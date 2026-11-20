import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerCommerceRoutes } from '../server/routes/commerce';
import { registerInventoryRoutes } from '../server/routes/inventory';
import { registerInboxRoutes } from '../server/routes/inbox';
import { registerExportRoutes } from '../server/routes/export';
import { registerCollectionRoutes } from '../server/routes/collections';
import { notificationsForRole } from '../server/routes/notifications';
import { staffRoleError } from '../server/routes/system';
import { dbStore } from '../server/store';

/** Same routes as production, with the session role injected from a test header. */
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = String(req.headers['x-test-role'] || 'admin');
    req.authUser = { id: role, email: `${role}@x`, name: role, role, roleTitle: role, branchId: null } as any;
    next();
  });
  registerCommerceRoutes(app);
  registerInventoryRoutes(app);
  registerInboxRoutes(app);
  registerExportRoutes(app);
  registerCollectionRoutes(app);
  return app;
}
const app = makeApp();
const get = (path: string, role: string) => request(app).get(path).set('x-test-role', role);

beforeEach(() => {
  dbStore.clearAll();
  dbStore.customers.push({
    id: 'c1', code: 'KH-B2B-000001', type: 'B2B', name: 'NPP A', phone: '0900000001', branchId: 'ALL', status: 'Đang hoạt động',
    tags: [], priceTier: 'NPP', creditLimit: 5_000_000, paymentTermDays: 30, totalOrders: 0, totalRevenue: 0, outstandingDebt: 1_000_000, createdAt: '2026-01-01',
  } as any);
  dbStore.conversations.push({ id: 'cv1', channel: 'zalo', externalUserId: 'z1', displayName: 'Khách', lastMessageAt: '', lastMessagePreview: '', unreadCount: 0, status: 'open', createdAt: '' });
});

describe('read access is enforced by the API, not only by hidden tabs', () => {
  const cases: Array<[string, string[], string[]]> = [
    // path, roles allowed, roles refused
    ['/api/customers', ['admin', 'sales_rep', 'accountant', 'cskh_sales_consultant', 'marketing_lead'], ['warehouse_keeper', 'viewer']],
    ['/api/orders', ['admin', 'sales_rep', 'accountant', 'warehouse_keeper', 'cskh_sales_consultant'], ['marketing_lead', 'viewer']],
    ['/api/receivables', ['admin', 'sales_manager', 'accountant'], ['warehouse_keeper', 'marketing_lead', 'viewer']],
    ['/api/inventory/summary', ['admin', 'sales_manager', 'accountant', 'warehouse_keeper'], ['sales_rep', 'marketing_lead', 'viewer']],
    ['/api/visits', ['admin', 'sales_manager', 'sales_rep'], ['accountant', 'warehouse_keeper', 'viewer']],
    ['/api/conversations', ['admin', 'sales_manager', 'cskh_sales_consultant'], ['sales_rep', 'warehouse_keeper', 'viewer']],
  ];
  for (const [path, allowed, refused] of cases) {
    it(path, async () => {
      for (const r of allowed) expect((await get(path, r)).status, `${r} → ${path}`).toBe(200);
      for (const r of refused) expect((await get(path, r)).status, `${r} → ${path}`).toBe(403);
    });
  }
});

describe('inbox', () => {
  it('a warehouse keeper or viewer cannot message customers', async () => {
    for (const role of ['warehouse_keeper', 'viewer', 'accountant']) {
      const r = await request(app).post('/api/conversations/cv1/reply').set('x-test-role', role).send({ text: 'xin chào' });
      expect(r.status).toBe(403);
    }
    expect(dbStore.messages).toHaveLength(0);
  });
});

describe('debt is hidden from marketing', () => {
  it('customer list and detail drop debt / credit fields', async () => {
    const list = await get('/api/customers', 'marketing_lead');
    expect(list.body.customers[0]).not.toHaveProperty('outstandingDebt');
    expect(list.body.customers[0]).not.toHaveProperty('creditLimit');
    const detail = await get('/api/customers/c1', 'marketing_lead');
    expect(detail.body.customer).not.toHaveProperty('outstandingDebt');
    expect(detail.body.receivables).toEqual([]);
    const acc = await get('/api/customers/c1', 'accountant');
    expect(acc.body.customer.outstandingDebt).toBe(1_000_000);
  });
});

describe('export needs the matching view right', () => {
  it('warehouse keeper exports stock, not customers or receivables', async () => {
    expect((await get('/api/export/stock-lots', 'warehouse_keeper')).status).toBe(200);
    expect((await get('/api/export/customers', 'warehouse_keeper')).status).toBe(403);
    expect((await get('/api/export/receivables', 'warehouse_keeper')).status).toBe(403);
    expect((await get('/api/export/customers', 'accountant')).status).toBe(200);
  });
});

describe('collections', () => {
  it('contracts and sales targets need the matching role; the full dump is admin-only', async () => {
    expect((await get('/api/collections/b2bContracts', 'warehouse_keeper')).status).toBe(403);
    expect((await get('/api/collections/salesTargets', 'marketing_lead')).status).toBe(403);
    expect((await get('/api/collections/salesTargets', 'sales_rep')).status).toBe(200);
    expect((await get('/api/collections/branches', 'viewer')).status).toBe(200);
    expect((await get('/api/collections', 'sales_manager')).status).toBe(403);
    expect((await get('/api/collections', 'admin')).status).toBe(200);
  });
});

describe('notifications', () => {
  const all = ['orders-pending', 'debt-overdue', 'tickets-new', 'stock-low', 'lots-expired', 'outlets-inactive']
    .map(id => ({ id, severity: 'med' as const, title: id, detail: '', tab: '', count: 1 }));
  it('each role only gets alerts it can act on', () => {
    expect(notificationsForRole(all, 'warehouse_keeper').map(n => n.id)).toEqual(['orders-pending', 'stock-low', 'lots-expired']);
    expect(notificationsForRole(all, 'viewer').map(n => n.id)).toEqual(['stock-low']);
    expect(notificationsForRole(all, 'admin')).toHaveLength(all.length);
  });
});

describe('staff accounts store a fixed role key', () => {
  it('accepts a key, refuses free text', () => {
    expect(staffRoleError({ role: 'warehouse_keeper' }, true)).toBeNull();
    expect(staffRoleError({ role: 'Giám đốc Marketing' }, true)).toMatch(/không hợp lệ/);
    expect(staffRoleError({}, true)).toMatch(/Chưa chọn/);
    expect(staffRoleError({ name: 'x' }, false)).toBeNull();
  });
});
