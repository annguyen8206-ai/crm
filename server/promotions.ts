/**
 * Trade / consumer promotions (chương trình khuyến mãi — CTKM).
 *
 *   percent  value% off the eligible lines (optionally capped by maxDiscount)
 *   amount   value VND off the order (never more than the eligible subtotal)
 *   gift     every buyQty of buyProductId earns giftQty of giftProductId free
 *
 * Usage is derived from the orders that carry the code (cancelled / returned
 * orders give their use back), so there is no counter to drift out of sync.
 * Pure functions — the routes in server/routes/promotions.ts own the state.
 */
import type { B2BChannel, CustomerRecord, OrderItem, OrderRecord, ProductRecord } from './commerce-types';
import { priceFor, round } from './commerce';

export type PromotionType = 'percent' | 'amount' | 'gift';

export interface PromotionRecord {
  id: string;
  code: string;                 // what reps pick / customers quote, e.g. "TET2027"
  name: string;
  description?: string;
  type: PromotionType;
  value?: number;               // percent (0-100) or VND amount
  maxDiscount?: number;         // percent type: cap in VND
  minOrderValue?: number;       // on the eligible subtotal
  productIds?: string[];        // percent/amount: eligible products (empty = all)
  buyProductId?: string;        // gift type
  buyQty?: number;
  giftProductId?: string;
  giftQty?: number;
  customerType: 'ALL' | 'B2B' | 'B2C';
  channels?: B2BChannel[];      // B2B only: restrict to these channels (empty = all)
  startDate: string;            // YYYY-MM-DD inclusive
  endDate: string;              // YYYY-MM-DD inclusive
  active: boolean;
  usageLimit?: number;          // total orders
  perCustomerLimit?: number;    // orders per customer
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}

export type PromotionResult =
  | { ok: true; discount: number; giftItems: OrderItem[]; summary: string }
  | { ok: false; reason: string };

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/** Server-local calendar date (promotion windows are local days, not UTC days). */
export const localYmd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const counts = (o: OrderRecord) => o.status !== 'Đã huỷ' && o.status !== 'Trả hàng';

export function promotionUses(code: string, orders: OrderRecord[], customerId?: string): number {
  const c = code.toUpperCase();
  return orders.filter(o => counts(o) && (o.promotionCode || '').toUpperCase() === c && (!customerId || o.customerId === customerId)).length;
}

/**
 * Can this promotion apply to this customer + basket today, and what does it give?
 * `items` are the priced lines BEFORE any promotion (gift lines excluded).
 */
export function evaluatePromotion(
  p: PromotionRecord,
  ctx: { customer: Pick<CustomerRecord, 'id' | 'type' | 'channel' | 'priceTier'>; items: OrderItem[]; products: ProductRecord[]; orders: OrderRecord[]; today: string },
): PromotionResult {
  const { customer, items, products, orders, today } = ctx;
  if (!p.active) return { ok: false, reason: 'Chương trình đang tạm dừng' };
  if (today < p.startDate) return { ok: false, reason: `Chương trình bắt đầu từ ${p.startDate}` };
  if (today > p.endDate) return { ok: false, reason: `Chương trình đã kết thúc ${p.endDate}` };
  if (p.customerType !== 'ALL' && p.customerType !== customer.type) return { ok: false, reason: `Chỉ áp dụng cho khách ${p.customerType}` };
  if (customer.type === 'B2B' && p.channels?.length && (!customer.channel || !p.channels.includes(customer.channel))) {
    return { ok: false, reason: `Chỉ áp dụng cho: ${p.channels.join(', ')}` };
  }
  if (p.usageLimit && promotionUses(p.code, orders) >= p.usageLimit) return { ok: false, reason: 'Đã hết lượt áp dụng' };
  if (p.perCustomerLimit && promotionUses(p.code, orders, customer.id) >= p.perCustomerLimit) {
    return { ok: false, reason: `Khách đã dùng tối đa ${p.perCustomerLimit} lần` };
  }

  const lines = items.filter(i => !i.isGift);
  if (p.type === 'gift') {
    const bought = lines.filter(i => i.productId === p.buyProductId).reduce((s, i) => s + i.quantity, 0);
    const buyQty = Math.max(1, p.buyQty || 1);
    const sets = Math.floor(bought / buyQty);
    const buyName = products.find(x => x.id === p.buyProductId)?.name || 'sản phẩm';
    if (sets < 1) return { ok: false, reason: `Mua tối thiểu ${buyQty} ${buyName}` };
    const gift = products.find(x => x.id === p.giftProductId);
    if (!gift) return { ok: false, reason: 'Sản phẩm quà tặng không còn tồn tại' };
    const qty = sets * Math.max(1, p.giftQty || 1);
    const unitPrice = priceFor(gift, customer.priceTier);
    return {
      ok: true, discount: 0,
      giftItems: [{ productId: gift.id, sku: gift.sku, name: `${gift.name} (quà tặng ${p.code})`, unit: gift.unit, quantity: qty, unitPrice, discountPercent: 100, lineTotal: 0, isGift: true }],
      summary: `Tặng ${qty} ${gift.unit} ${gift.name}`,
    };
  }

  const eligible = p.productIds?.length ? lines.filter(i => p.productIds!.includes(i.productId)) : lines;
  const base = eligible.reduce((s, i) => s + i.lineTotal, 0);
  if (base <= 0) return { ok: false, reason: 'Đơn không có sản phẩm thuộc chương trình' };
  if (p.minOrderValue && base < p.minOrderValue) return { ok: false, reason: `Giá trị tối thiểu ${vnd(p.minOrderValue)} (hiện ${vnd(base)})` };

  let discount: number;
  if (p.type === 'percent') {
    discount = round(base * Math.min(100, Math.max(0, p.value || 0)) / 100);
    if (p.maxDiscount) discount = Math.min(discount, p.maxDiscount);
  } else {
    discount = Math.min(base, Math.max(0, round(p.value || 0)));
  }
  if (discount <= 0) return { ok: false, reason: 'Chương trình không có giá trị giảm' };
  return {
    ok: true, discount, giftItems: [],
    summary: p.type === 'percent' ? `Giảm ${p.value}%${p.maxDiscount ? ` (tối đa ${vnd(p.maxDiscount)})` : ''} = ${vnd(discount)}` : `Giảm ${vnd(discount)}`,
  };
}

