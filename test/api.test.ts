import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';

let app: Express;

beforeAll(async () => {
  // serveClient:false => no Vite dev server / static handler is attached.
  app = await createApp({ serveClient: false });
});

describe('GET /api/health', () => {
  it('responds 200 with status ok and reports the DB as not configured in tests', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database.configured).toBe(false);
    expect(Array.isArray(res.body.integrations)).toBe(true);
  });
});

describe('auth gate', () => {
  it('rejects unauthenticated access to a business endpoint', async () => {
    const res = await request(app).get('/api/patients');
    expect([401, 503]).toContain(res.status);
  });
});

describe('public integration callbacks', () => {
  it('rejects a payments webhook with no/invalid signature', async () => {
    const res = await request(app).post('/api/payments/webhook').send({ amount: 1000, description: 'HD-2026-1' });
    expect(res.status).toBe(401);
  });

  it('rejects the Facebook webhook verification handshake without a matching token', async () => {
    const res = await request(app).get('/api/webhooks/facebook');
    expect(res.status).toBe(403);
  });
});

describe('integration settings endpoint', () => {
  it('is admin-gated', async () => {
    const g = await request(app).get('/api/system/settings');
    expect([401, 403, 503]).toContain(g.status);
    const p = await request(app).put('/api/system/settings').send({ values: { SMS_PROVIDER: 'esms' } });
    expect([401, 403, 503]).toContain(p.status);
  });
});

describe('public electronic-queue lookup', () => {
  it('404s for an unknown queue code', async () => {
    const res = await request(app).get('/api/queue/DOES-NOT-EXIST');
    expect(res.status).toBe(404);
  });
});
