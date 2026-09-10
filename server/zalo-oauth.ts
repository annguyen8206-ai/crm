import crypto from 'node:crypto';
import { saveSettings } from './settings';
import { resetZnsCache, primeZaloToken } from './integrations';

/**
 * Zalo OA OAuth v4 — obtain a long-lived refresh token so getZaloAccessToken()
 * can auto-renew the OA access token (which itself expires in ~25h).
 *
 *   1. admin opens createZaloAuthUrl().url  → Zalo consent screen
 *   2. Zalo redirects the browser to <redirectUri>?code=&state=
 *   3. completeZaloOAuth(code, state) exchanges the code and persists
 *      ZALO_OA_REFRESH_TOKEN via saveSettings()
 *
 * The redirect URI must be whitelisted in the Zalo app's callback list.
 */

const PENDING = new Map<string, { redirectUri: string; at: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;

function sweep(): void {
  const now = Date.now();
  for (const [k, v] of PENDING) if (now - v.at > STATE_TTL_MS) PENDING.delete(k);
}

export function createZaloAuthUrl(redirectUri: string): { url: string; state: string } | { error: string } {
  const appId = process.env.ZALO_APP_ID;
  if (!appId) return { error: 'Chưa cấu hình App ID (ZALO_APP_ID)' };
  sweep();
  const state = crypto.randomBytes(16).toString('hex');
  PENDING.set(state, { redirectUri, at: Date.now() });
  const url = 'https://oauth.zaloapp.com/v4/oa/permission'
    + `?app_id=${encodeURIComponent(appId)}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&state=${state}`;
  return { url, state };
}

export async function completeZaloOAuth(code: string, state: string): Promise<{ ok: boolean; error?: string }> {
  sweep();
  if (!PENDING.has(state)) return { ok: false, error: 'Phiên kết nối không hợp lệ hoặc đã hết hạn — thử lại từ đầu.' };
  PENDING.delete(state);

  const appId = process.env.ZALO_APP_ID;
  const secret = process.env.ZALO_APP_SECRET;
  if (!appId || !secret) return { ok: false, error: 'Thiếu ZALO_APP_ID hoặc ZALO_APP_SECRET.' };

  let json: any;
  try {
    const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: secret },
      body: new URLSearchParams({ code, app_id: appId, grant_type: 'authorization_code' }),
    });
    json = await res.json().catch(() => ({}));
  } catch (e: any) {
    return { ok: false, error: 'Không gọi được Zalo OAuth: ' + (e?.message || String(e)) };
  }

  if (!json.refresh_token) {
    const detail = json.error_description || json.error_name || json.message
      || (json.error != null ? `mã lỗi ${json.error}` : JSON.stringify(json).slice(0, 200));
    return { ok: false, error: `Zalo không trả về refresh_token: ${detail}` };
  }

  await saveSettings({ ZALO_OA_REFRESH_TOKEN: json.refresh_token });
  // Also drop any stale pasted access token so it can't shadow the fresh flow.
  await saveSettings({ ZALO_OA_ACCESS_TOKEN: '' });
  resetZnsCache();
  // Serve the token we just got instead of immediately burning the fresh
  // (single-use, rotating) refresh token on the very next call.
  if (json.access_token) primeZaloToken(json.access_token, json.expires_in);
  return { ok: true };
}

/** Minimal self-contained result page shown to the admin after the redirect. */
export function zaloOAuthResultPage(title: string, message: string, ok: boolean): string {
  const color = ok ? '#047857' : '#b91c1c';
  const bg = ok ? '#ecfdf5' : '#fef2f2';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;font:15px/1.6 system-ui,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;
       display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;max-width:420px;padding:28px;
        box-shadow:0 8px 30px rgba(2,6,23,.06);text-align:center}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${color};
         font-weight:700;font-size:13px;margin-bottom:12px}
  h1{font-size:18px;margin:0 0 8px}
  p{color:#475569;margin:0}
</style></head><body>
  <div class="card">
    <span class="badge">${ok ? 'THÀNH CÔNG' : 'THẤT BẠI'}</span>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body></html>`;
}
