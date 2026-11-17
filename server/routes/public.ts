import type { Express } from 'express';
import { dbStore } from '../store';
import { checkDatabase, databaseConfigured, persistStore } from '../database';
import { bus, emitChange } from '../events';
import {
  authConfigured, authStatus, authTableReady, completeStaff2fa,
  listStaff, loginStaff, verifyPreAuthToken, verifySessionToken,
} from '../auth';
import {
  integrationsStatus, requestOtp, verifyOtp,
  verifyWebhookAuth, parseWebhookPayload, extractOrderCode,
  facebookVerifyChallenge, verifyFacebookSignature, verifyZaloSignature,
  normalizeFacebookPayload, normalizeZaloPayload,
} from '../integrations';
import { ingestIncoming } from '../messaging-core';
import { completeZaloOAuth, zaloOAuthResultPage } from '../zalo-oauth';
import { registerPublicOptOut } from './messaging-bulk';
import { registerPublicFileDownload } from './files';
import { recordOrderPayment } from './commerce';
import { APP_NAME } from '../brand';
import { isAdmin } from '../rbac';

/** Routes reachable WITHOUT a staff bearer token (verified by shared secret,
 *  signed webhook, or nothing). Registered before `app.use('/api', requireAuth)`. */
export function registerPublicRoutes(app: Express): void {
  // =========================================================================
  // 1. HEALTH CHECK & SYSTEM METADATA
  // =========================================================================
  app.get('/api/health', async (req, res) => {
    const database = await checkDatabase();
    const authTable = await authTableReady();
    const code = database.configured && !database.connected ? 503 : 200;
    // Public callers (uptime monitors, the deploy script) get a minimal answer in
    // production; record counts, DB errors and integration config only go to an
    // admin session (Bearer token) or to dev.
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const viewer = bearer ? verifySessionToken(bearer) : null;
    const detailed = process.env.NODE_ENV !== 'production' || isAdmin(viewer?.role);
    if (!detailed) {
      return res.status(code).json({
        status: code === 200 ? 'ok' : 'degraded',
        app: APP_NAME,
        timestamp: new Date().toISOString(),
        database: { configured: databaseConfigured, connected: database.connected },
        authentication: { configured: authConfigured, tableReady: authTable },
      });
    }
    res.status(code).json({
      status: 'ok',
      app: APP_NAME,
      version: '3.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: {
        configured: databaseConfigured,
        customersCount: dbStore.customers.length,
        productsCount: dbStore.products.length,
        ordersCount: dbStore.orders.length,
        visitsCount: dbStore.visits.length,
        ticketsCount: dbStore.tickets.length,
        leadsCount: dbStore.leads.length,
      },
      geminiAiConfigured: !!process.env.GEMINI_API_KEY,
      storage: databaseConfigured ? 'postgresql-jsonb-snapshot' : 'in-memory-demo',
      databaseConnection: database,
      authentication: { configured: authConfigured, missing: authStatus().missing, tableReady: authTable },
      integrations: integrationsStatus()
    });
  });

  async function sendLoginOtp(userId: string, phone: string | null, email: string) {
    return requestOtp(`2fa:${userId}`, { phone: phone || undefined, email, purpose: 'Dang nhap' });
  }

  app.post('/api/auth/staff/login', async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
      }
      const result = await loginStaff(identifier, password);
      if (result.kind === 'session') {
        return res.json({ success: true, user: result.user, token: result.token });
      }
      const otp = await sendLoginOtp(result.userId, result.phone, result.email);
      res.json({
        success: false,
        twoFactorRequired: true,
        preAuthToken: result.preAuthToken,
        channel: otp.channel,
        otpMode: otp.mode,
        ...(otp.devCode ? { devCode: otp.devCode } : {})
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Đăng nhập thất bại' });
    }
  });

  app.post('/api/auth/staff/login/2fa', async (req, res) => {
    try {
      const { preAuthToken, code } = req.body || {};
      if (!preAuthToken || !code) return res.status(400).json({ error: 'Thiếu preAuthToken hoặc mã OTP' });
      const result = await completeStaff2fa(String(preAuthToken), String(code));
      res.json({ success: true, user: result.user, token: result.token });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Xác thực 2 lớp thất bại' });
    }
  });

  app.post('/api/auth/staff/login/2fa/resend', async (req, res) => {
    try {
      const { preAuthToken } = req.body || {};
      if (!preAuthToken) return res.status(400).json({ error: 'Thiếu preAuthToken' });
      const { userId } = verifyPreAuthToken(String(preAuthToken));
      const staff = (await listStaff()).find(s => s.id === userId);
      if (!staff) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      const otp = await sendLoginOtp(userId, staff.phone, staff.email);
      res.json({ success: otp.sent, channel: otp.channel, otpMode: otp.mode, ...(otp.devCode ? { devCode: otp.devCode } : {}) });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Không gửi lại được mã' });
    }
  });

  // Bank-notification webhook → auto-reconcile ORDER payments (Casso / Sepay /
  // generic). The transfer memo must contain the order code (DH-261117-0001,
  // dashes optional). Partial transfers are recorded as partial payments; any
  // amount above the remaining balance is capped and reported, never credited.
  app.post('/api/payments/webhook', (req, res) => {
    if (!verifyWebhookAuth(req.headers as Record<string, unknown>, req.query as Record<string, unknown>)) {
      return res.status(401).json({ error: 'Chữ ký webhook không hợp lệ' });
    }
    const txns = parseWebhookPayload(req.body);
    const reconciled: Array<{ orderCode: string; amount: number; reference: string; overpaid?: number }> = [];
    const unmatched: Array<{ amount: number; description: string; reason: string }> = [];
    for (const txn of txns) {
      const code = extractOrderCode(txn.description);
      const order = code ? dbStore.orders.find(o => o.code.toUpperCase() === code) : undefined;
      if (!order) { unmatched.push({ amount: txn.amount, description: txn.description, reason: code ? `Không có đơn ${code}` : 'Không tìm thấy mã đơn' }); continue; }
      const reference = txn.reference || `BANK-${Date.now()}`;
      if (order.payments.some(p => p.reference === reference)) continue; // provider retry
      const r = recordOrderPayment(order, txn.amount, 'Chuyển khoản', reference, 'Đối soát ngân hàng');
      if ('error' in r) { unmatched.push({ amount: txn.amount, description: txn.description, reason: r.error }); continue; }
      reconciled.push({ orderCode: order.code, amount: r.applied, reference, ...(r.excess ? { overpaid: r.excess } : {}) });
      dbStore.addAuditLog('payment-webhook', 'Cổng thanh toán', 'System', 'AUTO_RECONCILE', 'Đơn hàng', `${order.code} ← ${r.applied}${r.excess ? ` (thừa ${r.excess})` : ''}`);
    }
    if (reconciled.length) {
      void persistStore();
      emitChange({ type: 'store', path: '/api/payments/webhook', method: 'POST' });
    }
    res.json({ success: true, received: txns.length, reconciled, unmatched });
  });

  // OTP request / verify (login 2FA, phone/email verification).
  app.post('/api/auth/otp/request', async (req, res) => {
    const { identifier, phone, email, purpose } = req.body || {};
    if (!identifier || (!phone && !email)) {
      return res.status(400).json({ error: 'Cần identifier và ít nhất một trong phone/email' });
    }
    try {
      const result = await requestOtp(String(identifier), { phone, email, purpose });
      res.status(result.sent ? 200 : 502).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Không gửi được OTP' });
    }
  });

  app.post('/api/auth/otp/verify', (req, res) => {
    const { identifier, code } = req.body || {};
    if (!identifier || !code) return res.status(400).json({ error: 'Thiếu identifier hoặc code' });
    const result = verifyOtp(String(identifier), String(code));
    res.status(result.ok ? 200 : 400).json(result);
  });

  // --- Omnichannel inbound webhooks ---
  app.get('/api/webhooks/facebook', (req, res) => {
    const challenge = facebookVerifyChallenge(req.query as Record<string, unknown>);
    if (challenge !== null) return res.status(200).send(challenge);
    res.sendStatus(403);
  });

  app.post('/api/webhooks/facebook', async (req, res) => {
    if (!verifyFacebookSignature((req as any).rawBody || JSON.stringify(req.body), req.headers['x-hub-signature-256'] as string | undefined)) {
      return res.sendStatus(401);
    }
    res.sendStatus(200); // ack fast
    for (const msg of normalizeFacebookPayload(req.body)) {
      try { await ingestIncoming(msg); } catch (e: any) { console.error('[messaging] facebook ingest failed:', e.message); }
    }
  });

  app.post('/api/webhooks/zalo', async (req, res) => {
    const sigOk = verifyZaloSignature(
      (req as any).rawBody || JSON.stringify(req.body),
      req.headers['x-zevent-signature'] as string | undefined,
      String(req.body?.timestamp || '')
    );
    // Always ACK 200 — the Zalo console only registers a webhook that returns 200,
    // and its "Kiểm tra" probe sends a fake signed payload we can't verify. But we
    // ONLY ingest a message whose signature actually checks out; an unverified
    // payload is acknowledged and dropped (logged), never stored.
    res.sendStatus(200);
    const trustUnsigned = process.env.ZALO_WEBHOOK_TRUST_UNSIGNED === 'true';
    if (!sigOk) {
      if (!trustUnsigned) {
        console.warn('[messaging] zalo webhook: chữ ký không hợp lệ — bỏ qua payload (kiểm tra ZALO_APP_SECRET / ZALO_APP_ID; bật ZALO_WEBHOOK_DEBUG để xem chi tiết, hoặc ZALO_WEBHOOK_TRUST_UNSIGNED=true để tạm nhận không kiểm chữ ký)');
        return;
      }
      // Escape hatch: only for a payload that really looks like an event from OUR
      // app (matching app_id + an event_name + a sender). Lets the inbox work
      // while the ZNS/OA signing-key issue is still being sorted out.
      const b = req.body || {};
      const looksOurs = b.event_name && b.sender?.id
        && (!process.env.ZALO_APP_ID || String(b.app_id || '') === process.env.ZALO_APP_ID);
      if (!looksOurs) {
        console.warn('[messaging] zalo webhook: chữ ký sai + payload không khớp app — bỏ qua');
        return;
      }
      console.warn('[messaging] zalo webhook: chữ ký sai nhưng ZALO_WEBHOOK_TRUST_UNSIGNED=true → vẫn nhận');
    }
    for (const msg of normalizeZaloPayload(req.body)) {
      try { await ingestIncoming(msg); } catch (e: any) { console.error('[messaging] zalo ingest failed:', e.message); }
    }
  });

  // Zalo OA OAuth redirect target — the admin's browser lands here after consent.
  // Public (no bearer on a top-level redirect); CSRF-guarded by the `state` nonce.
  app.get('/api/system/zalo/oauth/callback', async (req, res) => {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const oauthError = String(req.query.error || req.query.error_description || '');
    res.set('Content-Type', 'text/html; charset=utf-8');
    if (oauthError) {
      return res.status(400).send(zaloOAuthResultPage('Zalo từ chối cấp quyền', oauthError, false));
    }
    if (!code || !state) {
      return res.status(400).send(zaloOAuthResultPage('Thiếu tham số', 'Không nhận được code/state từ Zalo.', false));
    }
    const r = await completeZaloOAuth(code, state);
    if (!r.ok) {
      return res.status(400).send(zaloOAuthResultPage('Kết nối Zalo OA thất bại', r.error || 'Lỗi không xác định.', false));
    }
    res.send(zaloOAuthResultPage(
      'Đã kết nối Zalo OA',
      `Refresh token đã được lưu — hệ thống sẽ tự gia hạn access token. Đóng tab này và quay lại ${APP_NAME}.`,
      true,
    ));
  });

  // Real-time stream for the CRM UI (SSE). Auth via ?token= because EventSource
  // cannot send an Authorization header.
  app.get('/api/stream', (req, res) => {
    const user = verifySessionToken(String(req.query.token || ''));
    if (!user) return res.sendStatus(401);
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders?.();
    res.write(`retry: 3000\n\n`);
    res.write(`event: ready\ndata: {"ok":true}\n\n`);
    const onChange = (evt: unknown) => res.write(`data: ${JSON.stringify(evt)}\n\n`);
    bus.on('change', onChange);
    const keepAlive = setInterval(() => res.write(`: ping\n\n`), 25000);
    req.on('close', () => { clearInterval(keepAlive); bus.off('change', onChange); });
  });

  // Marketing unsubscribe (phone-based, no bearer).
  registerPublicOptOut(app);
  // File download — authenticates via ?token= so <a href> works.
  registerPublicFileDownload(app);
}