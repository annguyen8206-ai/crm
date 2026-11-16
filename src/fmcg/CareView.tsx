import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { crm, type Customer } from './api';
import {
  PageHeader, Card, Tabs, Input, Select, Textarea, Button, Badge, Loading, ErrorBox, Empty, Modal, Field, Stat,
  Table, Th, Td, useLoad, useAction, fmtDateTime, type ViewProps, type Tone,
} from './ui';

const CATEGORIES = ['Chất lượng sản phẩm', 'Giao hàng chậm / sai hàng', 'Đổi trả hàng', 'Giá & khuyến mãi', 'Công nợ / hoá đơn', 'Trưng bày & hỗ trợ điểm bán', 'Góp ý khác'];
const PRIORITIES: Array<{ label: string; hours: number }> = [
  { label: 'Khẩn cấp (SLA 30p)', hours: 0.5 },
  { label: 'Cao (SLA 2h)', hours: 2 },
  { label: 'Trung bình (SLA 8h)', hours: 8 },
  { label: 'Thấp (SLA 24h)', hours: 24 },
];
const STATUSES = ['Mới tiếp nhận', 'Đang xử lý', 'Đã giải quyết', 'Đã đóng'];
const STATUS_TONE: Record<string, Tone> = { 'Mới tiếp nhận': 'blue', 'Đang xử lý': 'amber', 'Đã giải quyết': 'green', 'Đã đóng': 'slate' };

const localStamp = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const isOpen = (t: any) => t.status === 'Mới tiếp nhận' || t.status === 'Đang xử lý';
const isBreached = (t: any) => isOpen(t) && t.slaDeadline && new Date(t.slaDeadline.replace(' ', 'T')).getTime() < Date.now();

