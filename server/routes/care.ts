import type { Express } from 'express';
import { dbStore, SupportTicketRecord, AutoRecallRecord, CsatFeedbackRecord, AppointmentRecord } from '../store';
import { requirePerm } from '../rbac';
import { pageOf } from '../http-util';

/** Customer care: support tickets (SLA), D+3 follow-up calls, auto-recall, CSAT/NPS. */
export function registerCareRoutes(app: Express): void {
  // --- Support tickets ---
  app.get('/api/tickets', (req, res) => {
    const { status, priority, department, isOverdue } = req.query;
    let filtered = [...dbStore.tickets];

    if (status && typeof status === 'string') filtered = filtered.filter(t => t.status === status);
    if (priority && typeof priority === 'string') filtered = filtered.filter(t => t.priority === priority);
    if (department && typeof department === 'string') filtered = filtered.filter(t => t.department === department);
    if (isOverdue !== undefined) filtered = filtered.filter(t => t.isOverdue === (isOverdue === 'true'));

    const p = pageOf(filtered, req.query);
    res.json({ tickets: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.post('/api/tickets', requirePerm('canManageTickets'), (req, res) => {
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
      res.status(500).json({ error: 'Lỗi tạo phiếu khiếu nại SLA', details: e.message });
    }
  });

  app.put('/api/tickets/:id', requirePerm('canManageTickets'), (req, res) => {
    const idx = dbStore.tickets.findIndex(t => t.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu hỗ trợ' });
    }

    const updated = { ...dbStore.tickets[idx], ...req.body };

    if (req.body.status === 'Đã giải quyết' || req.body.status === 'Đã đóng') {
      updated.resolvedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    }

    dbStore.tickets[idx] = updated;
    res.json({ success: true, ticket: updated });
  });

  // --- Follow-up calls (D+3) ---
  app.get('/api/follow-ups', (req, res) => {
    const { status, assignedStaff } = req.query;
    let filtered = [...dbStore.followUps];

    if (status && typeof status === 'string') filtered = filtered.filter(f => f.callStatus === status);
    if (assignedStaff && typeof assignedStaff === 'string') filtered = filtered.filter(f => f.assignedStaff === assignedStaff);

    const p = pageOf(filtered, req.query);
    res.json({ followUps: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.put('/api/follow-ups/:id', requirePerm('canManageTickets'), (req, res) => {
    const idx = dbStore.followUps.findIndex(f => f.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc sau khám' });
    }

    dbStore.followUps[idx] = { ...dbStore.followUps[idx], ...req.body };
    res.json({ success: true, followUp: dbStore.followUps[idx] });
  });

  // --- Auto-recall ---
  app.get('/api/recalls', (req, res) => {
    const { category, status } = req.query;
    let filtered = [...dbStore.recalls];

    if (category && typeof category === 'string') filtered = filtered.filter(r => r.conditionCategory.includes(category));
    if (status && typeof status === 'string') filtered = filtered.filter(r => r.status === status);

    const p = pageOf(filtered, req.query);
    res.json({ recalls: p.page, total: p.total, limit: p.limit, offset: p.offset });
  });

  app.post('/api/recalls', (req, res) => {
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

  app.post('/api/recalls/:id/convert-to-appointment', (req, res) => {
    const recall = dbStore.recalls.find(r => r.id === req.params.id);
    if (!recall) {
      return res.status(404).json({ error: 'Không tìm thấy lịch nhắc tái khám' });
    }

    const newApt: AppointmentRecord = {
      id: `apt-${Date.now()}`,
      queueNumber: `TK-${Math.floor(100 + Math.random() * 900)}`,
      patientId: recall.patientId,
      patientName: recall.patientName,
      patientPhone: recall.patientPhone,
      doctorId: 'doc-1',
      doctorName: recall.assignedDoctor,
      department: recall.conditionCategory.includes('Tim Mạch') ? 'Khoa Tim Mạch & Huyết Áp' : recall.conditionCategory.includes('Da Liễu') ? 'Viện Thẩm Mỹ & Da Liễu' : 'Khoa Khám Bệnh Đa Khoa',
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

  // --- CSAT / NPS ---
  app.get('/api/csat/feedbacks', (req, res) => {
    const { sentiment, department } = req.query;
    let filtered = [...dbStore.csatFeedbacks];

    if (sentiment && typeof sentiment === 'string') filtered = filtered.filter(c => c.sentiment === sentiment);
    if (department && typeof department === 'string') filtered = filtered.filter(c => c.department === department);

    const totalRatings = filtered.length;
    const avgRating = totalRatings > 0 ? (filtered.reduce((acc, c) => acc + c.rating, 0) / totalRatings).toFixed(1) : '5.0';
    const promoters = filtered.filter(c => c.npsScore >= 9).length;
    const detractors = filtered.filter(c => c.npsScore <= 6).length;
    const npsIndex = totalRatings > 0 ? Math.round(((promoters - detractors) / totalRatings) * 100) : 85;

    const p = pageOf(filtered, req.query);
    res.json({
      feedbacks: p.page,
      total: totalRatings, limit: p.limit, offset: p.offset,
      avgRating: Number(avgRating),
      npsIndex,
      promotersCount: promoters,
      detractorsCount: detractors
    });
  });

  app.post('/api/csat/submit', (req, res) => {
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
}
