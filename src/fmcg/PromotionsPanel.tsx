import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Gift, Percent, BadgeDollarSign, Pencil } from 'lucide-react';
import { crm, type Promotion, type Product } from './api';
import {
  Card, Button, Badge, Loading, ErrorBox, Empty, Modal, Field, Input, Select, Textarea, MoneyInput,
  Table, Th, Td, useLoad, useAction, vnd, fmtDate, today, shiftDate, B2B_CHANNELS, type ViewProps, type Tone,
} from './ui';

type Row = Promotion & { used: number };

const TYPE_LABEL: Record<Promotion['type'], string> = { percent: 'Giảm %', amount: 'Giảm tiền', gift: 'Tặng hàng' };
const TYPE_ICON = { percent: Percent, amount: BadgeDollarSign, gift: Gift } as const;

function statusOf(p: Row): { label: string; tone: Tone } {
  const d = today();
  if (!p.active) return { label: 'Tạm dừng', tone: 'slate' };
  if (d < p.startDate) return { label: 'Sắp diễn ra', tone: 'sky' };
  if (d > p.endDate) return { label: 'Đã kết thúc', tone: 'slate' };
  if (p.usageLimit && p.used >= p.usageLimit) return { label: 'Hết lượt', tone: 'amber' };
  return { label: 'Đang chạy', tone: 'green' };
}

export function describePromotion(p: Promotion, products: Product[]): string {
  const name = (id?: string) => products.find(x => x.id === id)?.name || '—';
  if (p.type === 'gift') return `Mua ${p.buyQty} ${name(p.buyProductId)} → tặng ${p.giftQty} ${name(p.giftProductId)}`;
  const scope = p.productIds?.length ? ` cho ${p.productIds.map(name).join(', ')}` : '';
  const min = p.minOrderValue ? ` · đơn từ ${vnd(p.minOrderValue)}` : '';
  return p.type === 'percent'
    ? `Giảm ${p.value}%${p.maxDiscount ? ` (tối đa ${vnd(p.maxDiscount)})` : ''}${scope}${min}`
    : `Giảm ${vnd(p.value)}${scope}${min}`;
}

