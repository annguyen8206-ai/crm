import type { Express } from 'express';
import { dbStore } from '../store';
import { createStaff, listStaff, updateStaff } from '../auth';
import { integrationsStatus, sendEmail, resetZnsCache } from '../integrations';
import { saveSettings, describeSettings } from '../settings';
import { queryAudit } from '../audit';
import { requireAdmin } from '../http-util';

/** System / admin routes: audit log, staff accounts, integration status + settings. */
export function registerSystemRoutes(app: Express): void {
  // System Audit Logs — from the durable table when available (paginated).
  app.get('/api/system/audit-logs', requireAdmin, async (req, res) => {
    try {
      const q = req.query;
      const out = await queryAudit({
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
        action: typeof q.action === 'string' ? q.action : undefined,
        userId: typeof q.userId === 'string' ? q.userId : undefined,
      });
      if (out.total === 0 && dbStore.auditLogs.length) {
        return res.json({ logs: dbStore.auditLogs, total: dbStore.auditLogs.length, source: 'memory' });
      }
      res.json({ ...out, source: 'table' });
    } catch (e: any) {
      res.json({ logs: dbStore.auditLogs, total: dbStore.auditLogs.length, source: 'memory', error: e.message });
    }
  });

  // ------------------------------------------------------------------------
  // STAFF ACCOUNTS (auth_users) — admin / ban giám đốc only
  // ------------------------------------------------------------------------
  app.get('/api/staff', requireAdmin, async (req, res) => {
    try {
      res.json({ staff: await listStaff() });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi tải danh sách tài khoản', details: e.message });
    }
  });

  app.post('/api/staff', requireAdmin, async (req, res) => {
    try {
      const created = await createStaff(req.body || {});
      dbStore.addAuditLog(req.authUser?.id || 'system', req.authUser?.name || '', req.authUser?.role || '', 'CREATE_STAFF', 'Nhân sự', `Tạo tài khoản ${created.email}`);
      res.status(201).json({ success: true, staff: created });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Không thể tạo tài khoản' });
    }
  });

  app.put('/api/staff/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await updateStaff(req.params.id, req.body || {});
      dbStore.addAuditLog(req.authUser?.id || 'system', req.authUser?.name || '', req.authUser?.role || '', 'UPDATE_STAFF', 'Nhân sự', `Cập nhật tài khoản ${updated.email}`);
      res.json({ success: true, staff: updated });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Không thể cập nhật tài khoản' });
    }
  });

  // ------------------------------------------------------------------------
  // INTEGRATION STATUS + RUNTIME SETTINGS
  // ------------------------------------------------------------------------
  app.get('/api/system/integrations', requireAdmin, (req, res) => {
    res.json({ integrations: integrationsStatus() });
  });

  app.get('/api/system/settings', requireAdmin, (req, res) => {
    res.json({ ...describeSettings(), integrations: integrationsStatus() });
  });

  app.put('/api/system/settings', requireAdmin, async (req, res) => {
    try {
      const values = (req.body && (req.body.values ?? req.body)) || {};
      if (typeof values !== 'object' || Array.isArray(values)) {
        return res.status(400).json({ error: 'Payload phải là { values: { KEY: "..." } }' });
      }
      const { changed } = await saveSettings(values as Record<string, unknown>);
      if (changed.some(k => k.startsWith('ZALO_') || k === 'ZNS_OTP_PARAM')) resetZnsCache();
      dbStore.addAuditLog(req.authUser?.id || 'system', req.authUser?.name || '', req.authUser?.role || '',
        'UPDATE_SETTINGS', 'Tích hợp', `Cập nhật: ${changed.join(', ') || '(không có thay đổi)'}`);
      res.json({ success: true, changed, ...describeSettings(), integrations: integrationsStatus() });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Không lưu được cấu hình' });
    }
  });

  app.post('/api/email/send', requireAdmin, async (req, res) => {
    const { to, subject, html, text, cc, bcc, replyTo } = req.body || {};
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Cần to, subject và html hoặc text' });
    }
    const result = await sendEmail({ to, subject, html, text, cc, bcc, replyTo });
    res.status(result.ok ? 200 : 502).json(result);
  });
}
