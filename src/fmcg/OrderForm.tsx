import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, AlertTriangle, Search } from 'lucide-react';
import { crm, type Customer, type Product, type Order } from './api';
import {
  Modal, Field, Input, Select, Textarea, MoneyInput, Button, Badge, TypeBadge,
  vnd, PRICE_TIER_LABELS, ORDER_CHANNELS, PAYMENT_METHODS, useAction,
} from './ui';

interface Line { productId: string; quantity: number; discountPercent: number }

const DISCOUNT_LIMIT = 10; // mirrors DISCOUNT_APPROVAL_PERCENT default on the server

export function OrderFormModal({
  open, onClose, onCreated, notify, initialCustomerId, visitId, userName,
}: {
  open: boolean; onClose: () => void; onCreated: (o: Order) => void; notify: (m: string) => void;
  initialCustomerId?: string; visitId?: string; userName: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [customerQuery, setCustomerQuery] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [channel, setChannel] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [payNow, setPayNow] = useState(0);
  const [payMethod, setPayMethod] = useState('Tiền mặt');
  const { busy, run } = useAction(notify);

  useEffect(() => {
    if (!open) return;
    setCustomerId(initialCustomerId || '');
    setLines([]); setDiscountAmount(0); setShippingFee(0); setNotes(''); setPayNow(0); setCustomerQuery(''); setExpectedDeliveryDate('');
    Promise.all([crm.customers.list({ status: 'Đang hoạt động' }), crm.products.list({ status: 'Đang bán' })])
      .then(([c, p]) => { setCustomers(c.customers); setProducts(p.products); })
      .catch(e => notify(e.message));
  }, [open, initialCustomerId, notify]);

  const customer = customers.find(c => c.id === customerId);
  useEffect(() => { if (customer) setChannel(customer.type === 'B2B' ? 'Sales thị trường' : 'Zalo'); }, [customer?.id]);

  const priceOf = (p: Product) => (customer && p.prices[customer.priceTier]) || p.prices.LE || 0;
  const priced = lines.map(l => {
    const p = products.find(x => x.id === l.productId);
    const unitPrice = p ? priceOf(p) : 0;
    return { ...l, product: p, unitPrice, lineTotal: Math.round(l.quantity * unitPrice * (1 - l.discountPercent / 100)) };
  });
  const subtotal = priced.reduce((s, l) => s + l.lineTotal, 0);
  const total = Math.max(0, subtotal - Math.min(discountAmount, subtotal)) + shippingFee;
  const unpaid = Math.max(0, total - payNow);

  const warnings: string[] = [];
  if (customer?.type === 'B2B' && (customer.creditLimit || 0) > 0 && unpaid > 0 && customer.outstandingDebt + unpaid > (customer.creditLimit || 0)) {
    warnings.push(`Vượt hạn mức công nợ (${vnd(customer.outstandingDebt + unpaid)} / ${vnd(customer.creditLimit)})`);
  }
  if (priced.some(l => l.discountPercent > DISCOUNT_LIMIT) || (subtotal > 0 && (discountAmount / subtotal) * 100 > DISCOUNT_LIMIT)) {
    warnings.push(`Chiết khấu trên ${DISCOUNT_LIMIT}%`);
  }

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.toLowerCase().trim();
    const list = q ? customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§') || c.code.toLowerCase().includes(q)) : customers;
    return list.slice(0, 8);
  }, [customers, customerQuery]);

  const addProduct = (productId: string) => {
    if (!productId) return;
    setLines(prev => prev.some(l => l.productId === productId)
      ? prev.map(l => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { productId, quantity: 1, discountPercent: 0 }]);
  };

  const submit = async () => {
    if (!customer) return notify('Chọn khách hàng');
    if (!lines.length) return notify('Thêm ít nhất 1 sản phẩm');
    const r = await run(() => crm.orders.create({
      customerId: customer.id,
      items: lines.map(l => ({ productId: l.productId, quantity: l.quantity, discountPercent: l.discountPercent })),
      discountAmount, shippingFee, channel, notes: notes || undefined, visitId,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      payment: payNow > 0 ? { amount: payNow, method: payMethod } : undefined,
    }));
    if (r) {
      notify(r.needsApproval ? `Đã tạo đơn ${r.order.code} — đang chờ quản lý duyệt` : `Đã tạo đơn ${r.order.code}`);
      onCreated(r.order);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Tạo đơn hàng"
      footer={
        <>
          <div className="mr-auto text-sm self-center">Tổng: <b className="text-lg tabular-nums">{vnd(total)}</b></div>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} disabled={busy || !customer || !lines.length}>{warnings.length ? 'Gửi duyệt' : 'Tạo đơn'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!customer ? (
          <Field label="Khách hàng" required>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input autoFocus placeholder="Tìm theo tên, SĐT, mã khách hàng…" value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} className="pl-9" />
            </div>
            <ul className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {filteredCustomers.map(c => (
                <li key={c.id}>
                  <button onClick={() => setCustomerId(c.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <TypeBadge type={c.type} />
                    <span className="text-sm font-semibold truncate">{c.name}</span>
                    <span className="text-xs text-slate-400 ml-auto shrink-0">{c.phone}</span>
                  </button>
                </li>
              ))}
              {filteredCustomers.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">Không tìm thấy khách hàng</li>}
            </ul>
          </Field>
        ) : (
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <TypeBadge type={customer.type} />
            <span className="font-bold text-sm">{customer.name}</span>
            <span className="text-xs text-slate-500">{customer.phone}</span>
            <Badge tone="blue">{PRICE_TIER_LABELS[customer.priceTier]}</Badge>
            {customer.type === 'B2B' && (
              <span className="text-xs text-slate-500">Công nợ {vnd(customer.outstandingDebt)}{customer.creditLimit ? ` / hạn mức ${vnd(customer.creditLimit)}` : ''}</span>
            )}
            {!initialCustomerId && <button onClick={() => setCustomerId('')} className="ml-auto text-xs font-bold text-blue-600 cursor-pointer">Đổi khách</button>}
          </div>
        )}

        {customer && (
          <>
            <div>
              <div className="flex items-end gap-2 mb-2">
                <Field label="Thêm sản phẩm" className="flex-1">
                  <Select value="" onChange={e => addProduct(e.target.value)}>
                    <option value="">— Chọn sản phẩm —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name} · {vnd(priceOf(p))}/{p.unit}</option>)}
                  </Select>
                </Field>
              </div>
              {priced.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                      <tr><th className="text-left px-3 py-2">Sản phẩm</th><th className="px-2 py-2 w-24">SL</th><th className="px-2 py-2 w-24">CK %</th><th className="text-right px-3 py-2">Đơn giá</th><th className="text-right px-3 py-2">Thành tiền</th><th className="w-8" /></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {priced.map((l, i) => (
                        <tr key={l.productId}>
                          <td className="px-3 py-2"><div className="font-semibold">{l.product?.name}</div><div className="text-[11px] text-slate-400">{l.product?.sku} · {l.product?.unit}{typeof l.product?.stock === 'number' ? ` · tồn ${l.product.stock}` : ''}</div></td>
                          <td className="px-2 py-2"><Input type="number" min={1} value={l.quantity} onChange={e => setLines(ls => ls.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))} className="text-center" /></td>
                          <td className="px-2 py-2"><Input type="number" min={0} max={100} value={l.discountPercent} onChange={e => setLines(ls => ls.map((x, j) => (j === i ? { ...x, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } : x)))} className="text-center" /></td>
                          <td className="px-3 py-2 text-right tabular-nums">{vnd(l.unitPrice)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">{vnd(l.lineTotal)}</td>
                          <td className="pr-2"><button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" aria-label="Xoá dòng"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {priced.length === 0 && (
                <div className="border border-dashed border-slate-300 rounded-xl py-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Chọn sản phẩm để thêm vào đơn</div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Chiết khấu đơn (đ)"><MoneyInput value={discountAmount} onChange={setDiscountAmount} /></Field>
              <Field label="Phí giao hàng (đ)"><MoneyInput value={shippingFee} onChange={setShippingFee} /></Field>
              <Field label="Kênh bán"><Select value={channel} onChange={e => setChannel(e.target.value)}>{ORDER_CHANNELS.map(c => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Thanh toán ngay (đ)" hint={customer.type === 'B2B' ? `Còn lại ghi công nợ ${customer.paymentTermDays || 0} ngày` : 'COD / chuyển khoản trước'}>
                <MoneyInput value={payNow} onChange={v => setPayNow(Math.min(v, total))} />
              </Field>
              <Field label="Hình thức"><Select value={payMethod} onChange={e => setPayMethod(e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Ngày giao dự kiến"><Input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} /></Field>
            </div>
            <Field label="Ghi chú"><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder={`Người lập: ${userName}`} /></Field>

            <div className="bg-slate-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-y-1 max-w-sm ml-auto">
              <span className="text-slate-500">Tạm tính</span><span className="text-right tabular-nums">{vnd(subtotal)}</span>
              <span className="text-slate-500">Chiết khấu</span><span className="text-right tabular-nums">-{vnd(Math.min(discountAmount, subtotal))}</span>
              <span className="text-slate-500">Phí giao</span><span className="text-right tabular-nums">{vnd(shippingFee)}</span>
              <span className="font-bold">Tổng cộng</span><span className="text-right tabular-nums font-bold">{vnd(total)}</span>
              <span className="text-slate-500">Ghi công nợ</span><span className="text-right tabular-nums">{vnd(unpaid)}</span>
            </div>

            {warnings.length > 0 && (
              <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div><b>Đơn sẽ cần quản lý duyệt:</b> {warnings.join('; ')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
