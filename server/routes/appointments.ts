import type { Express } from 'express';
import { dbStore, AppointmentRecord } from '../store';
import { pageOf, queueLookupUrl, queueQrUrl } from '../http-util';

/** Appointment scheduling, status, e-queue check-in. */
export function registerAppointmentRoutes(app: Express): void {
  app.get('/api/appointments', (req, res) => {
    try {
      const { date, branchId, status, department, doctorId, patientId } = req.query;
      let filtered = [...dbStore.appointments];

      if (date && typeof date === 'string') filtered = filtered.filter(a => a.date === date);
      if (branchId && branchId !== 'ALL' && typeof branchId === 'string') filtered = filtered.filter(a => a.branchId === branchId);
      if (status && typeof status === 'string') filtered = filtered.filter(a => a.status === status);
      if (department && typeof department === 'string') filtered = filtered.filter(a => a.department === department);
      if (doctorId && typeof doctorId === 'string') filtered = filtered.filter(a => a.doctorId === doctorId);
      if (patientId && typeof patientId === 'string') filtered = filtered.filter(a => a.patientId === patientId);

      const p = pageOf(filtered, req.query);
      res.json({ appointments: p.page, total: p.total, limit: p.limit, offset: p.offset });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi tải danh sách lịch hẹn', details: e.message });
    }
  });

  app.post('/api/appointments', (req, res) => {
    try {
      const data = req.body;
      if (!data.patientName || !data.date || !data.department) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: tên bệnh nhân, ngày khám, chuyên khoa' });
      }

      const queueLetter = data.department.includes('Tim Mạch') ? 'A' : data.department.includes('Da Liễu') ? 'D' : data.department.includes('Sản') ? 'S' : 'B';
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
      res.status(500).json({ error: 'Lỗi đặt lịch hẹn', details: e.message });
    }
  });

  app.put('/api/appointments/:id/status', (req, res) => {
    const { status, notes } = req.body;
    const apt = dbStore.appointments.find(a => a.id === req.params.id);
    if (!apt) {
      return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    }

    apt.status = status;
    if (notes) apt.notes = notes;
    if (status === 'Đang khám' && !apt.seenAt) apt.seenAt = new Date().toISOString();

    res.json({ success: true, appointment: apt });
  });

  // Check-in: assign an electronic queue number (per branch + day) and print data.
  app.post('/api/appointments/:id/checkin', (req, res) => {
    const apt = dbStore.appointments.find(a => a.id === req.params.id);
    if (!apt) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });

    if (!apt.queueNumber) {
      const sameDayBranch = dbStore.appointments.filter(a => a.date === apt.date && a.branchId === apt.branchId && a.queueNumber);
      const prefix = (apt.branchId || 'A').replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase() || 'A';
      apt.queueNumber = `${prefix}-${String(sameDayBranch.length + 1).padStart(3, '0')}`;
    }
    apt.status = 'Đã tiếp đón';
    apt.checkedInAt = new Date().toISOString();

    res.json({
      success: true,
      appointment: apt,
      ticket: {
        queueNumber: apt.queueNumber,
        patientName: apt.patientName,
        department: apt.department,
        doctorName: apt.doctorName,
        date: apt.date,
        timeSlot: apt.timeSlot,
        lookupUrl: queueLookupUrl(apt.queueNumber),
        qrUrl: queueQrUrl(apt.queueNumber)
      }
    });
  });

  app.put('/api/appointments/:id', (req, res) => {
    const idx = dbStore.appointments.findIndex(a => a.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    }

    dbStore.appointments[idx] = {
      ...dbStore.appointments[idx],
      ...req.body,
      id: dbStore.appointments[idx].id
    };

    res.json({ success: true, appointment: dbStore.appointments[idx] });
  });
}
