import type { Express } from 'express';
import { dbStore } from '../store';

export type Notification = {
  id: string;
  severity: 'high' | 'med' | 'low';
  title: string;
  detail: string;
  tab: string;
  count: number;
};

const RESOLVED = new Set(['Đã giải quyết', 'Đã đóng']);

/** Derive actionable alerts from the current store. Pure — exported for tests. */
export function computeNotifications(store: typeof dbStore, now = Date.now()): Notification[] {
  const today = new Date(now).toISOString().slice(0, 10);
  const out: Notification[] = [];

  const parseWhen = (s?: string) => {
    if (!s) return NaN;
    const t = Date.parse(s.replace(' ', 'T'));
    return Number.isFinite(t) ? t : NaN;
  };

  // 1. Tickets past SLA and still open
  const overdueTix = store.tickets.filter(t => {
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

  // 2. New tickets awaiting triage
  const newTix = store.tickets.filter(t => t.status === 'Mới tiếp nhận' && !RESOLVED.has(t.status));
  if (newTix.length) {
    out.push({
      id: 'tickets-new', severity: 'med', tab: 'care', count: newTix.length,
      title: `${newTix.length} phiếu CSKH mới tiếp nhận`,
      detail: 'Cần phân công xử lý.',
    });
  }

  // 3. Today's appointments not yet checked in / confirmed
  const pendingToday = store.appointments.filter(a =>
    a.date === today && !a.checkedInAt &&
    /chờ tiếp đón|chờ xác nhận/i.test(a.status || '') && a.status !== 'Đã hủy'
  );
  if (pendingToday.length) {
    out.push({
      id: 'appts-today-pending', severity: 'med', tab: 'appointments', count: pendingToday.length,
      title: `${pendingToday.length} lịch khám hôm nay chưa xác nhận`,
      detail: pendingToday.slice(0, 3).map(a => `${a.patientName} ${a.timeSlot || ''}`.trim()).join('; '),
    });
  }

  // 4. Recalls past due
  const overdueRecalls = store.recalls.filter(r => (r.daysOverdue || 0) > 0 && !/hoàn tất|từ chối/i.test(r.status || ''));
  if (overdueRecalls.length) {
    out.push({
      id: 'recalls-overdue', severity: 'med', tab: 'care', count: overdueRecalls.length,
      title: `${overdueRecalls.length} lịch tái khám quá hạn`,
      detail: overdueRecalls.slice(0, 3).map(r => r.patientName).join(', '),
    });
  }

  // 5. Low-score CSAT feedback needing a follow-up call
  const csatFollow = store.csatFeedbacks.filter(c => c.followUpRequired && !c.followUpStatus);
  if (csatFollow.length) {
    out.push({
      id: 'csat-followup', severity: 'high', tab: 'care', count: csatFollow.length,
      title: `${csatFollow.length} đánh giá thấp cần liên hệ`,
      detail: csatFollow.slice(0, 3).map(c => `${c.patientName} (${c.rating}★)`).join(', '),
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
