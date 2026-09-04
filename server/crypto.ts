import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * Symmetric encryption for secrets kept in the DB (app_settings values).
 *
 * Key source, in order:
 *   SETTINGS_ENC_KEY  — 64 hex chars (32 bytes). Preferred.
 *   JWT_SECRET        — derived via scrypt when SETTINGS_ENC_KEY is absent, so
 *                       encryption still works with zero extra config.
 *
 * Stored format:  enc:v1:<iv b64>:<authTag b64>:<ciphertext b64>
 * Legacy plaintext (no "enc:" prefix) is returned as-is by decrypt() so existing
 * rows keep working and get upgraded on the next save.
 */

const PREFIX = 'enc:v1:';
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.SETTINGS_ENC_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    cachedKey = Buffer.from(hex, 'hex');
  } else {
    const base = process.env.JWT_SECRET || 'vitcrm-insecure-fallback-key';
    cachedKey = scryptSync(base, 'vitcrm-settings-salt', 32);
  }
  return cachedKey;
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) return value; // legacy plaintext
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':');
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch (e: any) {
    console.error('[crypto] decrypt failed (wrong SETTINGS_ENC_KEY / JWT_SECRET changed?):', e.message);
    return '';
  }
}
