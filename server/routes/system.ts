import type { Express } from 'express';
import crypto from 'node:crypto';
import { dbStore } from '../store';
import { createStaff, listStaff, updateStaff } from '../auth';
import { integrationsStatus, sendEmail, resetZnsCache, resetEmailCache, testIntegration } from '../integrations';
import { saveSettings, describeSettings } from '../settings';
import { queryAudit } from '../audit';
import { requireAdmin, APP_BASE_URL } from '../http-util';
import { createZaloAuthUrl } from '../zalo-oauth';
import { getZaloAccessToken, zaloAppSecretProof, withAppSecretProof } from '../integrations';

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

  // Live connectivity probe for one channel (Zalo OA, SMTP, Gemini, …).
  app.post('/api/system/integrations/:provider/test', requireAdmin, async (req, res) => {
    try {
      const result = await testIntegration(req.params.provider);
      dbStore.addAuditLog(req.authUser?.id || 'system', req.authUser?.name || '', req.authUser?.role || '',
        'TEST_INTEGRATION', 'Tích hợp', `${req.params.provider}: ${result.ok ? 'OK' : 'FAIL'} — ${result.message}`);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ ok: false, provider: req.params.provider, message: e.message || 'Lỗi kiểm tra kết nối' });
    }
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
      if (changed.some(k => k.startsWith('SMTP_'))) resetEmailCache();
      dbStore.addAuditLog(req.authUser?.id || 'system', req.authUser?.name || '', req.authUser?.role || '',
        'UPDATE_SETTINGS', 'Tích hợp', `Cập nhật: ${changed.join(', ') || '(không có thay đổi)'}`);
      res.json({ success: true, changed, ...describeSettings(), integrations: integrationsStatus() });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Không lưu được cấu hình' });
    }
  });

  // Kick off the Zalo OA OAuth flow — returns the consent URL + the redirect URI
  // the admin must whitelist in the Zalo app's callback list.
  app.get('/api/system/zalo/oauth/start', requireAdmin, (req, res) => {
    const base = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${base}/api/system/zalo/oauth/callback`;
    const r = createZaloAuthUrl(redirectUri);
    if ('error' in r) return res.status(400).json({ error: r.error, redirectUri });
    res.json({ url: r.url, redirectUri });
  });

  // One-shot Zalo OA diagnostic — runs the real refresh + getoa with the app's
  // live config and returns Zalo's raw responses (secrets masked).
  app.get('/api/system/zalo/diag', requireAdmin, async (_req, res) => {
    const mask = (v?: string | null) => !v ? '(trống)' : v.length <= 8 ? '••••' : v.slice(0, 4) + '…' + v.slice(-4) + ` (${v.length})`;
    const appId = process.env.ZALO_APP_ID || '';
    const appSecret = process.env.ZALO_APP_SECRET || '';
    const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN || '';
    const out: any = {
      config: {
        ZALO_APP_ID: mask(appId),
        ZALO_APP_SECRET: mask(appSecret),
        ZALO_OA_REFRESH_TOKEN: mask(refreshToken),
        ZALO_OA_ACCESS_TOKEN: mask(process.env.ZALO_OA_ACCESS_TOKEN),
        ZALO_OA_SECRET_KEY: mask(process.env.ZALO_OA_SECRET_KEY),
        ZNS_TEMPLATE_OTP: process.env.ZNS_TEMPLATE_OTP || '(trống)',
      },
    };

    // Non-destructive: go through the real cached/single-flight path. This DOES
    // consume + persist one refresh-token rotation if the cache is cold — that is
    // normal operation, not a leak.
    void refreshToken;
    try {
      const tok = await getZaloAccessToken();
      out.resolvedToken = mask(tok);
      if (tok) {
        out.currentProof = zaloAppSecretProof(tok).slice(0, 16) + '…';
        // Probe getoa with several appsecret_proof recipes; report which returns error:0.
        const oaSecret = process.env.ZALO_OA_SECRET_KEY || '';
        const recipes: Record<string, string | null> = {
          none: null,
          'hmac(key=appSecret,msg=token).hex': crypto.createHmac('sha256', appSecret).update(tok).digest('hex'),
          'hmac(key=token,msg=appSecret).hex': crypto.createHmac('sha256', tok).update(appSecret).digest('hex'),
          'hmac(key=appSecret,msg=token).base64': crypto.createHmac('sha256', appSecret).update(tok).digest('base64'),
          'sha256(token+appSecret).hex': crypto.createHash('sha256').update(tok + appSecret).digest('hex'),
          'sha256(appSecret+token).hex': crypto.createHash('sha256').update(appSecret + tok).digest('hex'),
          ...(oaSecret ? { 'hmac(key=oaSecret,msg=token).hex': crypto.createHmac('sha256', oaSecret).update(tok).digest('hex') } : {}),
        };
        const proofHex = crypto.createHmac('sha256', appSecret).update(tok).digest('hex');
        out.probes = {};
        for (const [name, proof] of Object.entries(recipes)) {
          const url = 'https://openapi.zalo.me/v2.0/oa/getoa' + (proof ? `?appsecret_proof=${proof}` : '');
          try {
            const g = await fetch(url, { headers: { access_token: tok } });
            const j: any = await g.json().catch(() => ({}));
            out.probes[name] = { error: j.error, message: j.message, oa: j.data?.name || j.data?.oa_id };
          } catch (e: any) {
            out.probes[name] = { error: 'fetch_failed', message: e?.message };
          }
        }
        const targets: Array<{ name: string; url: string; headers: Record<string, string> }> = [
          { name: 'v2 getoa, proof header', url: 'https://openapi.zalo.me/v2.0/oa/getoa', headers: { access_token: tok, appsecret_proof: proofHex } },
          { name: 'v3 getoa, no proof', url: 'https://openapi.zalo.me/v3.0/oa/getoa', headers: { access_token: tok } },
          { name: 'v3 getoa, proof header', url: 'https://openapi.zalo.me/v3.0/oa/getoa', headers: { access_token: tok, appsecret_proof: proofHex } },
          { name: 'v3 getoa, proof query', url: `https://openapi.zalo.me/v3.0/oa/getoa?appsecret_proof=${proofHex}`, headers: { access_token: tok } },
        ];
        out.endpointProbes = {};
        for (const t of targets) {
          try {
            const g = await fetch(t.url, { headers: t.headers });
            const j: any = await g.json().catch(() => ({}));
            out.endpointProbes[t.name] = { error: j.error, message: j.message, oa: j.data?.name || j.data?.oa_id };
          } catch (e: any) {
            out.endpointProbes[t.name] = { error: 'fetch_failed', message: e?.message };
          }
        }
      }
    } catch (e: any) {
      out.resolvedToken = { error: e?.message || String(e) };
    }

    res.json(out);
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
