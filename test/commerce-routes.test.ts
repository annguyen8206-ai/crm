import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerCommerceRoutes } from '../server/routes/commerce';
import { dbStore } from '../server/store';

/** Mini app: same routes, with the session user injected from a test header. */
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = decodeURIComponent(String(req.headers['x-test-role'] || 'admin'));
    const name = decodeURIComponent(String(req.headers['x-test-name'] || 'Admin'));
    req.authUser = { id: name, email: `${name}@x`, name, role, roleTitle: role, branchId: null } as any;
    next();
  });
  registerCommerceRoutes(app);
  return app;
}

const app = makeApp();
const as = (role: string, name = role) => ({ 'x-test-role': encodeURIComponent(role), 'x-test-name': encodeURIComponent(name) });

async function seedProduct(extra: Record<string, unknown> = {}) {
  const r = await request(app).post('/api/products').set(as('admin')).send({
    sku: 'sua-01', name: 'Sữa tươi 1L', category: 'Sữa', unit: 'Thùng', stock: 100,
    prices: { LE: 400_000, NPP: 300_000, GT: 350_000 }, repurchaseCycleDays: 14, ...extra,
  });
  expect(r.status).toBe(201);
  return r.body.product;
}

beforeEach(() => { dbStore.clearAll(); });

describe('customers', () => {
  it('creates B2C and B2B customers with codes and price tiers', async () => {
    const a = await request(app).post('/api/customers').set(as('admin')).send({ type: 'B2C', name: 'Chị Lan', phone: '0912 345 678' });
    expect(a.status).toBe(201);
    expect(a.body.customer).toMatchObject({ code: 'KH-B2C-000001', priceTier: 'LE', loyaltyTier: 'Thành viên', loyaltyPoints: 0 });

    const b = await request(app).post('/api/customers').set(as('admin')).send({
      type: 'B2B', name: 'Tạp hoá Minh', phone: '0988000111', channel: 'Nhà phân phối', creditLimit: 5_000_000, paymentTermDays: 30,
    });
    expect(b.body.customer).toMatchObject({ code: 'KH-B2B-000001', priceTier: 'NPP', creditLimit: 5_000_000 });
  });

  it('rejects duplicate phones within the same type', async () => {
    await request(app).post('/api/customers').set(as('admin')).send({ name: 'A', phone: '0912345678' });
    const dup = await request(app).post('/api/customers').set(as('admin')).send({ name: 'B', phone: '+84 912 345 678' });
    expect(dup.status).toBe(409);
  });

  it('blocks roles without permission and strips credit terms from reps', async () => {
    const denied = await request(app).post('/api/customers').set(as('Marketing Lead')).send({ name: 'X', phone: '0900000001' });
    expect(denied.status).toBe(403);

    const c = await request(app).post('/api/customers').set(as('admin')).send({ type: 'B2B', name: 'NPP', phone: '0900000002', channel: 'Đại lý cấp 1' });
    const put = await request(app).put(`/api/customers/${c.body.customer.id}`).set(as('Nhân viên kinh doanh', 'An'))
      .send({ creditLimit: 999_999_999, notes: 'ok' });
    expect(put.status).toBe(200);
    expect(put.body.customer.creditLimit).toBe(0);
    expect(put.body.customer.notes).toBe('ok');
  });
});

describe('products', () => {
  it('archives (not deletes) a product that has warehouse history, even with no orders', async () => {
    const p = await seedProduct(); // stock: 100 → opening lot TON-DAU
    const r = await request(app).delete(`/api/products/${p.id}`).set(as('admin'));
    expect(r.body).toMatchObject({ success: true, archived: true });
    expect(dbStore.products.find(x => x.id === p.id)?.status).toBe('Ngừng bán');
    expect(dbStore.lots.every(l => dbStore.products.some(x => x.id === l.productId))).toBe(true);
  });

  it('really deletes a product with no orders and no stock history', async () => {
    const p = await seedProduct({ stock: 0 });
    const r = await request(app).delete(`/api/products/${p.id}`).set(as('admin'));
    expect(r.body).toEqual({ success: true });
    expect(dbStore.products).toHaveLength(0);
  });

  it('dashboard low-stock ignores expired lots', async () => {
    const p = await seedProduct({ stock: 0 });
    dbStore.lots.push({ id: 'lot-x', productId: p.id, sku: p.sku, lotNo: 'L1', expiryDate: '2000-01-01', qty: 500, receivedAt: '2000-01-01T00:00:00Z' });
    p.stock = 500;
    const r = await request(app).get('/api/commerce/dashboard').set(as('admin'));
    expect(r.body.lowStock).toEqual([expect.objectContaining({ sku: p.sku, stock: 0 })]);
  });
});

