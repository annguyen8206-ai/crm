import type { DispatchResult, IntegrationStatus } from './types';

/**
 * Zalo ZNS (Zalo Notification Service) via Zalo OA Open API.
 *
 * Simple mode (token you paste, refresh yourself):
 *   ZALO_OA_ACCESS_TOKEN
 * Auto-refresh mode (recommended):
 *   ZALO_APP_ID, ZALO_APP_SECRET, ZALO_OA_REFRESH_TOKEN
 *
 * Map your approved template ids:
 *   ZNS_TEMPLATE_POST_VISIT_CARE, ZNS_TEMPLATE_AUTO_RECALL,
 *   ZNS_TEMPLATE_APPOINTMENT_CONFIRMED, ZNS_TEMPLATE_HEALTH_FOLLOWUP
 *
 * When unconfigured, sendZns() returns a simulated result (unchanged demo behaviour).
 */
const SEND_URL = 'https://business.openapi.zalo.me/message/template';
const REFRESH_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';

let cachedToken: { value: string; expiresAt: number } | null = null;

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

export function znsTemplateId(templateType: string): string | undefined {
  const map: Record<string, string | undefined> = {
    ZNS_POST_VISIT_CARE: process.env.ZNS_TEMPLATE_POST_VISIT_CARE,
    ZNS_AUTO_RECALL: process.env.ZNS_TEMPLATE_AUTO_RECALL,
    ZNS_APPOINTMENT_CONFIRMED: process.env.ZNS_TEMPLATE_APPOINTMENT_CONFIRMED,
    ZNS_HEALTH_CARE_FOLLOWUP: process.env.ZNS_TEMPLATE_HEALTH_FOLLOWUP
  };
  return map[templateType];
}

async function getAccessToken(): Promise<string | null> {
  if (process.env.ZALO_OA_ACCESS_TOKEN) return process.env.ZALO_OA_ACCESS_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;
  const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN;
  if (!appId || !appSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    app_id: appId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: appSecret },
    body
  });
  const json: any = await res.json().catch(() => ({}));
  if (!json.access_token) {
    console.error('[zns] token refresh failed:', JSON.stringify(json));
    return null;
  }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 };
  return cachedToken.value;
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
  const token = await getAccessToken();
  if (!token) return { ok: false, mode: 'live', provider: 'zalo-oa', error: 'Không lấy được access token Zalo OA' };

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: token },
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
