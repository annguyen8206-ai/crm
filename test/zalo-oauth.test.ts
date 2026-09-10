import { describe, it, expect, afterEach, vi } from 'vitest';
import { createZaloAuthUrl, completeZaloOAuth } from '../server/zalo-oauth';

const saved = { id: process.env.ZALO_APP_ID, secret: process.env.ZALO_APP_SECRET };
afterEach(() => {
  if (saved.id === undefined) delete process.env.ZALO_APP_ID; else process.env.ZALO_APP_ID = saved.id;
  if (saved.secret === undefined) delete process.env.ZALO_APP_SECRET; else process.env.ZALO_APP_SECRET = saved.secret;
  vi.unstubAllGlobals();
});

describe('Zalo OA OAuth', () => {
  it('createZaloAuthUrl errors without ZALO_APP_ID', () => {
    delete process.env.ZALO_APP_ID;
    expect(createZaloAuthUrl('https://x/cb')).toEqual({ error: expect.stringContaining('App ID') });
  });

  it('createZaloAuthUrl builds the v4 consent URL with an encoded redirect + state', () => {
    process.env.ZALO_APP_ID = 'app-123';
    const r = createZaloAuthUrl('https://crm.example/api/system/zalo/oauth/callback');
    if ('error' in r) throw new Error(r.error);
    expect(r.url).toContain('oauth.zaloapp.com/v4/oa/permission');
    expect(r.url).toContain('app_id=app-123');
    expect(r.url).toContain('redirect_uri=https%3A%2F%2Fcrm.example%2Fapi%2Fsystem%2Fzalo%2Foauth%2Fcallback');
    expect(r.url).toContain(`state=${r.state}`);
    expect(r.state).toMatch(/^[0-9a-f]{32}$/);
  });

  it('completeZaloOAuth rejects an unknown / expired state', async () => {
    process.env.ZALO_APP_ID = 'app-123';
    process.env.ZALO_APP_SECRET = 'secret-xyz';
    const r = await completeZaloOAuth('any-code', 'state-that-was-never-issued');
    expect(r).toEqual({ ok: false, error: expect.stringContaining('không hợp lệ') });
  });

  it('completeZaloOAuth surfaces a Zalo error when no refresh_token comes back', async () => {
    process.env.ZALO_APP_ID = 'app-123';
    process.env.ZALO_APP_SECRET = 'secret-xyz';
    const made = createZaloAuthUrl('https://crm.example/cb');
    if ('error' in made) throw new Error(made.error);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ error: -201, message: 'invalid code' }) }));
    const r = await completeZaloOAuth('bad-code', made.state);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('invalid code');
  });
});
