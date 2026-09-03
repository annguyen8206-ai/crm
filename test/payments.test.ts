import { describe, it, expect } from 'vitest';
import {
  parseWebhookPayload,
  extractInvoiceCode,
  vietQrBankInfo,
  verifyWebhookAuth,
  paymentsWebhookConfigured,
} from '../server/integrations/payments';

describe('extractInvoiceCode', () => {
  it('pulls a normalised HD code out of a transfer memo', () => {
    expect(extractInvoiceCode('CK TT VIEN PHI HD-2026-8801 CHUYEN KHOAN')).toBe('HD-2026-8801');
    expect(extractInvoiceCode('thanh toan HD 2026 8801')).toBe('HD-2026-8801');
    expect(extractInvoiceCode('hd20268801')).toBe('HD20268801');
  });
  it('returns null when there is no code', () => {
    expect(extractInvoiceCode('chuyen tien an trua')).toBeNull();
    expect(extractInvoiceCode('')).toBeNull();
    expect(extractInvoiceCode(undefined as unknown as string)).toBeNull();
  });
});

describe('parseWebhookPayload', () => {
  it('normalises a Casso-style { data: [...] } body and drops non-credits', () => {
    const rows = parseWebhookPayload({
      error: 0,
      data: [
        { amount: 700000, description: 'HD-2026-8801', tid: 'T1', when: '2026-08-24' },
        { amount: 0, description: 'ignored', tid: 'T2' },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 700000, description: 'HD-2026-8801', reference: 'T1' });
  });

  it('normalises a Sepay-style body and ignores outbound transfers', () => {
    expect(parseWebhookPayload({ transferType: 'out', transferAmount: 500000, content: 'x' })).toEqual([]);
    const rows = parseWebhookPayload({ transferType: 'in', transferAmount: 500000, content: 'HD-2026-1', referenceCode: 'R9' });
    expect(rows).toEqual([{ amount: 500000, description: 'HD-2026-1', reference: 'R9', when: expect.any(String) }]);
  });

  it('handles a bare generic object and a plain array', () => {
    expect(parseWebhookPayload({ amount: 100, description: 'a', reference: 'r' })).toHaveLength(1);
    expect(parseWebhookPayload([{ amount: 1 }, { amount: 2 }])).toHaveLength(2);
    expect(parseWebhookPayload(null)).toEqual([]);
    expect(parseWebhookPayload('nope' as unknown as object)).toEqual([]);
  });
});

describe('verifyWebhookAuth', () => {
  it('is false when no secret is configured', () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    expect(paymentsWebhookConfigured()).toBe(false);
    expect(verifyWebhookAuth({ authorization: 'Bearer x' }, {})).toBe(false);
  });

  it('matches the secret from bearer header, custom headers or query', () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 's3cr3t';
    try {
      expect(verifyWebhookAuth({ authorization: 'Bearer s3cr3t' }, {})).toBe(true);
      expect(verifyWebhookAuth({ 'x-webhook-secret': 's3cr3t' }, {})).toBe(true);
      expect(verifyWebhookAuth({}, { secret: 's3cr3t' })).toBe(true);
      expect(verifyWebhookAuth({ authorization: 'Bearer wrong' }, {})).toBe(false);
      expect(verifyWebhookAuth({}, {})).toBe(false);
    } finally {
      delete process.env.PAYMENT_WEBHOOK_SECRET;
    }
  });
});

describe('vietQrBankInfo', () => {
  it('falls back to demo bank identity when env is unset', () => {
    const info = vietQrBankInfo();
    expect(info.bankCode).toBeTruthy();
    expect(info.accountNumber).toBeTruthy();
    expect(info.accountName).toBeTruthy();
  });
});
