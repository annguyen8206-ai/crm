import type { Express } from 'express';
import { dbStore, SupportTicketRecord } from '../store';
import { requirePerm } from '../rbac';
import { pageOf } from '../http-util';
import { scopeList, canAccessBranch, enforceBranchOnCreate } from '../branch-scope';

const PRIORITY_HOURS: Record<SupportTicketRecord['priority'], number> = {
  'Khẩn cấp (SLA 30p)': 0.5,
  'Cao (SLA 2h)': 2,
  'Trung bình (SLA 8h)': 8,
  'Thấp (SLA 24h)': 24,
};
const STATUSES: SupportTicketRecord['status'][] = ['Mới tiếp nhận', 'Đang xử lý', 'Đã giải quyết', 'Đã đóng'];

/** Local "YYYY-MM-DD HH:mm" — the format tickets have always stored. */
export function localStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Sequential per-day ticket code: CS-261117-001, CS-261117-002, ... */
export function nextTicketCode(existing: string[], now = new Date()): string {
  const prefix = `CS-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`;
  let max = 0;
  for (const c of existing) {
    if (!c?.startsWith(prefix)) continue;
    const n = Number(c.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** SLA deadline from priority when the client does not send one. */
export function slaDeadlineFor(priority: SupportTicketRecord['priority'], from = new Date()): string {
  return localStamp(new Date(from.getTime() + (PRIORITY_HOURS[priority] ?? 8) * 3_600_000));
}

/** Customer care tickets (complaints, returns, delivery issues) with SLA tracking. */
export function registerCareRoutes(app: Express): void {
  app.get('/api/tickets', (req, res) => {
    const { status, priority, department, isOverdue, customerId } = req.query;
    let filtered = scopeList(req, [...dbStore.tickets], t => t.branchId);

    if (status && typeof status === 'string') filtered = filtered.filter(t => t.status === status);
    if (priority && typeof priority === 'string') filtered = filtered.filter(t => t.priority === priority);
    if (department && typeof department === 'string') filtered = filtered.filter(t => t.department === department);
    if (customerId && typeof customerId === 'string') filtered = filtered.filter(t => t.patientId === customerId);
    if (isOverdue !== undefined) filtered = filtered.filter(t => t.isOverdue === (isOverdue === 'true'));

    const p = pageOf(filtered, req.query);
    res.json({ tickets: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.post('/api/tickets', requirePerm('canManageTickets'), (req, res) => {
    const data = req.body || {};
    const customer = data.patientId ? dbStore.customers.find(c => c.id === data.patientId) : undefined;
    const name = String(data.patientName || customer?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Thiếu khách hàng' });
    if (!String(data.description || '').trim()) return res.status(400).json({ error: 'Thiếu nội dung phản ánh' });

    const priority: SupportTicketRecord['priority'] = data.priority in PRIORITY_HOURS ? data.priority : 'Trung bình (SLA 8h)';
    const now = new Date();
    const ticket: SupportTicketRecord = {
      id: `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketCode: nextTicketCode(dbStore.tickets.map(t => t.ticketCode), now),
      patientId: customer?.id || String(data.patientId || ''),
      patientName: name,
      patientPhone: String(data.patientPhone || customer?.phone || ''),
      category: String(data.category || 'Góp ý khác'),
      priority,
      status: 'Mới tiếp nhận',
      department: String(data.department || 'Phòng CSKH'),
      branchId: enforceBranchOnCreate(req, data.branchId || customer?.branchId) || customer?.branchId || '',
      assignedStaff: String(data.assignedStaff || req.authUser?.name || ''),
      description: String(data.description).slice(0, 5000),
      slaDeadline: typeof data.slaDeadline === 'string' && data.slaDeadline ? data.slaDeadline : slaDeadlineFor(priority, now),
      isOverdue: false,
      compensationVoucher: data.compensationVoucher || '',
      orderCode: data.orderCode ? String(data.orderCode).trim().toUpperCase() : undefined,
      createdAt: localStamp(now),
    };

    dbStore.tickets.unshift(ticket);
    res.status(201).json({ success: true, ticket });
  });

  app.put('/api/tickets/:id', requirePerm('canManageTickets'), (req, res) => {
    const idx = dbStore.tickets.findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy phiếu hỗ trợ' });
    const current = dbStore.tickets[idx];
    if (!canAccessBranch(req, current.branchId)) return res.status(403).json({ error: 'Phiếu thuộc chi nhánh khác' });

    const body = req.body || {};
    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }
    // Only workflow fields are editable; identity, code, branch and timestamps are not.
    const patch: Partial<SupportTicketRecord> = {};
    for (const k of ['status', 'resolution', 'compensationVoucher', 'assignedStaff', 'category', 'description'] as const) {
      if (body[k] !== undefined) (patch as any)[k] = String(body[k]).slice(0, 5000);
    }
    if (body.priority !== undefined && body.priority in PRIORITY_HOURS) patch.priority = body.priority;

    const updated: SupportTicketRecord = { ...current, ...patch };
    const closing = (updated.status === 'Đã giải quyết' || updated.status === 'Đã đóng');
    if (closing && !current.resolvedAt) updated.resolvedAt = localStamp(new Date());
    if (!closing) updated.resolvedAt = undefined;

    dbStore.tickets[idx] = updated;
    res.json({ success: true, ticket: updated });
  });
}
