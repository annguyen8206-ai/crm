import React, { useMemo, useState } from 'react';
import { Plus, Search, Phone, MapPin, Pencil, ShoppingCart, Gift } from 'lucide-react';
import { crm, type Customer } from './api';
import {
  PageHeader, Card, Tabs, Input, Select, Button, Badge, TypeBadge, TierBadge, Loading, ErrorBox, Empty, Drawer, Stat,
  Table, MobileList, Th, Td, Modal, Field, useLoad, useAction, vnd, shortVnd, fmtDate, fmtDateTime, B2B_CHANNELS, PRICE_TIER_LABELS,
  ORDER_STATUS_TONE, PAYMENT_TONE, VISIT_TONE, SEGMENT_TONE, type ViewProps,
} from './ui';
import { CustomerFormModal } from './CustomerForm';
import { OrderFormModal } from './OrderForm';
import { ExportButton } from './ExportButton';

type TypeFilter = 'ALL' | 'B2B' | 'B2C';

export function CustomersView({ notify, can, userName, refreshKey }: ViewProps) {
  const [type, setType] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => crm.customers.list(), [refreshKey]);

  const all = data?.customers || [];
  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const qd = q.replace(/\D/g, '');
    return all.filter(c =>
      (type === 'ALL' || c.type === type) &&
      (!channel || c.channel === channel) &&
      (!status || c.status === status) &&
      (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (qd.length >= 3 && c.phone.replace(/\D/g, '').includes(qd)) || (c.companyName || '').toLowerCase().includes(q)));
  }, [all, type, search, channel, status]);

  const counts = { ALL: all.length, B2B: all.filter(c => c.type === 'B2B').length, B2C: all.filter(c => c.type === 'B2C').length };
  const distributors = all.filter(c => c.channel === 'Nhà phân phối');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khách hàng"
        subtitle="Khách sỉ B2B (NPP, đại lý, điểm bán) và người tiêu dùng B2C"
        actions={<>
          {can('canExportData') && <ExportButton defaultKind="customers" notify={notify} />}
          {can('canManageCustomers') && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> Thêm khách hàng</Button>}
        </>}
      />

      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        <Tabs<TypeFilter> value={type} onChange={v => { setType(v); setChannel(''); }} items={[
          { id: 'ALL', label: `Tất cả (${counts.ALL})` },
          { id: 'B2B', label: `B2B (${counts.B2B})` },
          { id: 'B2C', label: `B2C (${counts.B2C})` },
        ]} />
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, SĐT, mã KH, pháp nhân…" className="pl-9" />
        </div>
        {type !== 'B2C' && (
          <Select value={channel} onChange={e => setChannel(e.target.value)} className="lg:w-48">
            <option value="">Mọi loại khách sỉ</option>
            {B2B_CHANNELS.map(c => <option key={c}>{c}</option>)}
          </Select>
        )}
        <Select value={status} onChange={e => setStatus(e.target.value)} className="lg:w-44">
          <option value="">Mọi trạng thái</option><option>Đang hoạt động</option><option>Tiềm năng</option><option>Ngừng giao dịch</option>
        </Select>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card>
          {rows.length === 0 ? <Empty text="Không có khách hàng phù hợp" /> : (<>
            <MobileList rows={rows.slice(0, 500)} keyOf={c => c.id} onSelect={c => setSelectedId(c.id)} render={c => {
              const overLimit = c.type === 'B2B' && (c.creditLimit || 0) > 0 && c.outstandingDebt > (c.creditLimit || 0);
              return (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="font-semibold text-slate-900">{c.name}</div><div className="text-xs text-slate-400">{c.code} · {c.phone}</div></div>
                    <div className="text-right shrink-0"><div className="font-semibold tabular-nums">{shortVnd(c.totalRevenue)}</div><div className="text-xs text-slate-400">{c.totalOrders} đơn</div></div>
                  </div>
                  <div className="flex flex-wrap gap-1 items-center text-xs">
                    <TypeBadge type={c.type} />
                    {c.type === 'B2B' ? <span className="text-slate-600">{c.channel}</span> : <TierBadge tier={c.loyaltyTier} />}
                    {c.status !== 'Đang hoạt động' && <Badge tone={c.status === 'Tiềm năng' ? 'sky' : 'slate'}>{c.status}</Badge>}
                    <span className="ml-auto tabular-nums">
                      {c.type === 'B2B'
                        ? <span className={overLimit ? 'text-rose-600 font-bold' : 'text-slate-500'}>Nợ {shortVnd(c.outstandingDebt)}{c.creditLimit ? ` / ${shortVnd(c.creditLimit)}` : ''}{overLimit ? ' · vượt hạn mức' : ''}</span>
                        : <span className="text-slate-500">{(c.loyaltyPoints || 0).toLocaleString('vi-VN')} điểm</span>}
                    </span>
                  </div>
                </div>
              );
            }} />
            <Table desktopOnly>
              <thead className="border-b border-slate-100">
                <tr><Th>Khách hàng</Th><Th>Phân loại</Th><Th>Phụ trách</Th><Th className="text-right">Doanh số</Th><Th className="text-right">Công nợ / Điểm</Th><Th>Mua gần nhất</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 500).map(c => {
                  const overLimit = c.type === 'B2B' && (c.creditLimit || 0) > 0 && c.outstandingDebt > (c.creditLimit || 0);
                  return (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)} className="hover:bg-slate-50 cursor-pointer">
                      <Td>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.code} · {c.phone}</div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1 items-center">
                          <TypeBadge type={c.type} />
                          {c.type === 'B2B' ? <span className="text-xs text-slate-600">{c.channel}</span> : <TierBadge tier={c.loyaltyTier} />}
                          {c.status !== 'Đang hoạt động' && <Badge tone={c.status === 'Tiềm năng' ? 'sky' : 'slate'}>{c.status}</Badge>}
                        </div>
                      </Td>
                      <Td className="text-xs">{c.assignedRep || '—'}</Td>
                      <Td className="text-right tabular-nums"><div className="font-semibold">{shortVnd(c.totalRevenue)}</div><div className="text-xs text-slate-400">{c.totalOrders} đơn</div></Td>
                      <Td className="text-right tabular-nums">
                        {c.type === 'B2B'
                          ? <span className={overLimit ? 'text-rose-600 font-bold' : c.outstandingDebt ? 'text-slate-800' : 'text-slate-400'}>{shortVnd(c.outstandingDebt)}{c.creditLimit ? <span className="text-xs text-slate-400 font-normal"> / {shortVnd(c.creditLimit)}</span> : null}</span>
                          : <span>{(c.loyaltyPoints || 0).toLocaleString('vi-VN')} điểm</span>}
                      </Td>
                      <Td className="text-xs text-slate-500">{fmtDate(c.lastOrderDate)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </>)}
          {rows.length > 500 && <div className="text-xs text-slate-400 px-4 py-2">Hiển thị 500 / {rows.length} — hãy lọc thêm.</div>}
        </Card>
      )}

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
        notify={notify}
        editing={editing}
        defaultType={type === 'B2B' ? 'B2B' : 'B2C'}
        canEditCredit={can('canApproveOrders')}
        distributors={distributors}
      />

      {selectedId && (
        <CustomerDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={c => { setEditing(c); setFormOpen(true); }}
          onChanged={() => void reload()}
          notify={notify}
          can={can}
          userName={userName}
          refreshKey={refreshKey}
        />
      )}
    </div>
  );
}

