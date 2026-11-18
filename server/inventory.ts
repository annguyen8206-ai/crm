/**
 * Warehouse stock by LOT with expiry dates (quản lý xuất nhập kho & date).
 *
 * - Every unit in stock belongs to a lot: lot number, manufacture date (NSX),
 *   expiry date (HSD, optional for products that don't expire, e.g. diffusers).
 * - Every change is a StockMove (the stock card / thẻ kho). Product.stock is kept
 *   as the derived total so the rest of the app keeps working.
 * - Sales are issued FEFO: earliest expiry first; expired lots are never sold.
 * - Each order remembers which lots it took (lot traceability for complaints
 *   and recalls); cancelling or returning puts the goods back into those lots.
 *
 * Pure-ish functions that mutate the store passed in — routes own persistence.
 */
import type { OrderRecord, ProductRecord } from './commerce-types';

export type MoveType =
  | 'Nhập mua' | 'Nhập trả hàng' | 'Nhập khác' | 'Tồn đầu kỳ'
  | 'Xuất bán' | 'Xuất huỷ' | 'Xuất mẫu / tặng' | 'Xuất khác'
  | 'Hoàn kho huỷ đơn' | 'Điều chỉnh kiểm kê';

export const RECEIPT_REASONS: MoveType[] = ['Nhập mua', 'Nhập trả hàng', 'Nhập khác'];
export const ISSUE_REASONS: MoveType[] = ['Xuất huỷ', 'Xuất mẫu / tặng', 'Xuất khác'];

export interface LotRecord {
  id: string;
  productId: string;
  sku: string;
  lotNo: string;
  mfgDate?: string;        // YYYY-MM-DD
  expiryDate?: string;     // YYYY-MM-DD; none = does not expire
  qty: number;             // on hand
  receivedAt: string;      // ISO
  cost?: number;           // unit cost of this lot
}

export interface StockMove {
  id: string;
  at: string;              // ISO
  type: MoveType;
  productId: string;
  sku: string;
  lotId: string;
  lotNo: string;
  expiryDate?: string;
  qty: number;             // + in, − out
  balanceAfter: number;    // product total after the move
  ref?: string;            // voucher code (PN-/PX-/KK-) or order code (DH-)
  by?: string;
  note?: string;
}

export interface VoucherLine { productId: string; sku: string; name: string; lotId: string; lotNo: string; expiryDate?: string; qty: number; cost?: number; systemQty?: number }
export interface InventoryVoucher {
  id: string;
  code: string;            // PN-261118-01 (nhập), PX-… (xuất), KK-… (kiểm kê)
  kind: 'in' | 'out' | 'count';
  reason: MoveType;
  partner?: string;        // supplier / recipient
  note?: string;
  lines: VoucherLine[];
  createdBy?: string;
  createdAt: string;
}

export interface OrderLotAllocation { productId: string; lotId: string; lotNo: string; expiryDate?: string; qty: number }

export interface InventoryStore {
  products: ProductRecord[];
  lots: LotRecord[];
  stockMoves: StockMove[];
  inventoryVouchers: InventoryVoucher[];
}

export const EXPIRY_WARNING_DAYS = Number(process.env.EXPIRY_WARNING_DAYS || 90);
const DAY = 86_400_000;

