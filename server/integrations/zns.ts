import crypto from 'node:crypto';
import type { DispatchResult, IntegrationStatus } from './types';

/**
 * Zalo ZNS (Zalo Notification Service) via Zalo OA Open API.
 *
 * Auto-refresh mode (recommended, takes priority when all three are set):
 *   ZALO_APP_ID, ZALO_APP_SECRET, ZALO_OA_REFRESH_TOKEN
 * Fallback — a token you paste and renew yourself (expires in ~25h, no auto-renew):
 *   ZALO_OA_ACCESS_TOKEN
 * The refresh trio wins over a pasted token on purpose: a stale pasted token that
 * sits alongside a valid trio used to make Zalo return -124 "Access token invalid"
 * and OTP/messaging then silently fell back to simulated mode.
 *
 * Map your approved template ids:
 *   ZNS_TEMPLATE_POST_VISIT_CARE, ZNS_TEMPLATE_AUTO_RECALL,
 *   ZNS_TEMPLATE_APPOINTMENT_CONFIRMED, ZNS_TEMPLATE_HEALTH_FOLLOWUP,
 *   ZNS_TEMPLATE_OTP  (an approved "OTP / xác thực" ZNS template)
 *   ZNS_OTP_PARAM     name of the code field in that template's data (default "otp")
 *
 * When unconfigured, sendZns() returns a simulated result (unchanged demo behaviour).
 */
const SEND_URL = 'https://business.openapi.zalo.me/message/template';
const REFRESH_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';

let cachedToken: { value: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<string | null> | null = null;

/** Drop the cached OA access token — call after Zalo credentials change at runtime. */
export function resetZnsCache(): void {
  cachedToken = null;
  refreshInFlight = null;
}

/** Seed the cache with a freshly-minted access token (e.g. straight from the OAuth
 *  code exchange) so the next call serves it instead of burning a rotating refresh token. */
export function primeZaloToken(accessToken: string, expiresInSeconds?: number): void {
  if (!accessToken) return;
  cachedToken = { value: accessToken, expiresAt: Date.now() + Number(expiresInSeconds || 3600) * 1000 };
}

/**
 * Zalo's required security parameter for OA Open APIs — HMAC-SHA256 of the access
 * token keyed by the app's Secret Key, hex. MUST be sent as the `appsecret_proof`
 * HTTP header (not a query param). Without it Zalo rejects calls with -242 / -1241
 * "Invalid appsecret_proof". Returns '' when no app secret is set.
 */
export function zaloAppSecretProof(accessToken: string): string {
  const appSecret = process.env.ZALO_APP_SECRET;
  if (!appSecret || !accessToken) return '';
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

/** Standard auth headers for a Zalo OA Open API request. */
export function zaloAuthHeaders(accessToken: string): Record<string, string> {
  const h: Record<string, string> = { access_token: accessToken };
  const proof = zaloAppSecretProof(accessToken);
  if (proof) h.appsecret_proof = proof;
  return h;
}

export function znsConfigured(): boolean {
  return Boolean(
    process.env.ZALO_OA_ACCESS_TOKEN ||
    (process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET && process.env.ZALO_OA_REFRESH_TOKEN)
  );
}

export function znsStatus(): IntegrationStatus {
  const auto = Boolean(process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET && process.env.ZALO_OA_REFRESH_TOKEN);
  const simple = Boolean(process.env.ZALO_OA_ACCESS_TOKEN);
  return {
    name: 'zns',
    configured: auto || simple,
    mode: auto || simple ? 'live' : 'simulated',
    provider: 'zalo-oa',
    detail: auto ? 'OAuth refresh token' : simple ? 'static access token' : 'Thiếu ZALO_OA_ACCESS_TOKEN hoặc bộ ZALO_APP_ID/SECRET/REFRESH_TOKEN'
  };
}

/**
 * Real connectivity probe for the "Kiểm tra kết nối" button: obtain an OA access
 * token from the current credentials, then call OA `getoa` to confirm it works.
 */
export async function testZnsConnection(): Promise<{ ok: boolean; message: string }> {
  if (!znsConfigured()) {
    return { ok: false, message: 'Chưa nhập khoá Zalo — cần OA Access Token, hoặc bộ App ID + App Secret + OA Refresh Token.' };
  }
  resetZnsCache();
  let token: string | null = null;
  try {
    token = await getZaloAccessToken();
  } catch (e: any) {
    return { ok: false, message: 'Lỗi khi lấy access token: ' + (e?.message || String(e)) };
  }
  if (!token) {
    return { ok: false, message: 'Không lấy được access token. Kiểm tra lại App ID / App Secret / OA Refresh Token (hoặc OA Access Token dán tay đã hết hạn).' };
  }
  try {
    // Zalo OpenAPI v2+ wants the token in the `access_token` header, not the query.
    const res = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', { headers: zaloAuthHeaders(token) });
    const json: any = await res.json().catch(() => ({}));
    if (json.error === 0 && json.data) {
      return { ok: true, message: `Kết nối Zalo OA thành công: ${json.data.name || json.data.oa_id || 'OA'}` };
    }
    return { ok: false, message: `Zalo trả về lỗi ${json.error ?? '?'}: ${json.message || 'không rõ nguyên nhân'}` };
  } catch (e: any) {
    return { ok: false, message: 'Không gọi được Zalo OpenAPI: ' + (e?.message || String(e)) };
  }
}

export function znsTemplateId(templateType: string): string | undefined {
  const map: Record<string, string | undefined> = {
    ZNS_POST_VISIT_CARE: process.env.ZNS_TEMPLATE_POST_VISIT_CARE,
    ZNS_AUTO_RECALL: process.env.ZNS_TEMPLATE_AUTO_RECALL,
    ZNS_APPOINTMENT_CONFIRMED: process.env.ZNS_TEMPLATE_APPOINTMENT_CONFIRMED,
    ZNS_HEALTH_CARE_FOLLOWUP: process.env.ZNS_TEMPLATE_HEALTH_FOLLOWUP,
    ZNS_OTP: process.env.ZNS_TEMPLATE_OTP
  };
  return map[templateType];
}

/** True when a real OA token AND an approved OTP template id are both configured. */
export function znsOtpConfigured(): boolean {
  return znsConfigured() && Boolean(process.env.ZNS_TEMPLATE_OTP);
}

/**
 * Deliver an OTP code through an approved Zalo ZNS OTP template.
 * `extra` lets a template that needs more than the code (e.g. `{ minutes: "5" }`)
 * receive it. Returns a simulated result when ZNS OTP isn't configured.
 */
export async function sendZaloOtp(phone: string, code: string, extra?: Record<string, string>): Promise<DispatchResult> {
  const param = process.env.ZNS_OTP_PARAM || 'otp';
  return sendZns({
    phone,
    templateType: 'ZNS_OTP',
    templateData: { [param]: code, ...(extra || {}) },
    trackingId: `otp-${Date.now()}`
  });
}

/**
 * A valid Zalo OA access token. Shared by ZNS, OTP and the omnichannel inbox
 * (reply + profile lookup). Auto-refresh trio wins over a pasted token; the
 * minted token is cached until ~1min before it expires. `resetZnsCache()` drops it.
 */
export async function getZaloAccessToken(): Promise<string | null> {
  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;
  const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN;
  const staticToken = process.env.ZALO_OA_ACCESS_TOKEN || null;

  if (!appId || !appSecret || !refreshToken) return staticToken;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  // Single-flight: Zalo rotates (invalidates) the refresh token on every use, so N
  // concurrent callers must NOT each fire their own refresh — they share one.
  if (!refreshInFlight) {
    refreshInFlight = doRefresh(appId, appSecret, refreshToken)
      .finally(() => { refreshInFlight = null; });
  }
  const minted = await refreshInFlight;
  return minted ?? staticToken;
}

async function doRefresh(appId: string, appSecret: string, refreshToken: string): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  let json: any;
  try {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: appSecret },
      body: new URLSearchParams({ app_id: appId, grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    json = await res.json().catch(() => ({}));
  } catch (e: any) {
    console.error('[zns] token refresh error:', e?.message || String(e));
    return null;
  }
  if (!json.access_token) {
    console.error('[zns] token refresh failed:', JSON.stringify(json));
    return null;
  }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 };
  if (json.refresh_token && json.refresh_token !== refreshToken) {
    void persistRotatedRefreshToken(json.refresh_token);
  }
  return cachedToken.value;
}

async function persistRotatedRefreshToken(next: string): Promise<void> {
  try {
    process.env.ZALO_OA_REFRESH_TOKEN = next; // effective immediately
    const { saveSettings } = await import('../settings');
    await saveSettings({ ZALO_OA_REFRESH_TOKEN: next });
  } catch (e: any) {
    console.error('[zns] could not persist rotated refresh token:', e?.message || String(e));
  }
}

function normalisePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return '84' + digits.slice(1);
  if (digits.startsWith('84')) return digits;
  return digits;
}