export function CareView({ notify, can, userName, refreshKey }: ViewProps) {
  const [tab, setTab] = useState<'open' | 'all'>('open');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const { data, error, loading, reload } = useLoad(() => crm.tickets.list(), [refreshKey]);
  const all = data?.tickets || [];
  const rows = all.filter(t => (tab === 'all' || isOpen(t)) && (!q || `${t.ticketCode} ${t.patientName} ${t.patientPhone} ${t.description}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-4">
      <PageHeader title="CSKH & Khiếu nại" subtitle="Tiếp nhận phản ánh chất lượng, giao hàng, đổi trả — theo dõi SLA xử lý"
        actions={can('canManageTickets') && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Tạo phiếu</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Đang mở" value={all.filter(isOpen).length} />
        <Stat label="Quá hạn SLA" value={all.filter(isBreached).length} tone={all.some(isBreached) ? 'red' : undefined} />
        <Stat label="Đã giải quyết" value={all.filter(t => t.status === 'Đã giải quyết' || t.status === 'Đã đóng').length} tone="green" />
        <Stat label="Chất lượng SP" value={all.filter(t => t.category === 'Chất lượng sản phẩm').length} hint="Tổng phiếu về chất lượng" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Tabs value={tab} onChange={setTab} items={[{ id: 'open', label: 'Đang mở' }, { id: 'all', label: 'Tất cả' }]} />
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Mã phiếu, khách hàng, nội dung…" className="pl-9" /></div>
      </div>
      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        <Card>
          {rows.length === 0 ? <Empty text="Không có phiếu" /> : (
            <Table>
              <thead className="border-b border-slate-100"><tr><Th>Phiếu</Th><Th>Khách hàng</Th><Th>Loại</Th><Th>Ưu tiên</Th><Th>Hạn SLA</Th><Th>Trạng thái</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(t => (
                  <tr key={t.id} onClick={() => setSelected(t)} className="hover:bg-slate-50 cursor-pointer">
                    <Td><div className="font-semibold">{t.ticketCode}</div><div className="text-xs text-slate-400 truncate max-w-56">{t.description}</div></Td>
                    <Td><div>{t.patientName}</div><div className="text-xs text-slate-400">{t.patientPhone}</div></Td>
                    <Td className="text-xs">{t.category}</Td>
                    <Td className="text-xs">{t.priority}</Td>
                    <Td>{isBreached(t) ? <Badge tone="red">Quá hạn</Badge> : <span className="text-xs">{t.slaDeadline}</span>}</Td>
                    <Td><Badge tone={STATUS_TONE[t.status] || 'slate'}>{t.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
      <CreateTicketModal open={createOpen} onClose={() => setCreateOpen(false)} notify={notify} userName={userName} onDone={() => void reload()} />
      {selected && <TicketModal ticket={selected} onClose={() => setSelected(null)} notify={notify} canEdit={can('canManageTickets')} onDone={() => { setSelected(null); void reload(); }} />}
    </div>
  );
}

function CreateTicketModal({ open, onClose, notify, userName, onDone }: { open: boolean; onClose: () => void; notify: (m: string) => void; userName: string; onDone: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[2].label);
  const [description, setDescription] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const { busy, run } = useAction(notify);
  useEffect(() => {
    if (!open) return;
    setCustomer(null); setQ(''); setDescription(''); setOrderCode('');
    crm.customers.list().then(r => setCustomers(r.customers)).catch(() => undefined);
  }, [open]);
  const matches = useMemo(() => (q ? customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')).slice(0, 6) : []), [q, customers]);

  const save = async () => {
    if (!customer) return notify('Chọn khách hàng');
    if (!description.trim()) return notify('Nhập nội dung phản ánh');
    const hours = PRIORITIES.find(p => p.label === priority)!.hours;
    const r = await run(() => crm.tickets.create({
      patientId: customer.id, patientName: customer.name, patientPhone: customer.phone, branchId: customer.branchId,
      category, priority, department: 'Phòng CSKH', assignedStaff: userName,
      description: orderCode ? `[Đơn ${orderCode}] ${description}` : description,
      slaDeadline: localStamp(new Date(Date.now() + hours * 3_600_000)),
    }), 'Đã tạo phiếu CSKH');
    if (r) { onDone(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Tạo phiếu CSKH"
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy} onClick={save}>Tạo phiếu</Button></>}>
      <div className="space-y-3">
        {customer ? (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"><span><b>{customer.name}</b> · {customer.phone}</span><button className="text-xs font-bold text-blue-600 cursor-pointer" onClick={() => setCustomer(null)}>Đổi</button></div>
        ) : (
          <Field label="Khách hàng" required>
            <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên hoặc SĐT…" />
            {matches.length > 0 && <ul className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-100">{matches.map(c => <li key={c.id}><button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => setCustomer(c)}>{c.name} <span className="text-slate-400">· {c.phone} · {c.type}</span></button></li>)}</ul>}
          </Field>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Loại phản ánh"><Select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Mức ưu tiên"><Select value={priority} onChange={e => setPriority(e.target.value)}>{PRIORITIES.map(p => <option key={p.label}>{p.label}</option>)}</Select></Field>
          <Field label="Mã đơn liên quan"><Input value={orderCode} onChange={e => setOrderCode(e.target.value)} placeholder="DH-…" /></Field>
        </div>
        <Field label="Nội dung" required><Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả vấn đề, số lô / hạn sử dụng nếu là lỗi sản phẩm…" /></Field>
      </div>
    </Modal>
  );
}

function TicketModal({ ticket, onClose, notify, canEdit, onDone }: { ticket: any; onClose: () => void; notify: (m: string) => void; canEdit: boolean; onDone: () => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [resolution, setResolution] = useState(ticket.resolution || '');
  const [voucher, setVoucher] = useState(ticket.compensationVoucher || '');
  const { busy, run } = useAction(notify);
  return (
    <Modal open onClose={onClose} title={`${ticket.ticketCode} · ${ticket.category}`}
      footer={canEdit ? <><Button variant="secondary" onClick={onClose}>Đóng</Button><Button disabled={busy} onClick={async () => { if (await run(() => crm.tickets.update(ticket.id, { status, resolution, compensationVoucher: voucher }), 'Đã cập nhật phiếu')) onDone(); }}>Lưu</Button></> : undefined}>
      <div className="space-y-3 text-sm">
        <div><b>{ticket.patientName}</b> · {ticket.patientPhone}</div>
        <div className="text-xs text-slate-500">Tạo {ticket.createdAt} · {ticket.priority} · hạn {ticket.slaDeadline} · phụ trách {ticket.assignedStaff}{ticket.resolvedAt ? ` · xong ${ticket.resolvedAt}` : ''}</div>
        <p className="bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">{ticket.description}</p>
        {canEdit ? (
          <>
            <Field label="Trạng thái"><Select value={status} onChange={e => setStatus(e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Hướng xử lý"><Textarea rows={3} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="VD: Đổi 1 thùng mới, thu hồi lô lỗi để QA kiểm tra" /></Field>
            <Field label="Voucher / bồi hoàn"><Input value={voucher} onChange={e => setVoucher(e.target.value)} /></Field>
          </>
        ) : ticket.resolution && <p><b>Xử lý:</b> {ticket.resolution}</p>}
      </div>
    </Modal>
  );
}
