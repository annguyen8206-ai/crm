import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerCommerceRoutes } from '../server/routes/commerce';
import { registerInventoryRoutes } from '../server/routes/inventory';
import { dbStore } from '../server/store';
import { ensureOpeningLots, expiryStatus, localDay, nextVoucherCode, receive } from '../server/inventory';
import { roleKeyOf } from '../server/rbac';
import { computeNotifications } from '../server/routes/notifications';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const role = decodeURIComponent(String(req.headers['x-test-role'] || 'admin'));
  req.authUser = { id: 'u', email: 'u@x', name: 'Thủ kho A', role, roleTitle: role, branchId: null } as any;
  next();
});
registerCommerceRoutes(app);
registerInventoryRoutes(app);

const today = localDay();
const plus = (days: number) => localDay(new Date(Date.now() + days * 86_400_000));

let p: any, c: any;
beforeEach(async () => {
  dbStore.clearAll();
  p = (await request(app).post('/api/products').send({ sku: 'LAV10', name: 'Oải hương 10ml', category: 'Tinh dầu', unit: 'Chai', prices: { LE: 150_000, GT: 120_000 }, cost: 60_000 })).body.product;
  c = (await request(app).post('/api/customers').send({ type: 'B2B', name: 'Nhà thuốc A', phone: '0900000301', channel: 'Tạp hoá (GT)' })).body.customer;
});

const receipt = (lines: object[], role = 'admin') =>
  request(app).post('/api/inventory/receipts').set('x-test-role', encodeURIComponent(role)).send({ reason: 'Nhập mua', partner: 'Nhà máy', lines });
const order = (qty: number) => request(app).post('/api/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: qty }] });

describe('receipts', () => {
  it('creates lots, keeps product.stock as the total and writes the stock card', async () => {
    const r = await receipt([
      { productId: p.id, lotNo: 'l-a', expiryDate: plus(200), mfgDate: plus(-100), qty: 10 },
      { productId: p.id, lotNo: 'L-B', expiryDate: plus(500), qty: 20 },
    ]);
    expect(r.status).toBe(201);
    expect(r.body.voucher.code).toMatch(/^PN-\d{6}-01$/);
    expect(dbStore.lots.map(l => l.lotNo).sort()).toEqual(['L-A', 'L-B']);
    expect(dbStore.products[0].stock).toBe(30);
    expect(dbStore.stockMoves.map(m => m.balanceAfter)).toEqual([10, 30]);
  });

  it('requires lot number and expiry date (unless the product does not track expiry)', async () => {
    const r = await receipt([{ productId: p.id, lotNo: '', qty: 5 }]);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/thiếu số lô/);
    expect(r.body.error).toMatch(/thiếu hạn sử dụng/);
    await request(app).put(`/api/products/${p.id}`).send({ trackExpiry: false });
    expect((await receipt([{ productId: p.id, lotNo: 'M1', qty: 5 }])).status).toBe(201);
  });

  it('rejects a receipt into an existing lot with a different expiry, and is all-or-nothing', async () => {
    await receipt([{ productId: p.id, lotNo: 'L1', expiryDate: plus(100), qty: 5 }]);
    const bad = await receipt([
      { productId: p.id, lotNo: 'L2', expiryDate: plus(300), qty: 7 },
      { productId: p.id, lotNo: 'L1', expiryDate: plus(999), qty: 1 },
    ]);
    expect(bad.status).toBe(400);
    expect(dbStore.lots.map(l => l.lotNo)).toEqual(['L1']);   // L2 rolled back
    expect(dbStore.products[0].stock).toBe(5);
  });

  it('only warehouse / accountant / admin may post vouchers', async () => {
    expect((await receipt([{ productId: p.id, lotNo: 'X', expiryDate: plus(100), qty: 1 }], 'Nhân viên kinh doanh')).status).toBe(403);
    expect((await receipt([{ productId: p.id, lotNo: 'X', expiryDate: plus(100), qty: 1 }], 'Thủ kho')).status).toBe(201);
  });
});

