import { describe, it, expect, afterEach, vi } from 'vitest';
import { getZaloAccessToken, resetZnsCache } from '../server/integrations/zns';

const KEYS = ['ZALO_OA_ACCESS_TOKEN', 'ZALO_APP_ID', 'ZALO_APP_SECRET', 'ZALO_OA_REFRESH_TOKEN'];
const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetZnsCache();
  vi.unstubAllGlobals();
});

describe('getZaloAccessToken priority', () => {
  it('returns the pasted token untouched when the refresh trio is absent', async () => {
    for (const k of KEYS) delete process.env[k];
    process.env.ZALO_OA_ACCESS_TOKEN = 'pasted-123';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await getZaloAccessToken()).toBe('pasted-123');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prefers the auto-refresh trio over a stale pasted token, and caches the result', async () => {
    process.env.ZALO_OA_ACCESS_TOKEN = 'stale-pasted';
    process.env.ZALO_APP_ID = 'app1';
    process.env.ZALO_APP_SECRET = 'secret1';
    process.env.ZALO_OA_REFRESH_TOKEN = 'refresh1';
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ access_token: 'fresh-token', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    resetZnsCache();

    expect(await getZaloAccessToken()).toBe('fresh-token');
    expect(await getZaloAccessToken()).toBe('fresh-token'); // served from cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('oauth.zaloapp.com');
  });

  it('persists a rotated refresh_token so the next refresh does not fail', async () => {
    process.env.ZALO_APP_ID = 'app1';
    process.env.ZALO_APP_SECRET = 'secret1';
    process.env.ZALO_OA_REFRESH_TOKEN = 'old-refresh';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ access_token: 'at', expires_in: 3600, refresh_token: 'new-refresh' }),
    }));
    resetZnsCache();

    await getZaloAccessToken();
    expect(process.env.ZALO_OA_REFRESH_TOKEN).toBe('new-refresh');
  });

  it('falls back to the pasted token when the refresh call fails', async () => {
    process.env.ZALO_OA_ACCESS_TOKEN = 'pasted-fallback';
    process.env.ZALO_APP_ID = 'app1';
    process.env.ZALO_APP_SECRET = 'secret1';
    process.env.ZALO_OA_REFRESH_TOKEN = 'refresh1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ error: -14002 }) }));
    resetZnsCache();

    expect(await getZaloAccessToken()).toBe('pasted-fallback');
  });
});
