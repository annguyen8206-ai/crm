import React, { useMemo, useState } from 'react';
import { Plus, Search, Check, Truck, PackageCheck, XCircle, Undo2, Wallet, AlertTriangle } from 'lucide-react';
import { crm, type Order } from './api';
import {
  PageHeader, Card, Tabs, Input, Select, Button, Badge, TypeBadge, Loading, ErrorBox, Empty, Drawer, Modal, Field, Stat,
  MoneyInput, Table, Th, Td, useLoad, useAction, vnd, shortVnd, fmtDate, fmtDateTime, ORDER_STATUS_TONE, PAYMENT_TONE,
  PAYMENT_METHODS, PRICE_TIER_LABELS, type ViewProps,
} from './ui';
import { OrderFormModal } from './OrderForm';

const STATUS_TABS = ['ALL', 'Chờ duyệt', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã huỷ', 'Trả hàng'] as const;
type StatusTab = typeof STATUS_TABS[number];

export function OrdersView({ notify, can, userName, refreshKey }: ViewProps) {
  const [section, setSection] = useState<'orders' | 'receivables'>('orders');
  return (
    <div className="space-y-4">
      <PageHeader
        title="Đơn hàng & Công nợ"
        subtitle="Đơn bán sỉ B2B và bán lẻ B2C, duyệt đơn, giao hàng, thu tiền"
        actions={<Tabs value={section} onChange={setSection} items={[{ id: 'orders', label: 'Đơn hàng' }, { id: 'receivables', label: 'Công nợ phải thu' }]} />}
      />
      {section === 'orders'
        ? <OrdersList notify={notify} can={can} userName={userName} refreshKey={refreshKey} />
        : <Receivables refreshKey={refreshKey} />}
    </div>
  );
}

function OrdersList({ notify, can, userName, refreshKey }: ViewProps) {
  const [tab, setTab] = useState<StatusTab>('ALL');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const { data, error, loading, reload } = useLoad(() => crm.orders.list(), [refreshKey]);
  const all = data?.orders || [];

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return all.filter(o =>
      (tab === 'ALL' || o.status === tab) && (!type || o.customerType === type) && (!payment || o.paymentStatus === payment) &&
      (!q || o.code.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')));
  }, [all, tab, type, search, payment]);
  const countOf = (s: StatusTab) => (s === 'ALL' ? all.length : all.filter(o => o.status === s).length);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        <Tabs<StatusTab> value={tab} onChange={setTab} items={STATUS_TABS.map(s => ({
          id: s, label: <>{s === 'ALL' ? 'Tất cả' : s} <span className={s === 'Chờ duyệt' && countOf(s) ? 'text-amber-600' : 'text-slate-400'}>{countOf(s)}</span></>,
        }))} />
        {can('canManageOrders') && <Button className="lg:ml-auto" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Tạo đơn</Button>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã đơn, tên khách, SĐT…" className="pl-9" />
        </div>
        <Select value={type} onChange={e => setType(e.target.value)} className="sm:w-36"><option value="">B2B + B2C</option><option>B2B</option><option>B2C</option></Select>
        <Select value={payment} onChange={e => setPayment(e.target.value)} className="sm:w-48"><option value="">Mọi trạng thái TT</option><option>Chưa thanh toán</option><option>Thanh toán một phần</option><option>Đã thanh toán</option></Select>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card>
          {rows.length === 0 ? <Empty text="Không có đơn hàng" /> : (
            <Table>
              <thead className="border-b border-slate-100"><tr><Th>Mã đơn</Th><Th>Khách hàng</Th><Th>Kênh / NV</Th><Th className="text-right">Tổng tiền</Th><Th>Trạng thái</Th><Th>Thanh toán</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 500).map(o => (
                  <tr key={o.id} onClick={() => setSelected(o)} className="hover:bg-slate-50 cursor-pointer">
                    <Td><div className="font-semibold text-slate-900">{o.code}</div><div className="text-xs text-slate-400">{fmtDateTime(o.createdAt)}</div></Td>
                    <Td><div className="flex items-center gap-1.5"><TypeBadge type={o.customerType} /><span className="truncate max-w-48">{o.customerName}</span></div></Td>
                    <Td className="text-xs"><div>{o.channel}</div><div className="text-slate-400">{o.salesRep}</div></Td>
                    <Td className="text-right tabular-nums font-semibold">{vnd(o.total)}</Td>
                    <Td><Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status}</Badge></Td>
                    <Td><Badge tone={PAYMENT_TONE[o.paymentStatus]}>{o.paymentStatus}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <OrderFormModal open={createOpen} onClose={() => setCreateOpen(false)} notify={notify} userName={userName} onCreated={() => void reload()} />
      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onChanged={o => { setSelected(o); void reload(); }}
          notify={notify}
          can={can}
        />
      )}
    </>
  );
}

export function OrderDrawer({ order: o, onClose, onChanged, notify, can }: {
  order: Order; onClose: () => void; onChanged: (o: Order) => void; notify: (m: string) => void; can: (p: string) => boolean;
}) {
  const { busy, run } = useAction(notify);
  const [payOpen, setPayOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<'Đã huỷ' | 'Trả hàng' | null>(null);
  const [reason, setReason] = useState('');
  const balance = o.total - o.paidAmount;
  const live = o.status !== 'Đã huỷ' && o.status !== 'Trả hàng';

  const setStatus = async (status: Order['status'], why?: string) => {
    const r = await run(() => crm.orders.setStatus(o.id, status, why), `Đơn ${o.code}: ${status}`);
    if (r) onChanged(r.order);
  };

  return (
    <Drawer open onClose={onClose} title={<span className="flex items-center gap-2">{o.code}<Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status}</Badge></span>}>
      {o.status === 'Chờ duyệt' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4" />Đơn chờ duyệt</div>
          <ul className="list-disc pl-5">{(o.approvalReasons || []).map(r => <li key={r}>{r}</li>)}</ul>
          <div className="flex gap-2 pt-1">
            {can('canApproveOrders') && <Button disabled={busy} onClick={async () => { const r = await run(() => crm.orders.approve(o.id), `Đã duyệt đơn ${o.code}`); if (r) onChanged(r.order); }}><Check className="w-4 h-4" /> Duyệt đơn</Button>}
            {can('canManageOrders') && <Button variant="danger" disabled={busy} onClick={() => setReasonFor('Đã huỷ')}><XCircle className="w-4 h-4" /> Huỷ</Button>}
          </div>
          {!can('canApproveOrders') && <div className="text-xs">Cần Quản lý kinh doanh hoặc Kế toán duyệt.</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {o.status === 'Đã xác nhận' && can('canManageOrders') && <Button disabled={busy} onClick={() => setStatus('Đang giao')}><Truck className="w-4 h-4" /> Bắt đầu giao</Button>}
        {(o.status === 'Đã xác nhận' || o.status === 'Đang giao') && can('canManageOrders') && <Button disabled={busy} onClick={() => setStatus('Đã giao')}><PackageCheck className="w-4 h-4" /> Đã giao</Button>}
        {live && balance > 0 && o.status !== 'Chờ duyệt' && can('canManageOrders') && <Button variant="secondary" onClick={() => setPayOpen(true)}><Wallet className="w-4 h-4" /> Ghi nhận thanh toán</Button>}
        {o.status === 'Đã xác nhận' && can('canApproveOrders') && <Button variant="danger" onClick={() => setReasonFor('Đã huỷ')}><XCircle className="w-4 h-4" /> Huỷ đơn</Button>}
        {(o.status === 'Đang giao' || o.status === 'Đã giao') && can('canApproveOrders') && <Button variant="danger" onClick={() => setReasonFor('Trả hàng')}><Undo2 className="w-4 h-4" /> Trả hàng</Button>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Tổng tiền" value={shortVnd(o.total)} />
        <Stat label="Đã thu" value={shortVnd(o.paidAmount)} tone={o.paidAmount >= o.total ? 'green' : undefined} />
        <Stat label="Còn nợ" value={shortVnd(balance)} tone={balance > 0 ? 'amber' : undefined} hint={o.dueDate && balance > 0 ? `Hạn ${fmtDate(o.dueDate)}` : undefined} />
      </div>

      <Card className="p-4 text-sm space-y-1.5">
        <div className="flex items-center gap-2"><TypeBadge type={o.customerType} /><b>{o.customerName}</b><span className="text-slate-400">{o.customerPhone}</span></div>
        <div className="text-slate-600">Giao đến: {o.deliveryAddress || '—'}{o.expectedDeliveryDate ? ` · dự kiến ${fmtDate(o.expectedDeliveryDate)}` : ''}</div>
        <div className="text-slate-600">Kênh: {o.channel} · NV: {o.salesRep || '—'} · {PRICE_TIER_LABELS[o.priceTier]}</div>
        <div className="text-slate-400 text-xs">Tạo {fmtDateTime(o.createdAt)} bởi {o.createdBy}{o.approvedBy ? ` · Duyệt bởi ${o.approvedBy}` : ''}{o.deliveredAt ? ` · Giao ${fmtDateTime(o.deliveredAt)}` : ''}</div>
        {o.cancelledReason && <div className="text-rose-600">Lý do: {o.cancelledReason}</div>}
        {o.pointsEarned ? <div className="text-emerald-700">Đã cộng {o.pointsEarned} điểm thưởng</div> : null}
        {o.notes && <div className="bg-slate-50 rounded-lg p-2 text-slate-600">{o.notes}</div>}
      </Card>

      <Card title="Sản phẩm">
        <Table>
          <thead className="border-b border-slate-100"><tr><Th>Sản phẩm</Th><Th className="text-right">SL</Th><Th className="text-right">Đơn giá</Th><Th className="text-right">CK</Th><Th className="text-right">Thành tiền</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {o.items.map(i => (
              <tr key={i.productId}>
                <Td><div className="font-semibold">{i.name}</div><div className="text-xs text-slate-400">{i.sku}</div></Td>
                <Td className="text-right tabular-nums">{i.quantity} {i.unit}</Td>
                <Td className="text-right tabular-nums">{vnd(i.unitPrice)}</Td>
                <Td className="text-right tabular-nums">{i.discountPercent ? `${i.discountPercent}%` : '—'}</Td>
                <Td className="text-right tabular-nums font-semibold">{vnd(i.lineTotal)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="px-4 py-3 text-sm grid grid-cols-2 gap-y-1 max-w-xs ml-auto">
          <span className="text-slate-500">Tạm tính</span><span className="text-right tabular-nums">{vnd(o.subtotal)}</span>
          {o.discountAmount > 0 && <><span className="text-slate-500">Chiết khấu</span><span className="text-right tabular-nums">-{vnd(o.discountAmount)}</span></>}
          {o.shippingFee > 0 && <><span className="text-slate-500">Phí giao</span><span className="text-right tabular-nums">{vnd(o.shippingFee)}</span></>}
          <span className="font-bold">Tổng</span><span className="text-right tabular-nums font-bold">{vnd(o.total)}</span>
        </div>
      </Card>

      {o.payments.length > 0 && (
        <Card title="Lịch sử thanh toán">
          <ul className="divide-y divide-slate-100 px-4 pb-2">
            {o.payments.map(p => (
              <li key={p.id} className="py-2 flex justify-between text-sm gap-2">
                <span>{fmtDateTime(p.at)} · {p.method}{p.reference ? ` · ${p.reference}` : ''}<span className="text-slate-400"> · {p.by}</span></span>
                <span className="tabular-nums font-semibold text-emerald-700">+{vnd(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} order={o} notify={notify} onDone={onChanged} />
      <Modal open={!!reasonFor} onClose={() => setReasonFor(null)} title={reasonFor === 'Trả hàng' ? 'Ghi nhận trả hàng' : 'Huỷ đơn hàng'}
        footer={<><Button variant="secondary" onClick={() => setReasonFor(null)}>Đóng</Button><Button variant="danger" disabled={busy || !reason.trim()} onClick={async () => { await setStatus(reasonFor!, reason); setReasonFor(null); setReason(''); }}>Xác nhận</Button></>}>
        <Field label="Lý do" required><Input autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder={reasonFor === 'Trả hàng' ? 'VD: Hàng lỗi, hết hạn, giao sai…' : 'VD: Khách huỷ, hết hàng…'} /></Field>
        <p className="text-xs text-slate-500 mt-2">Tồn kho sẽ được hoàn lại; điểm thưởng của đơn (nếu có) sẽ bị thu hồi.</p>
      </Modal>
    </Drawer>
  );
}

function PaymentModal({ open, onClose, order, notify, onDone }: { open: boolean; onClose: () => void; order: Order; notify: (m: string) => void; onDone: (o: Order) => void }) {
  const balance = order.total - order.paidAmount;
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState('Chuyển khoản');
  const [reference, setReference] = useState('');
  const { busy, run } = useAction(notify);
  React.useEffect(() => { if (open) { setAmount(balance); setReference(''); } }, [open, balance]);
  return (
    <Modal open={open} onClose={onClose} title={`Thu tiền đơn ${order.code}`}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || amount <= 0 || amount > balance}
        onClick={async () => { const r = await run(() => crm.orders.pay(order.id, amount, method, reference || undefined), `Đã ghi nhận ${vnd(amount)}`); if (r) { onDone(r.order); onClose(); } }}>Ghi nhận</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Còn nợ: <b>{vnd(balance)}</b></p>
        <Field label="Số tiền"><MoneyInput value={amount} onChange={setAmount} /></Field>
        <Field label="Hình thức"><Select value={method} onChange={e => setMethod(e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Mã giao dịch / chứng từ"><Input value={reference} onChange={e => setReference(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function Receivables({ refreshKey }: { refreshKey: number }) {
  const [view, setView] = useState<'customer' | 'order'>('customer');
  const { data, error, loading, reload } = useLoad(() => crm.receivables(), [refreshKey]);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const buckets = ['Trong hạn', '1-30 ngày', '31-60 ngày', '61-90 ngày', '>90 ngày'];
  const byBucket = Object.fromEntries(buckets.map(b => [b, data.rows.filter(r => r.bucket === b).reduce((s, r) => s + r.balance, 0)]));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Tổng phải thu" value={shortVnd(data.total)} hint={`${data.rows.length} đơn chưa tất toán`} />
        <Stat label="Quá hạn" value={shortVnd(data.overdue)} tone={data.overdue ? 'red' : undefined} hint={data.total ? `${Math.round((data.overdue / data.total) * 100)}% tổng nợ` : undefined} />
        <Stat label="Quá hạn > 60 ngày" value={shortVnd(byBucket['61-90 ngày'] + byBucket['>90 ngày'])} tone={byBucket['>90 ngày'] ? 'red' : undefined} />
        <Stat label="Khách vượt hạn mức" value={data.byCustomer.filter(c => c.creditLimit > 0 && c.balance > c.creditLimit).length} tone="amber" />
      </div>
      <Card>
        <div className="flex h-3 rounded-full overflow-hidden m-4">
          {buckets.map((b, i) => (
            <div key={b} title={`${b}: ${vnd(byBucket[b])}`} style={{ width: `${data.total ? (byBucket[b] / data.total) * 100 : 0}%` }}
              className={['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-rose-500', 'bg-rose-700'][i]} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-slate-600">
          {buckets.map((b, i) => <span key={b} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-rose-500', 'bg-rose-700'][i]}`} />{b}: <b className="tabular-nums">{shortVnd(byBucket[b])}</b></span>)}
        </div>
      </Card>
      <Tabs value={view} onChange={setView} items={[{ id: 'customer', label: 'Theo khách hàng' }, { id: 'order', label: 'Theo đơn hàng' }]} />
      <Card>
        {data.rows.length === 0 ? <Empty text="Không có công nợ" /> : view === 'customer' ? (
          <Table>
            <thead className="border-b border-slate-100"><tr><Th>Khách hàng</Th><Th className="text-right">Dư nợ</Th><Th className="text-right">Quá hạn</Th><Th className="text-right">Hạn mức</Th><Th>Quá hạn lâu nhất</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.byCustomer.map(c => (
                <tr key={c.customerId}>
                  <Td className="font-semibold">{c.customerName}</Td>
                  <Td className="text-right tabular-nums">{vnd(c.balance)}</Td>
                  <Td className={`text-right tabular-nums ${c.overdue ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{vnd(c.overdue)}</Td>
                  <Td className={`text-right tabular-nums ${c.creditLimit && c.balance > c.creditLimit ? 'text-rose-600 font-semibold' : ''}`}>{c.creditLimit ? vnd(c.creditLimit) : '—'}</Td>
                  <Td>{c.maxDaysOverdue > 0 ? <Badge tone={c.maxDaysOverdue > 60 ? 'red' : 'amber'}>{c.maxDaysOverdue} ngày</Badge> : <Badge tone="green">Trong hạn</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Table>
            <thead className="border-b border-slate-100"><tr><Th>Đơn</Th><Th>Khách hàng</Th><Th>NV</Th><Th>Hạn TT</Th><Th className="text-right">Còn nợ</Th><Th>Tuổi nợ</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map(r => (
                <tr key={r.orderId}>
                  <Td className="font-semibold">{r.orderCode}</Td>
                  <Td>{r.customerName}</Td>
                  <Td className="text-xs">{r.salesRep || '—'}</Td>
                  <Td className="text-xs">{fmtDate(r.dueDate)}</Td>
                  <Td className="text-right tabular-nums font-semibold">{vnd(r.balance)}</Td>
                  <Td><Badge tone={r.daysOverdue > 60 ? 'red' : r.daysOverdue > 0 ? 'amber' : 'green'}>{r.bucket}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
