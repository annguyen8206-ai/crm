import type { Express, Request } from 'express';
import { dbStore } from '../store';
import { requirePerm, hasPerm, isAdmin, roleKeyOf } from '../rbac';
import { pageOf, digitsOnly, phoneMatches } from '../http-util';
import { scopeList, canAccessBranch, enforceBranchOnCreate } from '../branch-scope';
import type {
  CustomerRecord, ProductRecord, OrderRecord, VisitRecord, OrderStatus, PriceTier, B2BChannel, SalesTarget,
} from '../commerce-types';
import { PRICE_TIERS, CHANNEL_DEFAULT_TIER } from '../commerce-types';
import { evaluatePromotion, localYmd } from '../promotions';
import { checkOrderStock, commitOrderStock, releaseOrderStock, receive, sellableQty, StockError } from '../inventory';
import {
  buildOrderItems, orderTotals, paymentStatusOf, approvalReasons, customerStats, receivables, isRevenueOrder,
  pointsToCredit, tierForPoints, computeRfm, repurchaseDue, inactiveAccounts, distanceMeters,
  CHECKIN_MAX_DISTANCE_M, repKpis, commerceDashboard, addDays, ymd,
} from '../commerce';

const nowIso = () => new Date().toISOString();
const actor = (req: Request) => req.authUser?.name || 'Hệ thống';
const str = (v: unknown, max = 500) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const num = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? undefined : Number(v));

/** Field reps only see their own visits / orders; everyone else sees the branch scope. */
const isRep = (req: Request) => roleKeyOf(req.authUser?.role) === 'sales_rep';

function nextCode(prefix: string, existing: string[], width = 6): string {
  let max = 0;
  for (const c of existing) {
    if (!c?.startsWith(prefix)) continue;
    const n = Number(c.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(width, '0')}`;
}

function orderCode(): string {
  const d = new Date();
  const prefix = `DH-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-`;
  return nextCode(prefix, dbStore.orders.map(o => o.code), 4);
}

/** Refresh derived order stats + loyalty tier on a customer. */
export function recomputeCustomer(customerId: string): void {
  const c = dbStore.customers.find(x => x.id === customerId);
  if (!c) return;
  Object.assign(c, customerStats(customerId, dbStore.orders));
  if (c.type === 'B2C') c.loyaltyTier = tierForPoints(c.lifetimePoints || 0);
}

/** Credit loyalty points once an order is delivered + paid. */
function creditPoints(order: OrderRecord): void {
  const pts = pointsToCredit(order);
  if (!pts) return;
  const c = dbStore.customers.find(x => x.id === order.customerId);
  if (!c) return;
  order.pointsEarned = pts;
  c.loyaltyPoints = (c.loyaltyPoints || 0) + pts;
  c.lifetimePoints = (c.lifetimePoints || 0) + pts;
}

// Stock now moves by lot (FEFO) — see server/inventory.ts.

/**
 * Apply a payment to an order: caps at the outstanding balance, updates payment
 * status, credits loyalty points and refreshes customer stats. Shared by the
 * manual payment endpoint and the bank-webhook reconciler.
 */
export function recordOrderPayment(
  o: OrderRecord, amount: number, method: string, reference: string | undefined, by: string,
): { ok: true; applied: number; excess: number } | { ok: false; error: string } {
  if (o.status === 'Đã huỷ' || o.status === 'Trả hàng') return { ok: false, error: 'Đơn đã huỷ / trả hàng' };
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'Số tiền không hợp lệ' };
  const balance = Math.max(0, o.total - o.paidAmount);
  if (balance <= 0) return { ok: false, error: 'Đơn đã thanh toán đủ' };
  const applied = Math.min(amt, balance);
  const at = nowIso();
  o.payments.push({ id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`, amount: applied, method, reference, at, by });
  o.paidAmount += applied;
  o.paymentStatus = paymentStatusOf(o.total, o.paidAmount);
  o.updatedAt = at;
  creditPoints(o);
  recomputeCustomer(o.customerId);
  return { ok: true, applied, excess: amt - applied };
}

/**
 * Net a lump-sum collection (e.g. cash taken on a field visit) against the
 * customer's open orders, oldest due date first. Returns what went where and
 * any amount left over (more than the customer owed).
 */
export function allocateCollection(
  customerId: string, amount: number, method: string, reference: string, by: string,
): { allocations: Array<{ orderId: string; orderCode: string; amount: number }>; unallocated: number } {
  let left = Math.max(0, Math.round(amount));
  const open = receivables(dbStore.orders.filter(o => o.customerId === customerId))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.orderCode < b.orderCode ? -1 : 1));
  const allocations: Array<{ orderId: string; orderCode: string; amount: number }> = [];
  for (const row of open) {
    if (left <= 0) break;
    const o = dbStore.orders.find(x => x.id === row.orderId);
    if (!o) continue;
    const r = recordOrderPayment(o, Math.min(left, row.balance), method, reference, by);
    if ('error' in r) continue;
    allocations.push({ orderId: o.id, orderCode: o.code, amount: r.applied });
    left -= r.applied;
  }
  return { allocations, unallocated: left };
}

