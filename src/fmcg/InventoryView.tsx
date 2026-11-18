import React, { useEffect, useMemo, useState } from 'react';
import { PackagePlus, PackageMinus, ClipboardCheck, Plus, Trash2, Search, Route } from 'lucide-react';
import { crm, type LotView, type StockRow, type InventoryVoucher, type Product, type ExpiryStatus } from './api';
import {
  PageHeader, Card, Tabs, Stat, Table, MobileList, Th, Td, Badge, Button, Modal, Drawer, Field, Input, Select, Textarea,
  Loading, ErrorBox, Empty, useLoad, useAction, vnd, shortVnd, fmtDate, fmtDateTime, today, type ViewProps, type Tone,
} from './ui';
import { ExportButton } from './ExportButton';

const EXPIRY_TONE: Record<ExpiryStatus, Tone> = { 'Hết hạn': 'red', 'Cận date': 'amber', 'Còn hạn': 'green', 'Không hạn': 'slate' };
const MOVE_IN = (q: number) => q > 0;

function ExpiryBadge({ lot }: { lot: Pick<LotView, 'status' | 'daysLeft'> }) {
  const text = lot.status === 'Hết hạn' ? `Hết hạn ${Math.abs(lot.daysLeft || 0)} ngày`
    : lot.status === 'Không hạn' ? 'Không hạn' : `Còn ${lot.daysLeft} ngày`;
  return <Badge tone={EXPIRY_TONE[lot.status]}>{text}</Badge>;
}

type Section = 'stock' | 'expiry' | 'vouchers' | 'card';
type Dialog = { kind: 'receipt' } | { kind: 'issue'; preset?: { reason: string; lot: LotView } } | { kind: 'count'; productId?: string } | null;

export function InventoryView(props: ViewProps) {
  const { notify, can, refreshKey } = props;
  const [section, setSection] = useState<Section>('stock');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [traceLot, setTraceLot] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const key = refreshKey + bump;
  const manage = can('canManageInventory');
  const done = () => { setDialog(null); setBump(b => b + 1); };

  return (
    <div className="space-y-4">
      <PageHeader title="Kho hàng" subtitle="Tồn kho theo lô, hạn sử dụng, phiếu nhập – xuất, kiểm kê, truy xuất lô"
        actions={<>
          {can('canExportData') && <ExportButton defaultKind="stock-lots" notify={notify} />}
          {manage && <>
            <Button onClick={() => setDialog({ kind: 'receipt' })}><PackagePlus className="w-4 h-4" /> Nhập kho</Button>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'issue' })}><PackageMinus className="w-4 h-4" /> Xuất kho</Button>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'count' })}><ClipboardCheck className="w-4 h-4" /> Kiểm kê</Button>
          </>}
        </>} />
      <Tabs<Section> value={section} onChange={setSection} items={[
        { id: 'stock', label: 'Tồn kho' }, { id: 'expiry', label: 'Hạn sử dụng' }, { id: 'vouchers', label: 'Phiếu nhập / xuất' }, { id: 'card', label: 'Thẻ kho' },
      ]} />
      {section === 'stock' && <StockPanel refreshKey={key} onOpen={setProductId} />}
      {section === 'expiry' && <ExpiryPanel refreshKey={key} manage={manage} onTrace={setTraceLot} onWriteOff={lot => setDialog({ kind: 'issue', preset: { reason: 'Xuất huỷ', lot } })} />}
      {section === 'vouchers' && <VouchersPanel refreshKey={key} />}
      {section === 'card' && <CardPanel refreshKey={key} />}

      {productId && <ProductStockDrawer productId={productId} refreshKey={key} onClose={() => setProductId(null)} onTrace={setTraceLot}
        onCount={manage ? () => { setDialog({ kind: 'count', productId }); setProductId(null); } : undefined} />}
      {traceLot && <TraceModal lotId={traceLot} onClose={() => setTraceLot(null)} />}
      {dialog?.kind === 'receipt' && <ReceiptModal notify={notify} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'issue' && <IssueModal notify={notify} preset={dialog.preset} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'count' && <CountModal notify={notify} productId={dialog.productId} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  );
}

