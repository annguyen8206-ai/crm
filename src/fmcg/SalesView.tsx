import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, LogIn, LogOut, ShoppingCart, CalendarX, Target, UserPlus, Navigation } from 'lucide-react';
import { crm, type Customer, type Visit, type SalesTarget } from './api';
import {
  PageHeader, Card, Tabs, Input, Select, Textarea, Button, Badge, TypeBadge, Loading, ErrorBox, Empty, Modal, Field, Stat,
  MoneyInput, Table, Th, Td, useLoad, useAction, vnd, shortVnd, fmtDate, fmtDateTime, today, VISIT_TONE, VISIT_PURPOSES,
  type ViewProps,
} from './ui';
import { OrderFormModal } from './OrderForm';
import { RepSelect, useAssignees, isKnownRep } from './RepSelect';

type Section = 'visits' | 'kpi' | 'deals' | 'inactive';

export function SalesView(props: ViewProps) {
  const [section, setSection] = useState<Section>('visits');
  return (
    <div className="space-y-4">
      <PageHeader
        title="Kinh doanh & Thị trường"
        subtitle="Tuyến viếng thăm điểm bán, KPI nhân viên, cơ hội bán hàng"
        actions={<Tabs<Section> value={section} onChange={setSection} items={[
          { id: 'visits', label: 'Viếng thăm' },
          { id: 'kpi', label: 'KPI & Chỉ tiêu' },
          { id: 'deals', label: 'Cơ hội bán hàng' },
          { id: 'inactive', label: 'Điểm bán ngưng đặt' },
        ]} />}
      />
      {section === 'visits' && <VisitsPanel {...props} />}
      {section === 'kpi' && <KpiPanel {...props} />}
      {section === 'deals' && <DealsPanel {...props} />}
      {section === 'inactive' && <InactivePanel {...props} />}
    </div>
  );
}

// ================================================================ visits
function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | undefined> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