const CUSTOMER_EDITABLE: Array<keyof CustomerRecord> = [
  'name', 'phone', 'email', 'address', 'province', 'district', 'status', 'source', 'tags', 'assignedRep', 'notes',
  'gender', 'dob', 'companyName', 'taxCode', 'contactPerson', 'contactTitle', 'channel', 'parentDistributorId',
  'creditLimit', 'paymentTermDays', 'routeName', 'visitFrequency', 'location', 'priceTier',
];

function sanitizeCustomerPatch(body: any, type: CustomerRecord['type']): Partial<CustomerRecord> {
  const out: Partial<CustomerRecord> = {};
  for (const k of CUSTOMER_EDITABLE) {
    if (!(k in (body || {}))) continue;
    const v = body[k];
    switch (k) {
      case 'tags': out.tags = Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 30) : []; break;
      case 'creditLimit': case 'paymentTermDays': (out as any)[k] = Math.max(0, num(v) ?? 0); break;
      case 'priceTier': if (PRICE_TIERS.includes(v)) out.priceTier = v; break;
      case 'location':
        out.location = v && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng)) ? { lat: Number(v.lat), lng: Number(v.lng) } : undefined;
        break;
      default: (out as any)[k] = str(v);
    }
  }
  if (type === 'B2C') out.priceTier = 'LE';
  return out;
}

const PRODUCT_EDITABLE: Array<keyof ProductRecord> = [
  'sku', 'barcode', 'name', 'brand', 'category', 'unit', 'packSize', 'prices', 'cost', 'vatRate',
  'repurchaseCycleDays', 'stock', 'status', 'imageUrl', 'description', 'trackExpiry', 'expiryWarningDays',
];

function sanitizeProductPatch(body: any): Partial<ProductRecord> {
  const out: Partial<ProductRecord> = {};
  for (const k of PRODUCT_EDITABLE) {
    if (!(k in (body || {}))) continue;
    const v = body[k];
    if (k === 'prices') {
      const prices: Partial<Record<PriceTier, number>> = {};
      for (const t of PRICE_TIERS) { const n = num(v?.[t]); if (n !== undefined && n >= 0) prices[t] = n; }
      out.prices = prices;
    } else if (['packSize', 'cost', 'vatRate', 'repurchaseCycleDays', 'stock', 'expiryWarningDays'].includes(k)) {
      const n = num(v);
      (out as any)[k] = n === undefined ? undefined : Math.max(0, n);
    } else if (k === 'trackExpiry') {
      out.trackExpiry = v !== false && v !== 'false';
    } else {
      (out as any)[k] = str(v, 2000);
    }
  }
  if (out.sku) out.sku = out.sku.toUpperCase();
  return out;
}

/** Debt / credit fields are hidden from roles that may not see receivables (Marketing). */
function customerForRole<T extends CustomerRecord>(req: Request, c: T): T {
  if (hasPerm(req.authUser?.role, 'canViewReceivables')) return c;
  const { outstandingDebt: _d, creditLimit: _l, paymentTermDays: _t, ...rest } = c;
  return rest as T;
}

/** Allowed manual status transitions → permission needed. */
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, 'canManageOrders' | 'canApproveOrders'>>> = {
  'Chờ duyệt': { 'Đã huỷ': 'canManageOrders' },
  'Đã xác nhận': { 'Đang giao': 'canManageOrders', 'Đã giao': 'canManageOrders', 'Đã huỷ': 'canApproveOrders' },
  'Đang giao': { 'Đã giao': 'canManageOrders', 'Trả hàng': 'canApproveOrders' },
  'Đã giao': { 'Trả hàng': 'canApproveOrders' },
  'Đã huỷ': {},
  'Trả hàng': {},
};

