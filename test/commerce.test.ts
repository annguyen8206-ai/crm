import { describe, it, expect } from 'vitest';
import {
  priceFor, buildOrderItems, orderTotals, paymentStatusOf, approvalReasons, customerStats, agingBucket,
  receivables, pointsForAmount, tierForPoints, pointsToCredit, computeRfm, segmentOf, repurchaseDue,
  inactiveAccounts, distanceMeters, repKpis, commerceDashboard,
} from '../server/commerce';
import type { CustomerRecord, ProductRecord, OrderRecord } from '../server/commerce-types';

const product = (o: Partial<ProductRecord> = {}): ProductRecord => ({
  id: 'p1', sku: 'NUOC-01', name: 'Nước suối 500ml', category: 'Đồ uống', unit: 'Thùng',
  prices: { LE: 120_000, NPP: 90_000, GT: 105_000 }, status: 'Đang bán', createdAt: '2026-01-01', ...o,
});

const customer = (o: Partial<CustomerRecord> = {}): CustomerRecord => ({
  id: 'c1', code: 'KH-B2C-000001', type: 'B2C', name: 'Lan', phone: '0912345678', branchId: 'ALL',
  status: 'Đang hoạt động', tags: [], priceTier: 'LE', totalOrders: 0, totalRevenue: 0, outstandingDebt: 0,
  createdAt: '2026-01-01T00:00:00Z', ...o,
});

const order = (o: Partial<OrderRecord> = {}): OrderRecord => ({
  id: 'o1', code: 'DH-1', customerId: 'c1', customerName: 'Lan', customerPhone: '0912345678', customerType: 'B2C',
  branchId: 'ALL', channel: 'Zalo', priceTier: 'LE',
  items: [{ productId: 'p1', sku: 'NUOC-01', name: 'Nước', unit: 'Thùng', quantity: 1, unitPrice: 100_000, discountPercent: 0, lineTotal: 100_000 }],
  subtotal: 100_000, discountAmount: 0, shippingFee: 0, total: 100_000, paidAmount: 0, paymentStatus: 'Chưa thanh toán',
  payments: [], status: 'Đã xác nhận', createdAt: '2026-11-01T08:00:00Z', ...o,
});

describe('pricing', () => {
  it('uses the tier price and falls back to retail', () => {
    expect(priceFor(product(), 'NPP')).toBe(90_000);
    expect(priceFor(product(), 'MT')).toBe(120_000);
  });

  it('builds priced lines with line discounts', () => {
    const items = buildOrderItems([{ productId: 'p1', quantity: 10, discountPercent: 5 }], [product()], 'NPP');
    expect(items[0]).toMatchObject({ unitPrice: 90_000, lineTotal: 855_000, sku: 'NUOC-01' });
  });

  it('ignores price overrides unless allowed', () => {
    const lines = [{ productId: 'p1', quantity: 1, unitPrice: 1 }];
    expect(buildOrderItems(lines, [product()], 'LE')[0].unitPrice).toBe(120_000);
    expect(buildOrderItems(lines, [product()], 'LE', true)[0].unitPrice).toBe(1);
  });

  it('rejects empty orders, unknown / discontinued SKUs and bad quantities', () => {
    expect(() => buildOrderItems([], [product()], 'LE')).toThrow();
    expect(() => buildOrderItems([{ productId: 'x', quantity: 1 }], [product()], 'LE')).toThrow();
    expect(() => buildOrderItems([{ productId: 'p1', quantity: 1 }], [product({ status: 'Ngừng bán' })], 'LE')).toThrow();
    expect(() => buildOrderItems([{ productId: 'p1', quantity: 0 }], [product()], 'LE')).toThrow();
  });

  it('totals clamp the discount to the subtotal', () => {
    const items = buildOrderItems([{ productId: 'p1', quantity: 2 }], [product()], 'LE');
    expect(orderTotals(items, 40_000, 30_000)).toEqual({ subtotal: 240_000, discountAmount: 40_000, shippingFee: 30_000, total: 230_000 });
    expect(orderTotals(items, 999_999).total).toBe(0);
  });

  it('derives payment status', () => {
    expect(paymentStatusOf(100, 0)).toBe('Chưa thanh toán');
    expect(paymentStatusOf(100, 40)).toBe('Thanh toán một phần');
    expect(paymentStatusOf(100, 100)).toBe('Đã thanh toán');
  });
});

