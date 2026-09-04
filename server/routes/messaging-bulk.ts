import type { Express } from 'express';
import { dbStore, ZnsLogRecord } from '../store';
import { persistStore } from '../database';
import { emitChange } from '../events';
import { sendZns, sendSms } from '../integrations';
import { requirePerm } from '../rbac';
import { digitsOnly } from '../http-util';
import { recordAudit } from '../audit';
import { log } from '../logger';

/**
 * Throttled bulk messaging (Zalo ZNS / SMS) with opt-out honoured.
 *   BULK_RATE_MS   ms between sends (default 250 → ~4/s)
 * Jobs are in-memory (single instance). Opt-outs live in the
 * `messagingOptOut` collection: [{ phone, at, reason? }].
 */

const RATE_MS = Math.max(50, Number(process.env.BULK_RATE_MS || 250));

type Job = {
  id: string; channel: 'zns' | 'sms'; total: number;
  sent: number; failed: number; skipped: number;
  status: 'running' | 'done'; startedAt: string; finishedAt?: string;
  errors: Array<{ phone: string; error: string }>;
};
const jobs = new Map<string, Job>();

function optedOutSet(): Set<string> {
  const list = (dbStore.collections.messagingOptOut || []) as Array<{ phone?: string }>;
  return new Set(list.map(o => digitsOnly(o.phone || '').slice(-9)).filter(Boolean));
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runJob(job: Job, recipients: Array<{ phone: string; name?: string; data?: Record<string, string> }>, opts: { templateType?: string; message?: string }) {
  const optOut = optedOutSet();
  for (const r of recipients) {
    const key = digitsOnly(r.phone).slice(-9);
    if (!key || key.length < 9) { job.skipped++; continue; }
    if (optOut.has(key)) { job.skipped++; continue; }
    try {
      if (job.channel === 'zns') {
        const d = await sendZns({
          phone: r.phone,
          templateType: opts.templateType || 'ZNS_HEALTH_CARE_FOLLOWUP',
          templateData: r.data || { patient_name: r.name || 'Quý khách' },
        });
        if (d.ok) {
          job.sent++;
          const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
          dbStore.znsLogs.unshift({
            id: `zns-bulk-${Date.now()}-${job.sent}`, patientId: '', patientName: r.name || '',
            patientPhone: r.phone, templateType: opts.templateType || 'ZNS_HEALTH_CARE_FOLLOWUP',
            templateName: 'Gửi hàng loạt', diagnosis: '', doctorCareNotes: '', channel: 'Zalo ZNS',
            status: d.mode === 'live' ? 'Đã gửi thành công' : 'Đã gửi (giả lập)',
            sentAt: now, deliveredAt: d.ok ? now : '', trackingCode: d.ref || '', cost: d.mode === 'live' ? 320 : 0,
          } as ZnsLogRecord);
        } else { job.failed++; job.errors.push({ phone: r.phone, error: d.error || 'zns failed' }); }
      } else {
        const d = await sendSms({ to: r.phone, message: opts.message || '' });
        if (d.ok) job.sent++;
        else { job.failed++; job.errors.push({ phone: r.phone, error: d.error || 'sms failed' }); }
      }
    } catch (e: any) {
      job.failed++; job.errors.push({ phone: r.phone, error: e.message });
    }
    if (job.errors.length > 100) job.errors.splice(0, job.errors.length - 100);
    await sleep(RATE_MS);
  }
  job.status = 'done';
  job.finishedAt = new Date().toISOString();
  if (job.channel === 'zns') void persistStore();
  emitChange({ type: 'store', path: '/api/messaging/bulk', method: 'POST' });
  log.info('bulk messaging job finished', { id: job.id, channel: job.channel, sent: job.sent, failed: job.failed, skipped: job.skipped });
}

/** Opt-out endpoint — PUBLIC, reachable from an unsubscribe link (no bearer). */
export function registerPublicOptOut(app: Express): void {
  app.post('/api/messaging/opt-out', (req, res) => {
    const phone = String(req.body?.phone || '').trim();
    const key = digitsOnly(phone).slice(-9);
    if (key.length < 9) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    const list = (dbStore.collections.messagingOptOut || []) as Array<{ phone: string; at: string; reason?: string }>;
    if (!list.some(o => digitsOnly(o.phone).slice(-9) === key)) {
      list.unshift({ phone, at: new Date().toISOString(), reason: String(req.body?.reason || '') });
      dbStore.collections.messagingOptOut = list;
      void persistStore();
    }
    res.json({ success: true });
  });
}

export function registerBulkMessagingRoutes(app: Express): void {
  app.get('/api/messaging/opt-outs', requirePerm('canManageMarketing'), (_req, res) => {
    res.json({ optOuts: dbStore.collections.messagingOptOut || [] });
  });

  // Start a bulk job.
  app.post('/api/messaging/bulk', requirePerm('canManageMarketing'), (req, res) => {
    const b = req.body || {};
    const channel: 'zns' | 'sms' = b.channel === 'sms' ? 'sms' : 'zns';
    const recipients: Array<{ phone: string; name?: string; data?: Record<string, string> }> =
      Array.isArray(b.recipients) ? b.recipients.filter((r: any) => r && r.phone) : [];
    if (!recipients.length) return res.status(400).json({ error: 'Danh sách recipients trống' });
    if (channel === 'sms' && !String(b.message || '').trim()) {
      return res.status(400).json({ error: 'Cần message cho kênh SMS' });
    }
    if (recipients.length > 5000) return res.status(400).json({ error: 'Tối đa 5000 người/lần' });

    const job: Job = {
      id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channel, total: recipients.length, sent: 0, failed: 0, skipped: 0,
      status: 'running', startedAt: new Date().toISOString(), errors: [],
    };
    jobs.set(job.id, job);
    if (jobs.size > 50) { const oldest = [...jobs.keys()][0]; jobs.delete(oldest); }

    recordAudit({
      userId: req.authUser?.id || '', userName: req.authUser?.name || '', role: req.authUser?.role || '',
      action: 'BULK_MESSAGE', module: 'Marketing', ip: req.ip,
      details: `${channel.toUpperCase()} → ${recipients.length} người (job ${job.id})`,
    });

    void runJob(job, recipients, { templateType: b.templateType, message: b.message });
    res.status(202).json({ jobId: job.id, total: job.total });
  });

  app.get('/api/messaging/bulk/:jobId', requirePerm('canManageMarketing'), (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Không tìm thấy job' });
    res.json(job);
  });
}