export function registerCommerceRoutes(app: Express): void {
  // ================================================================ customers
  app.get('/api/customers', requirePerm('canViewCustomers'), (req, res) => {
    const { type, search, status, channel, assignedRep, tag, province } = req.query as Record<string, string | undefined>;
    let rows = scopeList(req, [...dbStore.customers], c => c.branchId);
    if (type === 'B2B' || type === 'B2C') rows = rows.filter(c => c.type === type);
    if (status) rows = rows.filter(c => c.status === status);
    if (channel) rows = rows.filter(c => c.channel === channel);
    if (assignedRep) rows = rows.filter(c => c.assignedRep === assignedRep);
    if (tag) rows = rows.filter(c => c.tags?.includes(tag));
    if (province) rows = rows.filter(c => c.province === province);
    if (search) {
      const s = search.toLowerCase().trim();
      const d = digitsOnly(s);
      rows = rows.filter(c =>
        c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) ||
        (c.companyName || '').toLowerCase().includes(s) || (c.taxCode || '').includes(s) ||
        (d.length >= 3 && digitsOnly(c.phone).includes(d)));
    }
    rows.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
    const p = pageOf(rows, req.query);
    res.json({ customers: p.page.map(c => customerForRole(req, c)), total: p.total, limit: p.limit, offset: p.offset });
  });

  app.get('/api/customers/rfm', requirePerm('canViewCustomers'), (req, res) => {
    const customers = scopeList(req, dbStore.customers, c => c.branchId);
    const rows = computeRfm(customers, dbStore.orders);
    const segments: Record<string, { B2B: number; B2C: number }> = {};
    rows.forEach(r => { (segments[r.segment] ||= { B2B: 0, B2C: 0 })[r.type] += 1; });
    res.json({ rows, segments });
  });

  app.get('/api/customers/:id', requirePerm('canViewCustomers'), (req, res) => {
    const c = dbStore.customers.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    if (!canAccessBranch(req, c.branchId)) return res.status(403).json({ error: 'Khách hàng thuộc chi nhánh khác' });
    const orders = dbStore.orders.filter(o => o.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const visits = dbStore.visits.filter(v => v.customerId === c.id).sort((a, b) => b.plannedDate.localeCompare(a.plannedDate));
    const rfm = computeRfm(dbStore.customers.filter(x => x.type === c.type), dbStore.orders).find(r => r.customerId === c.id);
    const outlets = c.channel === 'Nhà phân phối' ? dbStore.customers.filter(x => x.parentDistributorId === c.id) : [];
    const tickets = dbStore.tickets.filter(t => t.patientId === c.id || (c.phone && phoneMatches(t.patientPhone, c.phone)));
    // Debt only for the roles that work with it (Marketing sees purchases, not debt).
    const debt = hasPerm(req.authUser?.role, 'canViewReceivables') ? receivables(orders) : [];
    res.json({ customer: customerForRole(req, c), orders, visits, rfm, receivables: debt, outlets: outlets.map(o => customerForRole(req, o)), tickets });
  });

  app.post('/api/customers', requirePerm('canManageCustomers'), (req, res) => {
    const body = req.body || {};
    const type: CustomerRecord['type'] = body.type === 'B2B' ? 'B2B' : 'B2C';
    const name = str(body.name, 200);
    const phone = str(body.phone, 30);
    if (!name) return res.status(400).json({ error: 'Thiếu tên khách hàng' });
    if (!phone || digitsOnly(phone).length < 9) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    const dup = dbStore.customers.find(c => c.type === type && phoneMatches(c.phone, phone));
    if (dup) return res.status(409).json({ error: `Số điện thoại đã thuộc khách hàng ${dup.code} – ${dup.name}`, existingId: dup.id });

    const patch = sanitizeCustomerPatch(body, type);
    const channel = (type === 'B2B' ? (patch.channel as B2BChannel) || 'Tạp hoá (GT)' : undefined);
    const prefix = type === 'B2B' ? 'KH-B2B-' : 'KH-B2C-';
    const c: CustomerRecord = {
      ...patch,
      id: `cus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: nextCode(prefix, dbStore.customers.map(x => x.code)),
      type,
      name,
      phone,
      branchId: enforceBranchOnCreate(req, str(body.branchId)) || 'ALL',
      status: (patch.status as CustomerRecord['status']) || (type === 'B2B' ? 'Đang hoạt động' : 'Đang hoạt động'),
      tags: patch.tags || [],
      assignedRep: patch.assignedRep || (isRep(req) ? actor(req) : undefined),
      channel,
      priceTier: type === 'B2C' ? 'LE' : (patch.priceTier || CHANNEL_DEFAULT_TIER[channel!] || 'GT'),
      paymentTermDays: type === 'B2B' ? patch.paymentTermDays ?? 0 : undefined,
      creditLimit: type === 'B2B' ? patch.creditLimit ?? 0 : undefined,
      loyaltyTier: type === 'B2C' ? 'Thành viên' : undefined,
      loyaltyPoints: type === 'B2C' ? 0 : undefined,
      lifetimePoints: type === 'B2C' ? 0 : undefined,
      totalOrders: 0, totalRevenue: 0, outstandingDebt: 0,
      createdAt: nowIso(),
    };
    dbStore.customers.unshift(c);
    res.status(201).json({ success: true, customer: c });
  });

  app.put('/api/customers/:id', requirePerm('canManageCustomers'), (req, res) => {
    const c = dbStore.customers.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    if (!canAccessBranch(req, c.branchId)) return res.status(403).json({ error: 'Khách hàng thuộc chi nhánh khác' });
    const patch = sanitizeCustomerPatch(req.body, c.type);
    // Credit terms are a finance decision.
    if (('creditLimit' in patch || 'paymentTermDays' in patch || 'priceTier' in patch) && !hasPerm(req.authUser?.role, 'canApproveOrders')) {
      delete patch.creditLimit; delete patch.paymentTermDays; delete patch.priceTier;
    }
    if (patch.phone) {
      const dup = dbStore.customers.find(x => x.id !== c.id && x.type === c.type && phoneMatches(x.phone, patch.phone!));
      if (dup) return res.status(409).json({ error: `Số điện thoại đã thuộc khách hàng ${dup.code}`, existingId: dup.id });
    }
    Object.assign(c, patch, { updatedAt: nowIso() });
    res.json({ success: true, customer: c });
  });

  app.delete('/api/customers/:id', (req, res) => {
    if (!isAdmin(req.authUser?.role)) return res.status(403).json({ error: 'Chỉ quản trị viên được xoá khách hàng' });
    const idx = dbStore.customers.findIndex(x => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    if (dbStore.orders.some(o => o.customerId === req.params.id)) {
      return res.status(409).json({ error: 'Khách hàng đã có đơn hàng — hãy chuyển sang "Ngừng giao dịch" thay vì xoá' });
    }
    dbStore.customers.splice(idx, 1);
    res.json({ success: true });
  });

  app.post('/api/customers/:id/points/redeem', requirePerm('canManageLoyalty'), (req, res) => {
    const c = dbStore.customers.find(x => x.id === req.params.id);
    if (!c || c.type !== 'B2C') return res.status(404).json({ error: 'Không tìm thấy khách hàng B2C' });
    const points = Math.floor(Number(req.body?.points));
    if (!Number.isFinite(points) || points <= 0) return res.status(400).json({ error: 'Số điểm không hợp lệ' });
    if (points > (c.loyaltyPoints || 0)) return res.status(400).json({ error: `Khách chỉ còn ${c.loyaltyPoints || 0} điểm` });
    c.loyaltyPoints = (c.loyaltyPoints || 0) - points;
    const log = (dbStore.collections.pointLedger ||= []) as any[];
    log.unshift({ id: `pt-${Date.now()}`, customerId: c.id, delta: -points, reason: str(req.body?.reason) || 'Đổi điểm', by: actor(req), at: nowIso() });
    res.json({ success: true, customer: c });
  });

  // ================================================================ products
  app.get('/api/products', (req, res) => {
    const { search, category, status, brand } = req.query as Record<string, string | undefined>;
    let rows = [...dbStore.products];
    if (category) rows = rows.filter(p => p.category === category);
    if (brand) rows = rows.filter(p => p.brand === brand);
    if (status) rows = rows.filter(p => p.status === status);
    if (search) {
      const s = search.toLowerCase().trim();
      rows = rows.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.barcode || '').includes(s));
    }
    const p = pageOf(rows, req.query);
    res.json({ products: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.post('/api/products', requirePerm('canManageProducts'), (req, res) => {
    const patch = sanitizeProductPatch(req.body);
    if (!patch.sku || !patch.name) return res.status(400).json({ error: 'Cần mã SKU và tên sản phẩm' });
    if (!patch.prices?.LE) return res.status(400).json({ error: 'Cần giá bán lẻ (LE)' });
    if (dbStore.products.some(p => p.sku === patch.sku)) return res.status(409).json({ error: `SKU ${patch.sku} đã tồn tại` });
    const p: ProductRecord = {
      ...patch,
      id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku: patch.sku, name: patch.name,
      category: patch.category || 'Khác',
      unit: patch.unit || 'Cái',
      prices: patch.prices,
      status: (patch.status as ProductRecord['status']) || 'Đang bán',
      createdAt: nowIso(),
    };
    dbStore.products.unshift(p);
    // An initial stock figure becomes an opening lot on the stock card.
    const opening = p.stock || 0;
    p.stock = 0;
    if (opening > 0) receive(dbStore, { productId: p.id, lotNo: 'TON-DAU', qty: opening, type: 'Tồn đầu kỳ', by: actor(req), note: 'Tồn kho khi tạo sản phẩm' });
    res.status(201).json({ success: true, product: p });
  });

  app.put('/api/products/:id', requirePerm('canManageProducts'), (req, res) => {
    const p = dbStore.products.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    const patch = sanitizeProductPatch(req.body);
    if (patch.sku && patch.sku !== p.sku && dbStore.products.some(x => x.sku === patch.sku)) {
      return res.status(409).json({ error: `SKU ${patch.sku} đã tồn tại` });
    }
    if (patch.prices && !patch.prices.LE) return res.status(400).json({ error: 'Cần giá bán lẻ (LE)' });
    delete patch.stock; // stock only changes through warehouse vouchers and orders
    Object.assign(p, patch, { updatedAt: nowIso() });
    res.json({ success: true, product: p });
  });

  app.delete('/api/products/:id', requirePerm('canManageProducts'), (req, res) => {
    const idx = dbStore.products.findIndex(x => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    // Sold, or has warehouse history (lots / stock card): archive, never delete —
    // deleting would orphan its lots and break the stock card and lot trace.
    const id = req.params.id;
    if (dbStore.orders.some(o => o.items.some(i => i.productId === id)) ||
        dbStore.lots.some(l => l.productId === id) || dbStore.stockMoves.some(m => m.productId === id)) {
      dbStore.products[idx].status = 'Ngừng bán';
      return res.json({ success: true, archived: true, product: dbStore.products[idx] });
    }
    dbStore.products.splice(idx, 1);
    res.json({ success: true });
  });

  // ================================================================ orders
  app.get('/api/orders', requirePerm('canViewOrders'), (req, res) => {
    const { status, customerId, type, salesRep, from, to, search, paymentStatus } = req.query as Record<string, string | undefined>;
    let rows = scopeList(req, [...dbStore.orders], o => o.branchId);
    if (isRep(req)) rows = rows.filter(o => o.salesRep === actor(req) || o.createdBy === actor(req));
    if (status) rows = rows.filter(o => o.status === status);
    if (paymentStatus) rows = rows.filter(o => o.paymentStatus === paymentStatus);
    if (customerId) rows = rows.filter(o => o.customerId === customerId);
    if (type === 'B2B' || type === 'B2C') rows = rows.filter(o => o.customerType === type);
    if (salesRep) rows = rows.filter(o => o.salesRep === salesRep);
    if (from) rows = rows.filter(o => o.createdAt.slice(0, 10) >= from);
    if (to) rows = rows.filter(o => o.createdAt.slice(0, 10) <= to);
    if (search) {
      const s = search.toLowerCase().trim();
      rows = rows.filter(o => o.code.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s) || digitsOnly(o.customerPhone).includes(digitsOnly(s) || '§'));
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const p = pageOf(rows, req.query);
    res.json({ orders: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.get('/api/orders/:id', requirePerm('canViewOrders'), (req, res) => {
    const o = dbStore.orders.find(x => x.id === req.params.id || x.code === req.params.id);
    if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (!canAccessBranch(req, o.branchId)) return res.status(403).json({ error: 'Đơn hàng thuộc chi nhánh khác' });
    res.json({ order: o });
  });

  app.post('/api/orders', requirePerm('canManageOrders'), (req, res) => {
    const body = req.body || {};
    const c = dbStore.customers.find(x => x.id === body.customerId);
    if (!c) return res.status(400).json({ error: 'Chưa chọn khách hàng hợp lệ' });
    if (!canAccessBranch(req, c.branchId)) return res.status(403).json({ error: 'Khách hàng thuộc chi nhánh khác' });
    if (c.status === 'Ngừng giao dịch') return res.status(400).json({ error: 'Khách hàng đã ngừng giao dịch' });

    let items;
    try {
      items = buildOrderItems(body.items, dbStore.products, c.priceTier, hasPerm(req.authUser?.role, 'canApproveOrders'));
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
    // Promotion (pre-approved by marketing → excluded from the rep-discount check).
    let promotionCode: string | undefined;
    let promotionDiscount = 0;
    const promoCode = str(body.promotionCode, 50)?.toUpperCase();
    if (promoCode) {
      const promo = dbStore.promotions.find(p => p.code === promoCode);
      if (!promo) return res.status(400).json({ error: `Không có chương trình ${promoCode}` });
      const r = evaluatePromotion(promo, { customer: c, items, products: dbStore.products, orders: dbStore.orders, today: localYmd() });
      if ('reason' in r) return res.status(400).json({ error: `CTKM ${promoCode}: ${r.reason}` });
      promotionCode = promo.code;
      promotionDiscount = r.discount;
      items = [...items, ...r.giftItems];
    }
    // Enough non-expired stock for every line (gifts included)? Checked even for
    // orders that will wait for approval, so nobody approves an order we can't ship.
    const shortage = checkOrderStock(dbStore, { items });
    if (shortage) return res.status(400).json({ error: shortage });
    const manualDiscount = num(body.discountAmount) || 0;
    const totals = orderTotals(items, manualDiscount + promotionDiscount, num(body.shippingFee) || 0);
    const upfront = Math.min(totals.total, Math.max(0, num(body.payment?.amount) || 0));
    const reasons = approvalReasons(c, c.outstandingDebt || 0, {
      items, ...totals, paidAmount: upfront,
      discountAmount: Math.max(0, totals.discountAmount - promotionDiscount),
    });
    const createdAt = nowIso();
    const o: OrderRecord = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: orderCode(),
      customerId: c.id, customerName: c.name, customerPhone: c.phone, customerType: c.type,
      branchId: c.branchId,
      channel: str(body.channel) || (c.type === 'B2B' ? 'Sales thị trường' : 'Zalo'),
      salesRep: str(body.salesRep) || c.assignedRep || actor(req),
      priceTier: c.priceTier,
      items,
      ...totals,
      promotionCode,
      promotionDiscount: promotionDiscount || undefined,
      paidAmount: upfront,
      paymentStatus: paymentStatusOf(totals.total, upfront),
      payments: upfront > 0 ? [{ id: `pay-${Date.now()}`, amount: upfront, method: str(body.payment?.method) || 'Tiền mặt', reference: str(body.payment?.reference), at: createdAt, by: actor(req) }] : [],
      status: reasons.length ? 'Chờ duyệt' : 'Đã xác nhận',
      approvalReasons: reasons.length ? reasons : undefined,
      dueDate: c.type === 'B2B' && c.paymentTermDays ? addDays(createdAt.slice(0, 10), c.paymentTermDays) : createdAt.slice(0, 10),
      deliveryAddress: str(body.deliveryAddress) || c.address,
      expectedDeliveryDate: str(body.expectedDeliveryDate, 10),
      visitId: str(body.visitId, 80),
      notes: str(body.notes, 2000),
      createdBy: actor(req),
      createdAt,
    };
    if (o.status === 'Đã xác nhận') commitOrderStock(dbStore, o, actor(req));
    dbStore.orders.unshift(o);
    if (o.visitId) {
      const v = dbStore.visits.find(x => x.id === o.visitId);
      if (v) v.orderId = o.id;
    }
    recomputeCustomer(c.id);
    res.status(201).json({ success: true, order: o, needsApproval: reasons.length > 0 });
  });

  app.post('/api/orders/:id/approve', requirePerm('canApproveOrders'), (req, res) => {
    const o = dbStore.orders.find(x => x.id === req.params.id);
    if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (!canAccessBranch(req, o.branchId)) return res.status(403).json({ error: 'Đơn hàng thuộc chi nhánh khác' });
    if (o.status !== 'Chờ duyệt') return res.status(400).json({ error: `Đơn đang ở trạng thái "${o.status}"` });
    try {
      commitOrderStock(dbStore, o, actor(req));
    } catch (e: any) {
      if (e instanceof StockError) return res.status(400).json({ error: e.message });
      throw e;
    }
    o.status = 'Đã xác nhận';
    o.approvedBy = actor(req);
    o.approvedAt = nowIso();
    o.updatedAt = o.approvedAt;
    recomputeCustomer(o.customerId);
    res.json({ success: true, order: o });
  });

  app.post('/api/orders/:id/status', (req, res) => {
    const o = dbStore.orders.find(x => x.id === req.params.id);
    if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (!canAccessBranch(req, o.branchId)) return res.status(403).json({ error: 'Đơn hàng thuộc chi nhánh khác' });
    const to = req.body?.status as OrderStatus;
    const needed = TRANSITIONS[o.status]?.[to];
    if (!needed) return res.status(400).json({ error: `Không thể chuyển "${o.status}" → "${to}"` });
    if (!hasPerm(req.authUser?.role, needed)) return res.status(403).json({ error: 'Vai trò của bạn không được phép thực hiện thao tác này' });
    const wasCommitted = isRevenueOrder(o);
    o.status = to;
    o.updatedAt = nowIso();
    if (to === 'Đã giao') o.deliveredAt = o.updatedAt;
    if (to === 'Đã huỷ' || to === 'Trả hàng') {
      o.cancelledReason = str(req.body?.reason, 500);
      if (wasCommitted) releaseOrderStock(dbStore, o, to === 'Trả hàng' ? 'Nhập trả hàng' : 'Hoàn kho huỷ đơn', actor(req));
      // Returned goods: take back any loyalty points the order earned.
      if (o.pointsEarned) {
        const c = dbStore.customers.find(x => x.id === o.customerId);
        if (c) {
          c.loyaltyPoints = Math.max(0, (c.loyaltyPoints || 0) - o.pointsEarned);
          c.lifetimePoints = Math.max(0, (c.lifetimePoints || 0) - o.pointsEarned);
        }
        o.pointsEarned = 0;
      }
    }
    creditPoints(o);
    recomputeCustomer(o.customerId);
    res.json({ success: true, order: o });
  });

  app.post('/api/orders/:id/payments', requirePerm('canManageOrders'), (req, res) => {
    const o = dbStore.orders.find(x => x.id === req.params.id);
    if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (!canAccessBranch(req, o.branchId)) return res.status(403).json({ error: 'Đơn hàng thuộc chi nhánh khác' });
    const amount = Math.round(Number(req.body?.amount));
    const balance = o.total - o.paidAmount;
    // Manual entry: refuse an overpayment outright (likely a typo) rather than capping it.
    if (Number.isFinite(amount) && amount > balance + 0.5) return res.status(400).json({ error: `Số tiền vượt quá công nợ còn lại (${balance.toLocaleString('vi-VN')}đ)` });
    const r = recordOrderPayment(o, amount, str(req.body?.method) || 'Chuyển khoản', str(req.body?.reference), actor(req));
    if ('error' in r) return res.status(400).json({ error: r.error });
    res.json({ success: true, order: o });
  });

  app.get('/api/receivables', requirePerm('canViewReceivables'), (req, res) => {
    let orders = scopeList(req, dbStore.orders, o => o.branchId);
    if (isRep(req)) orders = orders.filter(o => o.salesRep === actor(req));
    const rows = receivables(orders);
    const byCustomer = new Map<string, { customerId: string; customerName: string; balance: number; overdue: number; maxDaysOverdue: number; creditLimit: number }>();
    for (const r of rows) {
      const c = dbStore.customers.find(x => x.id === r.customerId);
      const a = byCustomer.get(r.customerId) || { customerId: r.customerId, customerName: r.customerName, balance: 0, overdue: 0, maxDaysOverdue: 0, creditLimit: c?.creditLimit || 0 };
      a.balance += r.balance;
      if (r.daysOverdue > 0) a.overdue += r.balance;
      a.maxDaysOverdue = Math.max(a.maxDaysOverdue, r.daysOverdue);
      byCustomer.set(r.customerId, a);
    }
    res.json({
      rows,
      byCustomer: [...byCustomer.values()].sort((a, b) => b.overdue - a.overdue || b.balance - a.balance),
      total: rows.reduce((s, r) => s + r.balance, 0),
      overdue: rows.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.balance, 0),
    });
  });

  // ================================================================ visits
  app.get('/api/visits', requirePerm('canViewSales'), (req, res) => {
    const { date, from, to, salesRep, status, customerId } = req.query as Record<string, string | undefined>;
    let rows = scopeList(req, [...dbStore.visits], v => v.branchId);
    if (isRep(req)) rows = rows.filter(v => v.salesRep === actor(req));
    if (date) rows = rows.filter(v => v.plannedDate === date);
    if (from) rows = rows.filter(v => v.plannedDate >= from);
    if (to) rows = rows.filter(v => v.plannedDate <= to);
    if (salesRep) rows = rows.filter(v => v.salesRep === salesRep);
    if (status) rows = rows.filter(v => v.status === status);
    if (customerId) rows = rows.filter(v => v.customerId === customerId);
    rows.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.customerName.localeCompare(b.customerName));
    const p = pageOf(rows, req.query);
    res.json({ visits: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.post('/api/visits', requirePerm('canManageVisits'), (req, res) => {
    const body = req.body || {};
    const ids: string[] = Array.isArray(body.customerIds) ? body.customerIds : [body.customerId];
    const plannedDate = str(body.plannedDate, 10) || ymd(new Date());
    const rep = isRep(req) ? actor(req) : (str(body.salesRep) || actor(req));
    const created: VisitRecord[] = [];
    for (const id of ids) {
      const c = dbStore.customers.find(x => x.id === id);
      if (!c || !canAccessBranch(req, c.branchId)) continue;
      if (dbStore.visits.some(v => v.customerId === c.id && v.plannedDate === plannedDate && v.salesRep === rep && v.status !== 'Bỏ lỡ')) continue;
      const v: VisitRecord = {
        id: `vis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerId: c.id, customerName: c.name, customerAddress: c.address,
        salesRep: rep, branchId: c.branchId, plannedDate,
        purpose: str(body.purpose) || 'Lấy đơn',
        status: 'Kế hoạch',
        notes: str(body.notes, 1000),
        createdAt: nowIso(),
      };
      dbStore.visits.push(v);
      created.push(v);
    }
    if (!created.length) return res.status(400).json({ error: 'Không tạo được lịch viếng thăm (khách không hợp lệ hoặc đã có lịch trong ngày)' });
    res.status(201).json({ success: true, visits: created });
  });

  const findVisit = (req: Request) => {
    const v = dbStore.visits.find(x => x.id === req.params.id);
    if (!v) return { error: [404, 'Không tìm thấy lịch viếng thăm'] as const };
    if (!canAccessBranch(req, v.branchId)) return { error: [403, 'Lịch thuộc chi nhánh khác'] as const };
    if (isRep(req) && v.salesRep !== actor(req)) return { error: [403, 'Đây không phải lịch của bạn'] as const };
    return { v };
  };

  app.post('/api/visits/:id/check-in', requirePerm('canManageVisits'), (req, res) => {
    const { v, error } = findVisit(req);
    if (error) return res.status(error[0]).json({ error: error[1] });
    if (v!.status !== 'Kế hoạch') return res.status(400).json({ error: `Lịch đang ở trạng thái "${v!.status}"` });
    const loc = req.body?.location;
    v!.checkInAt = nowIso();
    v!.status = 'Đã check-in';
    if (loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng))) {
      v!.checkInLocation = { lat: Number(loc.lat), lng: Number(loc.lng), accuracy: num(loc.accuracy) };
      const c = dbStore.customers.find(x => x.id === v!.customerId);
      if (c?.location) {
        v!.distanceMeters = distanceMeters(c.location, v!.checkInLocation);
        v!.locationFlag = v!.distanceMeters > CHECKIN_MAX_DISTANCE_M;
      } else if (c && req.body?.saveAsOutletLocation) {
        c.location = { lat: v!.checkInLocation.lat, lng: v!.checkInLocation.lng };
      }
    }
    res.json({ success: true, visit: v });
  });

  app.post('/api/visits/:id/check-out', requirePerm('canManageVisits'), (req, res) => {
    const { v, error } = findVisit(req);
    if (error) return res.status(error[0]).json({ error: error[1] });
    if (v!.status !== 'Đã check-in') return res.status(400).json({ error: 'Cần check-in trước khi kết thúc viếng thăm' });
    const b = req.body || {};
    v!.status = 'Hoàn thành';
    v!.checkOutAt = nowIso();
    v!.outcome = str(b.outcome, 200);
    v!.notes = str(b.notes, 2000) ?? v!.notes;
    if (b.orderId && dbStore.orders.some(o => o.id === b.orderId)) v!.orderId = b.orderId;
    // Cash collected on the visit is netted against the outlet's oldest open orders.
    const collected = Math.max(0, Math.round(num(b.collectedAmount) || 0));
    let collection: ReturnType<typeof allocateCollection> | undefined;
    if (collected > 0) {
      collection = allocateCollection(v!.customerId, collected, str(b.collectionMethod) || 'Tiền mặt', `Viếng thăm ${v!.id}`, actor(req));
      v!.collectedAmount = collected - collection.unallocated || undefined;
      if (collection.unallocated > 0) {
        v!.notes = [v!.notes, `Thu thừa ${collection.unallocated.toLocaleString('vi-VN')}đ so với công nợ — chưa ghi nhận.`].filter(Boolean).join('\n');
      }
    }
    if (Array.isArray(b.stockCheck)) {
      v!.stockCheck = b.stockCheck
        .filter((s: any) => s && s.productId && Number.isFinite(Number(s.quantity)))
        .map((s: any) => ({ productId: String(s.productId), quantity: Number(s.quantity) }));
    }
    if (Array.isArray(b.photoFileIds)) v!.photoFileIds = b.photoFileIds.map(String).slice(0, 10);
    res.json({ success: true, visit: v, collection });
  });

  app.put('/api/visits/:id', requirePerm('canManageVisits'), (req, res) => {
    const { v, error } = findVisit(req);
    if (error) return res.status(error[0]).json({ error: error[1] });
    const b = req.body || {};
    if (b.plannedDate && v!.status === 'Kế hoạch') v!.plannedDate = String(b.plannedDate).slice(0, 10);
    if (b.purpose) v!.purpose = str(b.purpose)!;
    if (b.notes !== undefined) v!.notes = str(b.notes, 2000);
    if (b.status === 'Bỏ lỡ' && v!.status === 'Kế hoạch') v!.status = 'Bỏ lỡ';
    if (b.salesRep && !isRep(req)) v!.salesRep = str(b.salesRep)!;
    res.json({ success: true, visit: v });
  });

  // ================================================================ analytics
  app.get('/api/commerce/dashboard', (req, res) => {
    const today = ymd(new Date());
    const from = String(req.query.from || addDays(today, -29)).slice(0, 10);
    const to = String(req.query.to || today).slice(0, 10);
    let orders = scopeList(req, dbStore.orders, o => o.branchId);
    const seesAll = hasPerm(req.authUser?.role, 'canViewFinancialBI');
    if (!seesAll) orders = orders.filter(o => o.salesRep === actor(req) || o.createdBy === actor(req));
    const customers = scopeList(req, dbStore.customers, c => c.branchId);
    const sellable = (p: ProductRecord) => (dbStore.lots.some(l => l.productId === p.id) ? sellableQty(dbStore, p.id) : p.stock);
    res.json({ ...commerceDashboard(customers, orders, dbStore.products, from, to, new Date(), sellable), scope: seesAll ? 'company' : 'mine' });
  });

  app.get('/api/commerce/kpi', requirePerm('canViewSales'), (req, res) => {
    const month = String(req.query.month || ymd(new Date()).slice(0, 7)).slice(0, 7);
    const targets = (dbStore.collections.salesTargets || []) as SalesTarget[];
    let rows = repKpis(month, scopeList(req, dbStore.orders, o => o.branchId), scopeList(req, dbStore.visits, v => v.branchId), dbStore.customers, targets);
    if (isRep(req)) rows = rows.filter(r => r.salesRep === actor(req));
    res.json({ month, rows });
  });

  app.get('/api/commerce/repurchase-due', requirePerm('canViewCustomers'), (req, res) => {
    const ahead = Math.min(60, Math.max(0, Number(req.query.aheadDays) || 7));
    const rows = repurchaseDue(scopeList(req, dbStore.customers, c => c.branchId), dbStore.orders, dbStore.products, new Date(), ahead);
    res.json({ rows, total: rows.length });
  });

  app.get('/api/commerce/inactive-accounts', requirePerm('canViewSales'), (req, res) => {
    let rows = inactiveAccounts(scopeList(req, dbStore.customers, c => c.branchId));
    if (isRep(req)) rows = rows.filter(r => r.customer.assignedRep === actor(req));
    res.json({ rows: rows.map(r => ({ ...r.customer, daysSinceLastOrder: r.daysSinceLastOrder, limitDays: r.limit })), total: rows.length });
  });
}
