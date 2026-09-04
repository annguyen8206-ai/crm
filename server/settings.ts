import { pool } from './database';
import { encryptSecret, decryptSecret } from './crypto';

/**
 * Runtime-editable integration settings.
 *
 * Stored in a dedicated `app_settings` table (NOT the JSONB snapshot / history),
 * loaded on boot and applied ON TOP OF `process.env` — so a value entered in the
 * admin UI wins over the same key in `.env`. Clearing a field in the UI removes
 * the row and the original `.env` value (captured at boot) is restored.
 *
 * Only integration keys are editable here; core infra (DATABASE_URL, JWT_SECRET,
 * AUTH_BOOTSTRAP_*, NODE_ENV, DATABASE_SSL) is deliberately NOT in the registry.
 */

export type SettingField = { key: string; label: string; secret?: boolean; placeholder?: string };
export type SettingGroup = { id: string; title: string; hint?: string; fields: SettingField[] };

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'zalo', title: 'Zalo OA & ZNS',
    hint: 'Dùng ZALO_OA_ACCESS_TOKEN (dán tay) HOẶC bộ APP_ID/SECRET/REFRESH_TOKEN (tự làm mới).',
    fields: [
      { key: 'ZALO_OA_ACCESS_TOKEN', label: 'OA Access Token', secret: true },
      { key: 'ZALO_APP_ID', label: 'App ID', secret: true },
      { key: 'ZALO_APP_SECRET', label: 'App Secret', secret: true },
      { key: 'ZALO_OA_REFRESH_TOKEN', label: 'OA Refresh Token', secret: true },
      { key: 'ZNS_TEMPLATE_OTP', label: 'Template ID — OTP' },
      { key: 'ZNS_OTP_PARAM', label: 'Tên tham số mã trong template', placeholder: 'otp' },
      { key: 'ZNS_TEMPLATE_APPOINTMENT_CONFIRMED', label: 'Template ID — Xác nhận lịch' },
      { key: 'ZNS_TEMPLATE_POST_VISIT_CARE', label: 'Template ID — Dặn dò sau khám' },
      { key: 'ZNS_TEMPLATE_AUTO_RECALL', label: 'Template ID — Nhắc tái khám' },
      { key: 'ZNS_TEMPLATE_HEALTH_FOLLOWUP', label: 'Template ID — Khảo sát sức khỏe' },
    ],
  },
  {
    id: 'sms', title: 'SMS',
    hint: 'SMS_PROVIDER: twilio | esms | generic. Dùng làm fallback khi Zalo không gửi được.',
    fields: [
      { key: 'SMS_PROVIDER', label: 'Nhà cung cấp (twilio/esms/generic)', placeholder: 'esms' },
      { key: 'ESMS_API_KEY', label: 'eSMS API Key', secret: true },
      { key: 'ESMS_SECRET_KEY', label: 'eSMS Secret Key', secret: true },
      { key: 'ESMS_BRANDNAME', label: 'eSMS Brandname' },
      { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', secret: true },
      { key: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', secret: true },
      { key: 'TWILIO_FROM', label: 'Twilio From' },
      { key: 'SMS_WEBHOOK_URL', label: 'Generic Webhook URL' },
      { key: 'SMS_WEBHOOK_TOKEN', label: 'Generic Webhook Bearer', secret: true },
    ],
  },
  {
    id: 'otp', title: 'OTP',
    fields: [
      { key: 'OTP_CHANNEL_ORDER', label: 'Thứ tự kênh', placeholder: 'zalo,sms,email' },
      { key: 'OTP_TTL_SECONDS', label: 'Hạn mã (giây)', placeholder: '300' },
      { key: 'OTP_LENGTH', label: 'Độ dài mã', placeholder: '6' },
      { key: 'OTP_DEV_ECHO', label: 'Trả mã trong response (true/false — chỉ dev)', placeholder: 'false' },
    ],
  },
  {
    id: 'email', title: 'Email (SMTP)',
    fields: [
      { key: 'SMTP_HOST', label: 'SMTP Host' },
      { key: 'SMTP_PORT', label: 'SMTP Port', placeholder: '587' },
      { key: 'SMTP_SECURE', label: 'SMTP Secure (true nếu cổng 465)', placeholder: 'false' },
      { key: 'SMTP_USER', label: 'SMTP User' },
      { key: 'SMTP_PASS', label: 'SMTP Password', secret: true },
      { key: 'SMTP_FROM', label: 'From' },
    ],
  },
  {
    id: 'messaging', title: 'Facebook Messenger',
    fields: [
      { key: 'FACEBOOK_APP_SECRET', label: 'App Secret', secret: true },
      { key: 'FACEBOOK_PAGE_ACCESS_TOKEN', label: 'Page Access Token', secret: true },
      { key: 'FACEBOOK_VERIFY_TOKEN', label: 'Verify Token', secret: true },
    ],
  },
  {
    id: 'payments', title: 'Thanh toán / VietQR',
    fields: [
      { key: 'VIETQR_BANK_CODE', label: 'Mã ngân hàng', placeholder: 'MB' },
      { key: 'VIETQR_ACCOUNT_NUMBER', label: 'Số tài khoản' },
      { key: 'VIETQR_ACCOUNT_NAME', label: 'Tên tài khoản' },
      { key: 'PAYMENT_PROVIDER', label: 'Provider webhook (casso/sepay/generic)' },
      { key: 'PAYMENT_WEBHOOK_SECRET', label: 'Webhook Secret (tự đối soát)', secret: true },
    ],
  },
  {
    id: 'voip', title: 'Tổng đài (VoIP)',
    fields: [
      { key: 'VOIP_PROVIDER', label: 'Provider (stringee/generic)' },
      { key: 'STRINGEE_API_KEY_SID', label: 'Stringee API Key SID', secret: true },
      { key: 'STRINGEE_API_KEY_SECRET', label: 'Stringee API Key Secret', secret: true },
      { key: 'STRINGEE_FROM_NUMBER', label: 'Stringee From Number' },
      { key: 'STRINGEE_ANSWER_URL', label: 'Stringee Answer URL' },
      { key: 'VOIP_WEBHOOK_URL', label: 'Generic Webhook URL' },
      { key: 'VOIP_WEBHOOK_TOKEN', label: 'Generic Webhook Bearer', secret: true },
      { key: 'VOIP_WEBHOOK_SECRET', label: 'Inbound Webhook Secret (screen-pop)', secret: true },
    ],
  },
  {
    id: 'ai', title: 'AI (Gemini)',
    fields: [
      { key: 'AI_ENABLED', label: 'Bật AI (true/false)', placeholder: 'false' },
      { key: 'GEMINI_API_KEY', label: 'Gemini API Key', secret: true },
    ],
  },
  {
    id: 'app', title: 'Ứng dụng',
    fields: [
      { key: 'APP_URL', label: 'URL công khai (cho QR số thứ tự, webhook...)' },
      { key: 'REMINDER_ENABLED', label: 'Bật nhắc lịch tự động (true/false)', placeholder: 'false' },
    ],
  },
];

const EDITABLE_KEYS = new Set(SETTING_GROUPS.flatMap(g => g.fields.map(f => f.key)));
const SECRET_KEYS = new Set(SETTING_GROUPS.flatMap(g => g.fields.filter(f => f.secret).map(f => f.key)));

// Values entered in the UI, keyed by env-var name. Only non-empty values are kept.
const overlay = new Map<string, string>();
// `.env` values captured before any overlay was applied, so "clear in UI" can revert.
const originalEnv = new Map<string, string | undefined>();
let captured = false;

function captureOriginalEnv(): void {
  if (captured) return;
  for (const key of EDITABLE_KEYS) originalEnv.set(key, process.env[key]);
  captured = true;
}

function applyToProcessEnv(): void {
  for (const key of EDITABLE_KEYS) {
    if (overlay.has(key)) {
      process.env[key] = overlay.get(key)!;
    } else {
      const orig = originalEnv.get(key);
      if (orig === undefined) delete process.env[key];
      else process.env[key] = orig;
    }
  }
}

/** Create the table, load saved values and apply them over process.env. Safe with no DB. */
export async function initSettings(): Promise<void> {
  captureOriginalEnv();
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const rows = await pool.query<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  overlay.clear();
  for (const r of rows.rows) {
    if (!EDITABLE_KEYS.has(r.key)) continue;
    const plain = SECRET_KEYS.has(r.key) ? decryptSecret(r.value) : r.value;
    if (plain !== '') overlay.set(r.key, plain);
  }
  applyToProcessEnv();
}

/**
 * Persist a patch of {key: value}. Empty string / null removes the override
 * (reverting to whatever `.env` had). Unknown keys are ignored.
 */
export async function saveSettings(patch: Record<string, unknown>): Promise<{ changed: string[] }> {
  captureOriginalEnv();
  const changed: string[] = [];
  for (const [key, raw] of Object.entries(patch)) {
    if (!EDITABLE_KEYS.has(key)) continue;
    const value = raw == null ? '' : String(raw).trim();
    if (value === '') {
      if (overlay.delete(key)) changed.push(key);
      if (pool) await pool.query('DELETE FROM app_settings WHERE key = $1', [key]);
    } else {
      if (overlay.get(key) !== value) changed.push(key);
      overlay.set(key, value);
      if (pool) {
        const stored = SECRET_KEYS.has(key) ? encryptSecret(value) : value;
        await pool.query(
          `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, stored]
        );
      }
    }
  }
  applyToProcessEnv();
  return { changed };
}

/** Masked view for the admin UI: never returns raw secret values. */
export function describeSettings(): {
  groups: SettingGroup[];
  values: Record<string, { set: boolean; source: 'ui' | 'env' | 'none'; preview: string }>;
} {
  const values: Record<string, { set: boolean; source: 'ui' | 'env' | 'none'; preview: string }> = {};
  for (const key of EDITABLE_KEYS) {
    const inUi = overlay.has(key);
    const raw = inUi ? overlay.get(key)! : (originalEnv.get(key) ?? process.env[key] ?? '');
    const source: 'ui' | 'env' | 'none' = inUi ? 'ui' : raw ? 'env' : 'none';
    let preview = '';
    if (raw) {
      preview = SECRET_KEYS.has(key)
        ? (raw.length <= 4 ? '••••' : '••••' + raw.slice(-4))
        : raw;
    }
    values[key] = { set: Boolean(raw), source, preview };
  }
  return { groups: SETTING_GROUPS, values };
}
