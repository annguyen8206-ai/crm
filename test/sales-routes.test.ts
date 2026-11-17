import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerSalesRoutes } from '../server/routes/sales';
import { dbStore } from '../server/store';

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.authUser = { id: 'a', email: 'a@x', name: 'Rep An', role: 'admin', roleTitle: 'admin', branchId: null } as any; next(); });
registerSalesRoutes(app);

beforeEach(() => dbStore.clearAll());

describe('/api/leads', () => {
  it('keeps zero value / zero probability instead of inventing defaults', async () => {
    const r = await request(app).post('/api/leads').send({ customerName: 'Tạp hoá X', expectedValue: 0, probability: 0 });
    expect(r.status).toBe(201);
    expect(r.body.lead).toMatchObject({ expectedValue: 0, probability: 0, type: 'B2B', assignedStaff: 'Rep An', stage: 'Mới tiếp nhận' });
    expect(r.body.lead.serviceCategory).toBe('');
  });

  it('requires a name and rejects unknown stages', async () => {
    expect((await request(app).post('/api/leads').send({})).status).toBe(400);
    const l = (await request(app).post('/api/leads').send({ customerName: 'A' })).body.lead;
    expect((await request(app).put(`/api/leads/${l.id}`).send({ stage: 'Bay màu' })).status).toBe(400);
  });

  it('pins probability on close and protects the id', async () => {
    const l = (await request(app).post('/api/leads').send({ customerName: 'A', probability: 40, expectedValue: 1_000_000 })).body.lead;
    const won = await request(app).put(`/api/leads/${l.id}`).send({ stage: 'Chốt thành công (Won)', id: 'hacked' });
    expect(won.body.lead).toMatchObject({ id: l.id, probability: 100 });
    const lost = await request(app).put(`/api/leads/${l.id}`).send({ stage: 'Thất bại (Lost)' });
    expect(lost.body.lead.probability).toBe(0);
  });

  it('weights only OPEN deals and maps legacy stage names', async () => {
    dbStore.leads.push(
      { id: '1', customerName: 'Open', type: 'B2B', phone: '', email: '', serviceCategory: '', expectedValue: 1_000, stage: 'Đàm phán hợp đồng' as any, probability: 50, assignedStaff: '', source: '', notes: '', followUpDate: '', createdAt: '' },
      { id: '2', customerName: 'Lost', type: 'B2B', phone: '', email: '', serviceCategory: '', expectedValue: 9_000, stage: 'Thất bại (Lost)', probability: 0, assignedStaff: '', source: '', notes: '', followUpDate: '', createdAt: '' },
    );
    const r = await request(app).get('/api/leads');
    expect(r.body.totalPipelineValue).toBe(1_000);
    expect(r.body.weightedPipelineValue).toBe(500);
    expect(r.body.leads.find((l: any) => l.id === '1').stage).toBe('Đàm phán');
  });
});
