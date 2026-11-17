import type { Express } from 'express';
import { dbStore, LeadDealRecord } from '../store';
import { requirePerm } from '../rbac';
import { pageOf } from '../http-util';

export const LEAD_STAGES: LeadDealRecord['stage'][] = [
  'Mới tiếp nhận', 'Đã liên hệ', 'Gửi báo giá', 'Đàm phán', 'Chốt thành công (Won)', 'Thất bại (Lost)',
];
/** Older records used these names — read as their current equivalent. */
const STAGE_ALIASES: Record<string, LeadDealRecord['stage']> = {
  'Đàm phán hợp đồng': 'Đàm phán',
  'Tư vấn chuyên sâu': 'Đã liên hệ',
};
export const normalizeStage = (s: unknown): LeadDealRecord['stage'] | undefined => {
  const v = String(s ?? '');
  return (LEAD_STAGES as string[]).includes(v) ? (v as LeadDealRecord['stage']) : STAGE_ALIASES[v];
};
const isClosed = (s: string) => s.startsWith('Chốt') || s.startsWith('Thất bại');

const clampPct = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== '' && v != null ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
};
const money = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== '' && v != null ? Math.max(0, Math.round(n)) : fallback;
};
const text = (v: unknown, max = 500) => (v == null ? '' : String(v).trim().slice(0, max));

/** Sales pipeline: B2B (new outlets, distributors, chain listings) and large B2C deals. */
export function registerSalesRoutes(app: Express): void {
  app.get('/api/leads', (req, res) => {
    const { stage, type, assignedStaff } = req.query;
    let filtered = dbStore.leads.map(l => ({ ...l, stage: normalizeStage(l.stage) || l.stage }));

    if (stage && typeof stage === 'string') filtered = filtered.filter(l => l.stage === stage);
    if (type && typeof type === 'string') filtered = filtered.filter(l => l.type === type);
    if (assignedStaff && typeof assignedStaff === 'string') filtered = filtered.filter(l => l.assignedStaff === assignedStaff);

    const open = filtered.filter(l => !isClosed(l.stage));
    const p = pageOf(filtered, req.query);
    res.json({
      leads: p.page,
      total: p.total, limit: p.limit, offset: p.offset,
      totalPipelineValue: open.reduce((s, l) => s + (l.expectedValue || 0), 0),
      weightedPipelineValue: Math.round(open.reduce((s, l) => s + (l.expectedValue || 0) * (l.probability ?? 0) / 100, 0)),
    });
  });

  app.post('/api/leads', requirePerm('canManageB2BContracts'), (req, res) => {
    const d = req.body || {};
    const customerName = text(d.customerName, 200);
    if (!customerName) return res.status(400).json({ error: 'Thiếu tên khách / đơn vị' });
    const stage = normalizeStage(d.stage) || 'Mới tiếp nhận';
    const lead: LeadDealRecord = {
      id: `deal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerName,
      type: d.type === 'B2C' ? 'B2C' : 'B2B',
      contactPerson: text(d.contactPerson, 200),
      phone: text(d.phone, 30),
      email: text(d.email, 200),
      serviceCategory: text(d.serviceCategory, 300),
      expectedValue: money(d.expectedValue),
      stage,
      probability: stage.startsWith('Chốt') ? 100 : stage.startsWith('Thất bại') ? 0 : clampPct(d.probability, 30),
      assignedStaff: text(d.assignedStaff, 200) || req.authUser?.name || '',
      source: text(d.source, 100) || 'Sales thị trường',
      notes: text(d.notes, 4000),
      followUpDate: /^\d{4}-\d{2}-\d{2}$/.test(String(d.followUpDate || '')) ? d.followUpDate : '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    dbStore.leads.unshift(lead);
    res.status(201).json({ success: true, lead });
  });

  app.put('/api/leads/:id', requirePerm('canManageB2BContracts'), (req, res) => {
    const idx = dbStore.leads.findIndex(l => l.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    const d = req.body || {};
    const cur = dbStore.leads[idx];
    const next: LeadDealRecord = { ...cur, stage: normalizeStage(cur.stage) || cur.stage };

    if (d.stage !== undefined) {
      const stage = normalizeStage(d.stage);
      if (!stage) return res.status(400).json({ error: 'Giai đoạn không hợp lệ' });
      next.stage = stage;
    }
    if (d.customerName !== undefined) {
      const name = text(d.customerName, 200);
      if (!name) return res.status(400).json({ error: 'Thiếu tên khách / đơn vị' });
      next.customerName = name;
    }
    if (d.type !== undefined) next.type = d.type === 'B2C' ? 'B2C' : 'B2B';
    for (const k of ['contactPerson', 'phone', 'email', 'serviceCategory', 'assignedStaff', 'source', 'notes'] as const) {
      if (d[k] !== undefined) (next as any)[k] = text(d[k], k === 'notes' ? 4000 : 300);
    }
    if (d.expectedValue !== undefined) next.expectedValue = money(d.expectedValue, cur.expectedValue);
    if (d.probability !== undefined) next.probability = clampPct(d.probability, cur.probability);
    if (d.followUpDate !== undefined) next.followUpDate = /^\d{4}-\d{2}-\d{2}$/.test(String(d.followUpDate)) ? d.followUpDate : '';
    // Closing a deal pins the probability.
    if (next.stage.startsWith('Chốt')) next.probability = 100;
    if (next.stage.startsWith('Thất bại')) next.probability = 0;

    dbStore.leads[idx] = next;
    res.json({ success: true, lead: next });
  });
}
