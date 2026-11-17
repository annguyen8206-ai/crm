import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerCareRoutes, nextTicketCode, slaDeadlineFor } from '../server/routes/care';
import { registerCommerceRoutes } from '../server/routes/commerce';
import { registerPublicRoutes } from '../server/routes/public';
import { dbStore } from '../server/store';

function makeApp() {
  const app = express();
  app.use(express.json());
  registerPublicRoutes(app);
  app.use((req, _res, next) => {
    req.authUser = { id: 'admin', email: 'a@x', name: 'Admin', role: 'admin', roleTitle: 'admin', branchId: null } as any;
    next();
  });
  registerCommerceRoutes(app);
  registerCareRoutes(app);
  return app;
}
const app = makeApp();

beforeEach(() => dbStore.clearAll());

describe('ticket helpers', () => {
  it('numbers tickets sequentially per day', () => {
    const d = new Date('2026-11-17T09:00:00');
    expect(nextTicketCode([], d)).toBe('CS-261117-001');
    expect(nextTicketCode(['CS-261117-001', 'CS-261117-007', 'CS-261116-099'], d)).toBe('CS-261117-008');
  });
  it('derives the SLA deadline from the priority', () => {
    const d = new Date('2026-11-17T09:00:00');
    expect(slaDeadlineFor('Cao (SLA 2h)', d)).toBe('2026-11-17 11:00');
    expect(slaDeadlineFor('Thấp (SLA 24h)', d)).toBe('2026-11-18 09:00');
  });
});