export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysUntil = (ymd: string, today: string) =>
  Math.round((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);

export type ExpiryStatus = 'Hết hạn' | 'Cận date' | 'Còn hạn' | 'Không hạn';
export function expiryStatus(lot: Pick<LotRecord, 'expiryDate'>, today: string, warnDays = EXPIRY_WARNING_DAYS): ExpiryStatus {
  if (!lot.expiryDate) return 'Không hạn';
  const d = daysUntil(lot.expiryDate, today);
  return d < 0 ? 'Hết hạn' : d <= warnDays ? 'Cận date' : 'Còn hạn';
}
const warnDaysOf = (p?: ProductRecord) => p?.expiryWarningDays || EXPIRY_WARNING_DAYS;

/** Earliest expiry first; lots without expiry last; then oldest receipt. */
export const fefo = (a: LotRecord, b: LotRecord) =>
  (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31') || a.receivedAt.localeCompare(b.receivedAt);

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++ % 1296).toString(36).padStart(2, '0')}`;

export function productTotal(store: InventoryStore, productId: string): number {
  return store.lots.filter(l => l.productId === productId).reduce((s, l) => s + l.qty, 0);
}
/** Quantity that may be sold today (not expired). */
export function sellableQty(store: InventoryStore, productId: string, today = localDay()): number {
  return store.lots.filter(l => l.productId === productId && l.qty > 0 && !(l.expiryDate && l.expiryDate < today)).reduce((s, l) => s + l.qty, 0);
}
function syncProductStock(store: InventoryStore, productId: string): number {
  const total = productTotal(store, productId);
  const p = store.products.find(x => x.id === productId);
  if (p) p.stock = total;
  return total;
}

function move(store: InventoryStore, lot: LotRecord, type: MoveType, qty: number, m: { ref?: string; by?: string; note?: string; at?: string }): StockMove {
  const rec: StockMove = {
    id: uid('mv'), at: m.at || new Date().toISOString(), type, productId: lot.productId, sku: lot.sku,
    lotId: lot.id, lotNo: lot.lotNo, expiryDate: lot.expiryDate, qty,
    balanceAfter: syncProductStock(store, lot.productId), ref: m.ref, by: m.by, note: m.note,
  };
  store.stockMoves.push(rec);
  return rec;
}

/** Find-or-create the lot (same product + lot number) and add stock to it. */
export function receive(store: InventoryStore, input: {
  productId: string; lotNo: string; qty: number; mfgDate?: string; expiryDate?: string; cost?: number;
  type: MoveType; ref?: string; by?: string; note?: string; at?: string;
}): LotRecord {
  const p = store.products.find(x => x.id === input.productId);
  if (!p) throw new Error(`Không tìm thấy sản phẩm ${input.productId}`);
  const lotNo = input.lotNo.trim().toUpperCase();
  let lot = store.lots.find(l => l.productId === p.id && l.lotNo === lotNo);
  if (lot && input.expiryDate && lot.expiryDate && lot.expiryDate !== input.expiryDate) {
    throw new Error(`Lô ${lotNo} của ${p.sku} đã có HSD ${lot.expiryDate}, khác ${input.expiryDate}`);
  }
  if (!lot) {
    lot = { id: uid('lot'), productId: p.id, sku: p.sku, lotNo, mfgDate: input.mfgDate, expiryDate: input.expiryDate, qty: 0, receivedAt: input.at || new Date().toISOString(), cost: input.cost };
    store.lots.push(lot);
  }
  lot.qty += input.qty;
  move(store, lot, input.type, input.qty, input);
  return lot;
}

export class StockError extends Error {}

/** Take stock out of one lot (manual issue / write-off). */
export function issueFromLot(store: InventoryStore, lotId: string, qty: number, type: MoveType, m: { ref?: string; by?: string; note?: string }): LotRecord {
  const lot = store.lots.find(l => l.id === lotId);
  if (!lot) throw new StockError('Không tìm thấy lô hàng');
  if (qty > lot.qty) throw new StockError(`Lô ${lot.lotNo} (${lot.sku}) chỉ còn ${lot.qty}`);
  lot.qty -= qty;
  move(store, lot, type, -qty, m);
  return lot;
}

/** Plan a FEFO pick without changing anything. Throws if not enough sellable stock. */
export function planFefo(store: InventoryStore, needs: Map<string, number>, today = localDay()): OrderLotAllocation[] {
  const picks: OrderLotAllocation[] = [];
  const short: string[] = [];
  for (const [productId, need] of needs) {
    let left = need;
    const lots = store.lots.filter(l => l.productId === productId && l.qty > 0 && !(l.expiryDate && l.expiryDate < today)).sort(fefo);
    for (const lot of lots) {
      if (left <= 0) break;
      const take = Math.min(left, lot.qty);
      picks.push({ productId, lotId: lot.id, lotNo: lot.lotNo, expiryDate: lot.expiryDate, qty: take });
      left -= take;
    }
    if (left > 0) {
      const p = store.products.find(x => x.id === productId);
      short.push(`${p?.sku || productId} cần ${need}, còn ${need - left} hàng còn hạn`);
    }
  }
  if (short.length) throw new StockError(`Không đủ hàng: ${short.join('; ')}`);
  return picks;
}

const needsOf = (order: Pick<OrderRecord, 'items'>) => {
  const m = new Map<string, number>();
  for (const it of order.items) m.set(it.productId, (m.get(it.productId) || 0) + it.quantity);
  return m;
};

/** Is there enough sellable stock for this order? Returns the shortage text or null. */
export function checkOrderStock(store: InventoryStore, order: Pick<OrderRecord, 'items'>, today = localDay()): string | null {
  try { planFefo(store, needsOf(order), today); return null; } catch (e: any) { return e.message; }
}

/** Issue an order's goods FEFO and remember the lots on the order. */
export function commitOrderStock(store: InventoryStore, order: OrderRecord, by?: string, today = localDay()): void {
  if (order.lotAllocations?.length) return; // already issued
  const picks = planFefo(store, needsOf(order), today);
  for (const pick of picks) {
    const lot = store.lots.find(l => l.id === pick.lotId)!;
    lot.qty -= pick.qty;
    move(store, lot, 'Xuất bán', -pick.qty, { ref: order.code, by, note: order.customerName });
  }
  order.lotAllocations = picks;
}

/** Put an issued order's goods back into the lots they came from. */
export function releaseOrderStock(store: InventoryStore, order: OrderRecord, type: 'Hoàn kho huỷ đơn' | 'Nhập trả hàng', by?: string): void {
  const allocations = order.lotAllocations || [];
  if (allocations.length) {
    for (const a of allocations) {
      let lot = store.lots.find(l => l.id === a.lotId);
      if (!lot) { // lot record was removed — recreate it so the stock isn't lost
        const p = store.products.find(x => x.id === a.productId);
        lot = { id: a.lotId, productId: a.productId, sku: p?.sku || '', lotNo: a.lotNo, expiryDate: a.expiryDate, qty: 0, receivedAt: new Date().toISOString() };
        store.lots.push(lot);
      }
      lot.qty += a.qty;
      move(store, lot, type, a.qty, { ref: order.code, by, note: order.customerName });
    }
  } else {
    // Order confirmed before lot tracking existed: return into a dated "HOAN-KHO" lot.
    for (const [productId, qty] of needsOf(order)) {
      receive(store, { productId, lotNo: 'HOAN-KHO', qty, type, ref: order.code, by, note: `${order.customerName} (đơn trước khi quản lý lô)` });
    }
  }
  order.lotAllocations = [];
}

/**
 * Products that have a stock number but no lots (data from before lot tracking,
 * or a product created with an initial stock) get an opening lot "TON-DAU".
 */
export function ensureOpeningLots(store: InventoryStore, by = 'Hệ thống'): number {
  let n = 0;
  for (const p of store.products) {
    const hasLots = store.lots.some(l => l.productId === p.id);
    if (!hasLots && typeof p.stock === 'number' && p.stock > 0) {
      const qty = p.stock;
      p.stock = 0;
      receive(store, { productId: p.id, lotNo: 'TON-DAU', qty, type: 'Tồn đầu kỳ', by, note: 'Tồn kho trước khi quản lý theo lô' });
      n++;
    }
  }
  return n;
}

/** Per-product stock + expiry summary for the warehouse screen. */
export function stockSummary(store: InventoryStore, today = localDay()) {
  return store.products.map(p => {
    const lots = store.lots.filter(l => l.productId === p.id && l.qty > 0).sort(fefo);
    const warn = warnDaysOf(p);
    const by = (s: ExpiryStatus) => lots.filter(l => expiryStatus(l, today, warn) === s).reduce((a, l) => a + l.qty, 0);
    const dated = lots.filter(l => l.expiryDate && l.expiryDate >= today);
    return {
      productId: p.id, sku: p.sku, name: p.name, unit: p.unit, status: p.status, trackExpiry: p.trackExpiry !== false,
      total: lots.reduce((a, l) => a + l.qty, 0),
      sellable: lots.filter(l => !(l.expiryDate && l.expiryDate < today)).reduce((a, l) => a + l.qty, 0),
      nearExpiry: by('Cận date'), expired: by('Hết hạn'),
      lotCount: lots.length,
      nextExpiry: dated[0]?.expiryDate,
      value: lots.reduce((a, l) => a + l.qty * (l.cost ?? p.cost ?? 0), 0),
    };
  });
}

export function lotView(store: InventoryStore, lot: LotRecord, today = localDay()) {
  const p = store.products.find(x => x.id === lot.productId);
  return {
    ...lot, name: p?.name || lot.sku, unit: p?.unit || '',
    daysLeft: lot.expiryDate ? daysUntil(lot.expiryDate, today) : null,
    status: expiryStatus(lot, today, warnDaysOf(p)),
  };
}

/** Next voucher code for today: PN-261118-01 … */
export function nextVoucherCode(prefix: 'PN' | 'PX' | 'KK', existing: string[], now = new Date()): string {
  const day = `${prefix}-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`;
  const max = existing.filter(c => c.startsWith(day)).map(c => Number(c.slice(day.length)) || 0).reduce((a, b) => Math.max(a, b), 0);
  return `${day}${String(max + 1).padStart(2, '0')}`;
}
