import type { Express } from 'express';
import { dbStore } from './store';
import { sendEmail } from './integrations';
import { requireAdmin } from './http-util';
import { computeNotifications } from './routes/notifications';
import { log } from './logger';
import { isRevenueOrder, receivables } from './commerce';

/**
 * End-of-day digest emailed to management.
 *   DAILY_REPORT_ENABLED  "true" to turn the scheduler on
 *   DAILY_REPORT_TO       comma-separated recipient emails
 *   DAILY_REPORT_HOUR     0-23 local hour to send (default 18)
 * Also POST /api/reports/daily/run (admin) to send on demand.
 */

const money = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
/** Local calendar day of an ISO timestamp or "YYYY-MM-DD[ HH:mm]" string. */
const localDay = (s?: string) => {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  if (Number.isNaN(t.getTime())) return '';
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

type ReportStore = Pick<typeof dbStore, 'orders' | 'customers' | 'products' | 'visits' | 'tickets'>;

export function buildDailyReport(store: ReportStore, now = new Date()) {
  const today = localDay(now.toISOString());
  const orders = store.orders || [];

  const ordersToday = orders.filter(o => localDay(o.createdAt) === today && o.status !== 'Đã huỷ');
  const revenueOrders = ordersToday.filter(isRevenueOrder);
  const revenueToday = revenueOrders.reduce((s, o) => s + o.total, 0);
  const revenueB2B = revenueOrders.filter(o => o.customerType === 'B2B').reduce((s, o) => s + o.total, 0);
  const collectedToday = orders.reduce((s, o) =>
    s + (o.payments || []).filter(p => localDay(p.at) === today).reduce((x, p) => x + p.amount, 0), 0);

  const rec = receivables(orders, now);
  const receivableTotal = rec.reduce((s, r) => s + r.balance, 0);
  const overdueTotal = rec.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.balance, 0);

  const visitsToday = (store.visits || []).filter(v => v.plannedDate === today);
  const newCustomersToday = (store.customers || []).filter(c => localDay(c.createdAt) === today).length;

  const openTickets = (store.tickets || []).filter(t => /mới tiếp nhận|đang xử lý/i.test(t.status || '')).length;
  const overdueTickets = (store.tickets || []).filter(t => {
    if (/giải quyết|đóng/i.test(t.status || '')) return false;
    const due = Date.parse(String(t.slaDeadline || '').replace(' ', 'T'));
    return t.isOverdue === true || (Number.isFinite(due) && due < now.getTime());
  }).length;

  return {
    date: today,
    kpis: {
      ordersToday: ordersToday.length,
      pendingApproval: orders.filter(o => o.status === 'Chờ duyệt').length,
      revenueToday,
      revenueB2B,
      revenueB2C: revenueToday - revenueB2B,
      collectedToday,
      receivableTotal,
      overdueTotal,
      visitsPlanned: visitsToday.length,
      visitsDone: visitsToday.filter(v => v.status === 'Hoàn thành').length,
      newCustomersToday,
      openTickets,
      overdueTickets,
    },
    alerts: computeNotifications(store, now.getTime()),
  };
}

function renderHtml(r: ReturnType<typeof buildDailyReport>): { subject: string; html: string; text: string } {
  const k = r.kpis;
  const rows: Array<[string, string]> = [
    ['Đơn hàng hôm nay', `${k.ordersToday} (chờ duyệt ${k.pendingApproval})`],
    ['Doanh số hôm nay', `${money(k.revenueToday)} (B2B ${money(k.revenueB2B)} · B2C ${money(k.revenueB2C)})`],
    ['Tiền đã thu hôm nay', money(k.collectedToday)],
    ['Công nợ phải thu', `${money(k.receivableTotal)} (quá hạn ${money(k.overdueTotal)})`],
    ['Viếng thăm điểm bán', `${k.visitsDone}/${k.visitsPlanned} hoàn thành`],
    ['Khách hàng mới hôm nay', String(k.newCustomersToday)],
    ['Phiếu CSKH đang mở', `${k.openTickets} (quá hạn SLA ${k.overdueTickets})`],
  ];
  const tr = rows.map(([a, b]) =>
    `<tr><td style="padding:6px 12px;color:#475569">${a}</td><td style="padding:6px 12px;font-weight:700;text-align:right">${b}</td></tr>`).join('');
  const alertList = r.alerts.length
    ? '<ul style="margin:8px 0 0;padding-left:18px">' + r.alerts.map(a => `<li><b>${a.title}</b> — ${a.detail || ''}</li>`).join('') + '</ul>'
    : '<p style="color:#16a34a;margin:8px 0 0">Không có việc nào cần chú ý.</p>';

  return {
    subject: `VitCRM — Báo cáo cuối ngày ${r.date}`,
    text: rows.map(([a, b]) => `${a}: ${b}`).join('\n') + '\n\nCẦN CHÚ Ý:\n' + r.alerts.map(a => `- ${a.title}: ${a.detail}`).join('\n'),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#0f172a">Báo cáo cuối ngày · ${r.date}</h2>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px">${tr}</table>
      <h3 style="color:#b45309;margin-top:20px">Cần chú ý</h3>${alertList}
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Gửi tự động từ VitCRM.</p>
    </div>`,
  };
}

export async function sendDailyReport(): Promise<{ sent: boolean; recipients: string[]; mode?: string; error?: string }> {
  const to = (process.env.DAILY_REPORT_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!to.length) return { sent: false, recipients: [], error: 'DAILY_REPORT_TO chưa cấu hình' };
  const { subject, html, text } = renderHtml(buildDailyReport(dbStore));
  const r = await sendEmail({ to: to.join(','), subject, html, text });
  if (r.ok) log.info('daily report sent', { to, mode: r.mode });
  else log.warn('daily report send failed', { to, error: r.error });
  return { sent: r.ok, recipients: to, mode: r.mode, error: r.error };
}

let lastSentDate = '';

export function startDailyReportScheduler(): void {
  if (process.env.DAILY_REPORT_ENABLED !== 'true') {
    console.log('[daily-report] scheduler OFF (set DAILY_REPORT_ENABLED=true).');
    return;
  }
  const hour = Math.min(23, Math.max(0, Number(process.env.DAILY_REPORT_HOUR || 18)));
  console.log(`[daily-report] scheduler ON — sends at ${hour}:00 to ${process.env.DAILY_REPORT_TO || '(no recipients)'}`);
  setInterval(() => {
    const now = new Date();
    const d = now.toISOString().slice(0, 10);
    if (now.getHours() === hour && d !== lastSentDate) {
      lastSentDate = d;
      void sendDailyReport();
    }
  }, 60_000);
}

export function registerReportRoutes(app: Express): void {
  app.post('/api/reports/daily/run', requireAdmin, async (_req, res) => {
    const r = await sendDailyReport();
    res.status(r.sent ? 200 : 502).json(r);
  });
  app.get('/api/reports/daily/preview', requireAdmin, (_req, res) => {
    res.json(buildDailyReport(dbStore));
  });
}
