import { describe, it, expect, afterEach, vi } from 'vitest';
import { requestOtp, verifyOtp, otpStatus } from '../server/integrations/otp';

const ENV_KEYS = ['OTP_CHANNEL_ORDER', 'OTP_DEV_ECHO', 'OTP_LOG_CODES', 'ZNS_TEMPLATE_OTP', 'ZALO_OA_ACCESS_TOKEN', 'SMS_PROVIDER'];
const saved: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('requestOtp channel orchestration', () => {
  it('falls through Zalo (unconfigured) to a simulated SMS when nothing is set up', async () => {
    delete process.env.ZNS_TEMPLATE_OTP;
    delete process.env.SMS_PROVIDER;
    const r = await requestOtp('test:1', { phone: '0912345678' });
    expect(r.sent).toBe(true);
    expect(r.channel).toBe('sms');
    expect(r.mode).toBe('simulated');
  });

  it('echoes the code and verifyOtp accepts it exactly once when OTP_DEV_ECHO=true', async () => {
    process.env.OTP_DEV_ECHO = 'true';
    const id = 'test:echo';
    const r = await requestOtp(id, { phone: '0900000000' });
    expect(r.devCode).toMatch(/^\d{4,8}$/);
    expect(verifyOtp(id, r.devCode!).ok).toBe(true);
    expect(verifyOtp(id, r.devCode!).ok).toBe(false); // single-use
  });

  it('reports failure with channel "none" when neither phone nor email is given', async () => {
    const r = await requestOtp('test:empty', {});
    expect(r.sent).toBe(false);
    expect(r.channel).toBe('none');
  });

  it('honours OTP_CHANNEL_ORDER and surfaces it in otpStatus detail', () => {
    process.env.OTP_CHANNEL_ORDER = 'sms,zalo';
    expect(otpStatus().detail).toContain('sms→zalo');
  });

  it('writes the code to the server log when OTP_LOG_CODES=true', async () => {
    process.env.OTP_LOG_CODES = 'true';
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      await requestOtp('test:log', { phone: '0912345678', purpose: 'Đăng nhập VitCRM' });
    } finally {
      spy.mockRestore();
    }
    const entry = lines.find(l => l.includes('otp issued'));
    expect(entry).toBeTruthy();
    expect(entry).toMatch(/"code":"\d{4,8}"/);
    expect(entry).toContain('test:log');
  });

  it('does NOT log the code when OTP_LOG_CODES is unset', async () => {
    delete process.env.OTP_LOG_CODES;
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      await requestOtp('test:nolog', { phone: '0912345678' });
    } finally {
      spy.mockRestore();
    }
    expect(lines.some(l => l.includes('otp issued'))).toBe(false);
  });
});