describe('approval rules', () => {
  const items = buildOrderItems([{ productId: 'p1', quantity: 10 }], [product()], 'GT'); // 1,050,000
  const base = { items, subtotal: 1_050_000, discountAmount: 0, total: 1_050_000, paidAmount: 0 };

  it('flags B2B orders that push debt over the credit limit', () => {
    const b2b = { type: 'B2B' as const, creditLimit: 2_000_000 };
    expect(approvalReasons(b2b, 500_000, base)).toEqual([]);
    expect(approvalReasons(b2b, 1_500_000, base)[0]).toMatch(/hạn mức/);
    // Paid upfront → no credit exposure.
    expect(approvalReasons(b2b, 1_500_000, { ...base, paidAmount: 1_050_000 })).toEqual([]);
  });

  it('never applies a credit check to B2C or zero-limit accounts', () => {
    expect(approvalReasons({ type: 'B2C', creditLimit: 0 }, 9e9, base)).toEqual([]);
    expect(approvalReasons({ type: 'B2B', creditLimit: 0 }, 9e9, base)).toEqual([]);
  });

  it('flags discounts above the threshold', () => {
    const disc = buildOrderItems([{ productId: 'p1', quantity: 1, discountPercent: 15 }], [product()], 'LE');
    expect(approvalReasons({ type: 'B2C' }, 0, { ...base, items: disc }).join()).toMatch(/Chiết khấu dòng/);
    expect(approvalReasons({ type: 'B2C' }, 0, { ...base, discountAmount: 200_000 }).join()).toMatch(/Chiết khấu đơn/);
  });
});

describe('receivables', () => {
  it('computes stats only from committed orders', () => {
    const orders = [
      order({ id: 'a', total: 100, paidAmount: 40, createdAt: '2026-10-01T00:00:00Z' }),
      order({ id: 'b', total: 200, paidAmount: 200, status: 'Đã giao', createdAt: '2026-11-01T00:00:00Z' }),
      order({ id: 'c', total: 999, status: 'Đã huỷ' }),
      order({ id: 'd', total: 999, status: 'Chờ duyệt' }),
    ];
    expect(customerStats('c1', orders)).toEqual({
      totalOrders: 2, totalRevenue: 300, outstandingDebt: 60, firstOrderDate: '2026-10-01', lastOrderDate: '2026-11-01',
    });
  });

  it('buckets overdue days', () => {
    expect(agingBucket(0)).toBe('Trong hạn');
    expect(agingBucket(15)).toBe('1-30 ngày');
    expect(agingBucket(45)).toBe('31-60 ngày');
    expect(agingBucket(75)).toBe('61-90 ngày');
    expect(agingBucket(200)).toBe('>90 ngày');
  });

  it('ages open orders from their due date', () => {
    const rows = receivables([
      order({ id: 'a', total: 100, dueDate: '2026-11-10' }),
      order({ id: 'b', total: 100, paidAmount: 100 }),
    ], new Date('2026-11-20T00:00:00Z'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ balance: 100, daysOverdue: 10, bucket: '1-30 ngày' });
  });
});

describe('loyalty', () => {
  it('converts spend to points and points to tier', () => {
    expect(pointsForAmount(125_000)).toBe(12);
    expect(tierForPoints(0)).toBe('Thành viên');
    expect(tierForPoints(500)).toBe('Bạc');
    expect(tierForPoints(2500)).toBe('Vàng');
    expect(tierForPoints(9999)).toBe('Kim cương');
  });

  it('credits only delivered + paid B2C orders, once', () => {
    const paid = { status: 'Đã giao' as const, paymentStatus: 'Đã thanh toán' as const, total: 500_000 };
    expect(pointsToCredit(order(paid))).toBe(50);
    expect(pointsToCredit(order({ ...paid, pointsEarned: 50 }))).toBe(0);
    expect(pointsToCredit(order({ ...paid, customerType: 'B2B' }))).toBe(0);
    expect(pointsToCredit(order({ ...paid, status: 'Đang giao' }))).toBe(0);
  });
});

describe('RFM', () => {
  it('maps scores to segments', () => {
    expect(segmentOf(5, 5, 5)).toBe('Khách VIP');
    expect(segmentOf(5, 1, 1)).toBe('Khách mới');
    expect(segmentOf(3, 4, 2)).toBe('Trung thành');
    expect(segmentOf(1, 1, 1)).toBe('Ngủ đông');
    expect(segmentOf(2, 4, 3)).toBe('Có nguy cơ rời bỏ');
  });

  it('scores recency/frequency and marks customers without orders', () => {
    const now = new Date('2026-11-16T00:00:00Z');
    const orders = Array.from({ length: 6 }, (_, i) => order({ id: `o${i}`, createdAt: `2026-1${i % 2}-0${i + 1}T00:00:00Z` }));
    const rows = computeRfm([customer(), customer({ id: 'c2', name: 'Mai' })], orders, now);
    const lan = rows.find(r => r.customerId === 'c1')!;
    expect(lan.frequency).toBe(6);
    expect(lan.f).toBe(4);
    expect(lan.r).toBe(5);
    expect(rows.find(r => r.customerId === 'c2')!.segment).toBe('Chưa mua hàng');
  });
});

