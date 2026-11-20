import type { Express, Request } from 'express';
import { dbStore } from '../store';
import { requirePerm, hasPerm, EXPORT_VIEW_PERM } from '../rbac';
import { scopeList } from '../branch-scope';
import { receivables } from '../commerce';
import { PRICE_TIERS, PRICE_TIER_LABELS } from '../commerce-types';
import { recordAudit } from '../audit';
import { fefo, lotView, localDay } from '../inventory';

/**
 * Excel-ready CSV exports (UTF-8 with BOM so Excel shows Vietnamese correctly).
 *   GET /api/export/:kind?from=YYYY-MM-DD&to=YYYY-MM-DD&type=B2B|B2C
 *   kind = customers | orders | order-items | receivables | products | visits
 * Branch-scoped like the list endpoints; every export is audit-logged (PII).
 */

type Cell = string | number | boolean | null | undefined;

/** Quote a CSV cell; neutralise spreadsheet formula injection in text cells. */
export function csvCell(v: Cell): string {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '';
  if (typeof v === 'boolean') return v ? 'Có' : '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Local "dd/mm/yyyy HH:mm" for ISO timestamps, "dd/mm/yyyy" for plain dates. */
const fmt = (s?: string) => {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const inRange = (iso: string | undefined, from?: string, to?: string) => {
  const d = (iso || '').slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
};

const KINDS = ['customers', 'orders', 'order-items', 'receivables', 'products', 'visits', 'stock-lots', 'stock-moves'] as const;
type Kind = typeof KINDS[number];
const FILE_LABEL: Record<Kind, string> = {
  customers: 'khach-hang', orders: 'don-hang', 'order-items': 'chi-tiet-don-hang', receivables: 'cong-no', products: 'san-pham', visits: 'vieng-tham',
  'stock-lots': 'ton-kho-theo-lo', 'stock-moves': 'the-kho',
};

export function buildExport(kind: Kind, req: Pick<Request, 'authUser'> & { query: Record<string, unknown> }): { header: string[]; rows: Cell[][] } {
  const q = req.query;
  const from = typeof q.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.from) ? q.from : undefined;
  const to = typeof q.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.to) ? q.to : undefined;
  const type = q.type === 'B2B' || q.type === 'B2C' ? q.type : undefined;
  const r = req as Request;
  const orders = scopeList(r, dbStore.orders, o => o.branchId).filter(o => !type || o.customerType === type);

  switch (kind) {
    case 'customers': {
      const rows = scopeList(r, dbStore.customers, c => c.branchId).filter(c => !type || c.type === type);
      return {
        header: ['Mã KH', 'Loại', 'Tên', 'Điện thoại', 'Email', 'Địa chỉ', 'Tỉnh/TP', 'Loại khách sỉ', 'Bảng giá', 'NV phụ trách', 'Tuyến',
          'Trạng thái', 'Hạn mức công nợ', 'Số ngày nợ', 'Số đơn', 'Doanh số', 'Công nợ', 'Mua gần nhất', 'Hạng hội viên', 'Điểm', 'Mã số thuế', 'Nguồn', 'Ngày tạo'],
        rows: rows.map(c => [c.code, c.type, c.name, c.phone, c.email, c.address, c.province, c.channel, PRICE_TIER_LABELS[c.priceTier], c.assignedRep, c.routeName,
          c.status, c.creditLimit, c.paymentTermDays, c.totalOrders, c.totalRevenue, c.outstandingDebt, fmt(c.lastOrderDate), c.loyaltyTier, c.loyaltyPoints, c.taxCode, c.source, fmt(c.createdAt)]),
      };
    }
    case 'orders': {
      const rows = orders.filter(o => inRange(o.createdAt, from, to)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        header: ['Mã đơn', 'Ngày tạo', 'Mã KH', 'Khách hàng', 'Loại KH', 'Điện thoại', 'Kênh bán', 'NV bán hàng', 'Trạng thái', 'Thanh toán',
          'Tạm tính', 'Chiết khấu', 'Mã KM', 'Giảm KM', 'Phí giao', 'Tổng tiền', 'Đã thu', 'Còn nợ', 'Hạn thanh toán', 'Ngày giao', 'Ghi chú'],
        rows: rows.map(o => [o.code, fmt(o.createdAt), dbStore.customers.find(c => c.id === o.customerId)?.code, o.customerName, o.customerType, o.customerPhone,
          o.channel, o.salesRep, o.status, o.paymentStatus, o.subtotal, o.discountAmount, o.promotionCode, o.promotionDiscount, o.shippingFee, o.total,
          o.paidAmount, o.total - o.paidAmount, fmt(o.dueDate), fmt(o.deliveredAt), o.notes]),
      };
    }
    case 'order-items': {
      const rows = orders.filter(o => inRange(o.createdAt, from, to) && o.status !== 'Đã huỷ').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        header: ['Mã đơn', 'Ngày tạo', 'Trạng thái', 'Khách hàng', 'Loại KH', 'NV bán hàng', 'SKU', 'Sản phẩm', 'ĐVT', 'Số lượng', 'Đơn giá', 'CK %', 'Thành tiền', 'Hàng tặng'],
        rows: rows.flatMap(o => o.items.map(i => [o.code, fmt(o.createdAt), o.status, o.customerName, o.customerType, o.salesRep,
          i.sku, i.name, i.unit, i.quantity, i.unitPrice, i.discountPercent, i.lineTotal, !!i.isGift])),
      };
    }
    case 'receivables': {
      const rows = receivables(orders);
      return {
        header: ['Mã đơn', 'Khách hàng', 'NV bán hàng', 'Tổng tiền', 'Đã thu', 'Còn nợ', 'Hạn thanh toán', 'Số ngày quá hạn', 'Nhóm tuổi nợ'],
        rows: rows.map(x => [x.orderCode, x.customerName, x.salesRep, x.total, x.paid, x.balance, fmt(x.dueDate), Math.max(0, x.daysOverdue), x.bucket]),
      };
    }
    case 'products':
      return {
        header: ['SKU', 'Mã vạch', 'Tên sản phẩm', 'Nhãn hàng', 'Ngành hàng', 'ĐVT', 'Quy cách', ...PRICE_TIERS.map(t => PRICE_TIER_LABELS[t]), 'Giá vốn', 'VAT %', 'Tồn kho', 'Chu kỳ mua lại (ngày)', 'Trạng thái'],
        rows: dbStore.products.map(p => [p.sku, p.barcode, p.name, p.brand, p.category, p.unit, p.packSize, ...PRICE_TIERS.map(t => p.prices?.[t]),
          p.cost, p.vatRate, p.stock, p.repurchaseCycleDays, p.status]),
      };
    case 'stock-lots': {
      const day = localDay();
      const rows = dbStore.lots.filter(l => l.qty > 0).sort(fefo).map(l => lotView(dbStore, l, day));
      return {
        header: ['SKU', 'Sản phẩm', 'ĐVT', 'Số lô', 'Ngày SX', 'Hạn sử dụng', 'Còn (ngày)', 'Tình trạng', 'Tồn', 'Giá vốn / đv', 'Giá trị tồn', 'Ngày nhập'],
        rows: rows.map(l => {
          const cost = l.cost ?? dbStore.products.find(p => p.id === l.productId)?.cost;
          return [l.sku, l.name, l.unit, l.lotNo, fmt(l.mfgDate), fmt(l.expiryDate), l.daysLeft ?? '', l.status, l.qty, cost, cost != null ? cost * l.qty : undefined, fmt(l.receivedAt)];
        }),
      };
    }
    case 'stock-moves': {
      const rows = dbStore.stockMoves.filter(m => inRange(localDay(new Date(m.at)), from, to)).sort((a, b) => a.at.localeCompare(b.at));
      return {
        header: ['Thời gian', 'Loại', 'Chứng từ', 'SKU', 'Số lô', 'Hạn sử dụng', 'Nhập', 'Xuất', 'Tồn sau', 'Người thực hiện', 'Ghi chú'],
        rows: rows.map(m => [fmt(m.at), m.type, m.ref, m.sku, m.lotNo, fmt(m.expiryDate), m.qty > 0 ? m.qty : '', m.qty < 0 ? -m.qty : '', m.balanceAfter, m.by, m.note]),
      };
    }
    case 'visits': {
      const rows = scopeList(r, dbStore.visits, v => v.branchId).filter(v => inRange(v.plannedDate, from, to)).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
      return {
        header: ['Ngày', 'NV kinh doanh', 'Khách hàng', 'Địa chỉ', 'Mục đích', 'Trạng thái', 'Check-in', 'Check-out', 'Cách điểm bán (m)', 'Cảnh báo vị trí', 'Kết quả', 'Có đơn', 'Thu nợ', 'Ghi chú'],
        rows: rows.map(v => [fmt(v.plannedDate), v.salesRep, v.customerName, v.customerAddress, v.purpose, v.status, fmt(v.checkInAt), fmt(v.checkOutAt),
          v.distanceMeters, !!v.locationFlag, v.outcome, !!v.orderId, v.collectedAmount, v.notes]),
      };
    }
  }
}

export function registerExportRoutes(app: Express): void {
  app.get('/api/export/:kind', requirePerm('canExportData'), (req, res) => {
    const kind = req.params.kind as Kind;
    if (!KINDS.includes(kind)) return res.status(404).json({ error: `Không có báo cáo "${req.params.kind}"` });
    // Exporting needs the same right as viewing that data (e.g. Thủ kho: stock + orders, not customers / debt).
    const needed = EXPORT_VIEW_PERM[kind];
    if (needed && !hasPerm(req.authUser?.role, needed)) return res.status(403).json({ error: 'Vai trò của bạn không được xuất báo cáo này' });
    const { header, rows } = buildExport(kind, req as any);
    recordAudit({
      userId: req.authUser?.id || '', userName: req.authUser?.name || '', role: req.authUser?.role || '',
      action: 'EXPORT', module: 'Báo cáo', ip: req.ip,
      details: `${kind} · ${rows.length} dòng${req.query.from || req.query.to ? ` · ${req.query.from || '…'} → ${req.query.to || '…'}` : ''}`,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="vitcrm-${FILE_LABEL[kind]}-${stamp}.csv"`);
    res.send(toCsv(header, rows));
  });
}
