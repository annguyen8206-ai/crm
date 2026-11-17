import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';
import { dbStore } from '../server/store';

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
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('in production, anonymous callers only get the minimal status', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).get('/api/health');
      expect(res.body.status).toBe('ok');
      expect(res.body.integrations).toBeUndefined();
      expect(res.body.database).toEqual({ configured: false, connected: false });
      expect(JSON.stringify(res.body)).not.toMatch(/customersCount|missing|environment/);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('productionConfigProblems', () => {
  it('flags the sample values from .env.example and accepts real ones', async () => {
    const { productionConfigProblems } = await import('../server');
    expect(productionConfigProblems({
      JWT_SECRET: 'generate-a-long-random-secret-at-least-32-chars',
      AUTH_BOOTSTRAP_PASSWORD: 'change-this-immediately',
      DATABASE_URL: 'postgresql://purecrm:CHANGE_ME@127.0.0.1:5432/purecrm',
    })).toHaveLength(3);
    expect(productionConfigProblems({ JWT_SECRET: 'short', AUTH_BOOTSTRAP_PASSWORD: 'Str0ng!Pass#2026', DATABASE_URL: 'postgresql://u:p@h/d' })).toHaveLength(1);
    expect(productionConfigProblems({
      JWT_SECRET: 'a3f9c1d27e8b4f6a90c5d1e2b7f8a4c6d9e0f1a2b3c4d5e6', AUTH_BOOTSTRAP_PASSWORD: 'Str0ng!Pass#2026', DATABASE_URL: 'postgresql://u:p@h/d',
    })).toEqual([]);
  });
});

describe('auth gate', () => {
  it('rejects unauthenticated access to a business endpoint', async () => {
    const res = await request(app).get('/api/customers');
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

  it('always ACKs the Zalo webhook 200 (registration + probe), even on a bad signature', async () => {
    const savedSecret = process.env.ZALO_APP_SECRET;
    const savedAppId = process.env.ZALO_APP_ID;
    process.env.ZALO_APP_SECRET = 'test-secret';
    process.env.ZALO_APP_ID = 'test-app';
    try {
      const probe = await request(app).post('/api/webhooks/zalo').send({ challenge: 'ping' });
      expect(probe.status).toBe(200);

      // An event with an invalid signature is still ACKed 200 (so the URL registers
      // / Zalo stops retrying) — it just isn't ingested.
      const before = dbStore.messages.length;
      const spoof = await request(app)
        .post('/api/webhooks/zalo')
        .send({ event_name: 'user_send_text', sender: { id: 'u1' }, message: { text: 'hi' }, timestamp: '1' });
      expect(spoof.status).toBe(200);
      expect(dbStore.messages.length).toBe(before); // not stored
    } finally {
      if (savedSecret === undefined) delete process.env.ZALO_APP_SECRET; else process.env.ZALO_APP_SECRET = savedSecret;
      if (savedAppId === undefined) delete process.env.ZALO_APP_ID; else process.env.ZALO_APP_ID = savedAppId;
    }
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

describe('removed healthcare endpoints', () => {
  it('are no longer publicly reachable', async () => {
    for (const path of ['/api/queue/A-001', '/api/portal/me']) {
      const res = await request(app).get(path);
      expect(res.status).not.toBe(200);
    }
    expect((await request(app).post('/api/portal/auth/request-otp').send({ phone: '0900000000' })).status).not.toBe(200);
  });
});