export interface ZnsMessage {
  phone: string;
  templateType: string;
  templateData: Record<string, string>;
  trackingId?: string;
}

export async function sendZns(msg: ZnsMessage): Promise<DispatchResult> {
  if (!znsConfigured()) {
    console.log(`[zns:simulated] phone=${msg.phone} template=${msg.templateType}`);
    return { ok: true, mode: 'simulated', provider: 'zalo-oa' };
  }
  const templateId = znsTemplateId(msg.templateType);
  if (!templateId) {
    return { ok: false, mode: 'live', provider: 'zalo-oa', error: `Chưa cấu hình template id cho ${msg.templateType}` };
  }
  const token = await getZaloAccessToken();
  if (!token) return { ok: false, mode: 'live', provider: 'zalo-oa', error: 'Không lấy được access token Zalo OA' };

  if (process.env.ZALO_WEBHOOK_DEBUG === 'true') {
    const s = process.env.ZALO_APP_SECRET || '';
    console.warn('[zns] send debug ' + JSON.stringify({
      tokenLen: token.length, tokenHint: token.slice(0, 6) + '…' + token.slice(-4),
      appSecretLen: s.length, appSecretHint: s ? s.slice(0, 3) + '…' + s.slice(-3) : '(trống)',
      proofHint: zaloAppSecretProof(token).slice(0, 12),
      usingStaticToken: Boolean(process.env.ZALO_OA_ACCESS_TOKEN) && !(process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET && process.env.ZALO_OA_REFRESH_TOKEN),
    }));
  }

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...zaloAuthHeaders(token) },
      body: JSON.stringify({
        phone: normalisePhone(msg.phone),
        template_id: templateId,
        template_data: msg.templateData,
        tracking_id: msg.trackingId
      })
    });
    const json: any = await res.json().catch(() => ({}));
    if (json.error === 0) {
      return { ok: true, mode: 'live', provider: 'zalo-oa', ref: json.data?.msg_id, raw: json };
    }
    return { ok: false, mode: 'live', provider: 'zalo-oa', error: json.message || `Zalo error ${json.error}`, raw: json };
  } catch (error: any) {
    console.error('[zns] send failed:', error.message);
    return { ok: false, mode: 'live', provider: 'zalo-oa', error: error.message };
  }
}
