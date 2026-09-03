import { sendSms } from './sms';
import { sendEmail } from './email';
import { sendZaloOtp, znsOtpConfigured } from './zns';
import type { IntegrationStatus } from './types';

/**
 * One-time passcodes for login 2FA / verification.
 * Challenges are kept in memory (fine for a single instance) with a short TTL.
 *
 * Delivery tries channels in order until one succeeds "for real":
 *   OTP_CHANNEL_ORDER  comma list, default "zalo,sms,email"
 *   - zalo  → Zalo ZNS OTP template (needs ZALO_OA_* + ZNS_TEMPLATE_OTP); phone only
 *   - sms   → the SMS integration; phone only
 *   - email → the email integration; only when an email is supplied
 * A channel that is only "simulated" (unconfigured) does not stop the chain,
 * except SMS keeps its historical behaviour of reporting a simulated success so
 * local dev + OTP_DEV_ECHO still work with nothing configured.
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

function channelOrder(): OtpChannel[] {
  const raw = (process.env.OTP_CHANNEL_ORDER || 'zalo,sms,email')
    .split(',').map(s => s.trim().toLowerCase())
    .filter((s): s is OtpChannel => s === 'zalo' || s === 'sms' || s === 'email');
  return raw.length ? raw : ['zalo', 'sms', 'email'];
}

export function otpStatus(): IntegrationStatus {
  const primary = channelOrder()[0];
  return {
    name: 'otp',
    configured: true,
    mode: 'live',
    provider: 'in-memory',
    detail: `TTL ${Number(process.env.OTP_TTL_SECONDS || 300)}s · kênh: ${channelOrder().join('→')}${znsOtpConfigured() ? '' : primary === 'zalo' ? ' (zalo chưa cấu hình)' : ''} · ${store.size} challenge đang chờ`
  };
}

export type OtpChannel = 'zalo' | 'sms' | 'email';

export interface OtpRequestResult {
  sent: boolean;
  channel: OtpChannel | 'none';
  mode: 'live' | 'simulated';
  devCode?: string;
  error?: string;
}

/** identifier = whatever ties the challenge to a later verify (e.g. email or staff id). */
export async function requestOtp(identifier: string, opts: { phone?: string; email?: string; purpose?: string }): Promise<OtpRequestResult> {
  const code = genCode();
  store.set(identifier, { codeHash: hash(code), expiresAt: Date.now() + ttlMs(), attempts: 0, target: opts.phone || opts.email || '' });

  const minutes = String(Math.round(ttlMs() / 60000));
  const message = `${code} la ma xac thuc VitCRM cua ban${opts.purpose ? ` (${opts.purpose})` : ''}. Ma het han sau ${minutes} phut.`;
  const devEcho = process.env.OTP_DEV_ECHO === 'true' ? { devCode: code } : {};
  let lastError: string | undefined;

  for (const ch of channelOrder()) {
    if (ch === 'zalo') {
      if (!opts.phone || !znsOtpConfigured()) continue;
      const r = await sendZaloOtp(opts.phone, code, { minutes });
      if (r.ok && r.mode === 'live') return { sent: true, channel: 'zalo', mode: 'live', ...devEcho };
      lastError = r.error || lastError;
      // ZNS failed (e.g. recipient has no Zalo) → try the next channel.
    } else if (ch === 'sms') {
      if (!opts.phone) continue;
      const r = await sendSms({ to: opts.phone, message });
      if (r.ok && r.mode === 'live') return { sent: true, channel: 'sms', mode: 'live', ...devEcho };
      if (r.mode === 'simulated') return { sent: true, channel: 'sms', mode: 'simulated', ...devEcho };
      lastError = r.error || lastError;
    } else if (ch === 'email') {
      if (!opts.email) continue;
      const r = await sendEmail({ to: opts.email, subject: 'Mã xác thực VitCRM', text: message });
      if (r.ok) return { sent: true, channel: 'email', mode: r.mode, ...devEcho };
      lastError = r.error || lastError;
    }
  }

  return {
    sent: false,
    channel: 'none',
    mode: 'live',
    error: lastError || 'Không có kênh gửi OTP khả dụng (thiếu số điện thoại/email hoặc chưa cấu hình provider)',
    ...devEcho
  };
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
