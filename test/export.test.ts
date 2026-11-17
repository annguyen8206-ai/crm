import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerCommerceRoutes } from '../server/routes/commerce';
import { registerExportRoutes, csvCell, toCsv } from '../server/routes/export';
import { dbStore } from '../server/store';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const role = decodeURIComponent(String(req.headers['x-test-role'] || 'admin'));
  req.authUser = { id: 'u', email: 'u@x', name: 'Tester', role, roleTitle: role, branchId: null } as any;
  next();
});
registerCommerceRoutes(app);
registerExportRoutes(app);

beforeEach(() => dbStore.clearAll());

describe('csvCell / toCsv', () => {
  it('quotes separators and neutralises formula injection', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+84 912')).toBe("'+84 912");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell(-1500)).toBe('-1500');   // numbers stay numbers
    expect(csvCell(null)).toBe('');
    expect(csvCell(true)).toBe('Có');
  });
  it('starts with a UTF-8 BOM and uses CRLF', () => {
    const s = toCsv(['A', 'B'], [[1, 'x']]);
    expect(s.charCodeAt(0)).toBe(0xfeff);
    expect(s).toContain('A,B\r\n1,x\r\n');
  });
});

describe('GET /api/export/:kind', () => {
  async function seed() {
    const p = (await request(app).post('/api/products').send({ sku: 'S1', name: 'Sữa', category: 'Sữa', unit: 'Thùng', stock: 10, prices: { LE: 100_000 } })).body.product;
    const c = (await request(app).post('/api/customers').send({ type: 'B2C', name: '=cmd|calc', phone: '0900000201' })).body.customer;
    await request(app).post('/api/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: 2 }] });
  }

  it('exports customers / orders / order lines as CSV with Vietnamese headers', async () => {
    await seed();
    const c = await request(app).get('/api/export/customers');
    expect(c.status).toBe(200);
    expect(c.headers['content-type']).toMatch(/text\/csv/);
    expect(c.headers['content-disposition']).toMatch(/vitcrm-khach-hang-\d{4}-\d{2}-\d{2}\.csv/);
    expect(c.text).toContain('Mã KH,Loại,Tên');
    expect(c.text).toContain("'=cmd|calc");              // injection neutralised

    const o = await request(app).get('/api/export/orders');
    expect(o.text.split('\r\n').filter(Boolean)).toHaveLength(2); // header + 1 order
    const items = await request(app).get('/api/export/order-items');
    expect(items.text).toContain('S1,Sữa,Thùng,2,100000,0,200000');
  });

  it('filters orders by date range', async () => {
    await seed();
    const none = await request(app).get('/api/export/orders?from=2000-01-01&to=2000-01-02');
    expect(none.text.split('\r\n').filter(Boolean)).toHaveLength(1);
  });

  it('is limited to roles with canExportData and rejects unknown kinds', async () => {
    expect((await request(app).get('/api/export/customers').set('x-test-role', encodeURIComponent('Nhân viên kinh doanh'))).status).toBe(403);
    expect((await request(app).get('/api/export/customers').set('x-test-role', encodeURIComponent('Kế toán công nợ'))).status).toBe(200);
    expect((await request(app).get('/api/export/passwords')).status).toBe(404);
  });
});
