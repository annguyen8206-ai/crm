import { describe, it, expect } from 'vitest';
import { buildFmcgDemo } from '../server/seed-fmcg';
import { computeNotifications } from '../server/routes/notifications';

const NOW = new Date('2026-11-17T09:00:00');
const today = '2026-11-17';

describe('buildFmcgDemo', () => {
  const demo = buildFmcgDemo(NOW);

  it('is deterministic for the same day', () => {
    const again = buildFmcgDemo(NOW);
    expect(again.orders.map(o => o.code)).toEqual(demo.orders.map(o => o.code));
  });

  it('fills every screen: products, B2B + B2C customers, orders, today\'s visit plan', () => {
    expect(demo.products.length).toBeGreaterThan(5);
    expect(demo.customers.some(c => c.type === 'B2B')).toBe(true);
    expect(demo.customers.some(c => c.type === 'B2C')).toBe(true);
    expect(demo.orders.length).toBeGreaterThan(50);
    expect(demo.visits.filter(v => v.plannedDate === today && v.status === 'Kế hoạch').length).toBeGreaterThan(0);
  });

  it('has tickets with a mix of open/overdue/resolved and valid customers', () => {
    const ids = new Set(demo.customers.map(c => c.id));
    expect(demo.tickets.every(t => ids.has(t.patientId))).toBe(true);
    expect(demo.tickets.some(t => t.status === 'Mới tiếp nhận')).toBe(true);
    expect(demo.tickets.some(t => t.resolvedAt)).toBe(true);
    const codes = demo.tickets.map(t => t.ticketCode);
    expect(new Set(codes).size).toBe(codes.length);
    // At least one open ticket is past its SLA so the alert + "Quá hạn" badge show up.
    const alerts = computeNotifications({ ...demo, tickets: demo.tickets } as any, NOW.getTime());
    expect(alerts.some(a => a.id === 'tickets-overdue')).toBe(true);
  });

  it('has a deal in every pipeline stage and conversations whose messages line up', () => {
    const stages = new Set(demo.leads.map(l => l.stage));
    for (const s of ['Mới tiếp nhận', 'Đã liên hệ', 'Gửi báo giá', 'Đàm phán', 'Chốt thành công (Won)', 'Thất bại (Lost)']) expect(stages.has(s as any)).toBe(true);
    for (const c of demo.conversations) {
      const msgs = demo.messages.filter(m => m.conversationId === c.id);
      expect(msgs.length).toBeGreaterThan(0);
      expect(c.lastMessagePreview).toBe(msgs[msgs.length - 1].text.slice(0, 140));
    }
  });

  it('the pending demo order really is over the customer\'s credit limit', () => {
    const o = demo.orders.find(x => x.status === 'Chờ duyệt')!;
    const c = demo.customers.find(x => x.id === o.customerId)!;
    expect(c.outstandingDebt + o.total).toBeGreaterThan(c.creditLimit!);
  });

  it('promotions reference products that exist and are on sale', () => {
    const ids = new Set(demo.products.filter(p => p.status === 'Đang bán').map(p => p.id));
    for (const p of demo.promotions) {
      for (const id of [p.buyProductId, p.giftProductId, ...(p.productIds || [])].filter(Boolean)) expect(ids.has(id!)).toBe(true);
    }
  });

  it('order codes match the bank-memo format the payment webhook expects', () => {
    expect(demo.orders.every(o => /^DH-\d{6}-\d{4}$/.test(o.code))).toBe(true);
  });
});
