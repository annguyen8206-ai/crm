import nodemailer, { type Transporter } from 'nodemailer';
import type { DispatchResult, IntegrationStatus } from './types';
import { missing } from './types';

/**
 * SMTP email. Configure with:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
 *   SMTP_SECURE ("true" for port 465), SMTP_FROM ("VitCRM <no-reply@domain>")
 * When unconfigured, sendEmail() returns a simulated result and logs the payload.
 */
const REQUIRED = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const;

let transporter: Transporter | null = null;

export function emailConfigured(): boolean {
  return missing(...REQUIRED).length === 0;
}

export function emailStatus(): IntegrationStatus {
  const gaps = missing(...REQUIRED);
  return {
    name: 'email',
    configured: gaps.length === 0,
    mode: gaps.length === 0 ? 'live' : 'simulated',
    provider: 'smtp',
    detail: gaps.length ? `Thiếu: ${gaps.join(', ')}` : `Host ${process.env.SMTP_HOST}`
  };
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<DispatchResult> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@vitcrm.local';
  if (!emailConfigured()) {
    console.log(`[email:simulated] to=${msg.to} subject="${msg.subject}"`);
    return { ok: true, mode: 'simulated', provider: 'smtp' };
  }
  try {
    const info = await getTransporter().sendMail({
      from,
      to: msg.to,
      cc: msg.cc,
      bcc: msg.bcc,
      replyTo: msg.replyTo,
      subject: msg.subject,
      text: msg.text || stripHtml(msg.html || ''),
      html: msg.html
    });
    return { ok: true, mode: 'live', provider: 'smtp', ref: info.messageId, raw: info.response };
  } catch (error: any) {
    console.error('[email] send failed:', error.message);
    return { ok: false, mode: 'live', provider: 'smtp', error: error.message };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
