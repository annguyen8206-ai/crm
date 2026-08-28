import type { IntegrationStatus } from './types';
import { emailStatus } from './email';
import { znsStatus } from './zns';
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

export function logIntegrationsStatus(): void {
  console.log('VitCRM integrations');
  for (const s of integrationsStatus()) {
    const tag = s.mode === 'live' ? 'LIVE' : 'simulated';
    console.log(`  ${s.name.padEnd(9)}: ${tag.padEnd(10)} (${s.provider || '-'}) ${s.detail || ''}`);
  }
}
