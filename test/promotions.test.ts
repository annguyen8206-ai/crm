import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerCommerceRoutes } from '../server/routes/commerce';
import { registerPromotionRoutes } from '../server/routes/promotions';
import { dbStore } from '../server/store';
import { evaluatePromotion, sanitizePromotion, localYmd, type PromotionRecord } from '../server/promotions';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const role = decodeURIComponent(String(req.headers['x-test-role'] || 'admin'));
  req.authUser = { id: 'u', email: 'u@x', name: 'Tester', role, roleTitle: role, branchId: null } as any;
  next();
});
registerCommerceRoutes(app);
registerPromotionRoutes(app);

const today = localYmd();
const P = (o: Partial<PromotionRecord>): PromotionRecord => ({
  id: 'p', code: 'X', name: 'X', type: 'percent', value: 10, customerType: 'ALL', startDate: '2000-01-01', endDate: '2999-12-31', active: true, createdAt: '', ...o,
});

let mi: any, sua: any, npp: any, gt: any, b2c: any;
beforeEach(async () => {
  dbStore.clearAll();
  mi = (await request(app).post('/api/products').send({ sku: 'MI', name: 'Mì', category: 'Khô', unit: 'Thùng', stock: 100, prices: { LE: 100_000, GT: 100_000, NPP: 80_000 } })).body.product;
  sua = (await request(app).post('/api/products').send({ sku: 'SUA', name: 'Sữa', category: 'Sữa', unit: 'Thùng', stock: 100, prices: { LE: 400_000, NPP: 300_000, GT: 350_000 } })).body.product;
  npp = (await request(app).post('/api/customers').send({ type: 'B2B', name: 'NPP', phone: '0900000101', channel: 'Nhà phân phối' })).body.customer;
  gt = (await request(app).post('/api/customers').send({ type: 'B2B', name: 'Tạp hoá', phone: '0900000102', channel: 'Tạp hoá (GT)' })).body.customer;
  b2c = (await request(app).post('/api/customers').send({ type: 'B2C', name: 'Chị Lan', phone: '0900000103' })).body.customer;
});

describe('evaluatePromotion', () => {
  const ctx = () => ({ customer: npp, products: dbStore.products, orders: dbStore.orders, today });
  const line = (p: any, q: number, price: number) => ({ productId: p.id, sku: p.sku, name: p.name, unit: p.unit, quantity: q, unitPrice: price, discountPercent: 0, lineTotal: q * price });

  it('percent: only on eligible products, capped, with min order value', () => {
    const promo = P({ value: 10, productIds: [sua.id], maxDiscount: 50_000, minOrderValue: 500_000 });
    expect(evaluatePromotion(promo, { ...ctx(), items: [line(mi, 10, 80_000), line(sua, 1, 300_000)] })).toMatchObject({ ok: false });
    const r = evaluatePromotion(promo, { ...ctx(), items: [line(mi, 10, 80_000), line(sua, 2, 300_000)] });
    expect(r).toMatchObject({ ok: true, discount: 50_000 }); // 10% of 600k = 60k, capped at 50k
  });

  it('gift: repeats per set and carries the tier price at 100% off', () => {
    const promo = P({ type: 'gift', buyProductId: mi.id, buyQty: 10, giftProductId: mi.id, giftQty: 1 });
    expect(evaluatePromotion(promo, { ...ctx(), items: [line(mi, 9, 80_000)] })).toMatchObject({ ok: false });
    const r = evaluatePromotion(promo, { ...ctx(), items: [line(mi, 25, 80_000)] });
    expect(r.ok && r.giftItems[0]).toMatchObject({ productId: mi.id, quantity: 2, unitPrice: 80_000, lineTotal: 0, isGift: true });
  });

  it('respects dates, active flag, customer type and channel', () => {
    const items = [line(sua, 1, 300_000)];
    expect(evaluatePromotion(P({ active: false }), { ...ctx(), items })).toMatchObject({ ok: false });
    expect(evaluatePromotion(P({ endDate: '2001-01-01' }), { ...ctx(), items })).toMatchObject({ ok: false });
    expect(evaluatePromotion(P({ customerType: 'B2C' }), { ...ctx(), items })).toMatchObject({ ok: false });
    expect(evaluatePromotion(P({ customerType: 'B2B', channels: ['Tạp hoá (GT)'] }), { ...ctx(), items })).toMatchObject({ ok: false });
    expect(evaluatePromotion(P({ customerType: 'B2B', channels: ['Nhà phân phối'] }), { ...ctx(), items })).toMatchObject({ ok: true });
  });

  it('sanitizePromotion validates the essentials', () => {
    expect(sanitizePromotion({ code: 'x', name: 'n', startDate: today, endDate: today, type: 'percent', value: 5 })).toHaveProperty('error');
    expect(sanitizePromotion({ code: 'OK1', name: 'n', startDate: today, endDate: '2000-01-01', type: 'percent', value: 5 })).toHaveProperty('error');
    expect(sanitizePromotion({ code: 'OK1', name: 'n', startDate: today, endDate: today, type: 'percent', value: 150 })).toHaveProperty('error');
    expect(sanitizePromotion({ code: ' ok 1 ', name: 'n', startDate: today, endDate: today, type: 'amount', value: 1000 })).toMatchObject({ value: { code: 'OK1', type: 'amount' } });
  });
});

