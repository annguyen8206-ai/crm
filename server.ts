import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { dbStore, PatientRecord, AppointmentRecord, SupportTicketRecord, LeadDealRecord, InvoiceRecord, FollowUpTaskRecord, AutoRecallRecord, ZnsLogRecord, VoipCallRecord, CsatFeedbackRecord } from "./server/store";
import { checkDatabase, databaseConfigured, initializeDatabase, persistStore } from "./server/database";
import { authConfigured, initializeAuth, loginStaff, requireAuth } from "./server/auth";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  if (process.env.NODE_ENV === 'production' && !databaseConfigured) {
    throw new Error('DATABASE_URL is required in production');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
  }
  if (process.env.NODE_ENV === 'production' && (!process.env.AUTH_BOOTSTRAP_EMAIL || !process.env.AUTH_BOOTSTRAP_PASSWORD)) {
    throw new Error('AUTH_BOOTSTRAP_EMAIL and AUTH_BOOTSTRAP_PASSWORD are required in production');
  }
  await initializeDatabase();
  await initializeAuth();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '2mb' }));

  // Persist every successful write request after handlers complete.
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') || req.method === 'GET') return next();
    res.on('finish', () => {
      if (res.statusCode < 400) void persistStore();
    });
    next();
  });

  // Request Logging & Audit Middleware
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") && req.method !== "GET") {
      const userHeader = req.headers["x-user-id"] as string || "system";
      const userNameHeader = decodeURIComponent(req.headers["x-user-name"] as string || "Nhân viên VitHospital");
      const roleHeader = decodeURIComponent(req.headers["x-user-role"] as string || "Staff");
      const safeBody = { ...req.body };
      for (const key of ['password', 'password_hash', 'token', 'accessToken', 'secret', 'apiKey']) delete safeBody[key];
      dbStore.addAuditLog(userHeader, userNameHeader, roleHeader, `${req.method} ${req.path}`, "API Gateway", `Payload: ${JSON.stringify(safeBody).slice(0, 100)}...`);
    }
    next();
  });

  // =========================================================================
  // 1. HEALTH CHECK & SYSTEM METADATA ENDPOINTS
  // =========================================================================
  app.get("/api/health", async (req, res) => {
    const database = await checkDatabase();
    res.status(database.configured && !database.connected ? 503 : 200).json({
      status: "ok",
      app: "VitHospital Healthcare Management Backend",
      version: "2.6.0-PROD",
      environment: process.env.NODE_ENV || "development",
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
        authentication: { configured: authConfigured }
      });
  });

  app.post('/api/auth/staff/login', async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
      }
      const result = await loginStaff(identifier, password);
      res.json({ success: true, user: result, token: result.token });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Đăng nhập thất bại' });
    }
  });

  // All business APIs require a valid backend token.
  app.use('/api', requireAuth);

  // System Audit Logs
  app.get("/api/system/audit-logs", (req, res) => {
    res.json({
      logs: dbStore.auditLogs,
      total: dbStore.auditLogs.length
    });
  });

  // =========================================================================
  // 2. PATIENT MANAGEMENT API (HỒ SƠ BỆNH NHÂN 360)
  // =========================================================================
  app.get("/api/patients", (req, res) => {
    try {
      const { search, branchId, riskLevel, tag, limit = 50, offset = 0 } = req.query;
      let filtered = [...dbStore.patients];

      if (search && typeof search === 'string') {
        const s = search.toLowerCase().trim();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(s) ||
          p.pid.toLowerCase().includes(s) ||
          p.phone.includes(s) ||
          p.idCard.includes(s) ||
          p.insuranceCardNumber.toLowerCase().includes(s)
        );
      }

      if (branchId && branchId !== 'ALL' && typeof branchId === 'string') {
        filtered = filtered.filter(p => p.branchId === branchId);
      }

      if (riskLevel && typeof riskLevel === 'string') {
        filtered = filtered.filter(p => p.riskLevel === riskLevel);
      }

      if (tag && typeof tag === 'string') {
        filtered = filtered.filter(p => p.tags.includes(tag));
      }

      const total = filtered.length;
      const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

      res.json({
        patients: paginated,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tải danh sách bệnh nhân", details: e.message });
    }
  });

  app.get("/api/patients/:id", (req, res) => {
    const patient = dbStore.patients.find(p => p.id === req.params.id || p.pid === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: "Không tìm thấy bệnh nhân" });
    }

    // Correlated patient data
    const patientAppointments = dbStore.appointments.filter(a => a.patientId === patient.id);
    const patientTickets = dbStore.tickets.filter(t => t.patientId === patient.id);
    const patientInvoices = dbStore.invoices.filter(i => i.patientId === patient.id);
    const patientRecalls = dbStore.recalls.filter(r => r.patientId === patient.id);
    const patientZnsLogs = dbStore.znsLogs.filter(z => z.patientId === patient.id);

    res.json({
      patient,
      appointments: patientAppointments,
      tickets: patientTickets,
      invoices: patientInvoices,
      recalls: patientRecalls,
      znsLogs: patientZnsLogs
    });
  });

  app.post("/api/patients", (req, res) => {
    try {
      const data = req.body;
      if (!data.name || !data.phone) {
        return res.status(400).json({ error: "Tên và số điện thoại là bắt buộc" });
      }

      const newPid = `BN-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const newId = `pat-${Date.now()}`;

      const newPatient: PatientRecord = {
        id: newId,
        pid: data.pid || newPid,
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        gender: data.gender || 'Nam',
        dob: data.dob || '1990-01-01',
        age: data.age || 35,
        idCard: data.idCard || '',
        address: data.address || '',
        bloodType: data.bloodType || 'Chưa rõ',
        allergies: data.allergies || [],
        chronicConditions: data.chronicConditions || [],
        medicalHistoryNotes: data.medicalHistoryNotes || '',
        insuranceCardNumber: data.insuranceCardNumber || '',
        insuranceProvider: data.insuranceProvider || '',
        insuranceExpiry: data.insuranceExpiry || '',
        branchId: data.branchId || 'hn-central',
        firstVisitDate: new Date().toISOString().slice(0, 10),
        lastVisitDate: new Date().toISOString().slice(0, 10),
        totalVisits: 1,
        totalSpent: 0,
        riskLevel: data.riskLevel || 'Thấp',
        loyaltyTier: 'Standard',
        loyaltyPoints: 0,
        tags: data.tags || ['Bệnh Nhân Mới'],
        emergencyContact: data.emergencyContact || { name: '', relationship: '', phone: '' },
        vitalsHistory: data.vitalsHistory || []
      };

      dbStore.patients.unshift(newPatient);
      res.status(201).json({ success: true, patient: newPatient });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tạo hồ sơ bệnh nhân", details: e.message });
    }
  });

  app.put("/api/patients/:id", (req, res) => {
    const idx = dbStore.patients.findIndex(p => p.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: "Không tìm thấy bệnh nhân" });
    }

    dbStore.patients[idx] = {
      ...dbStore.patients[idx],
      ...req.body,
      id: dbStore.patients[idx].id // Preserve ID
    };

    res.json({ success: true, patient: dbStore.patients[idx] });
  });

  app.delete("/api/patients/:id", (req, res) => {
    const idx = dbStore.patients.findIndex(p => p.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: "Không tìm thấy bệnh nhân" });
    }
    const removed = dbStore.patients.splice(idx, 1);
    res.json({ success: true, message: `Đã xóa bệnh nhân ${removed[0].name}` });
  });

  // Add Vital Signs
  app.post("/api/patients/:id/vitals", (req, res) => {
    const patient = dbStore.patients.find(p => p.id === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: "Không tìm thấy bệnh nhân" });
    }

    const { bloodPressure, heartRate, spo2, weight, height, temperature, bloodGlucose } = req.body;
    const heightM = (height || 160) / 100;
    const bmi = Number(((weight || 60) / (heightM * heightM)).toFixed(1));

    const vital = {
      date: new Date().toISOString().slice(0, 10),
      bloodPressure: bloodPressure || '120/80',
      heartRate: Number(heartRate) || 75,
      spo2: Number(spo2) || 98,
      weight: Number(weight) || 60,
      height: Number(height) || 160,
      bmi,
      temperature: Number(temperature) || 36.5,
      bloodGlucose: bloodGlucose ? Number(bloodGlucose) : undefined
    };

    patient.vitalsHistory.unshift(vital);
    res.json({ success: true, vitals: vital, patientVitals: patient.vitalsHistory });
  });

  // =========================================================================
  // 3. APPOINTMENT MANAGEMENT API (ĐẶT LỊCH & TIẾP ĐÓN KHÁM)
  // =========================================================================
  app.get("/api/appointments", (req, res) => {
    try {
      const { date, branchId, status, department, doctorId, patientId } = req.query;
      let filtered = [...dbStore.appointments];

      if (date && typeof date === 'string') {
        filtered = filtered.filter(a => a.date === date);
      }
      if (branchId && branchId !== 'ALL' && typeof branchId === 'string') {
        filtered = filtered.filter(a => a.branchId === branchId);
      }
      if (status && typeof status === 'string') {
        filtered = filtered.filter(a => a.status === status);
      }
      if (department && typeof department === 'string') {
        filtered = filtered.filter(a => a.department === department);
      }
      if (doctorId && typeof doctorId === 'string') {
        filtered = filtered.filter(a => a.doctorId === doctorId);
      }
      if (patientId && typeof patientId === 'string') {
        filtered = filtered.filter(a => a.patientId === patientId);
      }

      res.json({ appointments: filtered, total: filtered.length });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tải danh sách lịch hẹn", details: e.message });
    }
  });

  app.post("/api/appointments", (req, res) => {
    try {
      const data = req.body;
      if (!data.patientName || !data.date || !data.department) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc: tên bệnh nhân, ngày khám, chuyên khoa" });
      }

      const queueLetter = data.department.includes("Tim Mạch") ? "A" : data.department.includes("Da Liễu") ? "D" : data.department.includes("Sản") ? "S" : "B";
      const queueNumber = `${queueLetter}-${Math.floor(100 + Math.random() * 900)}`;

      const newApt: AppointmentRecord = {
        id: `apt-${Date.now()}`,
        queueNumber,
        patientId: data.patientId || `pat-${Date.now()}`,
        patientName: data.patientName,
        patientPhone: data.patientPhone || '09xx xxx xxx',
        doctorId: data.doctorId || 'doc-1',
        doctorName: data.doctorName || 'BS. Chuyên Khoa VitHospital',
        department: data.department,
        branchId: data.branchId || 'hn-central',
        date: data.date,
        timeSlot: data.timeSlot || '08:30 - 09:00',
        status: data.status || 'Chờ tiếp đón',
        type: data.type || 'Khám mới',
        channel: data.channel || 'Website',
        symptoms: data.symptoms || 'Khám sức khỏe tổng quát',
        notes: data.notes || '',
        estimatedCost: data.estimatedCost || 500000,
        isPaid: data.isPaid || false,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };

      dbStore.appointments.unshift(newApt);
      res.status(201).json({ success: true, appointment: newApt });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi đặt lịch hẹn", details: e.message });
    }
  });

  app.put("/api/appointments/:id/status", (req, res) => {
    const { status, notes } = req.body;
    const apt = dbStore.appointments.find(a => a.id === req.params.id);
    if (!apt) {
      return res.status(404).json({ error: "Không tìm thấy lịch hẹn" });
    }

    apt.status = status;
    if (notes) apt.notes = notes;

    res.json({ success: true, appointment: apt });
  });

  app.put("/api/appointments/:id", (req, res) => {
    const idx = dbStore.appointments.findIndex(a => a.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: "Không tìm thấy lịch hẹn" });
    }

    dbStore.appointments[idx] = {
      ...dbStore.appointments[idx],
      ...req.body,
      id: dbStore.appointments[idx].id
    };

    res.json({ success: true, appointment: dbStore.appointments[idx] });
  });

  // =========================================================================
  // 4. CUSTOMER CARE & SUPPORT TICKETS SLA API
  // =========================================================================
  app.get("/api/tickets", (req, res) => {
    const { status, priority, department, isOverdue } = req.query;
    let filtered = [...dbStore.tickets];

    if (status && typeof status === 'string') {
      filtered = filtered.filter(t => t.status === status);
    }
    if (priority && typeof priority === 'string') {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (department && typeof department === 'string') {
      filtered = filtered.filter(t => t.department === department);
    }
    if (isOverdue !== undefined) {
      filtered = filtered.filter(t => t.isOverdue === (isOverdue === 'true'));
    }

    res.json({ tickets: filtered, total: filtered.length });
  });

  app.post("/api/tickets", (req, res) => {
    try {
      const data = req.body;
      const code = `SLA-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newTicket: SupportTicketRecord = {
        id: `ticket-${Date.now()}`,
        ticketCode: code,
        patientId: data.patientId || `pat-${Date.now()}`,
        patientName: data.patientName || 'Khách hàng',
        patientPhone: data.patientPhone || '09xx xxx xxx',
        category: data.category || 'Góp ý dịch vụ',
        priority: data.priority || 'Trung bình (SLA 8h)',
        status: 'Mới tiếp nhận',
        department: data.department || 'Phòng CSKH & Trải Nghiệm Bệnh Nhân',
        branchId: data.branchId || 'hn-central',
        assignedStaff: data.assignedStaff || 'CSKH Nguyễn Mai Linh',
        description: data.description || '',
        slaDeadline: data.slaDeadline || '2026-08-25 12:00',
        isOverdue: false,
        compensationVoucher: data.compensationVoucher || '',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };

      dbStore.tickets.unshift(newTicket);
      res.status(201).json({ success: true, ticket: newTicket });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tạo phiếu khiếu nại SLA", details: e.message });
    }
  });

  app.put("/api/tickets/:id", (req, res) => {
    const idx = dbStore.tickets.findIndex(t => t.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: "Không tìm thấy phiếu hỗ trợ" });
    }

    const updated = {
      ...dbStore.tickets[idx],
      ...req.body
    };

    if (req.body.status === 'Đã giải quyết' || req.body.status === 'Đã đóng') {
      updated.resolvedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    }

    dbStore.tickets[idx] = updated;
    res.json({ success: true, ticket: updated });
  });

  // =========================================================================
  // 5. SALES, LEADS & DEALS PIPELINE API
  // =========================================================================
  app.get("/api/leads", (req, res) => {
    const { stage, type, assignedStaff } = req.query;
    let filtered = [...dbStore.leads];

    if (stage && typeof stage === 'string') {
      filtered = filtered.filter(l => l.stage === stage);
    }
    if (type && typeof type === 'string') {
      filtered = filtered.filter(l => l.type === type);
    }
    if (assignedStaff && typeof assignedStaff === 'string') {
      filtered = filtered.filter(l => l.assignedStaff === assignedStaff);
    }

    const totalPipelineValue = filtered.reduce((acc, curr) => acc + (curr.expectedValue || 0), 0);
    const weightedPipelineValue = filtered.reduce((acc, curr) => acc + ((curr.expectedValue || 0) * (curr.probability || 50) / 100), 0);

    res.json({
      leads: filtered,
      total: filtered.length,
      totalPipelineValue,
      weightedPipelineValue
    });
  });

  app.post("/api/leads", (req, res) => {
    const data = req.body;
    const newLead: LeadDealRecord = {
      id: `deal-${Date.now()}`,
      customerName: data.customerName,
      type: data.type || 'B2C',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '09xx xxx xxx',
      email: data.email || '',
      serviceCategory: data.serviceCategory || 'Gói Khám Sức Khỏe',
      expectedValue: Number(data.expectedValue) || 10000000,
      stage: data.stage || 'Mới tiếp nhận',
      probability: Number(data.probability) || 50,
      assignedStaff: data.assignedStaff || 'Lê Hoàng Long',
      source: data.source || 'Website',
      notes: data.notes || '',
      followUpDate: data.followUpDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10)
    };

    dbStore.leads.unshift(newLead);
    res.status(201).json({ success: true, lead: newLead });
  });

  app.put("/api/leads/:id", (req, res) => {
    const idx = dbStore.leads.findIndex(l => l.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: "Không tìm thấy cơ hội kinh doanh" });
    }

    dbStore.leads[idx] = { ...dbStore.leads[idx], ...req.body };
    res.json({ success: true, lead: dbStore.leads[idx] });
  });

  // =========================================================================
  // 6. INVOICING, BILLING & VIETQR PAYMENT GATEWAY API
  // =========================================================================
  app.get("/api/invoices", (req, res) => {
    const { status, patientId, branchId } = req.query;
    let filtered = [...dbStore.invoices];

    if (status && typeof status === 'string') {
      filtered = filtered.filter(i => i.status === status);
    }
    if (patientId && typeof patientId === 'string') {
      filtered = filtered.filter(i => i.patientId === patientId);
    }
    if (branchId && typeof branchId === 'string') {
      filtered = filtered.filter(i => i.branchId === branchId);
    }

    const totalCollected = filtered.filter(i => i.status === 'Đã thanh toán').reduce((acc, curr) => acc + curr.patientPayable, 0);
    const totalPending = filtered.filter(i => i.status === 'Chờ thanh toán').reduce((acc, curr) => acc + curr.patientPayable, 0);

    res.json({
      invoices: filtered,
      total: filtered.length,
      totalCollected,
      totalPending
    });
  });

  app.post("/api/invoices", (req, res) => {
    const data = req.body;
    const invCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotal = (data.items || []).reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
    const insuranceDeduction = (data.items || []).reduce((acc: number, item: any) => acc + (item.insuranceCoverage || 0), 0);
    const discount = data.discount || 0;
    const patientPayable = Math.max(0, subtotal - insuranceDeduction - discount);

    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoiceCode: invCode,
      patientId: data.patientId || `pat-${Date.now()}`,
      patientName: data.patientName || 'Bệnh nhân',
      patientPhone: data.patientPhone || '09xx xxx xxx',
      branchId: data.branchId || 'hn-central',
      department: data.department || 'Khoa Khám Bệnh',
      items: data.items || [],
      subtotal,
      discount,
      insuranceDeduction,
      patientPayable,
      status: 'Chờ thanh toán',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    dbStore.invoices.unshift(newInvoice);
    res.status(201).json({ success: true, invoice: newInvoice });
  });

  // Generate VietQR Dynamic Payload
  app.post("/api/payments/vietqr", (req, res) => {
    const { amount, invoiceCode, patientName, bankCode = 'MB', accountNumber = '0338886868', accountName = 'BENH VIEN DKT VITHOSPITAL' } = req.body;
    const safeAmount = Number(amount) || 500000;
    const addInfo = encodeURIComponent(`TT VIEN PHI ${invoiceCode || 'HD'}`);
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${safeAmount}&addInfo=${addInfo}&accountName=${encodeURIComponent(accountName)}`;

    res.json({
      success: true,
      bank: {
        bankCode,
        bankName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
        accountNumber,
        accountName
      },
      amount: safeAmount,
      transferMemo: `TT VIEN PHI ${invoiceCode || 'HD'}`,
      qrUrl,
      vietQrString: `00020101021238580010A000000727012800069704220114${accountNumber}0208QRIBFTTA520459995303704540${safeAmount}5802VN5928${accountName}6006HANOI62220818${invoiceCode}6304`
    });
  });

  // Mark invoice as paid
  app.post("/api/invoices/:id/pay", (req, res) => {
    const { paymentMethod = 'VietQR', transactionRef } = req.body;
    const inv = dbStore.invoices.find(i => i.id === req.params.id);
    if (!inv) {
      return res.status(404).json({ error: "Không tìm thấy hóa đơn" });
    }

    inv.status = 'Đã thanh toán';
    inv.paymentMethod = paymentMethod;
    inv.transactionRef = transactionRef || `TXN-${Date.now()}`;
    inv.paidAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    res.json({ success: true, invoice: inv, message: "Đã xác nhận thanh toán viện phí thành công!" });
  });

  // =========================================================================
  // 7. FOLLOW-UP CALLS D+3 API
  // =========================================================================
  app.get("/api/follow-ups", (req, res) => {
    const { status, assignedStaff } = req.query;
    let filtered = [...dbStore.followUps];

    if (status && typeof status === 'string') {
      filtered = filtered.filter(f => f.callStatus === status);
    }
    if (assignedStaff && typeof assignedStaff === 'string') {
      filtered = filtered.filter(f => f.assignedStaff === assignedStaff);
    }

    res.json({ followUps: filtered, total: filtered.length });
  });

  app.put("/api/follow-ups/:id", (req, res) => {
    const idx = dbStore.followUps.findIndex(f => f.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: "Không tìm thấy ca chăm sóc sau khám" });
    }

    dbStore.followUps[idx] = { ...dbStore.followUps[idx], ...req.body };
    res.json({ success: true, followUp: dbStore.followUps[idx] });
  });

  // =========================================================================
  // 8. AUTO-RECALL MANAGEMENT API
  // =========================================================================
  app.get("/api/recalls", (req, res) => {
    const { category, status } = req.query;
    let filtered = [...dbStore.recalls];

    if (category && typeof category === 'string') {
      filtered = filtered.filter(r => r.conditionCategory.includes(category));
    }
    if (status && typeof status === 'string') {
      filtered = filtered.filter(r => r.status === status);
    }

    res.json({ recalls: filtered, total: filtered.length });
  });

  app.post("/api/recalls", (req, res) => {
    const data = req.body;
    if (data.id) {
      const idx = dbStore.recalls.findIndex(r => r.id === data.id);
      if (idx >= 0) {
        dbStore.recalls[idx] = { ...dbStore.recalls[idx], ...data };
        return res.json({ success: true, recall: dbStore.recalls[idx] });
      }
    }

    const newRecall: AutoRecallRecord = {
      id: `recall-${Date.now()}`,
      patientId: data.patientId || `pat-${Date.now()}`,
      patientName: data.patientName || 'Bệnh nhân',
      patientPhone: data.patientPhone || '09xx xxx xxx',
      lastVisitDate: data.lastVisitDate || new Date().toISOString().slice(0, 10),
      dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
      daysOverdue: data.daysOverdue || 0,
      conditionCategory: data.conditionCategory || 'Bệnh Mạn Tính',
      primaryDiagnosis: data.primaryDiagnosis || '',
      recallReason: data.recallReason || 'Tái khám định kỳ theo chỉ định của bác sĩ',
      recallIntervalDays: data.recallIntervalDays || 30,
      doctorRecommendation: data.doctorRecommendation || '',
      assignedDoctor: data.assignedDoctor || 'BS. Chuyên Khoa VitHospital',
      assignedStaff: data.assignedStaff || 'ĐD. Lê Thị Diệu',
      status: data.status || 'Đến hạn - Chờ liên hệ',
      notes: data.notes || ''
    };

    dbStore.recalls.unshift(newRecall);
    res.status(201).json({ success: true, recall: newRecall });
  });

  app.post("/api/recalls/:id/convert-to-appointment", (req, res) => {
    const recall = dbStore.recalls.find(r => r.id === req.params.id);
    if (!recall) {
      return res.status(404).json({ error: "Không tìm thấy lịch nhắc tái khám" });
    }

    const newApt: AppointmentRecord = {
      id: `apt-${Date.now()}`,
      queueNumber: `TK-${Math.floor(100 + Math.random() * 900)}`,
      patientId: recall.patientId,
      patientName: recall.patientName,
      patientPhone: recall.patientPhone,
      doctorId: 'doc-1',
      doctorName: recall.assignedDoctor,
      department: recall.conditionCategory.includes("Tim Mạch") ? "Khoa Tim Mạch & Huyết Áp" : recall.conditionCategory.includes("Da Liễu") ? "Viện Thẩm Mỹ & Da Liễu" : "Khoa Khám Bệnh Đa Khoa",
      branchId: 'hn-central',
      date: req.body.date || recall.dueDate,
      timeSlot: req.body.timeSlot || '09:00 - 09:30',
      status: 'Chờ tiếp đón',
      type: 'Tái khám',
      channel: 'Zalo OA',
      symptoms: `Tái khám định kỳ theo lịch nhắc: ${recall.primaryDiagnosis}`,
      notes: recall.doctorRecommendation,
      estimatedCost: 650000,
      isPaid: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    dbStore.appointments.unshift(newApt);
    recall.status = 'Đã gọi - Đồng ý đặt lịch';

    res.json({ success: true, appointment: newApt, recall });
  });

  // =========================================================================
  // 9. ZALO ZNS & OMNICHANNEL MESSAGING API
  // =========================================================================
  app.get("/api/zns/templates", (req, res) => {
    res.json({
      templates: [
        {
          id: 'tpl-1',
          code: 'ZNS_POST_VISIT_CARE',
          name: 'ZNS Dặn dò sau khám & Hướng dẫn theo dõi tại nhà',
          category: 'Chăm sóc sau khám',
          pricePerMessage: 320,
          sampleContent: 'Kính gửi {patient_name}, VitHospital gửi lời cảm ơn Quý khách. Bác sĩ dặn dò sau khám: {doctor_notes}. Chúc Quý khách mau khỏe!'
        },
        {
          id: 'tpl-2',
          code: 'ZNS_AUTO_RECALL',
          name: 'ZNS Nhắc lịch tái khám & Tầm soát định kỳ',
          category: 'Nhắc tái khám',
          pricePerMessage: 320,
          sampleContent: 'Kính gửi {patient_name}, đã đến lịch tái khám định kỳ cho tình trạng {diagnosis}. Kính mời Quý khách đặt hẹn sớm để duy trì kết quả điều trị.'
        },
        {
          id: 'tpl-3',
          code: 'ZNS_APPOINTMENT_CONFIRMED',
          name: 'ZNS Xác nhận đặt lịch khám thành công & Mã QR tiếp đón',
          category: 'Đặt lịch khám',
          pricePerMessage: 280,
          sampleContent: 'Lịch khám của Quý khách {patient_name} tại {branch_name} vào {time} ngày {date} đã được xác nhận. Mã số thứ tự: {queue_number}.'
        },
        {
          id: 'tpl-4',
          code: 'ZNS_HEALTH_CARE_FOLLOWUP',
          name: 'ZNS Khảo sát sức khỏe & Đánh giá mức độ hài lòng sau khám',
          category: 'Chăm sóc khách hàng',
          pricePerMessage: 280,
          sampleContent: 'VitCRM trân trọng cảm ơn Quý khách {patient_name} đã tin tưởng dịch vụ. Kính mời Quý khách để lại đánh giá trải nghiệm tại đường dẫn sau.'
        }
      ]
    });
  });

  app.get("/api/zns/logs", (req, res) => {
    res.json({ logs: dbStore.znsLogs, total: dbStore.znsLogs.length });
  });

  app.post("/api/zns/send-post-visit-care", (req, res) => {
    try {
      const {
        patientId,
        patientName,
        patientPhone,
        diagnosis,
        doctorCareNotes,
        channel = 'Zalo ZNS',
        templateType = 'ZNS_POST_VISIT_CARE'
      } = req.body;

      if (!patientName || !diagnosis) {
        return res.status(400).json({ error: "Thiếu thông tin bệnh nhân hoặc chẩn đoán khám bệnh" });
      }

      const trackingCode = `ZNS-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      const newLog: ZnsLogRecord = {
        id: `zns-log-${Date.now()}`,
        patientId: patientId || `pat-${Date.now()}`,
        patientName,
        patientPhone: patientPhone || '09xx xxx xxx',
        templateType,
        templateName: templateType === 'ZNS_AUTO_RECALL' ? 'ZNS Nhắc Lịch Tái Khám Tự Động' : 'ZNS Dặn Dò Sau Khám & Hướng Dẫn Điều Trị',
        diagnosis,
        doctorCareNotes: doctorCareNotes || 'Bệnh nhân tuân thủ chế độ ăn uống, sinh hoạt lành mạnh và theo dõi triệu chứng tại nhà.',
        channel,
        status: 'Đã gửi thành công',
        sentAt: timeStr,
        deliveredAt: timeStr,
        trackingCode,
        cost: 320
      };

      dbStore.znsLogs.unshift(newLog);

      res.json({
        success: true,
        message: `Đã gửi tin nhắn ${channel} dặn dò sau khám tới bệnh nhân ${patientName} thành công!`,
        log: newLog
      });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi gửi ZNS", details: e.message });
    }
  });

  // =========================================================================
  // 10. VOIP SOFTPHONE / WEBRTC CALL RECORDING API
  // =========================================================================
  app.post("/api/calls/click-to-call", (req, res) => {
    const { patientId, patientName, patientPhone, agentStaffName = 'CSKH VitCRM', agentExtension = '108' } = req.body;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const newCall: VoipCallRecord = {
      id: `call-${Date.now()}`,
      callType: 'OUTBOUND_CSKH',
      patientId: patientId || `pat-${Date.now()}`,
      patientName,
      patientPhone,
      agentStaffName,
      agentExtension,
      startTime: timeStr,
      durationSeconds: 0,
      status: 'Đang đổ chuông'
    };

    dbStore.voipCalls.unshift(newCall);
    res.json({
      success: true,
      message: `Đang kết nối tổng đài ảo máy nhánh ${agentExtension} tới số ${patientPhone}...`,
      callSession: newCall
    });
  });

  app.post("/api/calls/complete", (req, res) => {
    const { callId, durationSeconds, callOutcome, callNotes, status = 'Hoàn tất cuộc gọi' } = req.body;
    const idx = dbStore.voipCalls.findIndex(c => c.id === callId);
    if (idx >= 0) {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      dbStore.voipCalls[idx] = {
        ...dbStore.voipCalls[idx],
        durationSeconds: durationSeconds || 60,
        callOutcome: callOutcome || 'Ổn định',
        callNotes: callNotes || 'Cuộc gọi thành công',
        status,
        endTime: timeStr,
        audioRecordingUrl: `https://audio.vithospital.vn/rec-${Date.now()}.mp3`
      };
      return res.json({ success: true, callSession: dbStore.voipCalls[idx] });
    }
    res.json({ success: true });
  });

  app.get("/api/calls/logs", (req, res) => {
    res.json({ calls: dbStore.voipCalls, total: dbStore.voipCalls.length });
  });

  // =========================================================================
  // 11. CSAT & NPS PATIENT SURVEY API
  // =========================================================================
  app.get("/api/csat/feedbacks", (req, res) => {
    const { sentiment, department } = req.query;
    let filtered = [...dbStore.csatFeedbacks];

    if (sentiment && typeof sentiment === 'string') {
      filtered = filtered.filter(c => c.sentiment === sentiment);
    }
    if (department && typeof department === 'string') {
      filtered = filtered.filter(c => c.department === department);
    }

    const totalRatings = filtered.length;
    const avgRating = totalRatings > 0 ? (filtered.reduce((acc, c) => acc + c.rating, 0) / totalRatings).toFixed(1) : "5.0";
    const promoters = filtered.filter(c => c.npsScore >= 9).length;
    const detractors = filtered.filter(c => c.npsScore <= 6).length;
    const npsIndex = totalRatings > 0 ? Math.round(((promoters - detractors) / totalRatings) * 100) : 85;

    res.json({
      feedbacks: filtered,
      total: totalRatings,
      avgRating: Number(avgRating),
      npsIndex,
      promotersCount: promoters,
      detractorsCount: detractors
    });
  });

  app.post("/api/csat/submit", (req, res) => {
    const { patientId, patientName, patientPhone, visitDate, doctorName, department, rating, npsScore, comment } = req.body;
    const numRating = Number(rating) || 5;
    const numNps = Number(npsScore) || 10;
    const sentiment = numRating >= 4 ? 'Tích cực' : numRating === 3 ? 'Trung lập' : 'Tiêu cực';
    const followUpRequired = numRating <= 3;

    const newFeedback: CsatFeedbackRecord = {
      id: `csat-${Date.now()}`,
      patientId: patientId || `pat-${Date.now()}`,
      patientName: patientName || 'Bệnh nhân',
      patientPhone: patientPhone || '09xx xxx xxx',
      visitDate: visitDate || new Date().toISOString().slice(0, 10),
      doctorName: doctorName || 'BS. VitHospital',
      department: department || 'Khoa Khám Bệnh',
      rating: numRating,
      npsScore: numNps,
      sentiment,
      comment: comment || '',
      followUpRequired,
      followUpStatus: followUpRequired ? 'Chờ liên hệ xử lý' : undefined,
      submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    dbStore.csatFeedbacks.unshift(newFeedback);

    // If rating is low, automatically generate a Support Ticket for CSKH
    if (followUpRequired) {
      dbStore.tickets.unshift({
        id: `ticket-${Date.now()}`,
        ticketCode: `SLA-CSAT-${Math.floor(100 + Math.random() * 900)}`,
        patientId: newFeedback.patientId,
        patientName: newFeedback.patientName,
        patientPhone: newFeedback.patientPhone,
        category: 'Góp ý dịch vụ',
        priority: 'Cao (SLA 2h)',
        status: 'Mới tiếp nhận',
        department: 'Phòng CSKH & Trải Nghiệm Bệnh Nhân',
        branchId: 'hn-central',
        assignedStaff: 'CSKH Nguyễn Mai Linh',
        description: `Bệnh nhân đánh giá ${numRating} sao (${sentiment}): "${comment}"`,
        slaDeadline: '2026-08-24 18:00',
        isOverdue: false,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      });
    }

    res.status(201).json({ success: true, feedback: newFeedback });
  });

  // =========================================================================
  // 12. EXECUTIVE DASHBOARD ANALYTICS & KPIS API
  // =========================================================================
  app.get("/api/analytics/dashboard", (req, res) => {
    const totalPatients = dbStore.patients.length;
    const totalAppointments = dbStore.appointments.length;
    const todayAppointments = dbStore.appointments.filter(a => a.date === new Date().toISOString().slice(0, 10)).length;
    const totalRevenue = dbStore.invoices.filter(i => i.status === 'Đã thanh toán').reduce((acc, curr) => acc + curr.patientPayable, 0);
    const openTickets = dbStore.tickets.filter(t => t.status === 'Mới tiếp nhận' || t.status === 'Đang xử lý').length;
    const resolvedTickets = dbStore.tickets.filter(t => t.status === 'Đã giải quyết' || t.status === 'Đã đóng').length;
    const slaRate = (dbStore.tickets.length > 0 ? Math.round((resolvedTickets / dbStore.tickets.length) * 100) : 98);
    const overdueRecalls = dbStore.recalls.filter(r => r.daysOverdue > 0).length;

    res.json({
      kpis: {
        totalRevenue,
        revenueFormatted: `${(totalRevenue / 1000000).toFixed(1)} Triệu VNĐ`,
        totalPatients,
        totalAppointments,
        todayAppointments,
        openTickets,
        resolvedTickets,
        slaRate: `${slaRate}%`,
        overdueRecalls,
        bedOccupancyRate: "88.4%",
        averageWaitTimeMinutes: 14.5
      },
      branchPerformance: [
        { branchId: 'hn-central', name: 'VitHospital Trung Tâm (Phố Huế)', patients: 450, revenue: 1250000000, occupancy: '92%' },
        { branchId: 'hn-badinh', name: 'VitClinic Ba Đình', patients: 280, revenue: 680000000, occupancy: '84%' },
        { branchId: 'hn-caugiay', name: 'VitClinic Cầu Giấy', patients: 310, revenue: 740000000, occupancy: '86%' },
        { branchId: 'beauty-center', name: 'VitBeauty Center', patients: 190, revenue: 980000000, occupancy: '90%' }
      ]
    });
  });

  // =========================================================================
  // 13. GEMINI AI MEDICAL & CRM ASSISTANT SUITE
  // =========================================================================
  // AI Clinical Triage
  app.post("/api/ai/triage", async (req, res) => {
    try {
      const { symptoms, patientAge, patientGender, medicalHistory } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          urgency: symptoms?.toLowerCase().includes("ngực") || symptoms?.toLowerCase().includes("khó thở") ? "Khẩn cấp" : "Tiêu chuẩn",
          suggestedDepartment: symptoms?.toLowerCase().includes("tim") || symptoms?.toLowerCase().includes("ngực") ? "Khoa Tim Mạch" :
            symptoms?.toLowerCase().includes("da") || symptoms?.toLowerCase().includes("mụn") || symptoms?.toLowerCase().includes("ngứa") ? "Viện Thẩm Mỹ & Da Liễu" :
            symptoms?.toLowerCase().includes("ho") || symptoms?.toLowerCase().includes("sốt") ? "Khoa Hô Hấp - Nội Tổng Quát" :
            symptoms?.toLowerCase().includes("răng") || symptoms?.toLowerCase().includes("nướu") ? "Khoa Răng Hàm Mặt" : "Khoa Khám Bệnh Đa Khoa",
          recommendedDoctor: "PGS. TS. BS Trần Minh Đức",
          preliminaryAdvice: "Khuyến nghị bệnh nhân đến phòng khám sớm để được thăm khám lâm sàng và làm các chỉ định cận lâm sàng phù hợp.",
          recommendedTests: ["Công thức máu toàn phần (CBC)", "Điện tâm đồ ECG (nếu có tức ngực)", "Đo huyết áp và chỉ số sinh tồn"],
          questionsToAsk: ["Triệu chứng xuất hiện bao lâu rồi?", "Cơn đau có lan ra sau lưng hay cánh tay không?", "Có tiền sử bệnh tim mạch hay dị ứng thuốc gì không?"]
        });
      }

      const prompt = `Bạn là Trợ lý Y tế AI chuyên nghiệp của hệ thống VitCRM (Việt Nam).
Hãy phân tích thông tin bệnh nhân sau đây để đưa ra phân luồng khám bệnh (Triage) và hỗ trợ nhân viên tiếp đón/CSKH:
- Triệu chứng: ${symptoms}
- Tuổi: ${patientAge || 'Không rõ'}
- Giới tính: ${patientGender || 'Không rõ'}
- Tiền sử bệnh: ${medicalHistory || 'Chưa ghi nhận'}

TrẢ VỀ JSON thuần túy (không markdown bao quanh):
{
  "urgency": "Khẩn cấp" | "Ưu tiên" | "Tiêu chuẩn",
  "suggestedDepartment": "Tên chuyên khoa phù hợp",
  "recommendedDoctor": "Gợi ý bác sĩ chuyên khoa phụ trách",
  "preliminaryAdvice": "Lời khuyên sơ bộ và lưu ý an toàn cho bệnh nhân",
  "recommendedTests": ["Xét nghiệm/Cận lâm sàng đề xuất 1", "Xét nghiệm/Cận lâm sàng đề xuất 2"],
  "questionsToAsk": ["Câu hỏi CSKH nên hỏi thêm 1", "Câu hỏi CSKH nên hỏi thêm 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.2 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Triage Error:", err);
      res.status(500).json({ error: "Không thể xử lý yêu cầu phân luồng AI", details: err.message });
    }
  });

  // AI Patient 360 Summarizer
  app.post("/api/ai/summarize-patient", async (req, res) => {
    try {
      const { patientData } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          summary: `Khách hàng ${patientData?.name || 'Nguyễn Thị Bích Thủy'} (${patientData?.age || '47'} tuổi) là Hội viên VIP Gold, có tiền sử Tăng huyết áp và Đái tháo đường Type 2. Đã hoàn thành đợt tái khám định kỳ gần nhất, phản hồi tích cực về dịch vụ tiếp đón và đang tuân thủ phác đồ chăm sóc tại nhà.`,
          keyAlerts: ["Cần theo dõi sát lịch tái khám sau 30 ngày", "Nhắc nhân viên CSKH liên hệ hỏi thăm chỉ số huyết áp tại nhà"],
          actionPlan: ["Tư vấn khách hàng đặt lịch tái khám định kỳ vào tuần tới", "Gửi tin nhắn ZNS chăm sóc khách hàng và nhắc đo huyết áp 2 lần/ngày"]
        });
      }

      const prompt = `Bạn là Trợ lý AI Bác sĩ của VitCRM. Hãy tóm tắt góc nhìn 360 độ hồ sơ bệnh nhân sau đây để bác sĩ/nhân viên CSKH nắm bắt trong 15 giây:
Dữ liệu bệnh nhân: ${JSON.stringify(patientData)}

Trả về JSON thuần túy:
{
  "summary": "Tóm tắt lâm sàng súc tích, chuyên nghiệp",
  "keyAlerts": ["Cảnh báo 1", "Cảnh báo 2"],
  "actionPlan": ["Hành động đề xuất 1", "Hành động đề xuất 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.3 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Patient Summary Error:", err);
      res.status(500).json({ error: "Lỗi tóm tắt hồ sơ", details: err.message });
    }
  });

  // AI Campaign Copy Generator
  app.post("/api/ai/generate-campaign-content", async (req, res) => {
    try {
      const { segmentName, targetCondition, channel, tone } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          title: `Chăm sóc sức khỏe định kỳ chuyên khoa - VitHospital Healthcare`,
          message: `Kính gửi Quý khách, Hệ thống Bệnh viện VitHospital trân trọng gửi lời chúc sức khỏe. Đã đến lịch kiểm tra sức khỏe định kỳ cho tình trạng ${targetCondition || 'sức khỏe tổng quát'}. Kính mời Quý khách đặt lịch khám để được bác sĩ chuyên khoa tư vấn trực tiếp và nhận ưu đãi 15% gói xét nghiệm. Hotline: 1900 6868.`,
          suggestedSendTime: "08:30 sáng Thứ 3 hoặc Thứ 5",
          estimatedConversionRate: "18.5%"
        });
      }

      const prompt = `Bạn là chuyên gia Marketing Y tế & CSKH của hệ thống VitCRM. Hãy tạo nội dung thông điệp gửi tự động cho chiến dịch:
- Nhóm phân khúc: ${segmentName}
- Tình trạng/Bệnh lý mục tiêu: ${targetCondition}
- Kênh gửi: ${channel} (Zalo ZNS / SMS / Email)
- Giọng văn: ${tone || 'Ân cần, chuẩn mực y khoa, tạo sự tin cậy'}

Trả về JSON thuần túy:
{
  "title": "Tiêu đề thông điệp",
  "message": "Nội dung tin nhắn chuẩn định dạng kênh gửi, đầy đủ lời chào và CTA",
  "suggestedSendTime": "Khung giờ vàng gửi tin",
  "estimatedConversionRate": "Ước lượng tỷ lệ phản hồi dự kiến"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.4 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Campaign Error:", err);
      res.status(500).json({ error: "Lỗi tạo nội dung chiến dịch", details: err.message });
    }
  });

  // AI Empathy Care & Complaint Resolution Assistant
  app.post("/api/ai/generate-care-response", async (req, res) => {
    try {
      const { complaintText, category, patientName, department, priority } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          empatheticOpening: `Kính gửi Quý khách ${patientName || 'Nguyễn Văn A'}, Ban Giám đốc và Phòng Chăm Sóc Khách Hàng VitHospital đã nhận được phản ánh của Quý khách về sự việc "${category}". Chúng tôi chân thành xin lỗi vì trải nghiệm chưa trọn vẹn này.`,
          explanation: `Ngay sau khi tiếp nhận thông tin, Trưởng phòng CSKH đã phối hợp trực tiếp với đại diện ${department || 'Khoa Khám Bệnh'} để rà soát lại toàn bộ quy trình tiếp đón và phục vụ.`,
          actionTaken: `Hệ thống đã điều chỉnh quy trình luân chuyển hồ sơ để loại bỏ thời gian chờ quá tải, đồng thời nhắc nhở toàn bộ ekip ca trực nâng cao tinh thần phụng sự y đức.`,
          proposedResolution: `VitHospital xin phép gửi tặng Quý khách một Voucher Khám Chuyên Khoa/Chăm sóc phục hồi trị giá 500,000đ và ưu tiên phân luồng phòng khám VIP không chờ đợi trong tất cả các lần thăm khám tiếp theo.`,
          fullLetterDraft: `Kính gửi Quý khách ${patientName || 'Nguyễn Văn A'},\n\nBan Giám đốc và Phòng Chăm Sóc Khách Hàng VitHospital trân trọng cảm ơn Quý khách đã đóng góp ý kiến quý báu. Chúng tôi chân thành gửi lời xin lỗi sâu sắc về sự bất tiện mà Quý khách đã gặp phải tại ${department || 'Phòng khám'}.\n\nSau khi rà soát, chúng tôi đã tiến hành chấn chỉnh quy trình và xử lý dứt điểm nguyên nhân gây trễ. Để tri ân sự thông cảm của Quý khách, VitHospital trân trọng gửi tặng Quý khách Voucher ưu đãi y tế và mã định danh Chăm sóc Ưu tiên VIP.\n\nKính chúc Quý khách và gia đình luôn dồi dào sức khỏe!\nTrân trọng,\nPhòng Chăm Sóc Khách Hàng & Trải Nghiệm Bệnh Nhân - VitHospital Healthcare.`
        });
      }

      const prompt = `Bạn là Trưởng Phòng Chăm Sóc Khách Hàng & Trải Nghiệm Bệnh Nhân cao cấp của hệ thống Y tế VitHospital (Việt Nam).
