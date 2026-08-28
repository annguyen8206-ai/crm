import type { IntegrationStatus } from './types';

/**
 * VietQR display always works (static image via img.vietqr.io). Automatic
 * reconciliation needs a bank-notification webhook:
 *
 *   PAYMENT_WEBHOOK_SECRET   shared secret; sender must send it as
 *                            Authorization: Bearer <secret>  OR  ?secret=<secret>
 *                            OR (Casso) "secure-token" header
 *   PAYMENT_PROVIDER         "casso" | "sepay" | "generic"  (payload shape hint)
 *
 * Optional bank identity used to build the QR (defaults are demo values):
 *   VIETQR_BANK_CODE, VIETQR_ACCOUNT_NUMBER, VIETQR_ACCOUNT_NAME
 */
export function paymentsWebhookConfigured(): boolean {
  return Boolean(process.env.PAYMENT_WEBHOOK_SECRET);
}

export function paymentsStatus(): IntegrationStatus {
  const wh = paymentsWebhookConfigured();
  return {
    name: 'payments',
    configured: wh,
    mode: wh ? 'live' : 'simulated',
    provider: process.env.PAYMENT_PROVIDER || 'vietqr',
    detail: wh
      ? `Webhook đối soát bật (${process.env.PAYMENT_PROVIDER || 'generic'})`
      : 'QR hiển thị OK; đặt PAYMENT_WEBHOOK_SECRET để tự đối soát'
  };
}

export function vietQrBankInfo() {
  return {
    bankCode: process.env.VIETQR_BANK_CODE || 'MB',
    accountNumber: process.env.VIETQR_ACCOUNT_NUMBER || '0338886868',
    accountName: process.env.VIETQR_ACCOUNT_NAME || 'BENH VIEN DKT VITHOSPITAL'
  };
}

/** Constant-time-ish check of the webhook shared secret from common locations. */
export function verifyWebhookAuth(headers: Record<string, unknown>, query: Record<string, unknown>): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return false;
  const bearer = String(headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const candidates = [
    bearer,
    headers['secure-token'],
    headers['x-webhook-secret'],
    query['secret']
  ].map((v) => (v == null ? '' : String(v)));
  return candidates.some((c) => c.length > 0 && c === secret);
}

export interface BankTxn {
  amount: number;
  description: string;
  reference: string;
  when: string;
}

/** Normalise Casso / Sepay / generic payloads into a flat list of credit transactions. */
export function parseWebhookPayload(body: any): BankTxn[] {
  if (!body || typeof body !== 'object') return [];
  const provider = (process.env.PAYMENT_PROVIDER || '').toLowerCase();

  // Casso: { error: 0, data: [ { amount, description, tid, when, ... } ] }
  if (provider === 'casso' || Array.isArray(body.data)) {
    return (body.data || []).map((t: any) => ({
      amount: Number(t.amount) || 0,
      description: String(t.description || t.content || ''),
      reference: String(t.tid || t.id || t.reference || ''),
      when: String(t.when || t.transactionDate || new Date().toISOString())
    })).filter((t: BankTxn) => t.amount > 0);
  }

  // Sepay: { transferType: "in", transferAmount, content, referenceCode, transactionDate }
  if (provider === 'sepay' || body.transferAmount != null) {
    if (body.transferType && body.transferType !== 'in') return [];
    return [{
      amount: Number(body.transferAmount) || 0,
      description: String(body.content || body.description || ''),
      reference: String(body.referenceCode || body.id || ''),
      when: String(body.transactionDate || new Date().toISOString())
    }].filter((t) => t.amount > 0);
  }

  // Generic: { amount, description, reference, when } or an array of those
  const rows = Array.isArray(body) ? body : [body];
  return rows.map((t: any) => ({
    amount: Number(t.amount) || 0,
    description: String(t.description || t.content || ''),
    reference: String(t.reference || t.id || ''),
    when: String(t.when || new Date().toISOString())
  })).filter((t) => t.amount > 0);
}

/** Pull an invoice code like "HD-2026-8801" out of a bank transfer description. */
export function extractInvoiceCode(description: string): string | null {
  const m = String(description || '').toUpperCase().match(/HD[-\s]?\d{2,4}[-\s]?\d{3,6}/);
  return m ? m[0].replace(/\s/g, '-').replace(/-+/g, '-') : null;
}
