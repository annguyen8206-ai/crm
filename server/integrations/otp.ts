import { sendSms } from './sms';
import { sendEmail } from './email';
import type { IntegrationStatus } from './types';

/**
 * One-time passcodes for login 2FA / verification.
 * Challenges are kept in memory (fine for a single instance) with a short TTL.
 * Delivery uses the SMS integration, falling back to email when a channel is given.
 *
 *   OTP_TTL_SECONDS   default 300
 *   OTP_LENGTH        default 6
 *   OTP_DEV_ECHO      "true" → return the code in the API response (dev only)
 */
interface Challenge {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  target: string;
}

const store = new Map<string, Challenge>();

function ttlMs(): number {
  return Number(process.env.OTP_TTL_SECONDS || 300) * 1000;
}
function codeLength(): number {
  return Math.min(8, Math.max(4, Number(process.env.OTP_LENGTH || 6)));
}
function hash(code: string): string {
  // lightweight, dependency-free; OTPs are short-lived and single-use
  let h = 5381;
  for (let i = 0; i < code.length; i++) h = ((h << 5) + h + code.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
function genCode(): string {
  const n = codeLength();
  let out = '';
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export function otpStatus(): IntegrationStatus {
  return {
    name: 'otp',
    configured: true,
    mode: 'live',
    provider: 'in-memory',
    detail: `TTL ${Number(process.env.OTP_TTL_SECONDS || 300)}s, ${store.size} challenge(s) đang chờ`
  };
}

export interface OtpRequestResult {
  sent: boolean;
  channel: 'sms' | 'email' | 'none';
  mode: 'live' | 'simulated';
  devCode?: string;
  error?: string;
}

/** identifier = whatever ties the challenge to a later verify (e.g. email or staff id). */
export async function requestOtp(identifier: string, opts: { phone?: string; email?: string; purpose?: string }): Promise<OtpRequestResult> {
  const code = genCode();
  store.set(identifier, { codeHash: hash(code), expiresAt: Date.now() + ttlMs(), attempts: 0, target: opts.phone || opts.email || '' });

  const message = `${code} la ma xac thuc VitCRM cua ban${opts.purpose ? ` (${opts.purpose})` : ''}. Ma het han sau ${Math.round(ttlMs() / 60000)} phut.`;
  const devEcho = process.env.OTP_DEV_ECHO === 'true' ? { devCode: code } : {};

  if (opts.phone) {
    const r = await sendSms({ to: opts.phone, message });
    if (r.ok) return { sent: true, channel: 'sms', mode: r.mode, ...devEcho };
    if (r.mode === 'simulated') return { sent: true, channel: 'sms', mode: 'simulated', ...devEcho };
    // fall through to email if available
  }
  if (opts.email) {
    const r = await sendEmail({ to: opts.email, subject: 'Mã xác thực VitCRM', text: message });
    if (r.ok) return { sent: true, channel: 'email', mode: r.mode, ...devEcho };
    return { sent: false, channel: 'email', mode: r.mode, error: r.error, ...devEcho };
  }
  return { sent: false, channel: 'none', mode: 'live', error: 'Không có số điện thoại hoặc email để gửi OTP', ...devEcho };
}

export function verifyOtp(identifier: string, code: string): { ok: boolean; error?: string } {
  const c = store.get(identifier);
  if (!c) return { ok: false, error: 'Chưa yêu cầu OTP hoặc OTP đã hết hạn' };
  if (Date.now() > c.expiresAt) {
    store.delete(identifier);
    return { ok: false, error: 'OTP đã hết hạn' };
  }
  c.attempts += 1;
  if (c.attempts > 5) {
    store.delete(identifier);
    return { ok: false, error: 'Nhập sai quá số lần cho phép' };
  }
  if (hash(String(code || '')) !== c.codeHash) return { ok: false, error: 'Mã OTP không đúng' };
  store.delete(identifier);
  return { ok: true };
}