describe('promotions API + orders', () => {
  const create = (body: object, role = 'admin') => request(app).post('/api/promotions').set('x-test-role', role).send({ startDate: today, endDate: today, ...body });

  it('only marketing roles can create; codes are unique', async () => {
    expect((await create({ code: 'AA1', name: 'A', type: 'amount', value: 1000 }, 'Nhân viên kinh doanh')).status).toBe(403);
    expect((await create({ code: 'AA1', name: 'A', type: 'amount', value: 1000 })).status).toBe(201);
    expect((await create({ code: 'aa1', name: 'B', type: 'amount', value: 1000 })).status).toBe(409);
  });

  it('a 20% promotion does NOT trigger manager approval, a 20% manual discount does', async () => {
    await create({ code: 'BIG20', name: 'Giảm 20%', type: 'percent', value: 20 });
    const promo = await request(app).post('/api/orders').send({ customerId: gt.id, items: [{ productId: sua.id, quantity: 2 }], promotionCode: 'big20' });
    expect(promo.status).toBe(201);
    expect(promo.body.order).toMatchObject({ status: 'Đã xác nhận', promotionCode: 'BIG20', promotionDiscount: 140_000, discountAmount: 140_000, total: 560_000 });
    expect(promo.body.needsApproval).toBe(false);

    const manual = await request(app).post('/api/orders').send({ customerId: gt.id, items: [{ productId: sua.id, quantity: 2 }], discountAmount: 140_000 });
    expect(manual.body.needsApproval).toBe(true);
  });

  it('gift lines are added, take stock and stay out of the approval check', async () => {
    await create({ code: 'MI10', name: 'Mua 10 tặng 1', type: 'gift', buyProductId: mi.id, buyQty: 10, giftProductId: mi.id, giftQty: 1 });
    const r = await request(app).post('/api/orders').send({ customerId: gt.id, items: [{ productId: mi.id, quantity: 20 }], promotionCode: 'MI10' });
    expect(r.body.order.status).toBe('Đã xác nhận');
    expect(r.body.order.items).toHaveLength(2);
    expect(r.body.order.items[1]).toMatchObject({ isGift: true, quantity: 2, lineTotal: 0 });
    expect(r.body.order.total).toBe(2_000_000);
    expect(dbStore.products.find(p => p.id === mi.id)!.stock).toBe(78);
  });

  it('rejects an inapplicable code with the reason, and enforces per-customer limits', async () => {
    await create({ code: 'ONL50', name: '50k', type: 'amount', value: 50_000, customerType: 'B2C', minOrderValue: 300_000, perCustomerLimit: 1 });
    const wrongType = await request(app).post('/api/orders').send({ customerId: gt.id, items: [{ productId: sua.id, quantity: 1 }], promotionCode: 'ONL50' });
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.error).toMatch(/Chỉ áp dụng cho khách B2C/);

    expect((await request(app).post('/api/orders').send({ customerId: b2c.id, items: [{ productId: sua.id, quantity: 1 }], promotionCode: 'ONL50' })).status).toBe(201);
    const again = await request(app).post('/api/orders').send({ customerId: b2c.id, items: [{ productId: sua.id, quantity: 1 }], promotionCode: 'ONL50' });
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/tối đa 1 lần/);
  });

  it('evaluate lists what applies to a basket, best first', async () => {
    await create({ code: 'PCT5', name: '5%', type: 'percent', value: 5 });
    await create({ code: 'A100', name: '100k', type: 'amount', value: 100_000 });
    await create({ code: 'ONLYB2C', name: 'B2C', type: 'amount', value: 1, customerType: 'B2C' });
    const r = await request(app).post('/api/promotions/evaluate').send({ customerId: npp.id, items: [{ productId: sua.id, quantity: 10 }] });
    expect(r.body.applicable.map((a: any) => a.code)).toEqual(['PCT5', 'A100']); // 150k > 100k
    expect(r.body.notApplicable.map((a: any) => a.code)).toEqual(['ONLYB2C']);
  });

  it('cannot rename a code that orders already reference', async () => {
    const p = (await create({ code: 'USED', name: 'u', type: 'amount', value: 1000 })).body.promotion;
    await request(app).post('/api/orders').send({ customerId: gt.id, items: [{ productId: sua.id, quantity: 1 }], promotionCode: 'USED' });
    expect((await request(app).put(`/api/promotions/${p.id}`).send({ code: 'NEW' })).status).toBe(400);
    const list = await request(app).get('/api/promotions');
    expect(list.body.promotions[0].used).toBe(1);
  });
});
