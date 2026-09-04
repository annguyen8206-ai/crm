import type { Express } from 'express';
import { dbStore } from './store';
import { sendEmail } from './integrations';
import { requireAdmin } from './http-util';
import { computeNotifications } from './routes/notifications';
import { log } from './logger';

/**
 * End-of-day digest emailed to management.
 *   DAILY_REPORT_ENABLED  "true" to turn the scheduler on
 *   DAILY_REPORT_TO       comma-separated recipient emails
 *   DAILY_REPORT_HOUR     0-23 local hour to send (default 18)
 * Also POST /api/reports/daily/run (admin) to send on demand.
 */

const money = (n: number) => `${n.toLocaleString('vi-VN')} đ`;

export function buildDailyReport(store: typeof dbStore, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const day30 = now.getTime() - 30 * 86400000;

  const apptsToday = store.appointments.filter(a => a.date === today && a.status !== 'Đã hủy');
  const checkedIn = apptsToday.filter(a => a.checkedInAt);
  const noShow = apptsToday.filter(a => /vắng mặt|no-?show/i.test(a.status || ''));

  const paidToday = store.invoices.filter(i =>
    /đã thanh toán/i.test(i.status || '') && (i.paidAt || '').slice(0, 10) === today);
  const revenueToday = paidToday.reduce((s, i) => s + (Number(i.patientPayable) || 0), 0);
  const pendingValue = store.invoices
    .filter(i => /chờ thanh toán/i.test(i.status || ''))
    .reduce((s, i) => s + (Number(i.patientPayable) || 0), 0);

  const newPatients = store.patients.filter(p => {
    const t = Date.parse((p as any).firstVisitDate || (p as any).createdAt || '');
    return Number.isFinite(t) && t >= day30;
  }).length;

  const openTickets = store.tickets.filter(t => /mới tiếp nhận|đang xử lý/i.test(t.status || '')).length;
  const overdueTickets = store.tickets.filter(t =>
    t.isOverdue === true && !/giải quyết|đóng/i.test(t.status || '')).length;
  const overdueRecalls = store.recalls.filter(r => (r.daysOverdue || 0) > 0).length;

  const alerts = computeNotifications(store, now.getTime());

  return {
    date: today,
    kpis: {
      apptsToday: apptsToday.length,
      checkedIn: checkedIn.length,
      noShow: noShow.length,
      revenueToday,
      pendingValue,
      newPatients30d: newPatients,
      openTickets,
      overdueTickets,
      overdueRecalls,
      totalPatients: store.patients.length,
    },
    alerts,
  };
}

function renderHtml(r: ReturnType<typeof buildDailyReport>): { subject: string; html: string; text: string } {
  const k = r.kpis;
  const rows: Array<[string, string]> = [
    ['Lịch khám hôm nay', `${k.apptsToday} (đã tiếp đón ${k.checkedIn}, vắng ${k.noShow})`],
    ['Doanh thu đã thu hôm nay', money(k.revenueToday)],
    ['Công nợ chờ thu', money(k.pendingValue)],
    ['Hồ sơ mới (30 ngày)', String(k.newPatients30d)],
    ['Tổng hồ sơ khách hàng', String(k.totalPatients)],
    ['Ticket đang mở', String(k.openTickets)],
    ['Ticket quá hạn SLA', String(k.overdueTickets)],
    ['Tái khám quá hạn', String(k.overdueRecalls)],
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
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Gửi tự động từ VitCRM Healthcare.</p>
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
