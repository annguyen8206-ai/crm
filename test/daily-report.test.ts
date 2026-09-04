import { describe, it, expect } from 'vitest';
import { buildDailyReport } from '../server/daily-report';

const NOW = new Date('2026-09-04T18:00:00');
const today = '2026-09-04';

function store(over: Partial<Record<string, any[]>> = {}): any {
  return {
    patients: [], appointments: [], invoices: [], tickets: [], recalls: [],
    csatFeedbacks: [], followUps: [], leads: [], znsLogs: [], voipCalls: [],
    conversations: [], messages: [],
    ...over,
  };
}

describe('buildDailyReport', () => {
  it('counts today\'s appointments, check-ins and no-shows', () => {
    const r = buildDailyReport(store({
      appointments: [
        { date: today, status: 'Đã tiếp đón', checkedInAt: '2026-09-04T08:00:00' },
        { date: today, status: 'Chờ tiếp đón' },
        { date: today, status: 'Vắng mặt' },
        { date: today, status: 'Đã hủy' },
        { date: '2026-09-03', status: 'Đã khám xong' },
      ],
    }), NOW);
    expect(r.kpis.apptsToday).toBe(3);
    expect(r.kpis.checkedIn).toBe(1);
    expect(r.kpis.noShow).toBe(1);
  });

  it('sums revenue collected today and pending value', () => {
    const r = buildDailyReport(store({
      invoices: [
        { status: 'Đã thanh toán', paidAt: '2026-09-04 09:30', patientPayable: 500000 },
        { status: 'Đã thanh toán', paidAt: '2026-09-03 09:30', patientPayable: 999 },
        { status: 'Chờ thanh toán', patientPayable: 200000 },
      ],
    }), NOW);
    expect(r.kpis.revenueToday).toBe(500000);
    expect(r.kpis.pendingValue).toBe(200000);
  });

  it('includes the notification alerts', () => {
    const r = buildDailyReport(store({
      tickets: [{ status: 'Đang xử lý', isOverdue: true, slaDeadline: '2026-09-05 10:00' }],
    }), NOW);
    expect(r.kpis.overdueTickets).toBe(1);
    expect(r.alerts.some(a => a.id === 'tickets-overdue')).toBe(true);
  });

  it('empty store → all zeros, no alerts', () => {
    const r = buildDailyReport(store(), NOW);
    expect(r.kpis.apptsToday).toBe(0);
    expect(r.alerts).toEqual([]);
    expect(r.date).toBe(today);
  });
});
