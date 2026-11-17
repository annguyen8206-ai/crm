import { describe, it, expect } from 'vitest';
import { buildDailyReport } from '../server/daily-report';

const NOW = new Date('2026-09-04T18:00:00');
const today = '2026-09-04';
const at = (hhmm: string, day = today) => new Date(`${day}T${hhmm}:00`).toISOString();

function store(over: Partial<Record<string, any[]>> = {}): any {
  return { orders: [], customers: [], products: [], visits: [], tickets: [], ...over };
}

const order = (o: Record<string, unknown>) => ({
  code: 'DH', customerName: 'X', customerType: 'B2B', total: 0, paidAmount: 0, payments: [],
  status: 'Đã xác nhận', createdAt: at('09:00'), ...o,
});

describe('buildDailyReport', () => {
  it('counts today\'s orders and splits revenue B2B / B2C', () => {
    const r = buildDailyReport(store({
      orders: [
        order({ total: 1_000_000, customerType: 'B2B' }),
        order({ total: 200_000, customerType: 'B2C', status: 'Đã giao' }),
        order({ total: 500_000, status: 'Chờ duyệt' }),           // counted, not revenue
        order({ total: 999_999, status: 'Đã huỷ' }),              // ignored
        order({ total: 777_777, createdAt: at('09:00', '2026-09-03') }), // yesterday
      ],
    }), NOW);
    expect(r.kpis.ordersToday).toBe(3);
    expect(r.kpis.pendingApproval).toBe(1);
    expect(r.kpis.revenueToday).toBe(1_200_000);
    expect(r.kpis.revenueB2B).toBe(1_000_000);
    expect(r.kpis.revenueB2C).toBe(200_000);
  });

  it('sums money collected today across all orders, including old ones', () => {
    const r = buildDailyReport(store({
      orders: [
        order({ createdAt: at('09:00', '2026-08-01'), total: 900_000, paidAmount: 700_000,
          payments: [{ amount: 400_000, at: at('10:00', '2026-08-02') }, { amount: 300_000, at: at('11:00') }] }),
      ],
    }), NOW);
    expect(r.kpis.collectedToday).toBe(300_000);
    expect(r.kpis.receivableTotal).toBe(200_000);
  });

  it('tracks visits and overdue tickets, and includes the notification alerts', () => {
    const r = buildDailyReport(store({
      visits: [{ plannedDate: today, status: 'Hoàn thành' }, { plannedDate: today, status: 'Kế hoạch' }, { plannedDate: '2026-09-05', status: 'Kế hoạch' }],
      tickets: [
        { status: 'Đang xử lý', isOverdue: false, slaDeadline: '2026-09-04 10:00' },
        { status: 'Mới tiếp nhận', isOverdue: false, slaDeadline: '2026-09-05 10:00' },
        { status: 'Đã giải quyết', isOverdue: true, slaDeadline: '2026-09-01 10:00' },
      ],
    }), NOW);
    expect(r.kpis.visitsPlanned).toBe(2);
    expect(r.kpis.visitsDone).toBe(1);
    expect(r.kpis.openTickets).toBe(2);
    expect(r.kpis.overdueTickets).toBe(1);
    expect(r.alerts.some(a => a.id === 'tickets-overdue')).toBe(true);
  });

  it('empty store → all zeros, no alerts', () => {
    const r = buildDailyReport(store(), NOW);
    expect(r.kpis.ordersToday).toBe(0);
    expect(r.kpis.revenueToday).toBe(0);
    expect(r.alerts).toEqual([]);
    expect(r.date).toBe(today);
  });
});