describe('orders issue stock FEFO by lot', () => {
  beforeEach(async () => {
    await receipt([
      { productId: p.id, lotNo: 'LATE', expiryDate: plus(600), qty: 10 },
      { productId: p.id, lotNo: 'SOON', expiryDate: plus(30), qty: 4 },
      { productId: p.id, lotNo: 'DEAD', expiryDate: plus(-5), qty: 50 },
    ]);
  });

  it('takes the earliest-expiring lot first and never sells expired stock', async () => {
    const r = await order(6);
    expect(r.status).toBe(201);
    expect(r.body.order.lotAllocations.map((a: any) => [a.lotNo, a.qty])).toEqual([['SOON', 4], ['LATE', 2]]);
    expect(dbStore.lots.find(l => l.lotNo === 'DEAD')!.qty).toBe(50);
    expect(dbStore.products[0].stock).toBe(58);
  });

  it('refuses an order larger than the non-expired stock', async () => {
    const r = await order(15);   // 14 sellable, 50 expired
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/LAV10 cần 15, còn 14 hàng còn hạn/);
    expect(dbStore.orders).toHaveLength(0);
  });

  it('cancelling / returning puts goods back into the same lots', async () => {
    const o = (await order(6)).body.order;
    await request(app).post(`/api/orders/${o.id}/status`).send({ status: 'Đã huỷ', reason: 'Khách đổi ý' });
    expect(dbStore.lots.find(l => l.lotNo === 'SOON')!.qty).toBe(4);
    expect(dbStore.lots.find(l => l.lotNo === 'LATE')!.qty).toBe(10);
    expect(dbStore.stockMoves.filter(m => m.type === 'Hoàn kho huỷ đơn' && m.ref === o.code)).toHaveLength(2);
  });

  it('lot trace lists the orders that received a lot', async () => {
    const o = (await order(6)).body.order;
    const soon = dbStore.lots.find(l => l.lotNo === 'SOON')!;
    const t = await request(app).get(`/api/inventory/lots/${soon.id}/trace`);
    expect(t.body.orders).toEqual([expect.objectContaining({ code: o.code, customerName: 'Nhà thuốc A', qty: 4 })]);
  });
});

describe('issues & stock counts', () => {
  it('write-off of an expired lot; cannot issue more than the lot holds', async () => {
    await receipt([{ productId: p.id, lotNo: 'DEAD', expiryDate: plus(-1), qty: 8 }]);
    const lot = dbStore.lots[0];
    expect((await request(app).post('/api/inventory/issues').send({ reason: 'Xuất huỷ', lines: [{ lotId: lot.id, qty: 9 }] })).status).toBe(400);
    const r = await request(app).post('/api/inventory/issues').send({ reason: 'Xuất huỷ', note: 'Hết hạn', lines: [{ lotId: lot.id, qty: 8 }] });
    expect(r.status).toBe(201);
    expect(r.body.voucher.code).toMatch(/^PX-/);
    expect(dbStore.products[0].stock).toBe(0);
  });

  it('stock count records the difference per lot', async () => {
    await receipt([{ productId: p.id, lotNo: 'A', expiryDate: plus(200), qty: 10 }, { productId: p.id, lotNo: 'B', expiryDate: plus(300), qty: 10 }]);
    const [a, b] = dbStore.lots;
    const r = await request(app).post('/api/inventory/counts').send({ note: 'Kiểm kê tháng', lines: [{ lotId: a.id, actualQty: 7 }, { lotId: b.id, actualQty: 12 }] });
    expect(r.status).toBe(201);
    expect(r.body.voucher.lines.map((l: any) => [l.lotNo, l.systemQty, l.qty])).toEqual([['A', 10, -3], ['B', 10, 2]]);
    expect(dbStore.products[0].stock).toBe(19);
  });
});

describe('helpers', () => {
  it('existing product stock becomes an opening lot exactly once', () => {
    const store = { products: [{ id: 'x', sku: 'X', stock: 12 } as any], lots: [], stockMoves: [], inventoryVouchers: [] };
    expect(ensureOpeningLots(store)).toBe(1);
    expect(ensureOpeningLots(store)).toBe(0);
    expect(store.lots).toEqual([expect.objectContaining({ lotNo: 'TON-DAU', qty: 12 })]);
    expect(store.products[0].stock).toBe(12);
  });

  it('expiry status, voucher numbering, warehouse role mapping', () => {
    expect(expiryStatus({ expiryDate: plus(-1) }, today)).toBe('Hết hạn');
    expect(expiryStatus({ expiryDate: plus(10) }, today)).toBe('Cận date');
    expect(expiryStatus({ expiryDate: plus(400) }, today)).toBe('Còn hạn');
    expect(expiryStatus({}, today)).toBe('Không hạn');
    expect(nextVoucherCode('PN', ['PN-261118-01', 'PN-261118-07'], new Date('2026-11-18T10:00:00'))).toBe('PN-261118-08');
    expect(roleKeyOf('Thủ kho')).toBe('warehouse_keeper');
    expect(roleKeyOf('Nhân viên kho')).toBe('warehouse_keeper');
    expect(roleKeyOf('Kế toán kho')).toBe('accountant');
    expect(roleKeyOf('Quản lý tài khoản')).not.toBe('warehouse_keeper');
  });

  it('notifies about expired and near-expiry lots', () => {
    const store = { products: [{ id: 'x', sku: 'X', status: 'Đang bán' } as any], lots: [], stockMoves: [], inventoryVouchers: [] } as any;
    receive(store, { productId: 'x', lotNo: 'OLD', qty: 3, expiryDate: plus(-2), type: 'Nhập mua' });
    receive(store, { productId: 'x', lotNo: 'NEAR', qty: 3, expiryDate: plus(20), type: 'Nhập mua' });
    const n = computeNotifications({ ...store, tickets: [], orders: [], customers: [] });
    expect(n.map(x => x.id)).toEqual(expect.arrayContaining(['lots-expired', 'lots-near-expiry']));
  });
});
