import type { DispatchResult, IntegrationStatus } from './types';

/**
 * SMS gateway. Pick a provider with SMS_PROVIDER:
 *
 *   twilio   → TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 *   esms     → ESMS_API_KEY, ESMS_SECRET_KEY, ESMS_BRANDNAME
 *   generic  → SMS_WEBHOOK_URL (POST {to, message}), optional SMS_WEBHOOK_TOKEN (Bearer)
 *
 * When unconfigured, sendSms() returns a simulated result and logs the message.
 */
export function smsProvider(): string {
  return (process.env.SMS_PROVIDER || '').toLowerCase();
}

export function smsConfigured(): boolean {
  switch (smsProvider()) {
    case 'twilio':
      return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
    case 'esms':
      return Boolean(process.env.ESMS_API_KEY && process.env.ESMS_SECRET_KEY);
    case 'generic':
      return Boolean(process.env.SMS_WEBHOOK_URL);
    default:
      return false;
  }
}

export function smsStatus(): IntegrationStatus {
  const provider = smsProvider() || '(chưa chọn)';
  return {
    name: 'sms',
    configured: smsConfigured(),
    mode: smsConfigured() ? 'live' : 'simulated',
    provider,
    detail: smsConfigured() ? `Provider ${provider}` : 'Đặt SMS_PROVIDER + khoá tương ứng (twilio / esms / generic)'
  };
}

export interface SmsMessage {
  to: string;
  message: string;
}

export async function sendSms(msg: SmsMessage): Promise<DispatchResult> {
  const provider = smsProvider();
  if (!smsConfigured()) {
    console.log(`[sms:simulated] to=${msg.to} message="${msg.message}"`);
    return { ok: true, mode: 'simulated', provider: provider || 'none' };
  }
  try {
    if (provider === 'twilio') return await sendViaTwilio(msg);
    if (provider === 'esms') return await sendViaEsms(msg);
    if (provider === 'generic') return await sendViaWebhook(msg);
    return { ok: false, mode: 'live', provider, error: `SMS_PROVIDER "${provider}" không hỗ trợ` };
  } catch (error: any) {
    console.error('[sms] send failed:', error.message);
    return { ok: false, mode: 'live', provider, error: error.message };
  }
}

async function sendViaTwilio(msg: SmsMessage): Promise<DispatchResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({ To: msg.to, From: process.env.TWILIO_FROM!, Body: msg.message });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
    },
    body
  });
  const json: any = await res.json().catch(() => ({}));
  if (res.ok && json.sid) return { ok: true, mode: 'live', provider: 'twilio', ref: json.sid, raw: json };
  return { ok: false, mode: 'live', provider: 'twilio', error: json.message || `HTTP ${res.status}`, raw: json };
}

async function sendViaEsms(msg: SmsMessage): Promise<DispatchResult> {
  const res = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ApiKey: process.env.ESMS_API_KEY,
      SecretKey: process.env.ESMS_SECRET_KEY,
      Brandname: process.env.ESMS_BRANDNAME || undefined,
      SmsType: process.env.ESMS_BRANDNAME ? '2' : '8',
      Phone: msg.to,
      Content: msg.message
    })
  });
  const json: any = await res.json().catch(() => ({}));
  if (String(json.CodeResult) === '100') return { ok: true, mode: 'live', provider: 'esms', ref: json.SMSID, raw: json };
  return { ok: false, mode: 'live', provider: 'esms', error: json.ErrorMessage || `CodeResult ${json.CodeResult}`, raw: json };
}

async function sendViaWebhook(msg: SmsMessage): Promise<DispatchResult> {
  const res = await fetch(process.env.SMS_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {})
    },
    body: JSON.stringify({ to: msg.to, message: msg.message })
  });
  if (res.ok) return { ok: true, mode: 'live', provider: 'generic', raw: await res.text().catch(() => '') };
  return { ok: false, mode: 'live', provider: 'generic', error: `HTTP ${res.status}` };
}
