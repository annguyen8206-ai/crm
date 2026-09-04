import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';

let app: Express;
beforeAll(async () => { app = await createApp({ serveClient: false }); });

describe('messaging opt-out (public)', () => {
  it('accepts a valid phone and rejects a short one', async () => {
    const ok = await request(app).post('/api/messaging/opt-out').send({ phone: '0912345678' });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    const bad = await request(app).post('/api/messaging/opt-out').send({ phone: '12' });
    expect(bad.status).toBe(400);
  });
});

describe('bulk send + status (auth-gated)', () => {
  it('rejects unauthenticated', async () => {
    const r = await request(app).post('/api/messaging/bulk').send({ channel: 'zns', recipients: [{ phone: '0900000000' }] });
    expect([401, 403, 503]).toContain(r.status);
  });
  it('rejects unknown job id (once auth is required, still not 200)', async () => {
    const r = await request(app).get('/api/messaging/bulk/nope');
    expect([401, 403, 404, 503]).toContain(r.status);
  });
});
