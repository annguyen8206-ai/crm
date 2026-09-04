import type { Express } from 'express';
import { dbStore, LeadDealRecord } from '../store';
import { requirePerm } from '../rbac';
import { pageOf } from '../http-util';

/** Sales pipeline: B2B/B2C leads & deals. */
export function registerSalesRoutes(app: Express): void {
  app.get('/api/leads', (req, res) => {
    const { stage, type, assignedStaff } = req.query;
    let filtered = [...dbStore.leads];

    if (stage && typeof stage === 'string') filtered = filtered.filter(l => l.stage === stage);
    if (type && typeof type === 'string') filtered = filtered.filter(l => l.type === type);
    if (assignedStaff && typeof assignedStaff === 'string') filtered = filtered.filter(l => l.assignedStaff === assignedStaff);

    const totalPipelineValue = filtered.reduce((acc, curr) => acc + (curr.expectedValue || 0), 0);
    const weightedPipelineValue = filtered.reduce((acc, curr) => acc + ((curr.expectedValue || 0) * (curr.probability || 50) / 100), 0);

    const p = pageOf(filtered, req.query);
    res.json({
      leads: p.page,
      total: p.total, limit: p.limit, offset: p.offset,
      totalPipelineValue,
      weightedPipelineValue
    });
  });

  app.post('/api/leads', requirePerm('canManageB2BContracts'), (req, res) => {
    const data = req.body;
    const newLead: LeadDealRecord = {
      id: `deal-${Date.now()}`,
      customerName: data.customerName,
      type: data.type || 'B2C',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '09xx xxx xxx',
      email: data.email || '',
      serviceCategory: data.serviceCategory || 'Gói Khám Sức Khỏe',
      expectedValue: Number(data.expectedValue) || 10000000,
      stage: data.stage || 'Mới tiếp nhận',
      probability: Number(data.probability) || 50,
      assignedStaff: data.assignedStaff || 'Lê Hoàng Long',
      source: data.source || 'Website',
      notes: data.notes || '',
      followUpDate: data.followUpDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10)
    };

    dbStore.leads.unshift(newLead);
    res.status(201).json({ success: true, lead: newLead });
  });

  app.put('/api/leads/:id', requirePerm('canManageB2BContracts'), (req, res) => {
    const idx = dbStore.leads.findIndex(l => l.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    }

    dbStore.leads[idx] = { ...dbStore.leads[idx], ...req.body };
    res.json({ success: true, lead: dbStore.leads[idx] });
  });
}
