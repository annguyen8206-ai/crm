import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, isEncrypted } from '../server/crypto';

describe('secret encryption', () => {
  it('round-trips a value', () => {
    const secret = 'ZALO_OA_ACCESS_TOKEN_abcdef_012345';
    const enc = encryptSecret(secret);
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });

  it('passes legacy plaintext through untouched', () => {
    expect(isEncrypted('plainvalue')).toBe(false);
    expect(decryptSecret('plainvalue')).toBe('plainvalue');
  });

  it('returns empty string on a tampered payload rather than throwing', () => {
    const enc = encryptSecret('hello');
    const tampered = enc.slice(0, -4) + 'AAAA';
    expect(decryptSecret(tampered)).toBe('');
  });
});
