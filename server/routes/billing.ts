import type { Express } from 'express';
import { dbStore, InvoiceRecord } from '../store';
import { vietQrBankInfo } from '../integrations';
import { hasPerm } from '../rbac';
import { pageOf } from '../http-util';

/** Invoicing, VietQR payment, and the executive analytics dashboard. */
export function registerBillingRoutes(app: Express): void {
  app.get('/api/invoices', (req, res) => {
    const { status, patientId, branchId } = req.query;
    let filtered = [...dbStore.invoices];

    if (status && typeof status === 'string') filtered = filtered.filter(i => i.status === status);
    if (patientId && typeof patientId === 'string') filtered = filtered.filter(i => i.patientId === patientId);
    if (branchId && typeof branchId === 'string') filtered = filtered.filter(i => i.branchId === branchId);

    const totalCollected = filtered.filter(i => i.status === 'Đã thanh toán').reduce((acc, curr) => acc + curr.patientPayable, 0);
    const totalPending = filtered.filter(i => i.status === 'Chờ thanh toán').reduce((acc, curr) => acc + curr.patientPayable, 0);

    const p = pageOf(filtered, req.query);
    res.json({
      invoices: p.page,
      total: p.total, limit: p.limit, offset: p.offset,
      totalCollected,
      totalPending
    });
  });

  app.post('/api/invoices', (req, res) => {
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
  app.post('/api/payments/vietqr', (req, res) => {
    const bankDefaults = vietQrBankInfo();
    const { amount, invoiceCode, patientName,
      bankCode = bankDefaults.bankCode,
      accountNumber = bankDefaults.accountNumber,
      accountName = bankDefaults.accountName } = req.body;
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
  app.post('/api/invoices/:id/pay', (req, res) => {
    const { paymentMethod = 'VietQR', transactionRef } = req.body;
    const inv = dbStore.invoices.find(i => i.id === req.params.id);
    if (!inv) {
      return res.status(404).json({ error: 'Không tìm thấy hóa đơn' });
    }

    inv.status = 'Đã thanh toán';
    inv.paymentMethod = paymentMethod;
    inv.transactionRef = transactionRef || `TXN-${Date.now()}`;
    inv.paidAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    res.json({ success: true, invoice: inv, message: 'Đã xác nhận thanh toán viện phí thành công!' });
  });

  // =========================================================================
  // EXECUTIVE DASHBOARD ANALYTICS & KPIS
  // =========================================================================
  app.get('/api/analytics/dashboard', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const paidInvoices = dbStore.invoices.filter(i => i.status === 'Đã thanh toán');
    const totalRevenue = paidInvoices.reduce((a, c) => a + (c.patientPayable || 0), 0);
    const totalPatients = dbStore.patients.length;

    const openTickets = dbStore.tickets.filter(t => t.status === 'Mới tiếp nhận' || t.status === 'Đang xử lý').length;
    const closedTickets = dbStore.tickets.filter(t => t.status === 'Đã giải quyết' || t.status === 'Đã đóng').length;
    const slaRate = dbStore.tickets.length ? Math.round((closedTickets / dbStore.tickets.length) * 100) : 100;

    // Average wait = seenAt - checkedInAt across appointments that have both.
    const waits = dbStore.appointments
      .filter(a => a.checkedInAt && a.seenAt)
      .map(a => (new Date(a.seenAt!).getTime() - new Date(a.checkedInAt!).getTime()) / 60000)
      .filter(m => m >= 0 && m < 600);
    const averageWaitMinutes = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

    // RFM — Recency (days since last visit), Frequency (visits), Monetary (spent).
    const now = Date.now();
    const rfm = dbStore.patients.map(p => {
      const last = p.lastVisitDate ? new Date(p.lastVisitDate).getTime() : 0;
      const recencyDays = last ? Math.round((now - last) / 86400000) : 9999;
      return { id: p.id, name: p.name, recencyDays, frequency: p.totalVisits || 0, monetary: p.totalSpent || 0 };
    });
    const seg = (r: { recencyDays: number; frequency: number; monetary: number }) => {
      if (r.frequency >= 5 && r.recencyDays <= 120 && r.monetary >= 20_000_000) return 'VIP / Trung thành';
      if (r.recencyDays <= 90 && r.frequency >= 2) return 'Khách thường xuyên';
      if (r.recencyDays > 365) return 'Nguy cơ rời bỏ';
      if (r.frequency <= 1) return 'Khách mới';
      return 'Tiềm năng';
    };
    const rfmSegments: Record<string, number> = {};
    for (const r of rfm) rfmSegments[seg(r)] = (rfmSegments[seg(r)] || 0) + 1;

    const spends = dbStore.patients.map(p => p.totalSpent || 0).filter(v => v > 0);
    const avgClv = spends.length ? Math.round(spends.reduce((a, b) => a + b, 0) / spends.length) : 0;

    // Branch performance from real records.
    const byBranch = new Map<string, { patients: number; revenue: number }>();
    for (const p of dbStore.patients) {
      const b = byBranch.get(p.branchId) || { patients: 0, revenue: 0 };
      b.patients += 1;
      byBranch.set(p.branchId, b);
    }
    for (const inv of paidInvoices) {
      const b = byBranch.get(inv.branchId) || { patients: 0, revenue: 0 };
      b.revenue += inv.patientPayable || 0;
      byBranch.set(inv.branchId, b);
    }
    const branchPerformance = [...byBranch.entries()].map(([branchId, v]) => ({ branchId, ...v }));

    // Financial figures are only returned to roles with canViewFinancialBI.
    const seesFinance = hasPerm(req.authUser?.role, 'canViewFinancialBI');
    const kpis: Record<string, unknown> = {
      totalPatients,
      totalAppointments: dbStore.appointments.length,
      todayAppointments: dbStore.appointments.filter(a => a.date === today).length,
      checkedInToday: dbStore.appointments.filter(a => a.date === today && a.checkedInAt).length,
      openTickets,
      resolvedTickets: closedTickets,
      slaRate: `${slaRate}%`,
      overdueRecalls: dbStore.recalls.filter(r => (r.daysOverdue || 0) > 0).length,
      paidInvoices: paidInvoices.length,
      averageWaitTimeMinutes: averageWaitMinutes,
    };
    if (seesFinance) {
      kpis.totalRevenue = totalRevenue;
      kpis.revenueFormatted = `${(totalRevenue / 1_000_000).toFixed(1)} Triệu VNĐ`;
      kpis.pendingInvoiceValue = dbStore.invoices.filter(i => i.status === 'Chờ thanh toán').reduce((a, c) => a + (c.patientPayable || 0), 0);
      kpis.avgCustomerLifetimeValue = avgClv;
    }

    res.json({
      kpis,
      rfmSegments,
      branchPerformance: seesFinance ? branchPerformance : branchPerformance.map(({ branchId, patients }) => ({ branchId, patients })),
      financeVisible: seesFinance,
    });
  });
}
