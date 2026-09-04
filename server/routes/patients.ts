import type { Express } from 'express';
import { dbStore, PatientRecord } from '../store';
import { requirePerm } from '../rbac';
import { recordAudit } from '../audit';
import { requireAdmin } from '../http-util';

/** Patient 360 records + vitals. */
export function registerPatientRoutes(app: Express): void {
  app.get('/api/patients', (req, res) => {
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

      res.json({ patients: paginated, total, limit: Number(limit), offset: Number(offset) });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi tải danh sách bệnh nhân', details: e.message });
    }
  });

  app.get('/api/patients/:id', (req, res) => {
    const patient = dbStore.patients.find(p => p.id === req.params.id || p.pid === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Không tìm thấy bệnh nhân' });
    }

    // PII access trail (Nghị định 13/2023): who opened which patient record.
    recordAudit({
      userId: req.authUser?.id || '', userName: req.authUser?.name || '', role: req.authUser?.role || '',
      action: 'PATIENT_VIEW', module: 'Hồ sơ 360', details: `${patient.pid} · ${patient.name}`, ip: req.ip,
    });

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

  app.post('/api/patients', requirePerm('canManageAppointments', 'canEditClinicalEMR'), (req, res) => {
    try {
      const data = req.body;
      if (!data.name || !data.phone) {
        return res.status(400).json({ error: 'Tên và số điện thoại là bắt buộc' });
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
      res.status(500).json({ error: 'Lỗi tạo hồ sơ bệnh nhân', details: e.message });
    }
  });

  app.put('/api/patients/:id', (req, res) => {
    const idx = dbStore.patients.findIndex(p => p.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Không tìm thấy bệnh nhân' });
    }

    dbStore.patients[idx] = {
      ...dbStore.patients[idx],
      ...req.body,
      id: dbStore.patients[idx].id // Preserve ID
    };

    res.json({ success: true, patient: dbStore.patients[idx] });
  });

  app.delete('/api/patients/:id', requireAdmin, (req, res) => {
    const idx = dbStore.patients.findIndex(p => p.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Không tìm thấy bệnh nhân' });
    }
    const removed = dbStore.patients.splice(idx, 1);
    res.json({ success: true, message: `Đã xóa bệnh nhân ${removed[0].name}` });
  });

  // Add Vital Signs
  app.post('/api/patients/:id/vitals', requirePerm('canEditClinicalEMR', 'canManageAppointments'), (req, res) => {
    const patient = dbStore.patients.find(p => p.id === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Không tìm thấy bệnh nhân' });
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
}