function CustomerDrawer({ id, onClose, onEdit, onChanged, notify, can, userName, refreshKey }: ViewProps & {
  id: string; onClose: () => void; onEdit: (c: Customer) => void; onChanged: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'orders' | 'visits' | 'debt'>('overview');
  const [orderOpen, setOrderOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const { data, error, reload } = useLoad(() => crm.customers.get(id), [id, refreshKey]);
  const c = data?.customer;

  return (
    <Drawer
      open
      onClose={onClose}
      title={c ? <span className="flex items-center gap-2"><TypeBadge type={c.type} />{c.name}</span> : 'Khách hàng'}
      actions={c && (
        <>
          {can('canManageCustomers') && <Button variant="secondary" onClick={() => onEdit(c)}><Pencil className="w-3.5 h-3.5" /> Sửa</Button>}
          {can('canManageOrders') && c.status !== 'Ngừng giao dịch' && <Button onClick={() => setOrderOpen(true)}><ShoppingCart className="w-3.5 h-3.5" /> Tạo đơn</Button>}
        </>
      )}
    >
      {error ? <ErrorBox error={error} onRetry={reload} /> : !data || !c ? <Loading /> : (
        <>
          <Card className="p-4">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700"><Phone className="w-4 h-4 text-slate-400" /><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></div>
              <div className="flex items-center gap-2 text-slate-700 min-w-0"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{[c.address, c.district, c.province].filter(Boolean).join(', ') || '—'}</span></div>
              <Info label="Mã KH" value={c.code} />
              <Info label="Phụ trách" value={c.assignedRep} />
              {c.type === 'B2B' ? (
                <>
                  <Info label="Loại khách" value={c.channel} />
                  <Info label="Bảng giá" value={PRICE_TIER_LABELS[c.priceTier]} />
                  <Info label="Người liên hệ" value={c.contactPerson} />
                  <Info label="MST" value={c.taxCode} />
                  <Info label="Tuyến / tần suất" value={[c.routeName, c.visitFrequency].filter(Boolean).join(' · ')} />
                  <Info label="Điều khoản" value={`${c.paymentTermDays || 0} ngày · hạn mức ${c.creditLimit ? vnd(c.creditLimit) : 'không giới hạn'}`} />
                </>
              ) : (
                <>
                  <Info label="Giới tính / Ngày sinh" value={[c.gender, fmtDate(c.dob)].filter(x => x && x !== '—').join(' · ')} />
                  <Info label="Nguồn" value={c.source} />
                </>
              )}
            </div>
            {c.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{c.tags.map(t => <Badge key={t}>{t}</Badge>)}</div>}
            {c.notes && <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-lg p-2">{c.notes}</p>}
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Doanh số" value={shortVnd(c.totalRevenue)} />
            <Stat label="Số đơn" value={c.totalOrders} />
            {c.type === 'B2B'
              ? <Stat label="Công nợ" value={shortVnd(c.outstandingDebt)} tone={(c.creditLimit || 0) > 0 && c.outstandingDebt > (c.creditLimit || 0) ? 'red' : undefined} />
              : <Stat label="Điểm" value={(c.loyaltyPoints || 0).toLocaleString('vi-VN')} hint={<TierBadge tier={c.loyaltyTier} />} />}
            <Stat label="Phân khúc" value={<span className="text-base">{data.rfm ? <Badge tone={SEGMENT_TONE[data.rfm.segment]} className="text-xs">{data.rfm.segment}</Badge> : '—'}</span>} hint={data.rfm?.recencyDays != null ? `Mua cách đây ${data.rfm.recencyDays} ngày` : undefined} />
          </div>

          {c.type === 'B2C' && can('canManageLoyalty') && (c.loyaltyPoints || 0) > 0 && (
            <Button variant="secondary" onClick={() => setRedeemOpen(true)}><Gift className="w-3.5 h-3.5" /> Đổi điểm ({(c.loyaltyPoints || 0).toLocaleString('vi-VN')} điểm)</Button>
          )}

          <Tabs value={tab} onChange={setTab} items={[
            { id: 'overview', label: 'Hoạt động' },
            { id: 'orders', label: `Đơn hàng (${data.orders.length})` },
            ...(c.type === 'B2B' ? [{ id: 'visits' as const, label: `Viếng thăm (${data.visits.length})` }, { id: 'debt' as const, label: `Công nợ (${data.receivables.length})` }] : []),
          ]} />

          {tab === 'overview' && (
            <Card className="p-4">
              <ul className="space-y-3">
                {[...data.orders.slice(0, 8).map(o => ({ at: o.createdAt, el: <span>Đơn <b>{o.code}</b> · {vnd(o.total)} · <Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status}</Badge></span> })),
                  ...data.visits.slice(0, 5).map(v => ({ at: v.checkInAt || `${v.plannedDate}T00:00:00`, el: <span>Viếng thăm ({v.purpose}) bởi {v.salesRep} · <Badge tone={VISIT_TONE[v.status]}>{v.status}</Badge>{v.outcome ? ` · ${v.outcome}` : ''}</span> })),
                  ...data.tickets.slice(0, 5).map((t: any) => ({ at: (t.createdAt || '').replace(' ', 'T'), el: <span>Phiếu CSKH <b>{t.ticketCode}</b>: {t.category} · {t.status}</span> })),
                ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12).map((x, i) => (
                  <li key={i} className="flex gap-3 text-sm"><span className="text-xs text-slate-400 w-28 shrink-0 tabular-nums">{fmtDateTime(x.at)}</span><span className="text-slate-700 min-w-0">{x.el}</span></li>
                ))}
                {data.orders.length + data.visits.length + data.tickets.length === 0 && <Empty text="Chưa có hoạt động" />}
              </ul>
              {data.outlets.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-2">Điểm bán do NPP phụ trách ({data.outlets.length})</div>
                  <div className="flex flex-wrap gap-1">{data.outlets.map(o => <Badge key={o.id}>{o.name}</Badge>)}</div>
                </div>
              )}
            </Card>
          )}

          {tab === 'orders' && (
            <Card>
              {data.orders.length === 0 ? <Empty text="Chưa có đơn hàng" /> : (
                <Table>
                  <thead className="border-b border-slate-100"><tr><Th>Mã đơn</Th><Th>Ngày</Th><Th className="text-right">Tổng</Th><Th>Trạng thái</Th><Th>Thanh toán</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.orders.map(o => (
                      <tr key={o.id}>
                        <Td className="font-semibold">{o.code}</Td>
                        <Td className="text-xs">{fmtDate(o.createdAt)}</Td>
                        <Td className="text-right tabular-nums">{vnd(o.total)}</Td>
                        <Td><Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status}</Badge></Td>
                        <Td><Badge tone={PAYMENT_TONE[o.paymentStatus]}>{o.paymentStatus}</Badge></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}

          {tab === 'visits' && (
            <Card>
              {data.visits.length === 0 ? <Empty text="Chưa có lịch viếng thăm" /> : (
                <ul className="divide-y divide-slate-100">
                  {data.visits.map(v => (
                    <li key={v.id} className="px-4 py-2.5 text-sm flex flex-wrap items-center gap-2">
                      <span className="tabular-nums text-slate-500 w-24">{fmtDate(v.plannedDate)}</span>
                      <Badge tone={VISIT_TONE[v.status]}>{v.status}</Badge>
                      <span>{v.purpose}</span>
                      <span className="text-slate-400">· {v.salesRep}</span>
                      {v.locationFlag && <Badge tone="red">Check-in xa {v.distanceMeters}m</Badge>}
                      {v.orderId && <Badge tone="green">Có đơn</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'debt' && (
            <Card>
              {data.receivables.length === 0 ? <Empty text="Không có công nợ" /> : (
                <Table>
                  <thead className="border-b border-slate-100"><tr><Th>Đơn</Th><Th>Hạn thanh toán</Th><Th className="text-right">Còn nợ</Th><Th>Tuổi nợ</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.receivables.map(r => (
                      <tr key={r.orderId}>
                        <Td className="font-semibold">{r.orderCode}</Td>
                        <Td className="text-xs">{fmtDate(r.dueDate)}</Td>
                        <Td className="text-right tabular-nums font-semibold">{vnd(r.balance)}</Td>
                        <Td><Badge tone={r.daysOverdue > 30 ? 'red' : r.daysOverdue > 0 ? 'amber' : 'green'}>{r.daysOverdue > 0 ? `Quá ${r.daysOverdue} ngày` : 'Trong hạn'}</Badge></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}

          <OrderFormModal open={orderOpen} onClose={() => setOrderOpen(false)} initialCustomerId={c.id} userName={userName} notify={notify}
            onCreated={() => { void reload(); onChanged(); }} />
          <RedeemModal open={redeemOpen} onClose={() => setRedeemOpen(false)} customer={c} notify={notify} onDone={() => { void reload(); onChanged(); }} />
        </>
      )}
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div className="min-w-0"><span className="text-slate-400 text-xs">{label}: </span><span className="text-slate-800">{value || '—'}</span></div>;
}

export function RedeemModal({ open, onClose, customer, notify, onDone }: { open: boolean; onClose: () => void; customer: Customer; notify: (m: string) => void; onDone: () => void }) {
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState('Đổi voucher');
  const { busy, run } = useAction(notify);
  const max = customer.loyaltyPoints || 0;
  return (
    <Modal open={open} onClose={onClose} title={`Đổi điểm · ${customer.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || points <= 0 || points > max}
        onClick={async () => { const r = await run(() => crm.customers.redeem(customer.id, points, reason), `Đã trừ ${points} điểm`); if (r) { onDone(); onClose(); } }}>Xác nhận</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Số dư hiện tại: <b>{max.toLocaleString('vi-VN')} điểm</b></p>
        <Field label="Số điểm đổi"><Input type="number" min={1} max={max} value={points || ''} onChange={e => setPoints(Math.floor(Number(e.target.value) || 0))} /></Field>
        <Field label="Lý do / quà tặng"><Input value={reason} onChange={e => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
