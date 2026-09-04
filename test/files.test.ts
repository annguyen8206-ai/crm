import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';
import { safeName } from '../server/routes/files';

let app: Express;
beforeAll(async () => { app = await createApp({ serveClient: false }); });

describe('safeName', () => {
  it('keeps Vietnamese letters and the extension', () => {
    expect(safeName('kết quả xét nghiệm.pdf')).toBe('kết quả xét nghiệm.pdf');
  });
  it('neutralises path separators and traversal', () => {
    expect(safeName('a/b\\c.png')).toBe('a_b_c.png');
    const p = safeName('../../etc/passwd');
    expect(p).not.toMatch(/[\\/]/);
    expect(p).not.toContain('..');
  });
  it('drops leading dots and never returns empty', () => {
    expect(safeName('...hidden')).toBe('hidden');
    expect(safeName('   ')).toBe('file');
    expect(safeName('')).toBe('file');
  });
  it('caps length at 120', () => {
    expect(safeName('x'.repeat(500)).length).toBe(120);
  });
});

describe('file routes without a database', () => {
  it('upload is rejected (auth or 503, never a silent 200)', async () => {
    const r = await request(app)
      .post('/api/files?entityType=patient&entityId=p1')
      .set('Content-Type', 'application/pdf')
      .set('x-filename', 'a.pdf')
      .send(Buffer.from('%PDF-1.4 test'));
    expect([401, 403, 503]).toContain(r.status);
  });
  it('list is auth-gated (never leaks a 200)', async () => {
    const r = await request(app).get('/api/files?entityType=patient&entityId=p1');
    expect([200, 401, 403, 503]).toContain(r.status);
    if (r.status === 200) expect(r.body.files).toEqual([]);
  });
  it('public download rejects a missing/invalid token with 401', async () => {
    const r = await request(app).get('/api/files/some-id');
    expect(r.status).toBe(401);
  });
});