/** Validate + normalise an admin-supplied promotion body. Returns an error string or the record fields. */
export function sanitizePromotion(body: any, existing?: PromotionRecord): { error: string } | { value: Omit<PromotionRecord, 'id' | 'createdAt' | 'createdBy'> } {
  const b = { ...(existing || {}), ...(body || {}) };
  const code = String(b.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: 'Mã CTKM 3-30 ký tự: chữ, số, - hoặc _' };
  const name = String(b.name || '').trim().slice(0, 200);
  if (!name) return { error: 'Thiếu tên chương trình' };
  const type: PromotionType = ['percent', 'amount', 'gift'].includes(b.type) ? b.type : 'percent';
  const isDate = (s: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  if (!isDate(b.startDate) || !isDate(b.endDate)) return { error: 'Ngày bắt đầu / kết thúc không hợp lệ' };
  if (b.endDate < b.startDate) return { error: 'Ngày kết thúc phải sau ngày bắt đầu' };
  const n = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? undefined : Math.max(0, Number(v)));
  const value = n(b.value);
  if (type === 'percent' && (!value || value > 100)) return { error: 'Phần trăm giảm phải từ 1 đến 100' };
  if (type === 'amount' && !value) return { error: 'Nhập số tiền giảm' };
  if (type === 'gift' && (!b.buyProductId || !b.giftProductId)) return { error: 'Chọn sản phẩm mua và sản phẩm tặng' };
  const customerType = ['ALL', 'B2B', 'B2C'].includes(b.customerType) ? b.customerType : 'ALL';
  return {
    value: {
      code, name, description: String(b.description || '').slice(0, 1000) || undefined, type,
      value: type === 'gift' ? undefined : value,
      maxDiscount: type === 'percent' ? n(b.maxDiscount) || undefined : undefined,
      minOrderValue: type === 'gift' ? undefined : n(b.minOrderValue) || undefined,
      productIds: type === 'gift' ? undefined : (Array.isArray(b.productIds) ? b.productIds.map(String).filter(Boolean) : undefined),
      buyProductId: type === 'gift' ? String(b.buyProductId) : undefined,
      buyQty: type === 'gift' ? Math.max(1, Math.round(n(b.buyQty) || 1)) : undefined,
      giftProductId: type === 'gift' ? String(b.giftProductId) : undefined,
      giftQty: type === 'gift' ? Math.max(1, Math.round(n(b.giftQty) || 1)) : undefined,
      customerType,
      channels: customerType !== 'B2C' && Array.isArray(b.channels) && b.channels.length ? b.channels.map(String) : undefined,
      startDate: b.startDate, endDate: b.endDate,
      active: b.active !== false,
      usageLimit: n(b.usageLimit) ? Math.round(n(b.usageLimit)!) : undefined,
      perCustomerLimit: n(b.perCustomerLimit) ? Math.round(n(b.perCustomerLimit)!) : undefined,
    },
  };
}
