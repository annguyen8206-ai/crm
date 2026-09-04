import type { Express, Request } from 'express';
import { dbStore, AppointmentRecord, SupportTicketRecord } from '../store';
import { checkDatabase, databaseConfigured, persistStore } from '../database';
import { bus, emitChange } from '../events';
import {
  authConfigured, authStatus, authTableReady, completeStaff2fa, issuePortalToken,
  listStaff, loginStaff, requirePortalAuth, verifyPreAuthToken, verifySessionToken,
} from '../auth';
import {
  integrationsStatus, requestOtp, verifyOtp,
  verifyWebhookAuth, parseWebhookPayload, extractInvoiceCode,
  facebookVerifyChallenge, verifyFacebookSignature, verifyZaloSignature,
  normalizeFacebookPayload, normalizeZaloPayload,
} from '../integrations';
import { ingestIncoming, ingestInboundCall } from '../messaging-core';
import { registerPublicOptOut } from './messaging-bulk';
import { registerPublicFileDownload } from './files';
import { digitsOnly, phoneMatches } from '../http-util';

/** Routes reachable WITHOUT a staff bearer token (verified by shared secret,
 *  portal token, or nothing). Registered before `app.use('/api', requireAuth)`. */
export function registerPublicRoutes(app: Express): void {
  // =========================================================================
  // 1. HEALTH CHECK & SYSTEM METADATA
  // =========================================================================
  app.get('/api/health', async (req, res) => {
    const database = await checkDatabase();
    const authTable = await authTableReady();
    res.status(database.configured && !database.connected ? 503 : 200).json({
      status: 'ok',
      app: 'VitHospital Healthcare Management Backend',
      version: '2.6.0-PROD',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: {
        configured: databaseConfigured,
        patientsCount: dbStore.patients.length,
        appointmentsCount: dbStore.appointments.length,
        ticketsCount: dbStore.tickets.length,
        leadsCount: dbStore.leads.length,
        invoicesCount: dbStore.invoices.length,
        recallsCount: dbStore.recalls.length,
        znsLogsCount: dbStore.znsLogs.length,
        voipCallsCount: dbStore.voipCalls.length
      },
      geminiAiConfigured: !!process.env.GEMINI_API_KEY,
      storage: databaseConfigured ? 'postgresql-jsonb-snapshot' : 'in-memory-demo',
      databaseConnection: database,
      authentication: { configured: authConfigured, missing: authStatus().missing, tableReady: authTable },
      integrations: integrationsStatus()
    });
  });

  async function sendLoginOtp(userId: string, phone: string | null, email: string) {
    return requestOtp(`2fa:${userId}`, { phone: phone || undefined, email, purpose: 'Đăng nhập VitCRM' });
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

  // Bank-notification webhook → auto-reconcile invoices (Casso / Sepay / generic).
  app.post('/api/payments/webhook', (req, res) => {
    if (!verifyWebhookAuth(req.headers as Record<string, unknown>, req.query as Record<string, unknown>)) {
      return res.status(401).json({ error: 'Chữ ký webhook không hợp lệ' });
    }
    const txns = parseWebhookPayload(req.body);
    const matched: Array<{ invoiceCode: string; amount: number; reference: string }> = [];
    for (const txn of txns) {
      const code = extractInvoiceCode(txn.description);
      if (!code) continue;
      const inv = dbStore.invoices.find(i => i.invoiceCode.toUpperCase() === code.toUpperCase());
      if (!inv || inv.status === 'Đã thanh toán') continue;
      if (txn.amount + 0.5 < inv.patientPayable) continue; // underpaid → ignore
      inv.status = 'Đã thanh toán';
      inv.paymentMethod = 'VietQR';
      inv.transactionRef = txn.reference || `BANK-${Date.now()}`;
      inv.paidAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      matched.push({ invoiceCode: inv.invoiceCode, amount: txn.amount, reference: inv.transactionRef });
      dbStore.addAuditLog('payment-webhook', 'Cổng thanh toán', 'System', 'AUTO_RECONCILE', 'Viện phí', `${inv.invoiceCode} ← ${txn.amount}`);
    }
    if (matched.length) void persistStore();
    res.json({ success: true, received: txns.length, reconciled: matched });
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
    if (!verifyZaloSignature((req as any).rawBody || JSON.stringify(req.body), req.headers['x-zevent-signature'] as string | undefined, String(req.body?.timestamp || ''))) {
      return res.sendStatus(401);
    }
    res.sendStatus(200);
    for (const msg of normalizeZaloPayload(req.body)) {
      try { await ingestIncoming(msg); } catch (e: any) { console.error('[messaging] zalo ingest failed:', e.message); }
    }
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

  // --- Electronic queue lookup (public — the QR on the printed ticket points here) ---
  app.get('/api/queue/:code', (req, res) => {
    const code = req.params.code;
    const apt = dbStore.appointments.find(a => a.queueNumber && a.queueNumber.toLowerCase() === code.toLowerCase());
    if (!apt) return res.status(404).json({ error: 'Không tìm thấy số thứ tự' });
    const waiting = dbStore.appointments
      .filter(a => a.branchId === apt.branchId && a.date === apt.date && a.checkedInAt && !a.seenAt && a.status !== 'Đã hủy')
      .sort((a, b) => String(a.checkedInAt) < String(b.checkedInAt) ? -1 : 1);
    const ahead = waiting.findIndex(a => a.id === apt.id);
    const maskName = (n: string) => n ? n.split(' ').map((w, i, arr) => (i === arr.length - 1 ? w : w[0] + '.')).join(' ') : '';
    res.json({
      queueNumber: apt.queueNumber,
      patientName: maskName(apt.patientName),
      department: apt.department,
      status: apt.seenAt ? 'Đã vào khám' : apt.checkedInAt ? 'Đang chờ' : 'Chưa check-in',
      peopleAhead: ahead < 0 ? 0 : ahead,
      estimatedWaitMinutes: (ahead < 0 ? 0 : ahead) * 12
    });
  });

  // --- Patient Portal authentication (OTP by phone; no password) ---
  app.post('/api/portal/auth/request-otp', async (req, res) => {
    const phone = String(req.body?.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'Vui lòng nhập số điện thoại' });
    const patient = dbStore.patients.find(p => phoneMatches(p.phone, phone));
    if (!patient) return res.status(404).json({ error: 'Số điện thoại này chưa có hồ sơ tại phòng khám' });
    try {
      const r = await requestOtp(`portal:${digitsOnly(phone).slice(-9)}`, { phone, purpose: 'Đăng nhập cổng khách hàng' });
      res.json({ sent: r.sent, channel: r.channel, mode: r.mode, ...(r.devCode ? { devCode: r.devCode } : {}) });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Không gửi được mã OTP' });
    }
  });

  app.post('/api/portal/auth/verify', (req, res) => {
    const phone = String(req.body?.phone || '').trim();
    const code = String(req.body?.code || '').trim();
    const remember = req.body?.remember === true || req.body?.remember === 'true';
    if (!phone || !code) return res.status(400).json({ error: 'Thiếu số điện thoại hoặc mã OTP' });
    const check = verifyOtp(`portal:${digitsOnly(phone).slice(-9)}`, code);
    if (!check.ok) return res.status(400).json({ error: check.error || 'Mã OTP không đúng' });
    const patient = dbStore.patients.find(p => phoneMatches(p.phone, phone));
    if (!patient) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
    const token = issuePortalToken(patient.id, patient.phone, remember);
    res.json({ success: true, token, patient: { id: patient.id, name: patient.name, pid: patient.pid, phone: patient.phone } });
  });

  // Patient-scoped data (portal token only sees its own records).
  app.get('/api/portal/me', requirePortalAuth, (req, res) => {
    const pid = (req as any).portalPatientId as string;
    const patient = dbStore.patients.find(p => p.id === pid);
    if (!patient) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
    res.json({
      patient,
      appointments: dbStore.appointments.filter(a => a.patientId === pid).sort((a, b) => (a.date < b.date ? 1 : -1)),
      invoices: dbStore.invoices.filter(i => i.patientId === pid),
      recalls: dbStore.recalls.filter(r => r.patientId === pid)
    });
  });

  app.post('/api/portal/appointments', requirePortalAuth, (req, res) => {
    const pid = (req as any).portalPatientId as string;
    const patient = dbStore.patients.find(p => p.id === pid);
    if (!patient) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
    const d = req.body || {};
    const apt: AppointmentRecord = {
      id: `apt-portal-${Date.now()}`,
      patientId: pid,
      patientName: patient.name,
      patientPhone: patient.phone,
      doctorId: d.doctorId || '',
      doctorName: d.doctorName || '',
      department: d.department || 'Khoa Khám Bệnh',
      branchId: d.branchId || patient.branchId || 'hn-central',
      date: d.date || d.appointmentDate || new Date().toISOString().slice(0, 10),
      timeSlot: d.timeSlot || '08:00 - 08:30',
      status: 'Chờ tiếp đón',
      type: d.type || 'Khám mới',
      channel: 'Mobile App',
      symptoms: d.symptoms || '',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    dbStore.appointments.unshift(apt);
    void persistStore();
    emitChange({ type: 'store', path: '/api/portal/appointments', method: 'POST' });
    res.status(201).json({ success: true, appointment: apt });
  });

  app.post('/api/portal/tickets', requirePortalAuth, (req, res) => {
    const pid = (req as any).portalPatientId as string;
    const patient = dbStore.patients.find(p => p.id === pid);
    if (!patient) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
    const d = req.body || {};
    const ticket: SupportTicketRecord = {
      id: `ticket-portal-${Date.now()}`,
      ticketCode: `SLA-2026-${Math.floor(100 + Math.random() * 900)}`,
      patientId: pid,
      patientName: patient.name,
      patientPhone: patient.phone,
      category: d.category || 'Góp ý dịch vụ',
      priority: d.priority || 'Trung bình (SLA 8h)',
      status: 'Mới tiếp nhận',
      department: d.department || 'Phòng CSKH',
      branchId: patient.branchId || 'hn-central',
      assignedStaff: '',
      description: d.description || '',
      slaDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '),
      isOverdue: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    dbStore.tickets.unshift(ticket);
    void persistStore();
    emitChange({ type: 'store', path: '/api/portal/tickets', method: 'POST' });
    res.status(201).json({ success: true, ticket });
  });

  // --- Inbound VoIP webhook → screen-pop (public, shared secret) ---
  const voipWebhookOk = (req: Request) => {
    const secret = process.env.VOIP_WEBHOOK_SECRET;
    if (!secret) return true; // dev: accept unsigned
    const bearer = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    return bearer === secret || String(req.query.secret || '') === secret;
  };

  // Marketing unsubscribe (phone-based, no bearer).
  registerPublicOptOut(app);
  // File download — authenticates via ?token= so <a href> works.
  registerPublicFileDownload(app);

  app.post('/api/webhooks/voip', (req, res) => {
    if (!voipWebhookOk(req)) return res.sendStatus(401);
    res.sendStatus(200);
    const { event, from, to, callId, durationSeconds } = req.body || {};
    if (event === 'incoming' || event === 'ringing') {
      ingestInboundCall(String(from || ''), String(to || ''), String(callId || ''));
    } else if ((event === 'ended' || event === 'completed') && callId) {
      const c = dbStore.voipCalls.find(x => x.id === callId);
      if (c) { c.status = 'Hoàn tất cuộc gọi'; c.durationSeconds = Number(durationSeconds) || c.durationSeconds; void persistStore(); }
    }
  });
}
