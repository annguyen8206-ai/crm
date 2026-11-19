/**
 * Pure business rules for the FMCG CRM — no I/O, no store access. Route
 * handlers pass data in; everything here is deterministic given `now`.
 */
import type {
  CustomerRecord, ProductRecord, OrderRecord, OrderItem, PriceTier, LoyaltyTier,
  VisitRecord, SalesTarget, GeoPoint,
} from './commerce-types';

const DAY_MS = 86_400_000;

export const round = (n: number) => Math.round(n);
export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (isoDate: string, days: number) => ymd(new Date(new Date(isoDate).getTime() + days * DAY_MS));
export const daysBetween = (fromIso: string, to: Date) =>
  Math.floor((to.getTime() - new Date(fromIso.slice(0, 10)).getTime()) / DAY_MS);

/** Orders that count as real sales (revenue, debt, history). */
export function isRevenueOrder(o: OrderRecord): boolean {
  return o.status === 'Đã xác nhận' || o.status === 'Đang giao' || o.status === 'Đã giao';
}

// ---------------------------------------------------------------- pricing

/** Unit price of a product for a price tier; falls back to retail. */
export function priceFor(product: ProductRecord, tier: PriceTier): number {
  const p = product.prices?.[tier];
  if (typeof p === 'number' && p > 0) return p;
  return product.prices?.LE ?? 0;
}

export interface OrderLineInput { productId: string; quantity: number; discountPercent?: number; unitPrice?: number }

/**
 * Build priced order lines. `allowPriceOverride` lets an approver type a custom
 * unit price; otherwise the price list wins. Throws on unknown / inactive SKUs
 * or non-positive quantities.
 */
