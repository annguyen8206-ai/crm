import type { IntegrationStatus } from './types';
import { emailStatus, testEmailConnection } from './email';
import { znsStatus, testZnsConnection } from './zns';
import { smsStatus } from './sms';
import { voipStatus } from './voip';
import { paymentsStatus } from './payments';
import { otpStatus } from './otp';
import { messagingStatus } from './messaging';

export * from './types';
export * from './email';
export * from './zns';
export * from './sms';
export * from './voip';
export * from './payments';
export * from './otp';
export * from './messaging';

export function aiStatus(): IntegrationStatus {
  const enabled = process.env.AI_ENABLED === 'true';
  const key = Boolean(process.env.GEMINI_API_KEY);
  return {
    name: 'ai',
    configured: enabled && key,
    mode: enabled && key ? 'live' : 'simulated',
    provider: 'gemini',
    detail: !enabled ? 'AI_ENABLED != true' : !key ? 'Thiếu GEMINI_API_KEY (đang dùng fallback tất định)' : 'Gemini bật'
  };
}

export function integrationsStatus(): IntegrationStatus[] {
  return [aiStatus(), emailStatus(), znsStatus(), smsStatus(), voipStatus(), paymentsStatus(), otpStatus(), messagingStatus()];
}

export interface IntegrationTestResult { ok: boolean; provider: string; message: string }

/** Actively probe one integration's connectivity (for the UI "Kiểm tra kết nối" button). */
export async function testIntegration(provider: string): Promise<IntegrationTestResult> {
  const p = (provider || '').toLowerCase();
  const wrap = (r: { ok: boolean; message: string }): IntegrationTestResult => ({ provider: p, ...r });

  if (p === 'zns' || p === 'zalo') return wrap(await testZnsConnection());
  if (p === 'email' || p === 'smtp') return wrap(await testEmailConnection());

  if (p === 'ai' || p === 'gemini') {
    if (!(process.env.AI_ENABLED === 'true' && process.env.GEMINI_API_KEY)) {
      return wrap({ ok: false, message: 'Chưa bật AI_ENABLED=true hoặc thiếu GEMINI_API_KEY.' });
    }
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(process.env.GEMINI_API_KEY!)
      );
      return wrap(res.ok
        ? { ok: true, message: 'Gemini API key hợp lệ.' }
        : { ok: false, message: `Gemini trả HTTP ${res.status} — kiểm tra lại API key.` });
    } catch (e: any) {
      return wrap({ ok: false, message: 'Không gọi được Gemini API: ' + (e?.message || String(e)) });
    }
  }

  // sms / voip / payments / messaging: no safe live probe → report config completeness.
  const byName: Record<string, IntegrationStatus | undefined> = {
    sms: smsStatus(), voip: voipStatus(), payments: paymentsStatus(), messaging: messagingStatus(),
  };
  const st = byName[p];
  if (st) {
    return wrap(st.configured
      ? { ok: true, message: `Đã cấu hình (${st.detail || st.provider || 'ok'}). Chưa có kiểm tra gửi thật cho kênh này.` }
      : { ok: false, message: st.detail || 'Chưa cấu hình đủ khoá cho kênh này.' });
  }
  return wrap({ ok: false, message: `Không hỗ trợ kiểm tra kênh "${provider}".` });
}

export function logIntegrationsStatus(): void {
  console.log('VitCRM integrations');
  for (const s of integrationsStatus()) {
    const tag = s.mode === 'live' ? 'LIVE' : 'simulated';
    console.log(`  ${s.name.padEnd(9)}: ${tag.padEnd(10)} (${s.provider || '-'}) ${s.detail || ''}`);
  }
}