describe('orders', () => {
  it('prices by tier, confirms, decrements stock and tracks debt', async () => {
    const p = await seedProduct();
    const c = (await request(app).post('/api/customers').set(as('admin')).send({
      type: 'B2B', name: 'NPP Hà Nội', phone: '0900000003', channel: 'Nhà phân phối', creditLimit: 10_000_000, paymentTermDays: 15,
    })).body.customer;

    const o = await request(app).post('/api/orders').set(as('admin')).send({ customerId: c.id, items: [{ productId: p.id, quantity: 10 }] });
    expect(o.status).toBe(201);
    expect(o.body.order).toMatchObject({ status: 'Đã xác nhận', total: 3_000_000, paymentStatus: 'Chưa thanh toán' });
    expect(o.body.order.code).toMatch(/^DH-\d{6}-0001$/);
    expect(dbStore.products[0].stock).toBe(90);
    expect(dbStore.customers[0].outstandingDebt).toBe(3_000_000);

    const pay = await request(app).post(`/api/orders/${o.body.order.id}/payments`).set(as('Kế toán')).send({ amount: 1_000_000, method: 'Chuyển khoản' });
    expect(pay.body.order.paymentStatus).toBe('Thanh toán một phần');
    expect(dbStore.customers[0].outstandingDebt).toBe(2_000_000);

    const over = await request(app).post(`/api/orders/${o.body.order.id}/payments`).set(as('admin')).send({ amount: 5_000_000 });
    expect(over.status).toBe(400);

    const rec = await request(app).get('/api/receivables').set(as('admin'));
    expect(rec.body.total).toBe(2_000_000);
  });

  it('holds orders over the credit limit for approval', async () => {
    const p = await seedProduct();
    const c = (await request(app).post('/api/customers').set(as('admin')).send({
      type: 'B2B', name: 'Đại lý', phone: '0900000004', channel: 'Nhà phân phối', creditLimit: 1_000_000,
    })).body.customer;
    const o = await request(app).post('/api/orders').set(as('Nhân viên kinh doanh', 'An')).send({ customerId: c.id, items: [{ productId: p.id, quantity: 10 }] });
    expect(o.body.needsApproval).toBe(true);
    expect(o.body.order.status).toBe('Chờ duyệt');
    expect(dbStore.products[0].stock).toBe(100);

    const repTry = await request(app).post(`/api/orders/${o.body.order.id}/approve`).set(as('Nhân viên kinh doanh', 'An'));
    expect(repTry.status).toBe(403);

    const ok = await request(app).post(`/api/orders/${o.body.order.id}/approve`).set(as('Quản lý kinh doanh', 'Sếp'));
    expect(ok.body.order).toMatchObject({ status: 'Đã xác nhận', approvedBy: 'Sếp' });
    expect(dbStore.products[0].stock).toBe(90);
  });

  it('credits loyalty points once delivered and paid, and claws them back on return', async () => {
    const p = await seedProduct();
    const c = (await request(app).post('/api/customers').set(as('admin')).send({ name: 'Chị Hoa', phone: '0900000005' })).body.customer;
    const o = (await request(app).post('/api/orders').set(as('admin')).send({
      customerId: c.id, items: [{ productId: p.id, quantity: 1 }], payment: { amount: 400_000, method: 'COD' },
    })).body.order;
    expect(o.paymentStatus).toBe('Đã thanh toán');

    const bad = await request(app).post(`/api/orders/${o.id}/status`).set(as('admin')).send({ status: 'Chờ duyệt' });
    expect(bad.status).toBe(400);

    await request(app).post(`/api/orders/${o.id}/status`).set(as('admin')).send({ status: 'Đang giao' });
    const done = await request(app).post(`/api/orders/${o.id}/status`).set(as('admin')).send({ status: 'Đã giao' });
    expect(done.body.order.pointsEarned).toBe(40);
    expect(dbStore.customers[0]).toMatchObject({ loyaltyPoints: 40, lifetimePoints: 40, totalOrders: 1 });

    const ret = await request(app).post(`/api/orders/${o.id}/status`).set(as('admin')).send({ status: 'Trả hàng', reason: 'Hỏng' });
    expect(ret.status).toBe(200);
    expect(dbStore.customers[0]).toMatchObject({ loyaltyPoints: 0, totalOrders: 0 });
    expect(dbStore.products[0].stock).toBe(100);
  });

  it('rep only sees their own orders', async () => {
    const p = await seedProduct();
    const c = (await request(app).post('/api/customers').set(as('admin')).send({ name: 'K', phone: '0900000006' })).body.customer;
    await request(app).post('/api/orders').set(as('Nhân viên kinh doanh', 'An')).send({ customerId: c.id, items: [{ productId: p.id, quantity: 1 }], salesRep: 'An' });
    await request(app).post('/api/orders').set(as('Nhân viên kinh doanh', 'Bình')).send({ customerId: c.id, items: [{ productId: p.id, quantity: 1 }], salesRep: 'Bình' });
    const mine = await request(app).get('/api/orders').set(as('Nhân viên kinh doanh', 'An'));
    expect(mine.body.orders).toHaveLength(1);
    const all = await request(app).get('/api/orders').set(as('admin'));
    expect(all.body.orders).toHaveLength(2);
  });
});

