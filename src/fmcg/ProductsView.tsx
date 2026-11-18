import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Archive } from 'lucide-react';
import { crm, type Product } from './api';
import { ExportButton } from './ExportButton';
import {
  PageHeader, Card, Input, Select, Textarea, Button, Badge, Loading, ErrorBox, Empty, Modal, Field, MoneyInput,
  Table, MobileList, Th, Td, useLoad, useAction, vnd, PRICE_TIER_LABELS, type PriceTier, type ViewProps,
} from './ui';

const TIERS: PriceTier[] = ['LE', 'NPP', 'DL1', 'DL2', 'GT', 'MT'];
const DEFAULT_CATEGORIES = ['Tinh dầu nguyên chất', 'Mẹ & bé', 'Chăm sóc tóc & da', 'Xịt & nến thơm', 'Máy khuếch tán', 'Quà tặng', 'Khác'];

export function ProductsView({ notify, can, refreshKey }: ViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [tierView, setTierView] = useState<PriceTier>('LE');
  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  const { data, error, loading, reload } = useLoad(() => crm.products.list(), [refreshKey]);
  const { busy, run } = useAction(notify);
  const all = data?.products || [];
  const categories = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...all.map(p => p.category)])], [all]);
  const rows = all.filter(p =>
    (!category || p.category === category) && (!status || p.status === status) &&
    (!search || `${p.name} ${p.sku} ${p.barcode || ''} ${p.brand || ''}`.toLowerCase().includes(search.toLowerCase())));
  const canEdit = can('canManageProducts');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sản phẩm & Bảng giá"
        subtitle="Danh mục SKU, giá theo từng kênh (lẻ, NPP, đại lý, GT, MT), chu kỳ mua lại"
        actions={<>
          {can('canExportData') && <ExportButton defaultKind="products" notify={notify} />}
          {canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Thêm sản phẩm</Button>}
        </>}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, SKU, mã vạch, nhãn hàng…" className="pl-9" />
        </div>
        <Select value={category} onChange={e => setCategory(e.target.value)} className="sm:w-44"><option value="">Mọi ngành hàng</option>{categories.map(c => <option key={c}>{c}</option>)}</Select>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="sm:w-40"><option value="">Mọi trạng thái</option><option>Đang bán</option><option>Sắp ra mắt</option><option>Ngừng bán</option></Select>
        <Select value={tierView} onChange={e => setTierView(e.target.value as PriceTier)} className="sm:w-52" aria-label="Bảng giá hiển thị">
          {TIERS.map(t => <option key={t} value={t}>{PRICE_TIER_LABELS[t]}</option>)}
        </Select>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card>
          {rows.length === 0 ? <Empty text="Chưa có sản phẩm" action={canEdit && <Button onClick={() => setEditing('new')}>Thêm sản phẩm đầu tiên</Button>} /> : (<>
            <MobileList rows={rows} keyOf={p => p.id} onSelect={canEdit ? p => setEditing(p) : undefined} render={p => {
              const cmpTier = tierView === 'LE' ? 'NPP' : tierView;
              const cmp = p.prices[cmpTier];
              const low = typeof p.stock === 'number' && p.stock <= 10;
              return (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="font-semibold text-slate-900">{p.name}</div><div className="text-xs text-slate-400">{p.sku} · {p.category}</div></div>
                    <div className="text-right shrink-0"><div className="font-semibold tabular-nums">{vnd(p.prices.LE)}</div>{cmp ? <div className="text-xs text-slate-500 tabular-nums">{PRICE_TIER_LABELS[cmpTier].replace('Giá ', '')}: {vnd(cmp)}</div> : null}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge tone={p.status === 'Đang bán' ? 'green' : p.status === 'Sắp ra mắt' ? 'sky' : 'slate'}>{p.status}</Badge>
                    <span className={low ? 'text-rose-600 font-bold' : 'text-slate-500'}>Tồn {typeof p.stock === 'number' ? p.stock.toLocaleString('vi-VN') : '—'}{low ? ' · sắp hết' : ''}</span>
                    {p.repurchaseCycleDays ? <span className="text-slate-400 ml-auto">Mua lại {p.repurchaseCycleDays} ngày</span> : null}
                  </div>
                </div>
              );
            }} />
            <Table desktopOnly>
              <thead className="border-b border-slate-100"><tr><Th>Sản phẩm</Th><Th>Ngành hàng</Th><Th className="text-right">Giá lẻ</Th><Th className="text-right">{tierView === 'LE' ? 'Giá NPP' : PRICE_TIER_LABELS[tierView]}</Th><Th className="text-right">Tồn kho</Th><Th>Chu kỳ mua</Th><Th>Trạng thái</Th>{canEdit && <Th />}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(p => {
                  const cmpTier = tierView === 'LE' ? 'NPP' : tierView;
                  const cmp = p.prices[cmpTier];
                  const margin = cmp && p.prices.LE ? Math.round((1 - cmp / p.prices.LE) * 100) : null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <Td><div className="font-semibold text-slate-900">{p.name}</div><div className="text-xs text-slate-400">{p.sku}{p.brand ? ` · ${p.brand}` : ''} · {p.unit}{p.packSize ? ` (${p.packSize})` : ''}</div></Td>
                      <Td className="text-xs">{p.category}</Td>
                      <Td className="text-right tabular-nums font-semibold">{vnd(p.prices.LE)}</Td>
                      <Td className="text-right tabular-nums">{cmp ? <>{vnd(cmp)}{margin !== null && <div className="text-[11px] text-slate-400">-{margin}% so với lẻ</div>}</> : <span className="text-slate-400">= giá lẻ</span>}</Td>
                      <Td className={`text-right tabular-nums ${typeof p.stock === 'number' && p.stock <= 10 ? 'text-rose-600 font-bold' : ''}`}>{typeof p.stock === 'number' ? p.stock.toLocaleString('vi-VN') : '—'}</Td>
                      <Td className="text-xs">{p.repurchaseCycleDays ? `${p.repurchaseCycleDays} ngày` : '—'}</Td>
                      <Td><Badge tone={p.status === 'Đang bán' ? 'green' : p.status === 'Sắp ra mắt' ? 'sky' : 'slate'}>{p.status}</Badge></Td>
                      {canEdit && (
                        <Td className="whitespace-nowrap text-right">
                          <button onClick={() => setEditing(p)} className="p-2 text-slate-400 hover:text-blue-600 cursor-pointer" aria-label="Sửa"><Pencil className="w-4 h-4" /></button>
                          {p.status !== 'Ngừng bán' && (
                            <button disabled={busy} onClick={async () => {
                              if (!confirm(`Ngừng bán / xoá ${p.sku}?`)) return;
                              const r = await run(() => crm.products.remove(p.id));
                              if (r) { notify(r.archived ? `${p.sku} đã có đơn hàng nên được chuyển sang Ngừng bán` : `Đã xoá ${p.sku}`); void reload(); }
                            }} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer" aria-label="Ngừng bán"><Archive className="w-4 h-4" /></button>
                          )}
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </>)}
        </Card>
      )}

      <ProductFormModal
        open={editing !== null}
        editing={editing === 'new' ? null : editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => void reload()}
        notify={notify}
      />
    </div>
  );
}