describe('repurchase reminders', () => {
  const now = new Date('2026-11-16T00:00:00Z');
  const p = product({ repurchaseCycleDays: 30 });

  it('lists consumers whose cycle is due soon', () => {
    const rows = repurchaseDue([customer()], [order({ createdAt: '2026-10-20T00:00:00Z' })], [p], now);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dueDate: '2026-11-19', daysUntilDue: 3 });
  });

  it('resets on a newer purchase and ignores B2B / no-cycle products', () => {
    const orders = [order({ createdAt: '2026-10-01T00:00:00Z' }), order({ id: 'o2', createdAt: '2026-11-10T00:00:00Z' })];
    expect(repurchaseDue([customer()], orders, [p], now)).toHaveLength(0);
    expect(repurchaseDue([customer({ type: 'B2B' })], [order({ createdAt: '2026-10-20T00:00:00Z' })], [p], now)).toHaveLength(0);
    expect(repurchaseDue([customer()], [order({ createdAt: '2026-10-20T00:00:00Z' })], [product()], now)).toHaveLength(0);
  });

  it('stretches the cycle for multi-unit purchases', () => {
    const o = order({ createdAt: '2026-10-20T00:00:00Z' });
    o.items[0].quantity = 2;
    expect(repurchaseDue([customer()], [o], [p], now)).toHaveLength(0);
  });
});

describe('field sales', () => {
  it('computes haversine distance', () => {
    const d = distanceMeters({ lat: 21.0285, lng: 105.8542 }, { lat: 21.0294, lng: 105.8542 });
    expect(d).toBeGreaterThan(90);
    expect(d).toBeLessThan(110);
  });

  it('flags B2B outlets that have gone quiet', () => {
    const now = new Date('2026-11-16T00:00:00Z');
    const rows = inactiveAccounts([
      customer({ id: 'a', type: 'B2B', visitFrequency: 'Hàng tuần', lastOrderDate: '2026-10-20' }),
      customer({ id: 'b', type: 'B2B', visitFrequency: 'Hàng tuần', lastOrderDate: '2026-11-10' }),
      customer({ id: 'c', type: 'B2B' }),
    ], now);
    expect(rows.map(r => r.customer.id)).toEqual(['c', 'a']);
  });

  it('computes rep KPIs against targets', () => {
    const rows = repKpis('2026-11',
      [order({ salesRep: 'An', total: 3_000_000 }), order({ id: 'x', salesRep: 'An', total: 1_000_000, status: 'Đã huỷ' })],
      [
        { id: 'v1', customerId: 'c1', customerName: 'Lan', salesRep: 'An', branchId: 'ALL', plannedDate: '2026-11-02', purpose: 'Lấy đơn', status: 'Hoàn thành', orderId: 'o1', createdAt: '' },
        { id: 'v2', customerId: 'c1', customerName: 'Lan', salesRep: 'An', branchId: 'ALL', plannedDate: '2026-11-03', purpose: 'Lấy đơn', status: 'Hoàn thành', createdAt: '' },
      ],
      [], [{ salesRep: 'An', month: '2026-11', revenueTarget: 6_000_000 }]);
    expect(rows[0]).toMatchObject({ salesRep: 'An', revenue: 3_000_000, orders: 1, visitsDone: 2, strikeRate: 50, achievement: 50 });
  });
});

describe('dashboard', () => {
  it('aggregates revenue by type, day and product', () => {
    const d = commerceDashboard(
      [customer()],
      [order({ total: 100_000 }), order({ id: 'b', customerType: 'B2B', total: 300_000, createdAt: '2026-11-02T00:00:00Z' })],
      [product({ stock: 3 })], '2026-11-01', '2026-11-03', new Date('2026-11-03T00:00:00Z'),
    );
    expect(d.revenue).toBe(400_000);
    expect(d.revenueByType).toEqual({ B2B: 300_000, B2C: 100_000 });
    expect(d.daily).toHaveLength(3);
    expect(d.topProducts[0].quantity).toBe(2);
    expect(d.lowStock).toHaveLength(1);
    expect(d.receivableTotal).toBe(400_000);
  });
});