describe('visits', () => {
  it('plans, checks in with GPS distance and links an order on check-out', async () => {
    const p = await seedProduct();
    const c = (await request(app).post('/api/customers').set(as('admin')).send({
      type: 'B2B', name: 'Tạp hoá Cô Ba', phone: '0900000007', channel: 'Tạp hoá (GT)', location: { lat: 21.0285, lng: 105.8542 },
    })).body.customer;

    const plan = await request(app).post('/api/visits').set(as('Nhân viên kinh doanh', 'An')).send({ customerId: c.id, plannedDate: '2026-11-16' });
    expect(plan.status).toBe(201);
    const v = plan.body.visits[0];
    expect(v.salesRep).toBe('An');

    const other = await request(app).post(`/api/visits/${v.id}/check-in`).set(as('Nhân viên kinh doanh', 'Bình')).send({});
    expect(other.status).toBe(403);

    const ci = await request(app).post(`/api/visits/${v.id}/check-in`).set(as('Nhân viên kinh doanh', 'An'))
      .send({ location: { lat: 21.0385, lng: 105.8542 } });
    expect(ci.body.visit.status).toBe('Đã check-in');
    expect(ci.body.visit.locationFlag).toBe(true);

    const o = await request(app).post('/api/orders').set(as('Nhân viên kinh doanh', 'An'))
      .send({ customerId: c.id, items: [{ productId: p.id, quantity: 2 }], visitId: v.id });
    expect(dbStore.visits[0].orderId).toBe(o.body.order.id);

    const co = await request(app).post(`/api/visits/${v.id}/check-out`).set(as('Nhân viên kinh doanh', 'An')).send({ outcome: 'Có đơn' });
    expect(co.body.visit.status).toBe('Hoàn thành');

    const kpi = await request(app).get('/api/commerce/kpi?month=2026-11').set(as('admin'));
    expect(kpi.status).toBe(200);
  });
});

describe('analytics', () => {
  it('serves dashboard, RFM, repurchase and inactive lists', async () => {
    for (const path of ['/api/commerce/dashboard', '/api/customers/rfm', '/api/commerce/repurchase-due', '/api/commerce/inactive-accounts']) {
      const r = await request(app).get(path).set(as('admin'));
      expect(r.status, path).toBe(200);
    }
  });
});