function VisitsPanel({ notify, can, userName, refreshKey }: ViewProps) {
  const [date, setDate] = useState(today());
  const [rep, setRep] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [orderFor, setOrderFor] = useState<Visit | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<Visit | null>(null);
  const { data, error, loading, reload } = useLoad(() => crm.visits.list({ date }), [date, refreshKey]);
  const { busy, run } = useAction(notify);
  const visits = data?.visits || [];
  const reps = [...new Set(visits.map(v => v.salesRep))].sort();
  const rows = visits.filter(v => !rep || v.salesRep === rep);
  const done = rows.filter(v => v.status === 'Hoàn thành');

  const checkIn = async (v: Visit) => {
    notify('Đang lấy vị trí GPS…');
    const loc = await getPosition();
    const r = await run(() => crm.visits.checkIn(v.id, loc, true));
    if (r) {
      notify(!loc ? 'Đã check-in (không lấy được GPS)' : r.visit.locationFlag ? `Đã check-in — cách điểm bán ${r.visit.distanceMeters}m, đã gắn cờ kiểm tra` : 'Đã check-in tại điểm bán');
      void reload();
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Kế hoạch" value={rows.length} />
        <Stat label="Hoàn thành" value={done.length} hint={rows.length ? `${Math.round((done.length / rows.length) * 100)}% tuyến` : undefined} />
        <Stat label="Có đơn" value={done.filter(v => v.orderId).length} hint={done.length ? `Strike rate ${Math.round((done.filter(v => v.orderId).length / done.length) * 100)}%` : undefined} />
        <Stat label="Cảnh báo vị trí" value={rows.filter(v => v.locationFlag).length} tone={rows.some(v => v.locationFlag) ? 'amber' : undefined} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="sm:w-44" />
        {reps.length > 1 && <Select value={rep} onChange={e => setRep(e.target.value)} className="sm:w-56"><option value="">Tất cả nhân viên</option>{reps.map(r => <option key={r}>{r}</option>)}</Select>}
        {can('canManageVisits') && <Button className="sm:ml-auto" onClick={() => setPlanOpen(true)}><Plus className="w-4 h-4" /> Lên lịch viếng thăm</Button>}
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : rows.length === 0 ? (
        <Card><Empty text={`Không có lịch viếng thăm ngày ${fmtDate(date)}`} /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map(v => (
            <Card key={v.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{v.customerName}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{v.customerAddress || '—'}</div>
                </div>
                <Badge tone={VISIT_TONE[v.status]}>{v.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge tone="blue">{v.purpose}</Badge>
                <Badge>{v.salesRep}</Badge>
                {v.checkInAt && <Badge tone="slate">Vào {fmtDateTime(v.checkInAt).split(' ').pop()}</Badge>}
                {typeof v.distanceMeters === 'number' && <Badge tone={v.locationFlag ? 'red' : 'green'}>{v.distanceMeters}m</Badge>}
                {v.orderId && <Badge tone="green">Có đơn</Badge>}
                {v.collectedAmount ? <Badge tone="violet">Thu {shortVnd(v.collectedAmount)}</Badge> : null}
              </div>
              {v.outcome && <div className="text-sm text-slate-600">Kết quả: {v.outcome}{v.notes ? ` — ${v.notes}` : ''}</div>}
              {can('canManageVisits') && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {v.status === 'Kế hoạch' && <Button disabled={busy} onClick={() => checkIn(v)}><LogIn className="w-3.5 h-3.5" /> Check-in</Button>}
                  {v.status === 'Đã check-in' && !v.orderId && can('canManageOrders') && <Button onClick={() => setOrderFor(v)}><ShoppingCart className="w-3.5 h-3.5" /> Lên đơn</Button>}
                  {v.status === 'Đã check-in' && <Button variant="secondary" onClick={() => setCheckoutFor(v)}><LogOut className="w-3.5 h-3.5" /> Kết thúc</Button>}
                  {v.status === 'Kế hoạch' && <Button variant="ghost" disabled={busy} onClick={async () => { if (await run(() => crm.visits.update(v.id, { status: 'Bỏ lỡ' }), 'Đã đánh dấu bỏ lỡ')) void reload(); }}><CalendarX className="w-3.5 h-3.5" /> Bỏ lỡ</Button>}
                  {v.status === 'Kế hoạch' && v.customerAddress && (
                    <a className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-700" target="_blank" rel="noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.customerAddress)}`}><Navigation className="w-3.5 h-3.5" /> Chỉ đường</a>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <PlanVisitsModal open={planOpen} onClose={() => setPlanOpen(false)} notify={notify} defaultDate={date} canAssign={can('canApproveOrders')} userName={userName} onDone={() => void reload()} />
      {orderFor && (
        <OrderFormModal open onClose={() => setOrderFor(null)} initialCustomerId={orderFor.customerId} visitId={orderFor.id} notify={notify} userName={userName}
          onCreated={() => void reload()} />
      )}
      {checkoutFor && <CheckoutModal visit={checkoutFor} onClose={() => setCheckoutFor(null)} notify={notify} onDone={() => void reload()} />}
    </>
  );
}

function PlanVisitsModal({ open, onClose, notify, defaultDate, canAssign, userName, onDone }: {
  open: boolean; onClose: () => void; notify: (m: string) => void; defaultDate: string; canAssign: boolean; userName: string; onDone: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(defaultDate);
  const [purpose, setPurpose] = useState('Lấy đơn');
  const [rep, setRep] = useState(userName);
  const [showAll, setShowAll] = useState(false);
  const [route, setRoute] = useState('');
  const [q, setQ] = useState('');
  const { busy, run } = useAction(notify);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set()); setDate(defaultDate); setRep(userName); setQ(''); setRoute(''); setShowAll(false);
    crm.customers.list({ type: 'B2B', status: 'Đang hoạt động' }).then(r => setCustomers(r.customers)).catch(e => notify(e.message));
  }, [open, defaultDate, userName, notify]);

  const routes = [...new Set(customers.map(c => c.routeName).filter(Boolean))] as string[];
  // Outlets the chosen person looks after (plus unassigned ones); a manager can tick "all".
  const ownedBy = (c: Customer) => !c.assignedRep || c.assignedRep === rep;
  const list = customers.filter(c => (!route || c.routeName === route) && (!q || c.name.toLowerCase().includes(q.toLowerCase())) && ((canAssign && showAll) || ownedBy(c)));
  const pickRep = (name: string) => { setRep(name); setSelected(new Set()); };
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Modal open={open} onClose={onClose} wide title="Lên lịch viếng thăm"
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || selected.size === 0}
        onClick={async () => { const r = await run(() => crm.visits.plan({ customerIds: [...selected], plannedDate: date, purpose, salesRep: rep }), `Đã lên lịch ${selected.size} điểm bán`); if (r) { onDone(); onClose(); } }}>
        Lên lịch {selected.size || ''} điểm</Button></>}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Ngày"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Mục đích"><Select value={purpose} onChange={e => setPurpose(e.target.value)}>{VISIT_PURPOSES.map(p => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Nhân viên đi thăm">
            <RepSelect value={rep} disabled={!canAssign} onChange={pickRep} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Tìm điểm bán…" value={q} onChange={e => setQ(e.target.value)} className="flex-1 min-w-40" />
          {routes.length > 0 && <Select value={route} onChange={e => setRoute(e.target.value)} className="!w-44"><option value="">Mọi tuyến</option>{routes.map(r => <option key={r}>{r}</option>)}</Select>}
          <Button variant="secondary" onClick={() => setSelected(new Set(list.map(c => c.id)))}>Chọn tất cả</Button>
          {canAssign && (
            <label className="flex items-center gap-2 text-xs text-slate-600 w-full sm:w-auto">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="w-4 h-4" />
              Hiện cả điểm bán của người khác
            </label>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {showAll && canAssign ? 'Đang hiện mọi điểm bán.' : `Điểm bán do ${rep} phụ trách và điểm bán chưa giao cho ai.`}
        </p>
        <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {list.map(c => (
            <li key={c.id}>
              <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4" />
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{c.name}</div><div className="text-xs text-slate-400 truncate">{c.channel} · {c.routeName || 'Chưa có tuyến'} · {c.address}</div></div>
                <span className="text-xs text-slate-400 shrink-0">{c.lastOrderDate ? `Đơn cuối ${fmtDate(c.lastOrderDate)}` : 'Chưa có đơn'}</span>
              </label>
            </li>
          ))}
          {list.length === 0 && <li className="p-4 text-sm text-slate-400 text-center">Không có điểm bán phù hợp</li>}
        </ul>
      </div>
    </Modal>
  );
}

function CheckoutModal({ visit, onClose, notify, onDone }: { visit: Visit; onClose: () => void; notify: (m: string) => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState(visit.orderId ? 'Có đơn' : 'Không có đơn');
  const [notes, setNotes] = useState('');
  const [collected, setCollected] = useState(0);
  const [method, setMethod] = useState('Tiền mặt');
  const [debt, setDebt] = useState<number | null>(null);
  const { busy, run } = useAction(notify);
  useEffect(() => {
    crm.customers.get(visit.customerId).then(r => setDebt(r.customer.outstandingDebt || 0)).catch(() => setDebt(null));
  }, [visit.customerId]);

  const submit = async () => {
    const r = await run(() => crm.visits.checkOut(visit.id, { outcome, notes: notes || undefined, collectedAmount: collected || undefined, collectionMethod: method }));
    if (!r) return;
    const c = r.collection;
    if (c && c.allocations.length) {
      const total = c.allocations.reduce((s, a) => s + a.amount, 0);
      notify(`Đã thu ${vnd(total)} — trừ vào ${c.allocations.map(a => a.orderCode).join(', ')}${c.unallocated ? ` · thừa ${vnd(c.unallocated)} chưa ghi nhận` : ''}`);
    } else if (c && c.unallocated) {
      notify(`Khách không còn công nợ — ${vnd(c.unallocated)} chưa ghi nhận`);
    } else {
      notify('Đã hoàn thành viếng thăm');
    }
    onDone(); onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Kết thúc viếng thăm · ${visit.customerName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy} onClick={submit}>Hoàn thành</Button></>}>
      <div className="space-y-3">
        <Field label="Kết quả">
          <Select value={outcome} onChange={e => setOutcome(e.target.value)}>
            {['Có đơn', 'Không có đơn', 'Khách còn hàng', 'Chủ cửa hàng vắng', 'Đã thu nợ', 'Đã trưng bày', 'Khiếu nại / phản hồi'].map(o => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
          <Field label="Tiền thu nợ tại điểm (đ)" hint={debt === null ? 'Tự trừ vào các đơn còn nợ, cũ nhất trước' : `Công nợ hiện tại ${vnd(debt)} · tự trừ vào đơn cũ nhất trước`}>
            <MoneyInput value={collected} onChange={setCollected} />
          </Field>
          <Field label="Hình thức">
            <Select value={method} onChange={e => setMethod(e.target.value)}>{['Tiền mặt', 'Chuyển khoản', 'VietQR'].map(m => <option key={m}>{m}</option>)}</Select>
          </Field>
        </div>
        {debt !== null && collected > debt && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Số tiền lớn hơn công nợ — phần thừa {vnd(collected - debt)} sẽ không được ghi nhận.</div>}
        <Field label="Ghi chú (tồn kho, đối thủ, trưng bày…)"><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ================================================================ KPI
function KpiPanel({ notify, can, refreshKey }: ViewProps) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [targetsOpen, setTargetsOpen] = useState(false);
  const { data, error, loading, reload } = useLoad(() => crm.kpi(month), [month, refreshKey]);
  const assignees = useAssignees();
  const rows = data?.rows || [];
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totalTarget = rows.reduce((s, r) => s + r.revenueTarget, 0);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="sm:w-48" />
        {can('canApproveOrders') && <Button variant="secondary" className="sm:ml-auto" onClick={() => setTargetsOpen(true)}><Target className="w-4 h-4" /> Giao chỉ tiêu tháng</Button>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Doanh số đội" value={shortVnd(totalRev)} />
        <Stat label="Chỉ tiêu" value={totalTarget ? shortVnd(totalTarget) : '—'} hint={totalTarget ? `Đạt ${Math.round((totalRev / totalTarget) * 100)}%` : 'Chưa giao chỉ tiêu'} />
        <Stat label="Viếng thăm hoàn thành" value={rows.reduce((s, r) => s + r.visitsDone, 0)} hint={`/ ${rows.reduce((s, r) => s + r.visitsPlanned, 0)} kế hoạch`} />
        <Stat label="Khách mới" value={rows.reduce((s, r) => s + r.newCustomers, 0)} />
      </div>
      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card>
          {rows.length === 0 ? <Empty text="Chưa có số liệu tháng này" /> : (
            <Table>
              <thead className="border-b border-slate-100"><tr><Th>Nhân viên</Th><Th>Doanh số / Chỉ tiêu</Th><Th className="text-right">Đơn</Th><Th className="text-right">Viếng thăm</Th><Th className="text-right">Strike rate</Th><Th className="text-right">Khách mới</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.salesRep}>
                    <Td>
                      <div className="font-semibold">{r.salesRep}</div>
                      {!isKnownRep(assignees, r.salesRep) && <div className="text-[11px] text-amber-600">Không khớp tài khoản nào</div>}
                    </Td>
                    <Td className="min-w-56">
                      <div className="flex justify-between text-xs mb-1"><span className="tabular-nums font-semibold">{shortVnd(r.revenue)}</span><span className="text-slate-400 tabular-nums">{r.revenueTarget ? `${r.achievement}% / ${shortVnd(r.revenueTarget)}` : 'chưa giao'}</span></div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${(r.achievement ?? 0) >= 100 ? 'bg-emerald-500' : (r.achievement ?? 0) >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, r.achievement ?? 0)}%` }} /></div>
                    </Td>
                    <Td className="text-right tabular-nums">{r.orders}</Td>
                    <Td className="text-right tabular-nums">{r.visitsDone}/{r.visitsPlanned}{r.visitTarget ? <span className="text-xs text-slate-400"> (CT {r.visitTarget})</span> : null}</Td>
                    <Td className="text-right tabular-nums">{r.visitsDone ? `${r.strikeRate}%` : '—'}</Td>
                    <Td className="text-right tabular-nums">{r.newCustomers}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
      {targetsOpen && <TargetsModal month={month} onClose={() => setTargetsOpen(false)} notify={notify} onDone={() => void reload()} />}
    </>
  );
}

const prevMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};

/**
 * Monthly targets. Rows = every active sales rep / manager account (not
 * free-typed names); targets saved earlier under a name that matches no
 * account are shown flagged so they can be removed.
 */
function TargetsModal({ month, onClose, notify, onDone }: { month: string; onClose: () => void; notify: (m: string) => void; onDone: () => void }) {
  const assignees = useAssignees();
  const [all, setAll] = useState<SalesTarget[] | null>(null);
  const [rows, setRows] = useState<SalesTarget[]>([]);
  const [extra, setExtra] = useState('');
  const { busy, run } = useAction(notify);

  useEffect(() => {
    if (!assignees) return;
    crm.collection.get<SalesTarget>('salesTargets').then(items => {
      setAll(items);
      const existing = items.filter(t => t.month === month);
      const team = assignees.filter(a => a.role !== 'self').map(a => a.name);
      const names = [...new Set([...team, ...existing.map(t => t.salesRep)])];
      setRows(names.map(n => existing.find(t => t.salesRep === n) || { salesRep: n, month, revenueTarget: 0, visitTarget: 0 }));
    }).catch(e => notify(e.message));
  }, [month, assignees, notify]);

  const upd = (name: string, patch: Partial<SalesTarget>) => setRows(rs => rs.map(r => (r.salesRep === name ? { ...r, ...patch } : r)));
  const addable = (assignees || []).filter(a => !rows.some(r => r.salesRep === a.name));
  const last = (all || []).filter(t => t.month === prevMonth(month));
  const copyLast = () => setRows(rs => rs.map(r => {
    const p = last.find(t => t.salesRep === r.salesRep);
    return p && !r.revenueTarget && !r.visitTarget ? { ...r, revenueTarget: p.revenueTarget, visitTarget: p.visitTarget } : r;
  }));
  const totalRevenue = rows.reduce((s, r) => s + (r.revenueTarget || 0), 0);
  const totalVisits = rows.reduce((s, r) => s + (r.visitTarget || 0), 0);

  return (
    <Modal open onClose={onClose} title={`Giao chỉ tiêu tháng ${month.split('-').reverse().join('/')}`}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || !all}
        onClick={async () => {
          const merged = [...(all || []).filter(t => t.month !== month), ...rows.filter(r => r.revenueTarget > 0 || (r.visitTarget || 0) > 0)];
          if (await run(() => crm.collection.save('salesTargets', merged), 'Đã lưu chỉ tiêu')) { onDone(); onClose(); }
        }}>Lưu chỉ tiêu</Button></>}>
      {!all || !assignees ? <Loading /> : (
        <div className="space-y-2">
          {assignees.length <= 1 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Chưa có tài khoản nào mang vai trò Nhân viên / Quản lý kinh doanh. Tạo hoặc chỉnh vai trò ở <b>Tài khoản nhân viên</b> trước.
            </div>
          )}
          <div className="grid grid-cols-[1fr_150px_100px_28px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 px-0.5">
            <span>Nhân viên</span><span>Doanh số (đ)</span><span>Lượt viếng thăm</span><span />
          </div>
          {rows.map(r => {
            const unknown = !isKnownRep(assignees, r.salesRep);
            return (
              <div key={r.salesRep} className="grid grid-cols-[1fr_150px_100px_28px] gap-2 items-center">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.salesRep}</div>
                  {unknown && <div className="text-[11px] text-amber-600">Không khớp tài khoản nào — số liệu sẽ không cộng cho ai</div>}
                </div>
                <MoneyInput value={r.revenueTarget} onChange={v => upd(r.salesRep, { revenueTarget: v })} placeholder="0" />
                <Input type="number" min={0} value={r.visitTarget || ''} onChange={e => upd(r.salesRep, { visitTarget: Number(e.target.value) || 0 })} placeholder="0" />
                {unknown
                  ? <button aria-label={`Bỏ ${r.salesRep}`} title="Bỏ dòng này" onClick={() => setRows(rs => rs.filter(x => x.salesRep !== r.salesRep))} className="text-slate-400 hover:text-rose-600 cursor-pointer text-lg leading-none">×</button>
                  : <span />}
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_150px_100px_28px] gap-2 border-t border-slate-100 pt-2 text-sm font-semibold">
            <span>Tổng đội</span><span className="tabular-nums px-3">{vnd(totalRevenue)}</span><span className="tabular-nums px-3">{totalVisits || '—'}</span><span />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {addable.length > 0 && (
              <>
                <Select value={extra} onChange={e => setExtra(e.target.value)} className="flex-1 min-w-48">
                  <option value="">Thêm người khác…</option>
                  {addable.map(a => <option key={a.id} value={a.name}>{a.name}{a.role === 'self' ? ' (tôi)' : ''}</option>)}
                </Select>
                <Button variant="secondary" disabled={!extra} onClick={() => { setRows(rs => [...rs, { salesRep: extra, month, revenueTarget: 0, visitTarget: 0 }]); setExtra(''); }}>Thêm</Button>
              </>
            )}
            {last.length > 0 && <Button variant="secondary" onClick={copyLast}>Chép từ tháng trước</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ================================================================ deals pipeline
const STAGES = ['Mới tiếp nhận', 'Đã liên hệ', 'Gửi báo giá', 'Đàm phán', 'Chốt thành công (Won)', 'Thất bại (Lost)'];

function DealsPanel({ notify, can, userName, refreshKey }: ViewProps) {
  const [type, setType] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data, error, loading, reload } = useLoad(() => crm.leads.list(), [refreshKey]);
  const { busy, run } = useAction(notify);
  const leads = (data?.leads || []).filter(l => !type || l.type === type);
  const open = leads.filter(l => !String(l.stage).startsWith('Chốt') && !String(l.stage).startsWith('Thất bại'));
  const weighted = open.reduce((s, l) => s + (l.expectedValue || 0) * (l.probability || 0) / 100, 0);
  const editable = can('canManageB2BContracts');

  const convert = async (l: any) => {
    const r = await run(() => crm.customers.create({ type: l.type === 'B2B' ? 'B2B' : 'B2C', name: l.customerName, phone: l.phone, email: l.email || undefined, contactPerson: l.contactPerson || undefined, assignedRep: l.assignedStaff, source: l.source, notes: l.notes } as any), `Đã tạo khách hàng ${l.customerName}`);
    if (r) await run(() => crm.leads.update(l.id, { notes: `${l.notes || ''}\n→ Đã tạo KH ${r.customer.code}`.trim() }));
    void reload();
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Cơ hội đang mở" value={open.length} />
        <Stat label="Giá trị pipeline" value={shortVnd(open.reduce((s, l) => s + (l.expectedValue || 0), 0))} />
        <Stat label="Giá trị kỳ vọng" value={shortVnd(weighted)} hint="Theo xác suất chốt" />
        <Stat label="Đã chốt" value={leads.filter(l => String(l.stage).startsWith('Chốt')).length} tone="green" />
      </div>
      <div className="flex gap-2">
        <Select value={type} onChange={e => setType(e.target.value)} className="!w-40"><option value="">B2B + B2C</option><option>B2B</option><option>B2C</option></Select>
        {editable && <Button className="ml-auto" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Thêm cơ hội</Button>}
      </div>
      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {STAGES.map(stage => {
            const col = leads.filter(l => l.stage === stage || (stage === 'Đàm phán' && l.stage === 'Đàm phán hợp đồng'));
            return (
              <div key={stage} className="w-72 shrink-0 bg-slate-100/70 rounded-2xl p-2">
                <div className="flex justify-between items-center px-2 py-1.5 text-xs font-bold text-slate-600"><span>{stage}</span><span className="tabular-nums">{col.length} · {shortVnd(col.reduce((s, l) => s + (l.expectedValue || 0), 0))}</span></div>
                <div className="space-y-2">
                  {col.map(l => (
                    <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5"><TypeBadge type={l.type} /><span className="text-sm font-bold truncate">{l.customerName}</span></div>
                      <div className="text-xs text-slate-500 truncate">{l.serviceCategory}</div>
                      <div className="flex justify-between text-xs"><span className="font-semibold tabular-nums">{shortVnd(l.expectedValue)}</span><span className="text-slate-400">{l.probability}% · {l.assignedStaff}</span></div>
                      {l.followUpDate && <div className="text-[11px] text-slate-400">Hẹn {fmtDate(l.followUpDate)}</div>}
                      {editable && (
                        <div className="flex gap-1 pt-1">
                          <Select value={l.stage} disabled={busy} onChange={async e => { if (await run(() => crm.leads.update(l.id, { stage: e.target.value, probability: e.target.value.startsWith('Chốt') ? 100 : e.target.value.startsWith('Thất bại') ? 0 : l.probability }))) void reload(); }} className="!py-1 !text-xs">
                            {STAGES.map(s => <option key={s}>{s}</option>)}
                          </Select>
                          {String(l.stage).startsWith('Chốt') && can('canManageCustomers') && !String(l.notes || '').includes('Đã tạo KH') && (
                            <Button variant="secondary" className="!px-2 !py-1" title="Chuyển thành khách hàng" onClick={() => convert(l)}><UserPlus className="w-3.5 h-3.5" /></Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <DealModal open={createOpen} onClose={() => setCreateOpen(false)} notify={notify} userName={userName} onDone={() => void reload()} />
    </>
  );
}

function DealModal({ open, onClose, notify, userName, onDone }: { open: boolean; onClose: () => void; notify: (m: string) => void; userName: string; onDone: () => void }) {
  const blank = { type: 'B2B', customerName: '', contactPerson: '', phone: '', email: '', serviceCategory: '', expectedValue: 0, probability: 30, source: 'Sales thị trường', followUpDate: '', notes: '', stage: 'Mới tiếp nhận', assignedStaff: userName };
  const [d, setD] = useState<any>(blank);
  const { busy, run } = useAction(notify);
  useEffect(() => { if (open) setD({ ...blank, assignedStaff: userName }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: any) => setD((p: any) => ({ ...p, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Thêm cơ hội bán hàng"
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || !d.customerName.trim()} onClick={async () => { if (await run(() => crm.leads.create(d), 'Đã thêm cơ hội')) { onDone(); onClose(); } }}>Lưu</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Loại"><Select value={d.type} onChange={e => set('type', e.target.value)}><option value="B2B">B2B — mở điểm bán / NPP / chuỗi</option><option value="B2C">B2C — đơn lớn / quà tặng DN</option></Select></Field>
        <Field label="Tên khách / đơn vị" required><Input value={d.customerName} onChange={e => set('customerName', e.target.value)} /></Field>
        <Field label="Người liên hệ"><Input value={d.contactPerson} onChange={e => set('contactPerson', e.target.value)} /></Field>
        <Field label="Điện thoại"><Input value={d.phone} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="Nhu cầu / sản phẩm quan tâm" className="sm:col-span-2"><Input value={d.serviceCategory} onChange={e => set('serviceCategory', e.target.value)} placeholder="VD: Listing 6 SKU tinh dầu vào chuỗi nhà thuốc" /></Field>
        <Field label="Giá trị dự kiến (đ)"><MoneyInput value={d.expectedValue} onChange={v => set('expectedValue', v)} /></Field>
        <Field label="Xác suất chốt (%)"><Input type="number" min={0} max={100} value={d.probability} onChange={e => set('probability', Number(e.target.value) || 0)} /></Field>
        <Field label="Nguồn"><Select value={d.source} onChange={e => set('source', e.target.value)}>{['Sales thị trường', 'Website', 'Zalo', 'Facebook', 'Hotline', 'Hội chợ / Triển lãm', 'Giới thiệu'].map(s => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Hẹn liên hệ lại"><Input type="date" value={d.followUpDate} onChange={e => set('followUpDate', e.target.value)} /></Field>
        <Field label="Ghi chú" className="sm:col-span-2"><Textarea rows={2} value={d.notes} onChange={e => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ================================================================ inactive outlets
function InactivePanel({ notify, can, userName, refreshKey }: ViewProps) {
  const { data, error, loading, reload } = useLoad(() => crm.inactiveAccounts(), [refreshKey]);
  const { busy, run } = useAction(notify);
  const rows = data?.rows || [];
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <Card title={`${rows.length} điểm bán quá hạn không phát sinh đơn`}>
      <p className="px-4 text-xs text-slate-500 -mt-1 mb-2">Ngưỡng theo tần suất viếng thăm: hàng tuần 14 ngày, 2 tuần/lần 28 ngày, hàng tháng 45 ngày.</p>
      {rows.length === 0 ? <Empty text="Tất cả điểm bán đều đặt hàng đều đặn" /> : (
        <Table>
          <thead className="border-b border-slate-100"><tr><Th>Điểm bán</Th><Th>Phụ trách</Th><Th className="text-right">Ngày không đặt</Th><Th className="text-right">Công nợ</Th>{can('canManageVisits') && <Th />}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(c => (
              <tr key={c.id}>
                <Td><div className="font-semibold">{c.name}</div><div className="text-xs text-slate-400">{c.channel} · {c.routeName || '—'} · {c.phone}</div></Td>
                <Td className="text-xs">{c.assignedRep || '—'}</Td>
                <Td className="text-right"><Badge tone={(c.daysSinceLastOrder ?? 999) > c.limitDays * 2 ? 'red' : 'amber'}>{c.daysSinceLastOrder == null ? 'Chưa từng đặt' : `${c.daysSinceLastOrder} ngày`}</Badge></Td>
                <Td className="text-right tabular-nums">{vnd(c.outstandingDebt)}</Td>
                {can('canManageVisits') && (
                  <Td className="text-right">
                    <Button variant="secondary" disabled={busy} onClick={async () => {
                      if (await run(() => crm.visits.plan({ customerIds: [c.id], plannedDate: today(), purpose: 'Chăm sóc khách hàng', salesRep: c.assignedRep || userName }), `Đã lên lịch thăm ${c.name} hôm nay`)) void reload();
                    }}>Lên lịch thăm</Button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
