import React, { useEffect, useState } from 'react';
import { crm, type Customer } from './api';
import { Modal, Field, Input, Select, Textarea, MoneyInput, Button, B2B_CHANNELS, PRICE_TIER_LABELS, useAction } from './ui';

type Draft = Partial<Customer> & { tagsText?: string };

const blank = (type: 'B2B' | 'B2C'): Draft => ({
  type, name: '', phone: '', email: '', address: '', province: '', status: type === 'B2B' ? 'Đang hoạt động' : 'Đang hoạt động',
  channel: type === 'B2B' ? 'Tạp hoá (GT)' : undefined, creditLimit: 0, paymentTermDays: type === 'B2B' ? 7 : undefined,
  visitFrequency: type === 'B2B' ? 'Hàng tuần' : undefined, tagsText: '',
});

export function CustomerFormModal({
  open, onClose, onSaved, notify, editing, defaultType = 'B2C', canEditCredit, distributors = [],
}: {
  open: boolean; onClose: () => void; onSaved: (c: Customer) => void; notify: (m: string) => void;
  editing?: Customer | null; defaultType?: 'B2B' | 'B2C'; canEditCredit: boolean; distributors?: Customer[];
}) {
  const [d, setD] = useState<Draft>(blank(defaultType));
  const { busy, run } = useAction(notify);

  useEffect(() => {
    if (!open) return;
    setD(editing ? { ...editing, tagsText: (editing.tags || []).join(', ') } : blank(defaultType));
  }, [open, editing, defaultType]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }));
  const isB2B = d.type === 'B2B';

  const save = async () => {
    if (!d.name?.trim()) return notify('Nhập tên khách hàng');
    if ((d.phone || '').replace(/\D/g, '').length < 9) return notify('Số điện thoại không hợp lệ');
    const { tagsText, ...rest } = d;
    const payload: Partial<Customer> = {
      ...rest,
      tags: (tagsText || '').split(',').map(t => t.trim()).filter(Boolean),
    };
    for (const k of ['id', 'code', 'totalOrders', 'totalRevenue', 'outstandingDebt', 'firstOrderDate', 'lastOrderDate', 'createdAt', 'updatedAt', 'loyaltyPoints', 'lifetimePoints', 'loyaltyTier'] as const) {
      delete (payload as any)[k];
    }
    const r = await run(() => (editing ? crm.customers.update(editing.id, payload) : crm.customers.create(payload)),
      editing ? 'Đã cập nhật khách hàng' : 'Đã thêm khách hàng');
    if (r) { onSaved(r.customer); onClose(); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? `Sửa khách hàng ${editing.code}` : 'Thêm khách hàng'}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save} disabled={busy}>Lưu</Button></>}
    >
      <div className="space-y-4">
        {!editing && (
          <div className="grid grid-cols-2 gap-2">
            {(['B2C', 'B2B'] as const).map(t => (
              <button
                key={t}
                onClick={() => setD(prev => ({ ...blank(t), name: prev.name, phone: prev.phone }))}
                className={`p-3 rounded-xl border text-left cursor-pointer ${d.type === t ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="text-sm font-bold">{t === 'B2C' ? 'Người tiêu dùng (B2C)' : 'Khách sỉ / Điểm bán (B2B)'}</div>
                <div className="text-xs text-slate-500">{t === 'B2C' ? 'Mua lẻ qua online, hotline, cửa hàng' : 'NPP, đại lý, tạp hoá, siêu thị, HoReCa, doanh nghiệp'}</div>
              </button>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={isB2B ? 'Tên điểm bán / đơn vị' : 'Họ tên'} required><Input value={d.name || ''} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Số điện thoại" required><Input value={d.phone || ''} onChange={e => set('phone', e.target.value)} inputMode="tel" /></Field>
          {isB2B && (
            <>
              <Field label="Loại khách sỉ">
                <Select value={d.channel || ''} onChange={e => set('channel', e.target.value as any)}>{B2B_CHANNELS.map(c => <option key={c}>{c}</option>)}</Select>
              </Field>
              <Field label="Người liên hệ"><Input value={d.contactPerson || ''} onChange={e => set('contactPerson', e.target.value)} /></Field>
              <Field label="Tên pháp nhân (xuất hoá đơn)"><Input value={d.companyName || ''} onChange={e => set('companyName', e.target.value)} /></Field>
              <Field label="Mã số thuế"><Input value={d.taxCode || ''} onChange={e => set('taxCode', e.target.value)} /></Field>
            </>
          )}
          {!isB2B && (
            <>
              <Field label="Giới tính"><Select value={d.gender || ''} onChange={e => set('gender', (e.target.value || undefined) as any)}><option value="">—</option><option>Nữ</option><option>Nam</option><option>Khác</option></Select></Field>
              <Field label="Ngày sinh"><Input type="date" value={d.dob || ''} onChange={e => set('dob', e.target.value)} /></Field>
            </>
          )}
          <Field label="Email"><Input type="email" value={d.email || ''} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Nguồn khách"><Select value={d.source || ''} onChange={e => set('source', e.target.value)}>
            <option value="">—</option>{['Sales thị trường', 'Zalo', 'Facebook', 'Website', 'Sàn TMĐT', 'Hotline', 'Giới thiệu', 'Sự kiện / Sampling'].map(s => <option key={s}>{s}</option>)}
          </Select></Field>
          <Field label="Địa chỉ" className="sm:col-span-2"><Input value={d.address || ''} onChange={e => set('address', e.target.value)} /></Field>
          <Field label="Tỉnh / Thành phố"><Input value={d.province || ''} onChange={e => set('province', e.target.value)} /></Field>
          <Field label="Quận / Huyện"><Input value={d.district || ''} onChange={e => set('district', e.target.value)} /></Field>
          <Field label="Nhân viên phụ trách"><Input value={d.assignedRep || ''} onChange={e => set('assignedRep', e.target.value)} /></Field>
          <Field label="Trạng thái"><Select value={d.status} onChange={e => set('status', e.target.value as any)}><option>Đang hoạt động</option><option>Tiềm năng</option><option>Ngừng giao dịch</option></Select></Field>
        </div>

        {isB2B && (
          <div className="border border-slate-200 rounded-xl p-3 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase">Điều khoản bán hàng & tuyến</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Bảng giá" hint={canEditCredit ? undefined : 'Chỉ quản lý/kế toán được sửa'}>
                <Select value={d.priceTier || ''} disabled={!canEditCredit} onChange={e => set('priceTier', (e.target.value || undefined) as any)}>
                  <option value="">Theo loại khách</option>
                  {Object.entries(PRICE_TIER_LABELS).filter(([k]) => k !== 'LE').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Hạn mức công nợ (đ)" hint="0 = không giới hạn"><MoneyInput value={d.creditLimit} onChange={v => set('creditLimit', v)} disabled={!canEditCredit} /></Field>
              <Field label="Số ngày nợ"><Input type="number" min={0} value={d.paymentTermDays ?? 0} disabled={!canEditCredit} onChange={e => set('paymentTermDays', Number(e.target.value) || 0)} /></Field>
              <Field label="Tuyến bán hàng"><Input value={d.routeName || ''} onChange={e => set('routeName', e.target.value)} placeholder="VD: Tuyến T2" /></Field>
              <Field label="Tần suất viếng thăm"><Select value={d.visitFrequency || ''} onChange={e => set('visitFrequency', (e.target.value || undefined) as any)}><option>Hàng tuần</option><option>2 tuần/lần</option><option>Hàng tháng</option></Select></Field>
              <Field label="Nhà phân phối phụ trách">
                <Select value={d.parentDistributorId || ''} onChange={e => set('parentDistributorId', e.target.value || undefined)}>
                  <option value="">— Bán trực tiếp —</option>
                  {distributors.filter(x => x.id !== editing?.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nhãn (phân cách bằng dấu phẩy)"><Input value={d.tagsText || ''} onChange={e => set('tagsText', e.target.value)} placeholder="Key account, Mẹ bỉm, Văn phòng…" /></Field>
          <Field label="Ghi chú"><Textarea rows={1} value={d.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