export function buildOrderItems(
  lines: OrderLineInput[],
  products: ProductRecord[],
  tier: PriceTier,
  allowPriceOverride = false,
): OrderItem[] {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Đơn hàng phải có ít nhất 1 sản phẩm');
  const byId = new Map(products.map(p => [p.id, p]));
  return lines.map(l => {
    const p = byId.get(l.productId);
    if (!p) throw new Error(`Không tìm thấy sản phẩm ${l.productId}`);
    if (p.status === 'Ngừng bán') throw new Error(`Sản phẩm ${p.sku} đã ngừng bán`);
    const quantity = Number(l.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Số lượng không hợp lệ cho ${p.sku}`);
    const discountPercent = Math.min(100, Math.max(0, Number(l.discountPercent) || 0));
    const listPrice = priceFor(p, tier);
    const unitPrice = allowPriceOverride && Number(l.unitPrice) > 0 ? Number(l.unitPrice) : listPrice;
    return {
      productId: p.id, sku: p.sku, name: p.name, unit: p.unit,
      quantity, unitPrice, discountPercent,
      lineTotal: round(quantity * unitPrice * (1 - discountPercent / 100)),
    };
  });
}

export function orderTotals(items: OrderItem[], discountAmount = 0, shippingFee = 0) {
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const discount = Math.min(subtotal, Math.max(0, round(discountAmount)));
  const shipping = Math.max(0, round(shippingFee));
  return { subtotal, discountAmount: discount, shippingFee: shipping, total: subtotal - discount + shipping };
}

export function paymentStatusOf(total: number, paid: number): OrderRecord['paymentStatus'] {
  if (paid <= 0) return 'Chưa thanh toán';
  if (paid + 0.5 >= total) return 'Đã thanh toán';
  return 'Thanh toán một phần';
}

// ---------------------------------------------------------------- approval / credit

/** Max discount (% of subtotal, or any single line) a rep can give without approval. */
export const DISCOUNT_APPROVAL_THRESHOLD = Number(process.env.DISCOUNT_APPROVAL_PERCENT || 10);

/**
 * Reasons an order must wait for a manager. Empty array → auto-confirm.
 * `currentDebt` is the customer's open receivable BEFORE this order.
 */
export function approvalReasons(
  customer: Pick<CustomerRecord, 'type' | 'creditLimit'>,
  currentDebt: number,
  order: { items: OrderItem[]; subtotal: number; discountAmount: number; total: number; paidAmount: number },
): string[] {
  const reasons: string[] = [];
  const unpaid = Math.max(0, order.total - order.paidAmount);
  if (customer.type === 'B2B' && (customer.creditLimit || 0) > 0 && unpaid > 0 && currentDebt + unpaid > (customer.creditLimit || 0)) {
    reasons.push(`Vượt hạn mức công nợ: ${fmt(currentDebt + unpaid)} / ${fmt(customer.creditLimit || 0)}`);
  }
  const maxLine = Math.max(0, ...order.items.filter(i => !i.isGift).map(i => i.discountPercent));
  if (maxLine > DISCOUNT_APPROVAL_THRESHOLD) reasons.push(`Chiết khấu dòng ${maxLine}% > ${DISCOUNT_APPROVAL_THRESHOLD}%`);
  if (order.subtotal > 0 && (order.discountAmount / order.subtotal) * 100 > DISCOUNT_APPROVAL_THRESHOLD) {
    reasons.push(`Chiết khấu đơn ${((order.discountAmount / order.subtotal) * 100).toFixed(1)}% > ${DISCOUNT_APPROVAL_THRESHOLD}%`);
  }
  return reasons;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

// ---------------------------------------------------------------- receivables

export interface CustomerStats {
  totalOrders: number;
  totalRevenue: number;
  outstandingDebt: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
}

export function customerStats(customerId: string, orders: OrderRecord[]): CustomerStats {
  const mine = orders.filter(o => o.customerId === customerId && isRevenueOrder(o));
  const dates = mine.map(o => o.createdAt.slice(0, 10)).sort();
  return {
    totalOrders: mine.length,
    totalRevenue: mine.reduce((s, o) => s + o.total, 0),
    outstandingDebt: mine.reduce((s, o) => s + Math.max(0, o.total - o.paidAmount), 0),
    firstOrderDate: dates[0],
    lastOrderDate: dates[dates.length - 1],
  };
}

export type AgingBucket = 'Trong hạn' | '1-30 ngày' | '31-60 ngày' | '61-90 ngày' | '>90 ngày';
export const AGING_BUCKETS: AgingBucket[] = ['Trong hạn', '1-30 ngày', '31-60 ngày', '61-90 ngày', '>90 ngày'];

export function agingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'Trong hạn';
  if (daysOverdue <= 30) return '1-30 ngày';
  if (daysOverdue <= 60) return '31-60 ngày';
  if (daysOverdue <= 90) return '61-90 ngày';
  return '>90 ngày';
}

export interface ReceivableRow {
  orderId: string; orderCode: string; customerId: string; customerName: string;
  salesRep?: string; total: number; paid: number; balance: number;
  dueDate: string; daysOverdue: number; bucket: AgingBucket;
}

/** Open receivables per order, with aging. Orders with no dueDate are due on creation. */
export function receivables(orders: OrderRecord[], now = new Date()): ReceivableRow[] {
  return orders
    .filter(o => isRevenueOrder(o) && o.total - o.paidAmount > 0.5)
    .map(o => {
      const dueDate = o.dueDate || o.createdAt.slice(0, 10);
      const daysOverdue = daysBetween(dueDate, now);
      return {
        orderId: o.id, orderCode: o.code, customerId: o.customerId, customerName: o.customerName,
        salesRep: o.salesRep, total: o.total, paid: o.paidAmount, balance: o.total - o.paidAmount,
        dueDate, daysOverdue, bucket: agingBucket(daysOverdue),
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// ---------------------------------------------------------------- loyalty (B2C)

/** VND spent per loyalty point. */
export const VND_PER_POINT = Number(process.env.LOYALTY_VND_PER_POINT || 10_000);

export const LOYALTY_TIERS: Array<{ tier: LoyaltyTier; minLifetimePoints: number }> = [
  { tier: 'Kim cương', minLifetimePoints: 2000 },
  { tier: 'Vàng', minLifetimePoints: 800 },
  { tier: 'Bạc', minLifetimePoints: 200 },
  { tier: 'Thành viên', minLifetimePoints: 0 },
];

export function pointsForAmount(amount: number): number {
  return Math.max(0, Math.floor(amount / VND_PER_POINT));
}

export function tierForPoints(lifetimePoints: number): LoyaltyTier {
  return (LOYALTY_TIERS.find(t => lifetimePoints >= t.minLifetimePoints) || LOYALTY_TIERS[LOYALTY_TIERS.length - 1]).tier;
}

/** Points to credit for an order right now (B2C, delivered, fully paid, not yet credited). */
export function pointsToCredit(order: OrderRecord): number {
  if (order.customerType !== 'B2C') return 0;
  if (order.pointsEarned) return 0;
  if (order.status !== 'Đã giao' || order.paymentStatus !== 'Đã thanh toán') return 0;
  return pointsForAmount(order.total);
}

// ---------------------------------------------------------------- RFM segmentation

export type RfmSegment =
  | 'Khách VIP'
  | 'Trung thành'
  | 'Tiềm năng'
  | 'Khách mới'
  | 'Cần chăm sóc'
  | 'Có nguy cơ rời bỏ'
  | 'Ngủ đông'
  | 'Chưa mua hàng';

export interface RfmRow {
  customerId: string; name: string; type: CustomerRecord['type'];
  recencyDays: number | null; frequency: number; monetary: number;
  r: number; f: number; m: number; segment: RfmSegment;
}

function recencyScore(days: number): number {
  if (days <= 30) return 5;
  if (days <= 60) return 4;
  if (days <= 90) return 3;
  if (days <= 180) return 2;
  return 1;
}
function frequencyScore(n: number): number {
  if (n >= 12) return 5;
  if (n >= 6) return 4;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

/** Monetary score by quintile within the same customer type (B2B and B2C scale very differently). */
function quintileScorer(values: number[]): (v: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return () => 1;
  const cut = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const c = [cut(0.2), cut(0.4), cut(0.6), cut(0.8)];
  return (v: number) => 1 + c.filter(x => v > x).length;
}

export function segmentOf(r: number, f: number, m: number): RfmSegment {
  if (r >= 4 && f >= 4 && m >= 4) return 'Khách VIP';
  if (r >= 3 && f >= 3) return 'Trung thành';
  if (r >= 4 && f === 1) return 'Khách mới';
  if (r >= 3 && f <= 2) return 'Tiềm năng';
  if (r === 2 && f >= 3) return 'Có nguy cơ rời bỏ';
  if (r <= 2 && (f >= 2 || m >= 4)) return r === 1 ? 'Có nguy cơ rời bỏ' : 'Cần chăm sóc';
  return 'Ngủ đông';
}

/** RFM over the trailing `windowDays` (default 365). */
export function computeRfm(customers: CustomerRecord[], orders: OrderRecord[], now = new Date(), windowDays = 365): RfmRow[] {
  const since = now.getTime() - windowDays * DAY_MS;
  const agg = new Map<string, { last: number; n: number; sum: number }>();
  for (const o of orders) {
    if (!isRevenueOrder(o)) continue;
    const t = new Date(o.createdAt).getTime();
    const a = agg.get(o.customerId) || { last: 0, n: 0, sum: 0 };
    a.last = Math.max(a.last, t);
    if (t >= since) { a.n += 1; a.sum += o.total; }
    agg.set(o.customerId, a);
  }
  const scorers: Record<string, (v: number) => number> = {};
  for (const type of ['B2B', 'B2C']) {
    scorers[type] = quintileScorer(customers.filter(c => c.type === type && agg.get(c.id)?.n).map(c => agg.get(c.id)!.sum));
  }
  return customers.map(c => {
    const a = agg.get(c.id);
    if (!a || a.last === 0) {
      return { customerId: c.id, name: c.name, type: c.type, recencyDays: null, frequency: 0, monetary: 0, r: 0, f: 0, m: 0, segment: 'Chưa mua hàng' as RfmSegment };
    }
    const recencyDays = Math.floor((now.getTime() - a.last) / DAY_MS);
    const r = recencyScore(recencyDays);
    const f = frequencyScore(a.n);
    const m = a.n ? scorers[c.type](a.sum) : 1;
    return { customerId: c.id, name: c.name, type: c.type, recencyDays, frequency: a.n, monetary: a.sum, r, f, m, segment: segmentOf(r, f, m) };
  });
}

// ---------------------------------------------------------------- repurchase reminders

export interface RepurchaseDue {
  customerId: string; customerName: string; customerPhone: string;
  productId: string; sku: string; productName: string;
  lastPurchaseDate: string; cycleDays: number; dueDate: string; daysUntilDue: number;
}

/**
 * Consumers whose last purchase of a product with a known consumption cycle is
 * due within `aheadDays` (or overdue by up to `maxOverdueDays`). A later
 * purchase of the same product resets the clock.
 */
export function repurchaseDue(
  customers: CustomerRecord[], orders: OrderRecord[], products: ProductRecord[],
  now = new Date(), aheadDays = 7, maxOverdueDays = 60,
): RepurchaseDue[] {
  const cycle = new Map(products.filter(p => (p.repurchaseCycleDays || 0) > 0).map(p => [p.id, p]));
  const b2c = new Map(customers.filter(c => c.type === 'B2C' && c.status !== 'Ngừng giao dịch').map(c => [c.id, c]));
  const last = new Map<string, { date: string; qty: number }>(); // customerId|productId
  for (const o of orders) {
    if (!isRevenueOrder(o) || !b2c.has(o.customerId)) continue;
    const date = o.createdAt.slice(0, 10);
    for (const it of o.items) {
      if (!cycle.has(it.productId)) continue;
      const key = `${o.customerId}|${it.productId}`;
      const prev = last.get(key);
      if (!prev || date > prev.date) last.set(key, { date, qty: it.quantity });
    }
  }
  const out: RepurchaseDue[] = [];
  for (const [key, { date, qty }] of last) {
    const [customerId, productId] = key.split('|');
    const p = cycle.get(productId)!;
    const c = b2c.get(customerId)!;
    // Buying several units stretches the cycle (capped at 3x so bulk buys still get a nudge).
    const cycleDays = p.repurchaseCycleDays! * Math.min(3, Math.max(1, qty));
    const dueDate = addDays(date, cycleDays);
    const daysUntilDue = -daysBetween(dueDate, now);
    if (daysUntilDue <= aheadDays && daysUntilDue >= -maxOverdueDays) {
      out.push({
        customerId, customerName: c.name, customerPhone: c.phone,
        productId, sku: p.sku, productName: p.name,
        lastPurchaseDate: date, cycleDays, dueDate, daysUntilDue,
      });
    }
  }
  return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/** B2B outlets with no order for longer than their visit frequency allows. */
export function inactiveAccounts(customers: CustomerRecord[], now = new Date()) {
  const limit = (c: CustomerRecord) => (c.visitFrequency === 'Hàng tuần' ? 14 : c.visitFrequency === '2 tuần/lần' ? 28 : 45);
  return customers
    .filter(c => c.type === 'B2B' && c.status === 'Đang hoạt động')
    .map(c => ({ customer: c, daysSinceLastOrder: c.lastOrderDate ? daysBetween(c.lastOrderDate, now) : null, limit: limit(c) }))
    .filter(x => x.daysSinceLastOrder === null || x.daysSinceLastOrder > x.limit)
    .sort((a, b) => (b.daysSinceLastOrder ?? 9999) - (a.daysSinceLastOrder ?? 9999));
}

// ---------------------------------------------------------------- field sales

/** Haversine distance in metres. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export const CHECKIN_MAX_DISTANCE_M = Number(process.env.CHECKIN_MAX_DISTANCE_M || 300);

export interface RepKpi {
  salesRep: string;
  revenue: number; orders: number; newCustomers: number;
  visitsPlanned: number; visitsDone: number; visitsWithOrder: number;
  strikeRate: number;        // % of completed visits that produced an order
  revenueTarget: number; achievement: number | null; // % of target
  visitTarget: number;
}

/** Per-rep KPIs for a month (YYYY-MM). */
export function repKpis(
  month: string, orders: OrderRecord[], visits: VisitRecord[], customers: CustomerRecord[], targets: SalesTarget[],
): RepKpi[] {
  const reps = new Set<string>();
  const inMonth = (iso?: string) => !!iso && iso.slice(0, 7) === month;
  const mOrders = orders.filter(o => isRevenueOrder(o) && inMonth(o.createdAt) && o.salesRep);
  const mVisits = visits.filter(v => inMonth(v.plannedDate));
  mOrders.forEach(o => reps.add(o.salesRep!));
  mVisits.forEach(v => reps.add(v.salesRep));
  targets.filter(t => t.month === month).forEach(t => reps.add(t.salesRep));
  return [...reps].sort().map(rep => {
    const o = mOrders.filter(x => x.salesRep === rep);
    const v = mVisits.filter(x => x.salesRep === rep);
    const done = v.filter(x => x.status === 'Hoàn thành');
    const withOrder = done.filter(x => x.orderId);
    const t = targets.find(x => x.month === month && x.salesRep === rep);
    const revenue = o.reduce((s, x) => s + x.total, 0);
    return {
      salesRep: rep,
      revenue,
      orders: o.length,
      newCustomers: customers.filter(c => c.assignedRep === rep && inMonth(c.firstOrderDate)).length,
      visitsPlanned: v.length,
      visitsDone: done.length,
      visitsWithOrder: withOrder.length,
      strikeRate: done.length ? Math.round((withOrder.length / done.length) * 100) : 0,
      revenueTarget: t?.revenueTarget || 0,
      achievement: t?.revenueTarget ? Math.round((revenue / t.revenueTarget) * 100) : null,
      visitTarget: t?.visitTarget || 0,
    };
  });
}

// ---------------------------------------------------------------- dashboard

export function commerceDashboard(
  customers: CustomerRecord[], orders: OrderRecord[], products: ProductRecord[], from: string, to: string, now = new Date(),
  /** Quantity that can still be sold (excludes expired lots). Defaults to product.stock. */
  sellableOf: (p: ProductRecord) => number | undefined = p => p.stock,
) {
  const inRange = (o: OrderRecord) => { const d = o.createdAt.slice(0, 10); return d >= from && d <= to; };
  const rangeOrders = orders.filter(inRange);
  const sold = rangeOrders.filter(isRevenueOrder);
  const revenue = sold.reduce((s, o) => s + o.total, 0);
  const byType = { B2B: 0, B2C: 0 } as Record<'B2B' | 'B2C', number>;
  sold.forEach(o => { byType[o.customerType] += o.total; });

  const daily = new Map<string, { date: string; B2B: number; B2C: number }>();
  for (let d = from; d <= to; d = addDays(d, 1)) daily.set(d, { date: d, B2B: 0, B2C: 0 });
  sold.forEach(o => { const row = daily.get(o.createdAt.slice(0, 10)); if (row) row[o.customerType] += o.total; });

  const prodAgg = new Map<string, { productId: string; name: string; sku: string; quantity: number; revenue: number }>();
  sold.forEach(o => o.items.forEach(i => {
    const a = prodAgg.get(i.productId) || { productId: i.productId, name: i.name, sku: i.sku, quantity: 0, revenue: 0 };
    a.quantity += i.quantity; a.revenue += i.lineTotal; prodAgg.set(i.productId, a);
  }));
  const custAgg = new Map<string, { customerId: string; name: string; type: string; revenue: number; orders: number }>();
  sold.forEach(o => {
    const a = custAgg.get(o.customerId) || { customerId: o.customerId, name: o.customerName, type: o.customerType, revenue: 0, orders: 0 };
    a.revenue += o.total; a.orders += 1; custAgg.set(o.customerId, a);
  });

  const statusCounts: Record<string, number> = {};
  rangeOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  const rec = receivables(orders, now);
  const aging: Record<string, number> = Object.fromEntries(AGING_BUCKETS.map(b => [b, 0]));
  rec.forEach(r => { aging[r.bucket] += r.balance; });

  return {
    range: { from, to },
    revenue,
    revenueByType: byType,
    orderCount: sold.length,
    avgOrderValue: sold.length ? Math.round(revenue / sold.length) : 0,
    pendingApproval: orders.filter(o => o.status === 'Chờ duyệt').length,
    newCustomers: customers.filter(c => c.createdAt.slice(0, 10) >= from && c.createdAt.slice(0, 10) <= to).length,
    activeCustomers: new Set(sold.map(o => o.customerId)).size,
    customerCounts: {
      B2B: customers.filter(c => c.type === 'B2B').length,
      B2C: customers.filter(c => c.type === 'B2C').length,
    },
    daily: [...daily.values()],
    topProducts: [...prodAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    topCustomers: [...custAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    statusCounts,
    receivableTotal: rec.reduce((s, r) => s + r.balance, 0),
    overdueTotal: rec.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.balance, 0),
    aging,
    lowStock: products.filter(p => p.status === 'Đang bán')
      .map(p => ({ id: p.id, sku: p.sku, name: p.name, stock: sellableOf(p) }))
      .filter((p): p is { id: string; sku: string; name: string; stock: number } => typeof p.stock === 'number' && p.stock <= 10),
  };
}
