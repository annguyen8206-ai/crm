import jwt from 'jsonwebtoken';
import type { DispatchResult, IntegrationStatus } from './types';

/**
 * Outbound "click-to-call". Pick a provider with VOIP_PROVIDER:
 *
 *   stringee → STRINGEE_API_KEY_SID, STRINGEE_API_KEY_SECRET, STRINGEE_FROM_NUMBER
 *   generic  → VOIP_WEBHOOK_URL (POST {from, to, agentId}), optional VOIP_WEBHOOK_TOKEN
 *
 * When unconfigured, startCall() returns a simulated result (unchanged demo behaviour).
 */
export function voipProvider(): string {
  return (process.env.VOIP_PROVIDER || '').toLowerCase();
}

export function voipConfigured(): boolean {
  switch (voipProvider()) {
    case 'stringee':
      return Boolean(process.env.STRINGEE_API_KEY_SID && process.env.STRINGEE_API_KEY_SECRET && process.env.STRINGEE_FROM_NUMBER);
    case 'generic':
      return Boolean(process.env.VOIP_WEBHOOK_URL);
    default:
      return false;
  }
}

export function voipStatus(): IntegrationStatus {
  const provider = voipProvider() || '(chưa chọn)';
  return {
    name: 'voip',
    configured: voipConfigured(),
    mode: voipConfigured() ? 'live' : 'simulated',
    provider,
    detail: voipConfigured() ? `Provider ${provider}` : 'Đặt VOIP_PROVIDER + khoá tương ứng (stringee / generic)'
  };
}

export interface CallRequest {
  toNumber: string;
  fromNumber?: string;
  agentId?: string;
}

export async function startCall(req: CallRequest): Promise<DispatchResult> {
  const provider = voipProvider();
  if (!voipConfigured()) {
    console.log(`[voip:simulated] to=${req.toNumber} agent=${req.agentId || '-'}`);
    return { ok: true, mode: 'simulated', provider: provider || 'none' };
  }
  try {
    if (provider === 'stringee') return await callViaStringee(req);
    if (provider === 'generic') return await callViaWebhook(req);
    return { ok: false, mode: 'live', provider, error: `VOIP_PROVIDER "${provider}" không hỗ trợ` };
  } catch (error: any) {
    console.error('[voip] call failed:', error.message);
    return { ok: false, mode: 'live', provider, error: error.message };
  }
}

function stringeeRestToken(): string {
  const sid = process.env.STRINGEE_API_KEY_SID!;
  const secret = process.env.STRINGEE_API_KEY_SECRET!;
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { jti: `${sid}-${now}`, iss: sid, exp: now + 3600, rest_api: true },
    secret,
    { algorithm: 'HS256', header: { typ: 'JWT', alg: 'HS256', cty: 'stringee-api;v=1' } }
  );
}

async function callViaStringee(req: CallRequest): Promise<DispatchResult> {
  const token = stringeeRestToken();
  const res = await fetch('https://api.stringee.com/v1/call2/callout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-STRINGEE-AUTH': token },
    body: JSON.stringify({
      from: { type: 'external', number: req.fromNumber || process.env.STRINGEE_FROM_NUMBER, alias: 'VitCRM' },
      to: [{ type: 'external', number: req.toNumber, alias: req.toNumber }],
      answer_url: process.env.STRINGEE_ANSWER_URL || undefined
    })
  });
  const json: any = await res.json().catch(() => ({}));
  if (json.r === 0) return { ok: true, mode: 'live', provider: 'stringee', ref: json.call_id, raw: json };
  return { ok: false, mode: 'live', provider: 'stringee', error: json.message || `r=${json.r}`, raw: json };
}

async function callViaWebhook(req: CallRequest): Promise<DispatchResult> {
  const res = await fetch(process.env.VOIP_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.VOIP_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.VOIP_WEBHOOK_TOKEN}` } : {})
    },
    body: JSON.stringify({ from: req.fromNumber, to: req.toNumber, agentId: req.agentId })
  });
  if (res.ok) return { ok: true, mode: 'live', provider: 'generic', raw: await res.text().catch(() => '') };
  return { ok: false, mode: 'live', provider: 'generic', error: `HTTP ${res.status}` };
}