export function PromotionsPanel({ notify, can, refreshKey }: ViewProps) {
  const { data, error, loading, reload } = useLoad(() => crm.promotions.list(), [refreshKey]);
  const products = useLoad(() => crm.products.list(), [refreshKey]);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const editable = can('canManageMarketing');
  const rows = data?.promotions || [];
  const running = rows.filter(p => statusOf(p).label === 'Đang chạy');

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-slate-600"><b>{running.length}</b> chương trình đang chạy · áp dụng trực tiếp khi lên đơn, không cần quản lý duyệt chiết khấu</div>
        {editable && <Button className="ml-auto" onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Tạo chương trình</Button>}
      </div>
      <Card>
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty text="Chưa có chương trình khuyến mãi" /> : (
          <Table>
            <thead className="border-b border-slate-100"><tr><Th>Chương trình</Th><Th>Ưu đãi</Th><Th>Đối tượng</Th><Th>Thời gian</Th><Th className="text-right">Đã dùng</Th><Th>Trạng thái</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(p => {
                const Icon = TYPE_ICON[p.type];
                const st = statusOf(p);
                return (
                  <tr key={p.id}>
                    <Td><div className="font-semibold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-slate-400" />{p.name}</div><div className="text-xs font-mono text-blue-700">{p.code}</div></Td>
                    <Td className="text-xs max-w-72">{describePromotion(p, products.data?.products || [])}</Td>
                    <Td className="text-xs">{p.customerType === 'ALL' ? 'Mọi khách' : p.customerType}{p.channels?.length ? <div className="text-slate-400">{p.channels.join(', ')}</div> : null}</Td>
                    <Td className="text-xs whitespace-nowrap">{fmtDate(p.startDate)} → {fmtDate(p.endDate)}</Td>
                    <Td className="text-right tabular-nums">{p.used}{p.usageLimit ? ` / ${p.usageLimit}` : ''}</Td>
                    <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                    <Td className="text-right">{editable && <button onClick={() => setEditing(p)} className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer" aria-label={`Sửa ${p.code}`}><Pencil className="w-4 h-4" /></button>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      {editing && (
        <PromotionModal editing={editing === 'new' ? null : editing} products={products.data?.products || []} notify={notify}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />
      )}
    </div>
  );
}

function PromotionModal({ editing, products, notify, onClose, onSaved }: {
  editing: Row | null; products: Product[]; notify: (m: string) => void; onClose: () => void; onSaved: () => void;
}) {
  const blank: Partial<Promotion> = { type: 'percent', value: 5, customerType: 'ALL', startDate: today(), endDate: shiftDate(today(), 30), active: true, productIds: [], channels: [] };
  const [d, setD] = useState<Partial<Promotion>>(editing ? { ...editing } : blank);
  const { busy, run } = useAction(notify);
  const set = <K extends keyof Promotion>(k: K, v: Promotion[K] | undefined) => setD(p => ({ ...p, [k]: v }));
  const sellable = useMemo(() => products.filter(p => p.status !== 'Ngừng bán'), [products]);
  const codeLocked = !!editing && editing.used > 0;
  useEffect(() => { if (d.customerType === 'B2C') set('channels', []); }, [d.customerType]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: 'productIds' | 'channels', v: string) => {
    const cur = (d[k] as string[] | undefined) || [];
    set(k, (cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]) as any);
  };

  const save = async () => {
    const { id, createdAt, createdBy, updatedAt, ...payload } = d as Row;
    delete (payload as any).used;
    const r = await run(() => (editing ? crm.promotions.update(editing.id, payload) : crm.promotions.create(payload)), editing ? 'Đã cập nhật chương trình' : 'Đã tạo chương trình');
    if (r) onSaved();
  };

  return (
    <Modal open onClose={onClose} wide title={editing ? `Sửa ${editing.code}` : 'Tạo chương trình khuyến mãi'}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy} onClick={save}>Lưu</Button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Mã CTKM" required hint={codeLocked ? 'Đã có đơn áp dụng — không đổi được mã' : 'VD: TET2027, MI10TANG1'}>
            <Input value={d.code || ''} disabled={codeLocked} onChange={e => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))} />
          </Field>
          <Field label="Tên chương trình" required className="sm:col-span-2"><Input value={d.name || ''} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Hình thức">
            <Select value={d.type} onChange={e => set('type', e.target.value as Promotion['type'])}>
              <option value="percent">Giảm theo %</option><option value="amount">Giảm số tiền</option><option value="gift">Mua X tặng Y</option>
            </Select>
          </Field>
          <Field label="Bắt đầu" required><Input type="date" value={d.startDate || ''} onChange={e => set('startDate', e.target.value)} /></Field>
          <Field label="Kết thúc" required><Input type="date" value={d.endDate || ''} onChange={e => set('endDate', e.target.value)} /></Field>
        </div>

        <div className="border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase">Ưu đãi</div>
          {d.type === 'gift' ? (
            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="Mua sản phẩm" className="sm:col-span-2"><Select value={d.buyProductId || ''} onChange={e => set('buyProductId', e.target.value)}><option value="">— Chọn —</option>{sellable.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</Select></Field>
              <Field label="Số lượng mua"><Input type="number" min={1} value={d.buyQty ?? 10} onChange={e => set('buyQty', Number(e.target.value) || 1)} /></Field>
              <div />
              <Field label="Tặng sản phẩm" className="sm:col-span-2"><Select value={d.giftProductId || ''} onChange={e => set('giftProductId', e.target.value)}><option value="">— Chọn —</option>{sellable.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</Select></Field>
              <Field label="Số lượng tặng" hint="Lặp lại theo mỗi bội số"><Input type="number" min={1} value={d.giftQty ?? 1} onChange={e => set('giftQty', Number(e.target.value) || 1)} /></Field>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                {d.type === 'percent'
                  ? <Field label="Phần trăm giảm (%)" required><Input type="number" min={1} max={100} value={d.value ?? ''} onChange={e => set('value', Number(e.target.value) || undefined)} /></Field>
                  : <Field label="Số tiền giảm (đ)" required><MoneyInput value={d.value} onChange={v => set('value', v || undefined)} /></Field>}
                {d.type === 'percent' && <Field label="Giảm tối đa (đ)" hint="Để trống = không giới hạn"><MoneyInput value={d.maxDiscount} onChange={v => set('maxDiscount', v || undefined)} /></Field>}
                <Field label="Giá trị đơn tối thiểu (đ)" hint="Tính trên sản phẩm thuộc CT"><MoneyInput value={d.minOrderValue} onChange={v => set('minOrderValue', v || undefined)} /></Field>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Sản phẩm áp dụng <span className="font-normal text-slate-400">(không chọn = toàn bộ đơn)</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {sellable.map(p => {
                    const on = (d.productIds || []).includes(p.id);
                    return <button key={p.id} type="button" onClick={() => toggle('productIds', p.id)} aria-pressed={on}
                      className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${on ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p.name}</button>;
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase">Đối tượng & giới hạn</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Loại khách"><Select value={d.customerType} onChange={e => set('customerType', e.target.value as Promotion['customerType'])}><option value="ALL">Mọi khách</option><option value="B2B">Khách sỉ (B2B)</option><option value="B2C">Người tiêu dùng (B2C)</option></Select></Field>
            <Field label="Tổng lượt tối đa" hint="Để trống = không giới hạn"><Input type="number" min={0} value={d.usageLimit ?? ''} onChange={e => set('usageLimit', Number(e.target.value) || undefined)} /></Field>
            <Field label="Lượt / khách"><Input type="number" min={0} value={d.perCustomerLimit ?? ''} onChange={e => set('perCustomerLimit', Number(e.target.value) || undefined)} /></Field>
          </div>
          {d.customerType !== 'B2C' && (
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Kênh B2B <span className="font-normal text-slate-400">(không chọn = mọi kênh)</span></div>
              <div className="flex flex-wrap gap-1.5">
                {B2B_CHANNELS.map(ch => {
                  const on = (d.channels || []).includes(ch);
                  return <button key={ch} type="button" onClick={() => toggle('channels', ch)} aria-pressed={on}
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${on ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{ch}</button>;
                })}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.active !== false} onChange={e => set('active', e.target.checked)} /> Đang kích hoạt</label>
        </div>
        <Field label="Mô tả / điều kiện khác"><Textarea rows={2} value={d.description || ''} onChange={e => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