Hãy soạn một phản hồi chuyên nghiệp, ân cần, thấu cảm y khoa (Medical Empathy) và đề xuất giải pháp xử lý thỏa đáng cho khiếu nại của bệnh nhân sau:
- Tên bệnh nhân: ${patientName}
- Phân loại khiếu nại: ${category}
- Mức độ ưu tiên/SLA: ${priority}
- Phòng ban liên quan: ${department}
- Nội dung phản ánh của bệnh nhân: "${complaintText}"

Nguyên tắc phản hồi:
1. Lắng nghe và thấu cảm sâu sắc, không đổ lỗi cho bệnh nhân.
2. Thể hiện tinh thần cầu thị và minh bạch quy trình y tế.
3. Đưa ra giải pháp khắc phục cụ thể và chính sách hỗ trợ/bảo đảm quyền lợi.

Trả về JSON thuần túy:
{
  "empatheticOpening": "Lời chào và mở đầu thấu cảm, xoa dịu cảm xúc",
  "explanation": "Giải thích nguyên nhân một cách cầu thị, chuẩn mực",
  "actionTaken": "Các biện pháp khắc phục nội bộ đã triển khai ngay",
  "proposedResolution": "Giải pháp giải quyết và chính sách hỗ trợ bệnh nhân",
  "fullLetterDraft": "Toàn văn thư/tin nhắn phản hồi hoàn chỉnh, trang trọng, ấm áp để gửi cho bệnh nhân"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.3 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Empathy Care Error:", err);
      res.status(500).json({ error: "Lỗi tạo phản hồi CSKH AI", details: err.message });
    }
  });

  // AI Omnichannel Chatbot FAQ & Auto-Ticket Escalation
  app.post("/api/ai/chatbot-faq-reply", async (req, res) => {
    try {
      const { message, channel, patientName, patientPhone } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        const msgLower = (message || '').toLowerCase();
        let shouldEscalate = false;
        let reply = "Dạ chào Quý khách! VitHospital có thể hỗ trợ Quý khách đặt lịch khám, hướng dẫn chuẩn bị xét nghiệm, tra cứu viện phí và bảo lãnh bảo hiểm ạ.";
        let category: any = "Góp ý dịch vụ";
        let priority: any = "Trung bình (SLA 8h)";

        if (msgLower.includes("giá") || msgLower.includes("chi phí") || msgLower.includes("bao nhiêu tiền")) {
          reply = "Dạ, chi phí khám lâm sàng chuyên khoa tại VitHospital là 350.000đ - 500.000đ (Bác sĩ Trưởng khoa). Gói Tầm soát sức khỏe Tổng quát từ 2.800.000đ. Quý khách có muốn đặt lịch hẹn ngay không ạ?";
        } else if (msgLower.includes("bảo hiểm") || msgLower.includes("bảo lãnh") || msgLower.includes("bhyt")) {
          reply = "Dạ, VitHospital liên kết bảo lãnh viện phí trực tiếp với hơn 25 công ty bảo hiểm tư nhân (Bảo Việt, PVI, PTI, Liberty, Insmart...) và tiếp nhận BHYT đúng tuyến/thông tuyến. Quý khách chỉ cần mang theo CCCD và Thẻ bảo hiểm cứng hoặc VssID ạ.";
        } else if (msgLower.includes("nhịn ăn") || msgLower.includes("xét nghiệm") || msgLower.includes("chuẩn bị")) {
          reply = "Dạ, đối với xét nghiệm máu (đường huyết, mỡ máu) và siêu âm bụng tổng quát, Quý khách vui lòng nhịn ăn sáng từ 6 - 8 tiếng, có thể uống một ít nước lọc tinh khiết ạ.";
        } else if (msgLower.includes("khiếu nại") || msgLower.includes("thái độ") || msgLower.includes("bực") || msgLower.includes("gặp nhân viên") || msgLower.includes("người thật") || msgLower.includes("chưa hài lòng")) {
          shouldEscalate = true;
          category = msgLower.includes("thái độ") ? "Khiếu nại thái độ" : "Tư vấn kết quả chuyên môn";
          priority = "Cao (SLA 2h)";
          reply = `Dạ em đã hiểu vấn đề của Quý khách. Em đã chuyển tiếp yêu cầu và tự động tạo Phiếu Tiếp Nhận Khẩn Cấp gửi đến Đội ngũ Chăm Sóc Khách Hàng & Điều Dưỡng Trưởng. Nhân sự phụ trách sẽ gọi điện trực tiếp đến số điện thoại của Quý khách trong vòng 15 - 30 phút để hỗ trợ giải quyết dứt điểm ạ.`;
        }

        return res.json({
          reply,
          shouldEscalate,
          ticketData: shouldEscalate ? {
            category,
            priority,
            department: "Phòng CSKH & Trải Nghiệm Bệnh Nhân",
            reason: `Bệnh nhân cần hỗ trợ trực tiếp qua kênh ${channel || 'Zalo OA'}: "${message}"`
          } : null
        });
      }

      const prompt = `Bạn là Trợ Lý Chatbot Y Tế Thông Minh Đa Kênh của Hệ Thống Bệnh Viện & Phòng Khám Quốc Tế VitHospital (hoạt động trên ${channel || 'Zalo OA / Messenger'}).
Dưới đây là câu hỏi từ bệnh nhân:
- Tên khách/bệnh nhân: ${patientName || 'Khách hàng'}
- Tin nhắn gửi đến: "${message}"

Nhiệm vụ của bạn:
1. Trả lời ngắn gọn, lịch sự, ân cần, chuẩn mực y khoa, chuẩn ngôn ngữ chat tiếng Việt.
2. Cung cấp thông tin chuẩn xác về dịch vụ khám, giờ mở cửa (7:30 - 20:00 hàng ngày), bảo lãnh viện phí, chuẩn bị xét nghiệm.
3. QUAN TRỌNG: Phát hiện các trường hợp CẦN TỰ ĐỘNG TẠO TICKET CHĂM SÓC KHÁCH HÀNG (shouldEscalate = true) khi bệnh nhân khiếu nại, bức xúc, cần gặp bác sĩ/người thật.

Trả về JSON thuần túy:
{
  "reply": "Nội dung tin nhắn chatbot phản hồi lại bệnh nhân",
  "shouldEscalate": boolean,
  "ticketData": {
    "category": "Khiếu nại thái độ" | "Thắc mắc viện phí & bảo lãnh" | "Tư vấn kết quả chuyên môn" | "Thời gian chờ đợi" | "Hỗ trợ thủ tục BHYT" | "Góp ý dịch vụ",
    "priority": "Khẩn cấp (SLA 30p)" | "Cao (SLA 2h)" | "Trung bình (SLA 8h)",
    "department": "Khoa / Phòng ban phụ trách",
    "reason": "Tóm tắt lý do tạo ticket cho nhân viên CSKH"
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.2 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Chatbot FAQ Error:", err);
      res.status(500).json({ error: "Lỗi chatbot FAQ", details: err.message });
    }
  });

  // =========================================================================
  // 14. EXPORT ENGINE (CSV / EXCEL UTF-8 WITH BOM)
  // =========================================================================
  app.post("/api/export/csv", (req, res) => {
    try {
      const { type, data } = req.body;
      let filename = `VitHospital_Export_${type}_${Date.now()}.csv`;
      let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Vietnamese characters

      if (type === 'patients') {
        csvContent += "Mã BN,Họ Và Tên,Số Điện Thoại,Email,Giới Tính,Ngày Sinh,CMND/CCCD,Địa Chỉ,Nhóm Máu,Mức Nguy Cơ,Hạng Thẻ,Tổng Chi Tiêu (VNĐ)\n";
        (data || dbStore.patients).forEach((row: any) => {
          csvContent += `"${row.pid}","${row.name}","${row.phone}","${row.email||''}","${row.gender}","${row.dob}","${row.idCard||''}","${(row.address||'').replace(/"/g, '""')}","${row.bloodType||''}","${row.riskLevel}","${row.loyaltyTier}","${row.totalSpent}"\n`;
        });
      } else if (type === 'appointments') {
        csvContent += "Mã Khám,Số STT,Bệnh Nhân,Số Điện Thoại,Bác Sĩ,Chuyên Khoa,Chi Nhánh,Ngày Khám,Giờ Khám,Trạng Thái,Loại Khám,Kênh Đặt\n";
        (data || dbStore.appointments).forEach((row: any) => {
          csvContent += `"${row.id}","${row.queueNumber||''}","${row.patientName}","${row.patientPhone}","${row.doctorName}","${row.department}","${row.branchId}","${row.date}","${row.timeSlot}","${row.status}","${row.type}","${row.channel}"\n`;
        });
      } else if (type === 'tickets') {
        csvContent += "Mã Phiếu,Bệnh Nhân,Số Điện Thoại,Phân Loại Khiếu Nại,Mức Độ Ưu Tiên (SLA),Trạng Thái,Phòng Ban,Nhân Sự CSKH,Hạn SLA,Quá Hạn,Nội Dung\n";
        (data || dbStore.tickets).forEach((row: any) => {
          csvContent += `"${row.ticketCode}","${row.patientName}","${row.patientPhone}","${row.category}","${row.priority}","${row.status}","${row.department}","${row.assignedStaff}","${row.slaDeadline}","${row.isOverdue ? 'Có' : 'Không'}","${(row.description||'').replace(/"/g, '""')}"\n`;
        });
      } else if (type === 'follow_ups') {
        csvContent += "Mã Ca,Bệnh Nhân,Số Điện Thoại,Ngày Khám,Chẩn Đoán Sau Khám,Ghi Chú Bác Sĩ Dặn Dò,Trạng Thái Gọi,Tiến Triển Triệu Chứng,Nhân Sự CSKH,Thời Gian Hẹn\n";
        (data || dbStore.followUps).forEach((row: any) => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.visitDate}","${(row.primaryDiagnosis||'').replace(/"/g, '""')}","${(row.doctorCareNotes||'').replace(/"/g, '""')}","${row.callStatus}","${row.symptomProgression||''}","${row.assignedStaff}","${row.scheduledTime}"\n`;
        });
      } else if (type === 'recalls') {
        csvContent += "Mã Nhắc,Bệnh Nhân,Số Điện Thoại,Nhóm Bệnh,Chẩn Đoán,Lý Do Nhắc Tái Khám,Chu Kỳ (Ngày),Ngày Hạn,Quá Hạn (Ngày),Bác Sĩ Chỉ Định,Nhân Sự CSKH,Trạng Thái\n";
        (data || dbStore.recalls).forEach((row: any) => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.conditionCategory}","${(row.primaryDiagnosis||'').replace(/"/g, '""')}","${(row.recallReason||'').replace(/"/g, '""')}","${row.recallIntervalDays}","${row.dueDate}","${row.daysOverdue}","${row.assignedDoctor}","${row.assignedStaff}","${row.status}"\n`;
        });
      } else if (type === 'csat_feedbacks') {
        csvContent += "Mã Đánh Giá,Bệnh Nhân,Ngày Khám,Bác Sĩ,Chuyên Khoa,Điểm Sao (1-5),Điểm NPS (0-10),Cảm Xúc,Nội Dung Đóng Góp\n";
        (data || dbStore.csatFeedbacks).forEach((row: any) => {
          csvContent += `"${row.id}","${row.patientName}","${row.visitDate}","${row.doctorName}","${row.department}","${row.rating}","${row.npsScore}","${row.sentiment}","${(row.comment||'').replace(/"/g, '""')}"\n`;
        });
      } else if (type === 'invoices') {
        csvContent += "Mã Hóa Đơn,Bệnh Nhân,Số Điện Thoại,Chuyên Khoa,Tổng Tiền Gốc,Bảo Hiểm Trừ,Giảm Giá,Bệnh Nhân Trả,Trạng Thái,Phương Thức,Ngày Tạo\n";
        (data || dbStore.invoices).forEach((row: any) => {
          csvContent += `"${row.invoiceCode}","${row.patientName}","${row.patientPhone}","${row.department}","${row.subtotal}","${row.insuranceDeduction}","${row.discount}","${row.patientPayable}","${row.status}","${row.paymentMethod||''}","${row.createdAt}"\n`;
        });
      } else {
        csvContent += "ID,Data\n";
        (data || []).forEach((row: any) => {
          csvContent += `"${row.id}","${JSON.stringify(row).replace(/"/g, '""')}"\n`;
        });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi xuất file CSV", details: e.message });
    }
  });

  // =========================================================================
  // 15. VITE SPA MIDDLEWARE / STATIC ASSETS
  // =========================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`VitHospital Healthcare Management Server running on port ${PORT}`);
    console.log(`Live Backend Endpoints ready on http://0.0.0.0:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer().catch(error => {
  console.error('VitCRM startup failed:', error);
  process.exit(1);
});