// ================================================================ stock
function StockPanel({ refreshKey, onOpen }: { refreshKey: number; onOpen: (id: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => crm.inventory.summary(), [refreshKey]);
  const [q, setQ] = useState('');
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const t = data!.totals;
  const rows = data!.rows.filter(r => r.status !== 'Ngừng bán' || r.total > 0)
    .filter(r => !q || `${r.sku} ${r.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Tổng tồn kho" value={t.units.toLocaleString('vi-VN')} hint={`Giá trị vốn ${shortVnd(t.value)}`} />
        <Stat label="Sản phẩm sắp hết" value={data!.rows.filter(r => r.status === 'Đang bán' && r.sellable <= 10).length} tone={data!.rows.some(r => r.status === 'Đang bán' && r.sellable <= 10) ? 'amber' : undefined} hint="Còn bán được ≤ 10" />
        <Stat label="Lô cận date" value={t.nearExpiryLots} tone={t.nearExpiryLots ? 'amber' : undefined} />
        <Stat label="Lô hết hạn còn trong kho" value={t.expiredLots} tone={t.expiredLots ? 'red' : 'green'} hint={t.expiredUnits ? `${t.expiredUnits} đơn vị — cần xuất huỷ` : 'Không có'} />
      </div>
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm SKU, tên sản phẩm…" className="pl-9" /></div>
      <Card>
        {rows.length === 0 ? <Empty text="Chưa có sản phẩm" /> : (<>
          <MobileList rows={rows} keyOf={r => r.productId} onSelect={r => onOpen(r.productId)} render={(r: StockRow) => (
            <div className="space-y-1">
              <div className="flex justify-between gap-3"><div className="min-w-0"><div className="font-semibold">{r.name}</div><div className="text-xs text-slate-400">{r.sku} · {r.lotCount} lô</div></div>
                <div className="text-right shrink-0"><div className="font-bold tabular-nums">{r.total.toLocaleString('vi-VN')}</div><div className="text-xs text-slate-500">{r.unit}</div></div></div>
              <div className="flex flex-wrap gap-1 text-xs">
                {r.expired > 0 && <Badge tone="red">Hết hạn {r.expired}</Badge>}
                {r.nearExpiry > 0 && <Badge tone="amber">Cận date {r.nearExpiry}</Badge>}
                {r.nextExpiry && <span className="text-slate-500">HSD gần nhất {fmtDate(r.nextExpiry)}</span>}
              </div>
            </div>
          )} />
          <Table desktopOnly>
            <thead className="border-b border-slate-100"><tr><Th>Sản phẩm</Th><Th className="text-right">Tồn kho</Th><Th className="text-right">Bán được</Th><Th className="text-right">Cận date</Th><Th className="text-right">Hết hạn</Th><Th>HSD gần nhất</Th><Th className="text-right">Số lô</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.productId} onClick={() => onOpen(r.productId)} className="hover:bg-slate-50 cursor-pointer">
                  <Td><div className="font-semibold text-slate-900">{r.name}</div><div className="text-xs text-slate-400">{r.sku} · {r.unit}</div></Td>
                  <Td className="text-right tabular-nums font-semibold">{r.total.toLocaleString('vi-VN')}</Td>
                  <Td className={`text-right tabular-nums ${r.status === 'Đang bán' && r.sellable <= 10 ? 'text-rose-600 font-bold' : ''}`}>{r.sellable.toLocaleString('vi-VN')}</Td>
                  <Td className="text-right tabular-nums">{r.nearExpiry ? <span className="text-amber-700 font-semibold">{r.nearExpiry}</span> : '—'}</Td>
                  <Td className="text-right tabular-nums">{r.expired ? <span className="text-rose-600 font-bold">{r.expired}</span> : '—'}</Td>
                  <Td className="text-xs">{r.trackExpiry ? (r.nextExpiry ? fmtDate(r.nextExpiry) : '—') : 'Không theo dõi HSD'}</Td>
                  <Td className="text-right tabular-nums">{r.lotCount}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>)}
      </Card>
    </>
  );
}

function LotsList({ lots, onTrace, action }: { lots: LotView[]; onTrace: (id: string) => void; action?: (l: LotView) => React.ReactNode }) {
  if (!lots.length) return <Empty text="Không có lô hàng" />;
  return (<>
    <MobileList rows={lots} keyOf={l => l.id} render={l => (
      <div className="space-y-1.5">
        <div className="flex justify-between gap-3"><div className="min-w-0"><div className="font-semibold">{l.name}</div><div className="text-xs text-slate-500">Lô <b>{l.lotNo}</b> · HSD {l.expiryDate ? fmtDate(l.expiryDate) : '—'}</div></div>
          <div className="font-bold tabular-nums shrink-0">{l.qty.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">{l.unit}</span></div></div>
        <div className="flex flex-wrap items-center gap-2"><ExpiryBadge lot={l} />
          <button onClick={() => onTrace(l.id)} className="text-xs font-bold text-blue-700 cursor-pointer py-1">Truy xuất lô</button>
          {action?.(l)}</div>
      </div>
    )} />
    <Table desktopOnly>
      <thead className="border-b border-slate-100"><tr><Th>Sản phẩm</Th><Th>Số lô</Th><Th>NSX</Th><Th>HSD</Th><Th>Tình trạng</Th><Th className="text-right">Tồn</Th><Th /></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {lots.map(l => (
          <tr key={l.id}>
            <Td><div className="font-semibold">{l.name}</div><div className="text-xs text-slate-400">{l.sku}</div></Td>
            <Td className="font-mono text-xs">{l.lotNo}</Td>
            <Td className="text-xs">{l.mfgDate ? fmtDate(l.mfgDate) : '—'}</Td>
            <Td className="text-xs font-semibold">{l.expiryDate ? fmtDate(l.expiryDate) : '—'}</Td>
            <Td><ExpiryBadge lot={l} /></Td>
            <Td className="text-right tabular-nums font-semibold">{l.qty.toLocaleString('vi-VN')}</Td>
            <Td className="text-right whitespace-nowrap">
              <Button variant="ghost" onClick={() => onTrace(l.id)}><Route className="w-3.5 h-3.5" /> Truy xuất</Button>
              {action?.(l)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  </>);
}

// ================================================================ expiry
function ExpiryPanel({ refreshKey, manage, onTrace, onWriteOff }: { refreshKey: number; manage: boolean; onTrace: (id: string) => void; onWriteOff: (l: LotView) => void }) {
  const [filter, setFilter] = useState<'risk' | 'Hết hạn' | 'Cận date' | 'all'>('risk');
  const { data, error, loading, reload } = useLoad(() => crm.inventory.lots(), [refreshKey]);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const lots = data!.lots;
  const shown = lots.filter(l => filter === 'all' ? true : filter === 'risk' ? l.status === 'Hết hạn' || l.status === 'Cận date' : l.status === filter);
  const count = (s: ExpiryStatus) => lots.filter(l => l.status === s).length;
  return (
    <>
      <Tabs value={filter} onChange={setFilter} items={[
        { id: 'risk', label: `Cần xử lý (${count('Hết hạn') + count('Cận date')})` },
        { id: 'Hết hạn', label: `Hết hạn (${count('Hết hạn')})` },
        { id: 'Cận date', label: `Cận date (${count('Cận date')})` },
        { id: 'all', label: `Tất cả lô (${lots.length})` },
      ]} />
      <p className="text-xs text-slate-500">Hàng hết hạn <b>không được xuất bán</b> — hệ thống tự xuất lô có hạn gần nhất trước (FEFO). Cận date: còn ≤ 90 ngày (chỉnh riêng từng sản phẩm trong mục Sản phẩm). Gợi ý: tạo chương trình khuyến mãi để đẩy hàng cận date.</p>
      <Card>
        <LotsList lots={shown} onTrace={onTrace} action={manage ? l => l.status === 'Hết hạn' && (
          <Button variant="danger" className="!py-1" onClick={() => onWriteOff(l)}><Trash2 className="w-3.5 h-3.5" /> Xuất huỷ</Button>
        ) : undefined} />
      </Card>
    </>
  );
}

// ================================================================ vouchers
const KIND_LABEL: Record<InventoryVoucher['kind'], { label: string; tone: Tone }> = { in: { label: 'Nhập', tone: 'green' }, out: { label: 'Xuất', tone: 'red' }, count: { label: 'Kiểm kê', tone: 'blue' } };

function VouchersPanel({ refreshKey }: { refreshKey: number }) {
  const { data, error, loading, reload } = useLoad(() => crm.inventory.vouchers(), [refreshKey]);
  const [open, setOpen] = useState<InventoryVoucher | null>(null);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const rows = data!.vouchers;
  return (
    <Card>
      <p className="text-xs text-slate-500 px-4 pt-3">Xuất bán theo đơn hàng được ghi tự động vào Thẻ kho, không cần lập phiếu.</p>
      {rows.length === 0 ? <Empty text="Chưa có phiếu nào" /> : (<>
        <MobileList rows={rows} keyOf={v => v.id} onSelect={v => setOpen(v)} render={v => (
          <div className="flex justify-between gap-3">
            <div className="min-w-0"><div className="font-semibold">{v.code} <Badge tone={KIND_LABEL[v.kind].tone}>{KIND_LABEL[v.kind].label}</Badge></div><div className="text-xs text-slate-500">{v.reason}{v.partner ? ` · ${v.partner}` : ''}</div><div className="text-xs text-slate-400">{fmtDateTime(v.createdAt)} · {v.createdBy}</div></div>
            <div className="text-right text-sm tabular-nums shrink-0">{v.lines.length} dòng</div>
          </div>
        )} />
        <Table desktopOnly>
          <thead className="border-b border-slate-100"><tr><Th>Số phiếu</Th><Th>Loại</Th><Th>Lý do</Th><Th>Đối tác / ghi chú</Th><Th className="text-right">Số dòng</Th><Th className="text-right">Số lượng</Th><Th>Người lập</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(v => (
              <tr key={v.id} onClick={() => setOpen(v)} className="hover:bg-slate-50 cursor-pointer">
                <Td><div className="font-semibold whitespace-nowrap">{v.code}</div><div className="text-xs text-slate-400">{fmtDateTime(v.createdAt)}</div></Td>
                <Td><Badge tone={KIND_LABEL[v.kind].tone}>{KIND_LABEL[v.kind].label}</Badge></Td>
                <Td className="text-xs">{v.reason}</Td>
                <Td className="text-xs max-w-64 truncate">{v.partner || v.note || '—'}</Td>
                <Td className="text-right tabular-nums">{v.lines.length}</Td>
                <Td className="text-right tabular-nums">{v.lines.reduce((s, l) => s + Math.abs(l.qty), 0).toLocaleString('vi-VN')}</Td>
                <Td className="text-xs">{v.createdBy}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>)}
      {open && (
        <Modal open onClose={() => setOpen(null)} wide title={`${open.code} · ${open.reason}`}>
          <div className="space-y-3 text-sm">
            <div className="text-slate-600">{fmtDateTime(open.createdAt)} · {open.createdBy}{open.partner ? ` · ${open.partner}` : ''}</div>
            {open.note && <p className="bg-slate-50 rounded-xl p-3">{open.note}</p>}
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {open.lines.map((l, i) => (
                <li key={i} className="px-3 py-2 flex justify-between gap-3">
                  <div><div className="font-semibold">{l.name}</div><div className="text-xs text-slate-500">{l.sku} · lô {l.lotNo}{l.expiryDate ? ` · HSD ${fmtDate(l.expiryDate)}` : ''}{open.kind === 'count' ? ` · sổ sách ${l.systemQty}` : ''}</div></div>
                  <div className={`font-bold tabular-nums ${open.kind === 'in' || (open.kind === 'count' && l.qty > 0) ? 'text-emerald-700' : 'text-rose-600'}`}>{open.kind === 'in' || l.qty > 0 ? '+' : ''}{open.kind === 'out' ? -l.qty : l.qty}</div>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </Card>
  );
}

// ================================================================ stock card
function CardPanel({ refreshKey }: { refreshKey: number }) {
  const products = useLoad(() => crm.products.list(), []);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const { data, error, loading, reload } = useLoad(() => crm.inventory.moves({ productId: productId || undefined, type: type || undefined }), [refreshKey, productId, type]);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const rows = data?.moves || [];
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={productId} onChange={e => setProductId(e.target.value)} className="sm:w-80" aria-label="Lọc theo sản phẩm"><option value="">Tất cả sản phẩm</option>{(products.data?.products || []).map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</Select>
        <Select value={type} onChange={e => setType(e.target.value)} className="sm:w-56" aria-label="Lọc theo loại"><option value="">Mọi loại</option>{['Nhập mua', 'Nhập trả hàng', 'Nhập khác', 'Tồn đầu kỳ', 'Xuất bán', 'Xuất huỷ', 'Xuất mẫu / tặng', 'Xuất khác', 'Hoàn kho huỷ đơn', 'Điều chỉnh kiểm kê'].map(t => <option key={t}>{t}</option>)}</Select>
      </div>
      <Card>
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty text="Chưa có biến động" /> : (<>
          <MobileList rows={rows} keyOf={m => m.id} render={m => (
            <div className="flex justify-between gap-3 text-sm">
              <div className="min-w-0"><div className="font-semibold">{m.type} <span className="text-xs font-normal text-slate-400">{m.ref}</span></div><div className="text-xs text-slate-500">{m.sku} · lô {m.lotNo} · {fmtDateTime(m.at)}</div>{m.note && <div className="text-xs text-slate-400 truncate">{m.note}</div>}</div>
              <div className="text-right shrink-0"><div className={`font-bold tabular-nums ${MOVE_IN(m.qty) ? 'text-emerald-700' : 'text-rose-600'}`}>{MOVE_IN(m.qty) ? '+' : ''}{m.qty}</div><div className="text-xs text-slate-400">tồn {m.balanceAfter}</div></div>
            </div>
          )} />
          <Table desktopOnly>
            <thead className="border-b border-slate-100"><tr><Th>Thời gian</Th><Th>Loại</Th><Th>Chứng từ</Th><Th>Sản phẩm</Th><Th>Lô / HSD</Th><Th className="text-right">Nhập / xuất</Th><Th className="text-right">Tồn sau</Th><Th>Người / ghi chú</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(m => (
                <tr key={m.id}>
                  <Td className="text-xs whitespace-nowrap">{fmtDateTime(m.at)}</Td>
                  <Td className="text-xs">{m.type}</Td>
                  <Td className="text-xs font-semibold whitespace-nowrap">{m.ref || '—'}</Td>
                  <Td className="text-xs">{m.sku}</Td>
                  <Td className="text-xs"><span className="font-mono">{m.lotNo}</span>{m.expiryDate ? ` · ${fmtDate(m.expiryDate)}` : ''}</Td>
                  <Td className={`text-right tabular-nums font-bold ${MOVE_IN(m.qty) ? 'text-emerald-700' : 'text-rose-600'}`}>{MOVE_IN(m.qty) ? '+' : ''}{m.qty.toLocaleString('vi-VN')}</Td>
                  <Td className="text-right tabular-nums">{m.balanceAfter.toLocaleString('vi-VN')}</Td>
                  <Td className="text-xs text-slate-500 max-w-56 truncate">{m.by}{m.note ? ` · ${m.note}` : ''}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>)}
      </Card>
    </>
  );
}

// ================================================================ product drawer
function ProductStockDrawer({ productId, refreshKey, onClose, onTrace, onCount }: { productId: string; refreshKey: number; onClose: () => void; onTrace: (id: string) => void; onCount?: () => void }) {
  const lots = useLoad(() => crm.inventory.lots({ productId }), [productId, refreshKey]);
  const moves = useLoad(() => crm.inventory.moves({ productId, limit: 50 }), [productId, refreshKey]);
  const name = lots.data?.lots[0]?.name || moves.data?.moves[0]?.sku || 'Sản phẩm';
  return (
    <Drawer open onClose={onClose} title={name} actions={onCount && <Button variant="secondary" onClick={onCount}><ClipboardCheck className="w-4 h-4" /> Kiểm kê</Button>}>
      <Card title="Các lô đang tồn">{lots.loading && !lots.data ? <Loading /> : <LotsList lots={lots.data?.lots || []} onTrace={onTrace} />}</Card>
      <Card title="Thẻ kho (50 biến động gần nhất)">
        {moves.loading && !moves.data ? <Loading /> : (moves.data?.moves || []).length === 0 ? <Empty text="Chưa có biến động" /> : (
          <ul className="divide-y divide-slate-100">
            {moves.data!.moves.map(m => (
              <li key={m.id} className="px-4 py-2.5 flex justify-between gap-3 text-sm">
                <div className="min-w-0"><div className="font-semibold">{m.type} <span className="text-xs font-normal text-slate-400">{m.ref}</span></div><div className="text-xs text-slate-500">lô {m.lotNo} · {fmtDateTime(m.at)}{m.note ? ` · ${m.note}` : ''}</div></div>
                <div className="text-right shrink-0"><div className={`font-bold tabular-nums ${MOVE_IN(m.qty) ? 'text-emerald-700' : 'text-rose-600'}`}>{MOVE_IN(m.qty) ? '+' : ''}{m.qty}</div><div className="text-xs text-slate-400">tồn {m.balanceAfter}</div></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Drawer>
  );
}

// ================================================================ trace
function TraceModal({ lotId, onClose }: { lotId: string; onClose: () => void }) {
  const { data, error, loading } = useLoad(() => crm.inventory.trace(lotId), [lotId]);
  return (
    <Modal open onClose={onClose} wide title={data ? `Truy xuất lô ${data.lot.lotNo} · ${data.lot.name}` : 'Truy xuất lô'}>
      {error ? <ErrorBox error={error} /> : loading || !data ? <Loading /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <ExpiryBadge lot={data.lot} />
            <span className="text-slate-600">NSX {data.lot.mfgDate ? fmtDate(data.lot.mfgDate) : '—'} · HSD {data.lot.expiryDate ? fmtDate(data.lot.expiryDate) : '—'} · còn {data.lot.qty} {data.lot.unit}</span>
          </div>
          <div>
            <div className="font-bold mb-1">Đã giao cho {data.orders.length} đơn hàng</div>
            {data.orders.length === 0 ? <p className="text-slate-400">Chưa xuất bán từ lô này.</p> : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {data.orders.map(o => (
                  <li key={o.id} className="px-3 py-2 flex justify-between gap-3">
                    <div><div className="font-semibold">{o.customerName} <span className="text-xs font-normal text-slate-400">{o.customerPhone}</span></div><div className="text-xs text-slate-500">{o.code} · {fmtDateTime(o.createdAt)} · {o.status}</div></div>
                    <div className="font-bold tabular-nums">{o.qty}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="font-bold mb-1">Lịch sử lô</div>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {data.moves.map(m => (
                <li key={m.id} className="px-3 py-2 flex justify-between gap-3">
                  <div><div>{m.type} <span className="text-xs text-slate-400">{m.ref}</span></div><div className="text-xs text-slate-500">{fmtDateTime(m.at)} · {m.by}{m.note ? ` · ${m.note}` : ''}</div></div>
                  <div className={`font-bold tabular-nums ${MOVE_IN(m.qty) ? 'text-emerald-700' : 'text-rose-600'}`}>{MOVE_IN(m.qty) ? '+' : ''}{m.qty}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ================================================================ receipt
interface RLine { productId: string; lotNo: string; mfgDate: string; expiryDate: string; qty: number; cost: number }
const blankLine = (): RLine => ({ productId: '', lotNo: '', mfgDate: '', expiryDate: '', qty: 0, cost: 0 });

function ReceiptModal({ notify, onClose, onDone }: { notify: (m: string) => void; onClose: () => void; onDone: () => void }) {
  const products = useLoad(() => crm.products.list(), []);
  const list = (products.data?.products || []).filter(p => p.status !== 'Ngừng bán');
  const [reason, setReason] = useState('Nhập mua');
  const [partner, setPartner] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<RLine[]>([blankLine()]);
  const { busy, run } = useAction(notify);
  const set = (i: number, patch: Partial<RLine>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const prod = (id: string) => list.find(p => p.id === id);

  const save = async () => {
    const valid = lines.filter(l => l.productId && l.qty > 0);
    if (!valid.length) return notify('Thêm ít nhất 1 dòng có sản phẩm và số lượng');
    const r = await run(() => crm.inventory.receipt({
      reason, partner: partner || undefined, note: note || undefined,
      lines: valid.map(l => ({ productId: l.productId, lotNo: l.lotNo, mfgDate: l.mfgDate || undefined, expiryDate: l.expiryDate || undefined, qty: l.qty, cost: l.cost || undefined })),
    }));
    if (r) { notify(`Đã lập phiếu nhập ${r.voucher.code}`); onDone(); }
  };

  return (
    <Modal open onClose={onClose} wide title="Phiếu nhập kho"
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy} onClick={save}>Lưu phiếu nhập</Button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Loại nhập"><Select value={reason} onChange={e => setReason(e.target.value)}><option>Nhập mua</option><option>Nhập trả hàng</option><option>Nhập khác</option></Select></Field>
          <Field label={reason === 'Nhập trả hàng' ? 'Khách trả hàng' : 'Nhà cung cấp / nguồn'} className="sm:col-span-2"><Input value={partner} onChange={e => setPartner(e.target.value)} placeholder="VD: Nhà máy Pure — Bình Dương" /></Field>
        </div>
        <div className="space-y-3">
          {lines.map((l, i) => {
            const p = prod(l.productId);
            const needsExpiry = p ? p.trackExpiry !== false : true;
            return (
              <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-3">
                <div className="flex gap-2 items-end">
                  <Field label={`Sản phẩm ${lines.length > 1 ? i + 1 : ''}`} className="flex-1">
                    <Select value={l.productId} onChange={e => { const np = prod(e.target.value); set(i, { productId: e.target.value, cost: l.cost || np?.cost || 0 }); }}>
                      <option value="">— Chọn sản phẩm —</option>{list.map(x => <option key={x.id} value={x.id}>{x.sku} · {x.name}</option>)}
                    </Select>
                  </Field>
                  {lines.length > 1 && <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="p-2.5 text-slate-400 hover:text-rose-600 cursor-pointer" aria-label={`Xoá dòng ${i + 1}`}><Trash2 className="w-4 h-4" /></button>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Field label="Số lô" required><Input value={l.lotNo} onChange={e => set(i, { lotNo: e.target.value.toUpperCase() })} placeholder="L2611-01" autoCapitalize="characters" /></Field>
                  <Field label="Ngày SX"><Input type="date" value={l.mfgDate} max={today()} onChange={e => set(i, { mfgDate: e.target.value })} /></Field>
                  {needsExpiry
                    ? <Field label="Hạn sử dụng" required><Input type="date" value={l.expiryDate} onChange={e => set(i, { expiryDate: e.target.value })} /></Field>
                    : <div className="text-xs text-slate-400 self-center">Không theo dõi HSD</div>}
                  <Field label="Số lượng" required><Input type="number" inputMode="numeric" min={1} value={l.qty || ''} onChange={e => set(i, { qty: Math.max(0, Math.round(Number(e.target.value) || 0)) })} /></Field>
                  <Field label="Giá vốn / đv"><Input type="number" inputMode="numeric" min={0} value={l.cost || ''} onChange={e => set(i, { cost: Math.max(0, Number(e.target.value) || 0) })} /></Field>
                </div>
                {needsExpiry && l.expiryDate && l.expiryDate < today() && <div className="text-xs text-rose-600">Hạn sử dụng đã qua — lô này sẽ không bán được.</div>}
              </div>
            );
          })}
          <Button variant="ghost" onClick={() => setLines(ls => [...ls, blankLine()])}><Plus className="w-4 h-4" /> Thêm dòng</Button>
        </div>
        <Field label="Ghi chú"><Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Số hoá đơn, biển số xe giao hàng…" /></Field>
        <div className="text-sm text-right text-slate-600">Tổng: <b>{lines.reduce((s, l) => s + (l.qty || 0), 0).toLocaleString('vi-VN')}</b> đơn vị · giá trị <b>{vnd(lines.reduce((s, l) => s + (l.qty || 0) * (l.cost || 0), 0))}</b></div>
      </div>
    </Modal>
  );
}

// ================================================================ issue
function IssueModal({ notify, preset, onClose, onDone }: { notify: (m: string) => void; preset?: { reason: string; lot: LotView }; onClose: () => void; onDone: () => void }) {
  const lotsQ = useLoad(() => crm.inventory.lots(), []);
  const lots = lotsQ.data?.lots || [];
  const [reason, setReason] = useState(preset?.reason || 'Xuất mẫu / tặng');
  const [partner, setPartner] = useState('');
  const [note, setNote] = useState(preset ? `Huỷ lô hết hạn ${preset.lot.lotNo}` : '');
  const [lines, setLines] = useState<Array<{ lotId: string; qty: number }>>(preset ? [{ lotId: preset.lot.id, qty: preset.lot.qty }] : [{ lotId: '', qty: 0 }]);
  const { busy, run } = useAction(notify);
  const lotOf = (id: string) => lots.find(l => l.id === id);
  const set = (i: number, patch: Partial<{ lotId: string; qty: number }>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = async () => {
    const valid = lines.filter(l => l.lotId && l.qty > 0);
    if (!valid.length) return notify('Chọn lô và số lượng xuất');
    const r = await run(() => crm.inventory.issue({ reason, partner: partner || undefined, note: note || undefined, lines: valid }));
    if (r) { notify(`Đã lập phiếu xuất ${r.voucher.code}`); onDone(); }
  };

  return (
    <Modal open onClose={onClose} wide title="Phiếu xuất kho"
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button variant={reason === 'Xuất huỷ' ? 'danger' : 'primary'} disabled={busy} onClick={save}>Lưu phiếu xuất</Button></>}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Hàng bán cho khách được xuất tự động khi đơn được xác nhận. Dùng phiếu này cho hàng huỷ, hàng mẫu, quà tặng, xuất khác.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Lý do xuất"><Select value={reason} onChange={e => setReason(e.target.value)}><option>Xuất huỷ</option><option>Xuất mẫu / tặng</option><option>Xuất khác</option></Select></Field>
          <Field label={reason === 'Xuất huỷ' ? 'Hội đồng / người xác nhận huỷ' : 'Người nhận'} className="sm:col-span-2"><Input value={partner} onChange={e => setPartner(e.target.value)} /></Field>
        </div>
        {lotsQ.loading && !lotsQ.data ? <Loading /> : (
          <div className="space-y-3">
            {lines.map((l, i) => {
              const lot = lotOf(l.lotId);
              return (
                <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_auto] gap-2 items-end border border-slate-200 rounded-xl p-3">
                  <Field label={`Lô hàng ${lines.length > 1 ? i + 1 : ''}`} className="col-span-2 sm:col-span-1">
                    <Select value={l.lotId} onChange={e => set(i, { lotId: e.target.value, qty: Math.min(l.qty || 1, lotOf(e.target.value)?.qty || 0) })}>
                      <option value="">— Chọn lô —</option>
                      {lots.map(x => <option key={x.id} value={x.id}>{x.sku} · lô {x.lotNo} · {x.expiryDate ? `HSD ${fmtDate(x.expiryDate)}` : 'không hạn'} · còn {x.qty}{x.status === 'Hết hạn' ? ' · HẾT HẠN' : x.status === 'Cận date' ? ' · cận date' : ''}</option>)}
                    </Select>
                  </Field>
                  <Field label={lot ? `Số lượng (tối đa ${lot.qty})` : 'Số lượng'}><Input type="number" inputMode="numeric" min={1} max={lot?.qty} value={l.qty || ''} onChange={e => set(i, { qty: Math.max(0, Math.round(Number(e.target.value) || 0)) })} /></Field>
                  {lines.length > 1 ? <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="p-2.5 text-slate-400 hover:text-rose-600 cursor-pointer" aria-label={`Xoá dòng ${i + 1}`}><Trash2 className="w-4 h-4" /></button> : <span />}
                </div>
              );
            })}
            <Button variant="ghost" onClick={() => setLines(ls => [...ls, { lotId: '', qty: 0 }])}><Plus className="w-4 h-4" /> Thêm dòng</Button>
          </div>
        )}
        <Field label="Ghi chú / lý do chi tiết"><Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ================================================================ count
function CountModal({ notify, productId: initial, onClose, onDone }: { notify: (m: string) => void; productId?: string; onClose: () => void; onDone: () => void }) {
  const products = useLoad(() => crm.products.list(), []);
  const [productId, setProductId] = useState(initial || '');
  const lotsQ = useLoad(() => (productId ? crm.inventory.lots({ productId }) : Promise.resolve({ lots: [] as LotView[], total: 0 })), [productId]);
  const [actual, setActual] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const { busy, run } = useAction(notify);
  useEffect(() => { setActual({}); }, [productId]);
  const lots = lotsQ.data?.lots || [];
  const diffs = useMemo(() => lots.map(l => ({ lot: l, actual: actual[l.id] === undefined || actual[l.id] === '' ? l.qty : Math.max(0, Math.round(Number(actual[l.id]) || 0)) })).filter(x => x.actual !== x.lot.qty), [lots, actual]);
  const list: Product[] = products.data?.products || [];

  const save = async () => {
    if (!diffs.length) return notify('Số thực tế khớp sổ sách — không cần điều chỉnh');
    const r = await run(() => crm.inventory.count({ note: note || undefined, lines: diffs.map(d => ({ lotId: d.lot.id, actualQty: d.actual })) }));
    if (r) { notify(`Đã lập phiếu kiểm kê ${r.voucher.code} (${diffs.length} lô điều chỉnh)`); onDone(); }
  };

  return (
    <Modal open onClose={onClose} wide title="Kiểm kê kho"
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || !diffs.length} onClick={save}>Lưu kết quả kiểm kê</Button></>}>
      <div className="space-y-4">
        <Field label="Sản phẩm"><Select value={productId} onChange={e => setProductId(e.target.value)}><option value="">— Chọn sản phẩm —</option>{list.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</Select></Field>
        {productId && (lotsQ.loading && !lotsQ.data ? <Loading /> : lots.length === 0 ? <Empty text="Sản phẩm không còn lô nào trong kho" /> : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {lots.map(l => {
              const a = actual[l.id];
              const diff = a === undefined || a === '' ? 0 : Math.max(0, Math.round(Number(a) || 0)) - l.qty;
              return (
                <li key={l.id} className="p-3 grid grid-cols-[1fr_110px] gap-3 items-center">
                  <div><div className="font-semibold">Lô {l.lotNo}</div><div className="text-xs text-slate-500">HSD {l.expiryDate ? fmtDate(l.expiryDate) : '—'} · sổ sách <b>{l.qty}</b>{diff ? <span className={diff > 0 ? 'text-emerald-700' : 'text-rose-600'}> · {diff > 0 ? 'thừa' : 'thiếu'} {Math.abs(diff)}</span> : null}</div></div>
                  <label className="text-[11px] font-semibold text-slate-500">Thực tế
                    <Input type="number" inputMode="numeric" min={0} value={a ?? ''} placeholder={String(l.qty)} onChange={e => setActual(s => ({ ...s, [l.id]: e.target.value }))} className="mt-1 text-center" />
                  </label>
                </li>
              );
            })}
          </ul>
        ))}
        <Field label="Ghi chú"><Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Người kiểm, nguyên nhân chênh lệch…" /></Field>
      </div>
    </Modal>
  );
}
