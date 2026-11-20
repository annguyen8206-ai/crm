import type { Express, Request } from 'express';
import { dbStore } from '../store';
import { requirePerm } from '../rbac';
import { pageOf } from '../http-util';
import {
  RECEIPT_REASONS, ISSUE_REASONS, StockError, receive, issueFromLot, stockSummary, lotView, nextVoucherCode,
  localDay, fefo, type InventoryVoucher, type MoveType, type VoucherLine,
} from '../inventory';

const actor = (req: Request) => req.authUser?.name || 'Hệ thống';
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v: unknown, max = 500) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const posInt = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

/** Run all lines or none: snapshot the inventory arrays, restore on error. */
function atomically<T>(fn: () => T): T {
  const lots = dbStore.lots.map(l => ({ ...l }));
  const moves = dbStore.stockMoves.length;
  const stock = new Map(dbStore.products.map(p => [p.id, p.stock]));
  try {
    return fn();
  } catch (e) {
    dbStore.lots = lots;
    dbStore.stockMoves.length = moves;
    for (const p of dbStore.products) p.stock = stock.get(p.id);
    throw e;
  }
}

/** Warehouse: receipts (PN), issues (PX), stock counts (KK), lots & expiry, stock card. */
export function registerInventoryRoutes(app: Express): void {
  app.get('/api/inventory/summary', requirePerm('canViewInventory'), (_req, res) => {
    const rows = stockSummary(dbStore);
    const today = localDay();
    const live = dbStore.lots.filter(l => l.qty > 0).map(l => lotView(dbStore, l, today));
    res.json({
      rows,
      totals: {
        units: rows.reduce((s, r) => s + r.total, 0),
        value: rows.reduce((s, r) => s + r.value, 0),
        nearExpiryLots: live.filter(l => l.status === 'Cận date').length,
        expiredLots: live.filter(l => l.status === 'Hết hạn').length,
        expiredUnits: live.filter(l => l.status === 'Hết hạn').reduce((s, l) => s + l.qty, 0),
      },
    });
  });

  app.get('/api/inventory/lots', requirePerm('canViewInventory'), (req, res) => {
    const { productId, status, includeEmpty } = req.query as Record<string, string | undefined>;
    const today = localDay();
    let rows = dbStore.lots
      .filter(l => (includeEmpty === 'true' || l.qty > 0) && (!productId || l.productId === productId))
      .sort(fefo)
      .map(l => lotView(dbStore, l, today));
    if (status) rows = rows.filter(l => l.status === status);
    res.json({ lots: rows, total: rows.length });
  });

  /** Lot traceability: every move of one lot, with the orders it went to. */
  app.get('/api/inventory/lots/:id/trace', requirePerm('canViewInventory'), (req, res) => {
    const lot = dbStore.lots.find(l => l.id === req.params.id);
    if (!lot) return res.status(404).json({ error: 'Không tìm thấy lô hàng' });
    const moves = dbStore.stockMoves.filter(m => m.lotId === lot.id).sort((a, b) => a.at.localeCompare(b.at));
    const orders = dbStore.orders
      .filter(o => (o.lotAllocations || []).some(a => a.lotId === lot.id))
      .map(o => ({ id: o.id, code: o.code, customerName: o.customerName, customerPhone: o.customerPhone, status: o.status, createdAt: o.createdAt,
        qty: (o.lotAllocations || []).filter(a => a.lotId === lot.id).reduce((s, a) => s + a.qty, 0) }));
    res.json({ lot: lotView(dbStore, lot), moves, orders });
  });

  /** Stock card (thẻ kho). */
  app.get('/api/inventory/moves', requirePerm('canViewInventory'), (req, res) => {
    const { productId, lotId, type, from, to } = req.query as Record<string, string | undefined>;
    let rows = dbStore.stockMoves;
    if (productId) rows = rows.filter(m => m.productId === productId);
    if (lotId) rows = rows.filter(m => m.lotId === lotId);
    if (type) rows = rows.filter(m => m.type === type);
    if (from) rows = rows.filter(m => localDay(new Date(m.at)) >= from);
    if (to) rows = rows.filter(m => localDay(new Date(m.at)) <= to);
    rows = [...rows].sort((a, b) => b.at.localeCompare(a.at));
    const p = pageOf(rows, req.query);
    res.json({ moves: p.page, total: p.total });
  });

  app.get('/api/inventory/vouchers', requirePerm('canViewInventory'), (req, res) => {
    const rows = [...dbStore.inventoryVouchers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const p = pageOf(rows, req.query);
    res.json({ vouchers: p.page, total: p.total });
  });

  // ------------------------------------------------------------------ receipt (PN)
  app.post('/api/inventory/receipts', requirePerm('canManageInventory'), (req, res) => {
    const b = req.body || {};
    const reason = (RECEIPT_REASONS.includes(b.reason) ? b.reason : 'Nhập mua') as MoveType;
    const input = Array.isArray(b.lines) ? b.lines : [];
    if (!input.length) return res.status(400).json({ error: 'Phiếu nhập cần ít nhất 1 dòng hàng' });
    const errors: string[] = [];
    input.forEach((l: any, i: number) => {
      const p = dbStore.products.find(x => x.id === l?.productId);
      const row = `Dòng ${i + 1}`;
      if (!p) return errors.push(`${row}: chưa chọn sản phẩm`);
      if (!posInt(l.qty)) errors.push(`${row} (${p.sku}): số lượng phải > 0`);
      if (!str(l.lotNo, 40)) errors.push(`${row} (${p.sku}): thiếu số lô`);
      if (p.trackExpiry !== false && !isDate(l.expiryDate)) errors.push(`${row} (${p.sku}): thiếu hạn sử dụng`);
      if (l.mfgDate && !isDate(l.mfgDate)) errors.push(`${row} (${p.sku}): ngày sản xuất không hợp lệ`);
      if (isDate(l.mfgDate) && isDate(l.expiryDate) && l.expiryDate <= l.mfgDate) errors.push(`${row} (${p.sku}): HSD phải sau NSX`);
    });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const code = nextVoucherCode('PN', dbStore.inventoryVouchers.map(v => v.code));
    try {
      const voucher = atomically(() => {
        const lines: VoucherLine[] = input.map((l: any) => {
          const p = dbStore.products.find(x => x.id === l.productId)!;
          const cost = Number(l.cost) >= 0 && l.cost !== '' && l.cost != null ? Math.round(Number(l.cost)) : undefined;
          const lot = receive(dbStore, {
            productId: p.id, lotNo: String(l.lotNo), qty: posInt(l.qty), mfgDate: isDate(l.mfgDate) ? l.mfgDate : undefined,
            expiryDate: p.trackExpiry !== false && isDate(l.expiryDate) ? l.expiryDate : undefined, cost,
            type: reason, ref: code, by: actor(req), note: str(b.partner, 200),
          });
          return { productId: p.id, sku: p.sku, name: p.name, lotId: lot.id, lotNo: lot.lotNo, expiryDate: lot.expiryDate, qty: posInt(l.qty), cost };
        });
        const v: InventoryVoucher = { id: `iv-${Date.now()}`, code, kind: 'in', reason, partner: str(b.partner, 200), note: str(b.note, 2000), lines, createdBy: actor(req), createdAt: new Date().toISOString() };
        dbStore.inventoryVouchers.unshift(v);
        return v;
      });
      res.status(201).json({ success: true, voucher });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ------------------------------------------------------------------ issue (PX)
  app.post('/api/inventory/issues', requirePerm('canManageInventory'), (req, res) => {
    const b = req.body || {};
    const reason = (ISSUE_REASONS.includes(b.reason) ? b.reason : 'Xuất khác') as MoveType;
    const input = Array.isArray(b.lines) ? b.lines : [];
    if (!input.length) return res.status(400).json({ error: 'Phiếu xuất cần ít nhất 1 dòng hàng' });
    if (reason !== 'Xuất huỷ' && !str(b.note) && !str(b.partner)) return res.status(400).json({ error: 'Ghi rõ người nhận hoặc lý do xuất' });
    const code = nextVoucherCode('PX', dbStore.inventoryVouchers.map(v => v.code));
    try {
      const voucher = atomically(() => {
        const lines: VoucherLine[] = input.map((l: any, i: number) => {
          const qty = posInt(l.qty);
          if (!qty) throw new StockError(`Dòng ${i + 1}: số lượng phải > 0`);
          const lot = issueFromLot(dbStore, String(l.lotId || ''), qty, reason, { ref: code, by: actor(req), note: str(b.note, 200) || str(b.partner, 200) });
          const p = dbStore.products.find(x => x.id === lot.productId);
          return { productId: lot.productId, sku: lot.sku, name: p?.name || lot.sku, lotId: lot.id, lotNo: lot.lotNo, expiryDate: lot.expiryDate, qty };
        });
        const v: InventoryVoucher = { id: `iv-${Date.now()}`, code, kind: 'out', reason, partner: str(b.partner, 200), note: str(b.note, 2000), lines, createdBy: actor(req), createdAt: new Date().toISOString() };
        dbStore.inventoryVouchers.unshift(v);
        return v;
      });
      res.status(201).json({ success: true, voucher });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ------------------------------------------------------------------ stock count (KK)
  /** Body: { note, lines: [{ lotId, actualQty }] } — differences become adjustment moves. */
  app.post('/api/inventory/counts', requirePerm('canManageInventory'), (req, res) => {
    const b = req.body || {};
    const input = Array.isArray(b.lines) ? b.lines : [];
    if (!input.length) return res.status(400).json({ error: 'Phiếu kiểm kê cần ít nhất 1 lô' });
    const code = nextVoucherCode('KK', dbStore.inventoryVouchers.map(v => v.code));
    try {
      const voucher = atomically(() => {
        const lines: VoucherLine[] = [];
        for (const [i, l] of input.entries()) {
          const lot = dbStore.lots.find(x => x.id === l?.lotId);
          if (!lot) throw new StockError(`Dòng ${i + 1}: không tìm thấy lô`);
          const actual = Math.round(Number(l.actualQty));
          if (!Number.isFinite(actual) || actual < 0) throw new StockError(`Dòng ${i + 1} (${lot.lotNo}): số thực tế không hợp lệ`);
          const diff = actual - lot.qty;
          const p = dbStore.products.find(x => x.id === lot.productId);
          lines.push({ productId: lot.productId, sku: lot.sku, name: p?.name || lot.sku, lotId: lot.id, lotNo: lot.lotNo, expiryDate: lot.expiryDate, qty: diff, systemQty: lot.qty });
          if (diff > 0) receive(dbStore, { productId: lot.productId, lotNo: lot.lotNo, qty: diff, type: 'Điều chỉnh kiểm kê', ref: code, by: actor(req), note: str(b.note, 200) });
          if (diff < 0) issueFromLot(dbStore, lot.id, -diff, 'Điều chỉnh kiểm kê', { ref: code, by: actor(req), note: str(b.note, 200) });
        }
        const v: InventoryVoucher = { id: `iv-${Date.now()}`, code, kind: 'count', reason: 'Điều chỉnh kiểm kê', note: str(b.note, 2000), lines, createdBy: actor(req), createdAt: new Date().toISOString() };
        dbStore.inventoryVouchers.unshift(v);
        return v;
      });
      res.status(201).json({ success: true, voucher });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
}