function ProductFormModal({ open, editing, categories, onClose, onSaved, notify }: {
  open: boolean; editing: Product | null; categories: string[]; onClose: () => void; onSaved: () => void; notify: (m: string) => void;
}) {
  const [d, setD] = useState<Partial<Product>>({});
  const { busy, run } = useAction(notify);
  useEffect(() => {
    if (open) setD(editing ? { ...editing, prices: { ...editing.prices } } : { status: 'Đang bán', unit: 'Thùng', category: categories[0], prices: {}, vatRate: 8 });
  }, [open, editing, categories]);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setD(p => ({ ...p, [k]: v }));
  const setPrice = (t: PriceTier, v: number) => setD(p => ({ ...p, prices: { ...(p.prices || {}), [t]: v || undefined } }));

  const autoFill = () => {
    const le = d.prices?.LE;
    if (!le) return notify('Nhập giá bán lẻ trước');
    const pct: Record<PriceTier, number> = { LE: 1, NPP: 0.72, DL1: 0.78, DL2: 0.82, GT: 0.86, MT: 0.84 };
    setD(p => ({ ...p, prices: Object.fromEntries(TIERS.map(t => [t, Math.round((le * pct[t]) / 100) * 100])) }));
  };

  const save = async () => {
    if (!d.sku?.trim() || !d.name?.trim()) return notify('Nhập SKU và tên sản phẩm');
    if (!d.prices?.LE) return notify('Nhập giá bán lẻ');
    const { id, createdAt, updatedAt, ...payload } = d as Product;
    const r = await run(() => (editing ? crm.products.update(editing.id, payload) : crm.products.create(payload)), editing ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm');
    if (r) { onSaved(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} wide title={editing ? `Sửa ${editing.sku}` : 'Thêm sản phẩm'}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save} disabled={busy}>Lưu</Button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="SKU" required><Input value={d.sku || ''} onChange={e => set('sku', e.target.value.toUpperCase())} /></Field>
          <Field label="Tên sản phẩm" required className="sm:col-span-2"><Input value={d.name || ''} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Nhãn hàng"><Input value={d.brand || ''} onChange={e => set('brand', e.target.value)} /></Field>
          <Field label="Ngành hàng">
            <Input list="product-categories" value={d.category || ''} onChange={e => set('category', e.target.value)} />
            <datalist id="product-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Mã vạch"><Input value={d.barcode || ''} onChange={e => set('barcode', e.target.value)} /></Field>
          <Field label="Đơn vị bán"><Input value={d.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="Thùng, Hộp, Chai…" /></Field>
          <Field label="Quy cách (số đơn vị lẻ)"><Input type="number" min={0} value={d.packSize ?? ''} onChange={e => set('packSize', Number(e.target.value) || undefined)} /></Field>
          <Field label="Trạng thái"><Select value={d.status} onChange={e => set('status', e.target.value as any)}><option>Đang bán</option><option>Sắp ra mắt</option><option>Ngừng bán</option></Select></Field>
        </div>

        <div className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Bảng giá (đã gồm VAT, theo đơn vị bán)</div>
            <Button variant="ghost" onClick={autoFill}>Gợi ý từ giá lẻ</Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {TIERS.map(t => (
              <Field key={t} label={PRICE_TIER_LABELS[t]} required={t === 'LE'}><MoneyInput value={d.prices?.[t]} onChange={v => setPrice(t, v)} /></Field>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <Field label="Giá vốn"><MoneyInput value={d.cost} onChange={v => set('cost', v || undefined)} /></Field>
          <Field label="VAT %"><Input type="number" min={0} max={20} value={d.vatRate ?? ''} onChange={e => set('vatRate', Number(e.target.value) || 0)} /></Field>
          {editing
            ? <Field label="Tồn kho" hint="Thay đổi qua Kho hàng (nhập / xuất / kiểm kê)"><Input value={(d.stock ?? 0).toLocaleString('vi-VN')} disabled /></Field>
            : <Field label="Tồn đầu kỳ" hint="Ghi thành lô TON-DAU; nhập theo lô & HSD ở mục Kho hàng"><Input type="number" min={0} value={d.stock ?? ''} onChange={e => set('stock', e.target.value === '' ? undefined : Number(e.target.value))} /></Field>}
          <Field label="Chu kỳ mua lại (ngày)" hint="Dùng để nhắc khách B2C mua lại"><Input type="number" min={0} value={d.repurchaseCycleDays ?? ''} onChange={e => set('repurchaseCycleDays', Number(e.target.value) || undefined)} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <label className="flex items-center gap-2 text-sm py-2">
            <input type="checkbox" checked={d.trackExpiry !== false} onChange={e => set('trackExpiry', e.target.checked)} />
            Quản lý hạn sử dụng (bắt buộc nhập HSD khi nhập kho)
          </label>
          {d.trackExpiry !== false && (
            <Field label="Cảnh báo cận date trước (ngày)" hint="Mặc định 90 ngày"><Input type="number" min={1} value={d.expiryWarningDays ?? ''} placeholder="90" onChange={e => set('expiryWarningDays', Number(e.target.value) || undefined)} /></Field>
          )}
        </div>
        <Field label="Mô tả"><Textarea rows={2} value={d.description || ''} onChange={e => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