describe('POST/PUT /api/tickets', () => {
  it('fills customer data, a fresh SLA deadline and a sequential code', async () => {
    const c = (await request(app).post('/api/customers').send({ type: 'B2B', name: 'Tạp hoá Lan', phone: '0911222333', channel: 'Tạp hoá (GT)' })).body.customer;
    const r = await request(app).post('/api/tickets').send({ patientId: c.id, category: 'Đổi trả hàng', priority: 'Cao (SLA 2h)', description: 'Thùng sữa móp' });
    expect(r.status).toBe(201);
    expect(r.body.ticket).toMatchObject({ patientName: 'Tạp hoá Lan', patientPhone: '0911222333', status: 'Mới tiếp nhận' });
    expect(r.body.ticket.ticketCode).toMatch(/^CS-\d{6}-001$/);
    const due = Date.parse(r.body.ticket.slaDeadline.replace(' ', 'T'));
    expect(due).toBeGreaterThan(Date.now() + 60 * 60_000);   // not some fixed past date
    expect(due).toBeLessThan(Date.now() + 3 * 60 * 60_000);
  });

  it('rejects tickets without customer or description', async () => {
    expect((await request(app).post('/api/tickets').send({ description: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/tickets').send({ patientName: 'A' })).status).toBe(400);
  });

  it('only updates workflow fields and stamps / clears resolvedAt', async () => {
    const t = (await request(app).post('/api/tickets').send({ patientName: 'A', description: 'x' })).body.ticket;
    const bad = await request(app).put(`/api/tickets/${t.id}`).send({ status: 'Bay màu' });
    expect(bad.status).toBe(400);

    const done = await request(app).put(`/api/tickets/${t.id}`).send({ status: 'Đã giải quyết', ticketCode: 'HACK', branchId: 'other', resolution: 'Đổi hàng' });
    expect(done.body.ticket).toMatchObject({ status: 'Đã giải quyết', ticketCode: t.ticketCode, resolution: 'Đổi hàng' });
    expect(done.body.ticket.resolvedAt).toBeTruthy();

    const reopened = await request(app).put(`/api/tickets/${t.id}`).send({ status: 'Đang xử lý' });
    expect(reopened.body.ticket.resolvedAt).toBeUndefined();
  });
});

describe('visit check-out with cash collected', () => {
  it('nets the cash against the oldest-due orders first and reports leftovers', async () => {
    const p = (await request(app).post('/api/products').send({ sku: 'S2', name: 'Mì', category: 'Khô', unit: 'Thùng', stock: 100, prices: { LE: 100_000, GT: 100_000 } })).body.product;
    const c = (await request(app).post('/api/customers').send({ type: 'B2B', name: 'Tạp hoá B', phone: '0900333444', channel: 'Tạp hoá (GT)', creditLimit: 0, paymentTermDays: 7 })).body.customer;
    const mk = async (q: number) => (await request(app).post('/api/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: q }] })).body.order;
    const newer = await mk(3);   // 300k
    const older = await mk(5);   // 500k
    dbStore.orders.find(o => o.id === older.id)!.dueDate = '2026-01-01';
    dbStore.orders.find(o => o.id === newer.id)!.dueDate = '2026-02-01';

    const v = (await request(app).post('/api/visits').send({ customerIds: [c.id], plannedDate: '2026-11-17', purpose: 'Thu nợ' })).body.visits[0];
    await request(app).post(`/api/visits/${v.id}/check-in`).send({});
    const r = await request(app).post(`/api/visits/${v.id}/check-out`).send({ outcome: 'Đã thu nợ', collectedAmount: 1_000_000 });
    expect(r.status).toBe(200);
    expect(r.body.collection.allocations).toEqual([
      { orderId: older.id, orderCode: older.code, amount: 500_000 },
      { orderId: newer.id, orderCode: newer.code, amount: 300_000 },
    ]);
    expect(r.body.collection.unallocated).toBe(200_000);
    expect(r.body.visit.collectedAmount).toBe(800_000);
    expect(r.body.visit.notes).toMatch(/Thu thừa 200\.000đ/);
    expect(dbStore.customers.find(x => x.id === c.id)!.outstandingDebt).toBe(0);
    expect(dbStore.orders.find(o => o.id === older.id)!.payments[0]).toMatchObject({ method: 'Tiền mặt', reference: `Viếng thăm ${v.id}` });
  });
});

describe('POST /api/payments/webhook — bank transfer → order', () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'whsec';
  afterAll(() => { delete process.env.PAYMENT_WEBHOOK_SECRET; });
  const hook = (body: object) => request(app).post('/api/payments/webhook').set('Authorization', 'Bearer whsec').send(body);

  async function seedOrder() {
    const p = (await request(app).post('/api/products').send({ sku: 'S1', name: 'Sữa', category: 'Sữa', unit: 'Thùng', stock: 50, prices: { LE: 100_000, NPP: 100_000 } })).body.product;
    const c = (await request(app).post('/api/customers').send({ type: 'B2B', name: 'NPP A', phone: '0900111222', channel: 'Nhà phân phối', creditLimit: 50_000_000, paymentTermDays: 30 })).body.customer;
    const o = (await request(app).post('/api/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: 10 }] })).body.order;
    expect(o.total).toBe(1_000_000);
    return o;
  }

  it('rejects unsigned calls', async () => {
    expect((await request(app).post('/api/payments/webhook').send({ amount: 1, description: 'x' })).status).toBe(401);
  });

  it('records partial then full payment, matching codes without dashes, and ignores retries', async () => {
    const o = await seedOrder();
    const bare = o.code.replace(/-/g, '');
    const r1 = await hook({ transferType: 'in', transferAmount: 400_000, content: `NPP A TT ${bare}`, referenceCode: 'FT1' });
    expect(r1.body.reconciled).toEqual([{ orderCode: o.code, amount: 400_000, reference: 'FT1' }]);
    expect(dbStore.orders[0]).toMatchObject({ paidAmount: 400_000, paymentStatus: 'Thanh toán một phần' });

    const retry = await hook({ transferType: 'in', transferAmount: 400_000, content: `TT ${o.code}`, referenceCode: 'FT1' });
    expect(retry.body.reconciled).toEqual([]);
    expect(dbStore.orders[0].paidAmount).toBe(400_000);

    const r2 = await hook({ transferType: 'in', transferAmount: 700_000, content: `TT ${o.code}`, referenceCode: 'FT2' });
    expect(r2.body.reconciled).toEqual([{ orderCode: o.code, amount: 600_000, reference: 'FT2', overpaid: 100_000 }]);
    expect(dbStore.orders[0]).toMatchObject({ paidAmount: 1_000_000, paymentStatus: 'Đã thanh toán' });
  });

  it('reports transfers it cannot match', async () => {
    await seedOrder();
    const r = await hook({ transferType: 'in', transferAmount: 5, content: 'chuyen tien an trua', referenceCode: 'X' });
    expect(r.body.reconciled).toEqual([]);
    expect(r.body.unmatched[0].reason).toBe('Không tìm thấy mã đơn');
    const r2 = await hook({ transferType: 'in', transferAmount: 5, content: 'DH-990101-0001', referenceCode: 'Y' });
    expect(r2.body.unmatched[0].reason).toBe('Không có đơn DH-990101-0001');
  });
});
