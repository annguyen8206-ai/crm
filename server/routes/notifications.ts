import type { Express } from 'express';
import { dbStore } from '../store';
import { receivables, inactiveAccounts } from '../commerce';

export type Notification = {
  id: string;
  severity: 'high' | 'med' | 'low';
  title: string;
  detail: string;
  tab: string;
  count: number;
};

const RESOLVED = new Set(['Đã giải quyết', 'Đã đóng']);

type NotifStore = Pick<typeof dbStore, 'tickets' | 'orders' | 'products' | 'customers'>;

/** Derive actionable alerts from the current store. Pure — exported for tests. */
export function computeNotifications(store: NotifStore, now = Date.now()): Notification[] {
  const out: Notification[] = [];
  const nowDate = new Date(now);

  const parseWhen = (s?: string) => {
    if (!s) return NaN;
    const t = Date.parse(s.replace(' ', 'T'));
    return Number.isFinite(t) ? t : NaN;
  };

  // 1. Orders waiting for a manager (credit limit / discount)
  const pending = (store.orders || []).filter(o => o.status === 'Chờ duyệt');
  if (pending.length) {
    out.push({
      id: 'orders-pending', severity: 'high', tab: 'orders', count: pending.length,
      title: `${pending.length} đơn hàng chờ duyệt`,
      detail: pending.slice(0, 3).map(o => `${o.code} · ${o.customerName}`).join('; '),
    });
  }

  // 2. Receivables more than 30 days overdue
  const overdue = receivables(store.orders || [], nowDate).filter(r => r.daysOverdue > 30);
  if (overdue.length) {
    const customers = [...new Set(overdue.map(r => r.customerName))];
    out.push({
      id: 'debt-overdue', severity: 'high', tab: 'orders', count: customers.length,
      title: `${customers.length} khách nợ quá hạn trên 30 ngày`,
      detail: customers.slice(0, 3).join(', '),
    });
  }

  // 3. Tickets past SLA and still open
  const overdueTix = (store.tickets || []).filter(t => {
    if (RESOLVED.has(t.status)) return false;
    const due = parseWhen(t.slaDeadline);
    return t.isOverdue === true || (Number.isFinite(due) && due < now);
  });
  if (overdueTix.length) {
    out.push({
      id: 'tickets-overdue', severity: 'high', tab: 'care', count: overdueTix.length,
      title: `${overdueTix.length} phiếu CSKH quá hạn SLA`,
      detail: overdueTix.slice(0, 3).map(t => t.ticketCode || t.patientName).join(', '),
    });
  }

  // 4. New tickets awaiting triage
  const newTix = (store.tickets || []).filter(t => t.status === 'Mới tiếp nhận');
  if (newTix.length) {
    out.push({
      id: 'tickets-new', severity: 'med', tab: 'care', count: newTix.length,
      title: `${newTix.length} phiếu CSKH mới tiếp nhận`,
      detail: 'Cần phân công xử lý.',
    });
  }

  // 5. Low stock on active SKUs
  const low = (store.products || []).filter(p => p.status === 'Đang bán' && typeof p.stock === 'number' && p.stock <= 10);
  if (low.length) {
    out.push({
      id: 'stock-low', severity: 'med', tab: 'products', count: low.length,
      title: `${low.length} sản phẩm sắp hết hàng`,
      detail: low.slice(0, 3).map(p => `${p.sku} (${p.stock})`).join(', '),
    });
  }

  // 6. B2B outlets that stopped ordering
  const quiet = inactiveAccounts(store.customers || [], nowDate);
  if (quiet.length) {
    out.push({
      id: 'outlets-inactive', severity: 'low', tab: 'sales', count: quiet.length,
      title: `${quiet.length} điểm bán lâu không đặt hàng`,
      detail: quiet.slice(0, 3).map(q => q.customer.name).join(', '),
    });
  }

  const order = { high: 0, med: 1, low: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function registerNotificationRoutes(app: Express): void {
  app.get('/api/notifications', (_req, res) => {
    const notifications = computeNotifications(dbStore);
    res.json({
      notifications,
      total: notifications.reduce((n, x) => n + x.count, 0),
      highCount: notifications.filter(n => n.severity === 'high').reduce((n, x) => n + x.count, 0),
    });
  });
}
