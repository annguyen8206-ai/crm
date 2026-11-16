import { describe, it, expect } from 'vitest';
import { computeNotifications } from '../server/routes/notifications';

const NOW = Date.parse('2026-09-04T10:00:00');

function store(over: Partial<Record<string, any[]>> = {}): any {
  return { tickets: [], orders: [], products: [], customers: [], ...over };
}

const order = (o: Record<string, unknown>) => ({
  id: 'o', code: 'DH-1', customerId: 'c', customerName: 'NPP A', customerType: 'B2B', status: 'Đã giao',
  total: 1000, paidAmount: 0, items: [], createdAt: '2026-07-01T00:00:00Z', ...o,
});

describe('computeNotifications', () => {
  it('returns nothing for an empty store', () => {
    expect(computeNotifications(store(), NOW)).toEqual([]);
  });

  it('flags overdue tickets (by isOverdue or past slaDeadline)', () => {
    const n = computeNotifications(store({
      tickets: [
        { ticketCode: 'T1', status: 'Đang xử lý', isOverdue: true, slaDeadline: '2026-09-05 10:00' },
        { ticketCode: 'T2', status: 'Mới tiếp nhận', slaDeadline: '2026-09-04 08:00' },
        { ticketCode: 'T3', status: 'Đã đóng', slaDeadline: '2026-01-01 00:00' }, // resolved → ignored
      ],
    }), NOW);
    const overdue = n.find(x => x.id === 'tickets-overdue');
    expect(overdue?.count).toBe(2);
    expect(overdue?.severity).toBe('high');
    expect(n.find(x => x.id === 'tickets-new')?.count).toBe(1);
  });

  it('flags orders awaiting approval and debt overdue > 30 days', () => {
    const n = computeNotifications(store({
      orders: [
        order({ id: 'a', status: 'Chờ duyệt' }),
        order({ id: 'b', dueDate: '2026-07-15' }),                       // 51 days overdue
        order({ id: 'c', customerName: 'Đại lý B', dueDate: '2026-08-30' }), // 5 days → not yet
        order({ id: 'd', dueDate: '2026-06-01', paidAmount: 1000 }),      // paid
      ],
    }), NOW);
    expect(n.find(x => x.id === 'orders-pending')?.count).toBe(1);
    expect(n.find(x => x.id === 'debt-overdue')?.count).toBe(1);
    expect(n[0].severity).toBe('high');
  });

  it('flags low stock and quiet outlets with lower severity', () => {
    const n = computeNotifications(store({
      products: [{ sku: 'A', status: 'Đang bán', stock: 3 }, { sku: 'B', status: 'Ngừng bán', stock: 0 }, { sku: 'C', status: 'Đang bán' }],
      customers: [{ id: 'x', name: 'Tạp hoá', type: 'B2B', status: 'Đang hoạt động', visitFrequency: 'Hàng tuần', lastOrderDate: '2026-08-01' }],
    }), NOW);
    expect(n.find(x => x.id === 'stock-low')?.count).toBe(1);
    expect(n.find(x => x.id === 'outlets-inactive')?.severity).toBe('low');
  });
});
