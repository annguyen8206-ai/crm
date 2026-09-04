import type { Express } from 'express';
import { dbStore, PatientRecord } from '../store';
import { persistStore } from '../database';
import { emitChange } from '../events';
import { requirePerm } from '../rbac';
import { recordAudit } from '../audit';
import { requireAdmin, digitsOnly } from '../http-util';

const uniq = <T,>(a: T[]) => [...new Set(a)];

/** Reassign every record that points at `fromId` to `toId`. Returns a per-collection count. */
function repointPatientRefs(fromId: string, toId: string): Record<string, number> {
  const moved: Record<string, number> = {};
  const bump = (k: string) => { moved[k] = (moved[k] || 0) + 1; };
  for (const a of dbStore.appointments) if (a.patientId === fromId) { a.patientId = toId; bump('appointments'); }
  for (const t of dbStore.tickets)      if (t.patientId === fromId) { t.patientId = toId; bump('tickets'); }
  for (const i of dbStore.invoices)     if (i.patientId === fromId) { i.patientId = toId; bump('invoices'); }
  for (const r of dbStore.recalls)      if (r.patientId === fromId) { r.patientId = toId; bump('recalls'); }
  for (const z of dbStore.znsLogs)      if (z.patientId === fromId) { z.patientId = toId; bump('znsLogs'); }
  for (const v of dbStore.voipCalls)    if (v.patientId === fromId) { v.patientId = toId; bump('voipCalls'); }
  for (const c of dbStore.csatFeedbacks) if (c.patientId === fromId) { c.patientId = toId; bump('csatFeedbacks'); }
  for (const f of dbStore.followUps)    if (f.patientId === fromId) { f.patientId = toId; bump('followUps'); }
  for (const cv of dbStore.conversations) if (cv.patientId === fromId) { cv.patientId = toId; bump('conversations'); }
  return moved;
}

/** Fill blanks on `keep` from `merge`, union arrays, sum visit/spend totals. */
function mergePatientFields(keep: PatientRecord, merge: PatientRecord): void {
  const fillIfBlank = (k: keyof PatientRecord) => { if (!keep[k] && merge[k]) (keep as any)[k] = merge[k]; };
  (['email', 'idCard', 'address', 'dob', 'gender', 'bloodType', 'insuranceCardNumber',
    'insuranceProvider', 'insuranceExpiry', 'medicalHistoryNotes', 'emrLink'] as Array<keyof PatientRecord>).forEach(fillIfBlank);

  keep.allergies = uniq([...(keep.allergies || []), ...(merge.allergies || [])].filter(x => x && x !== 'Không có tiền sử dị ứng'));
  keep.chronicConditions = uniq([...(keep.chronicConditions || []), ...(merge.chronicConditions || [])]);
  keep.tags = uniq([...(keep.tags || []), ...(merge.tags || [])]);
  keep.totalVisits = (keep.totalVisits || 0) + (merge.totalVisits || 0);
  keep.totalSpent = (keep.totalSpent || 0) + (merge.totalSpent || 0);
  keep.loyaltyPoints = Math.max(keep.loyaltyPoints || 0, merge.loyaltyPoints || 0);
  if (merge.firstVisitDate && (!keep.firstVisitDate || merge.firstVisitDate < keep.firstVisitDate)) keep.firstVisitDate = merge.firstVisitDate;
  if (merge.lastVisitDate && (!keep.lastVisitDate || merge.lastVisitDate > keep.lastVisitDate)) keep.lastVisitDate = merge.lastVisitDate;

  const seenDates = new Set((keep.vitalsHistory || []).map(v => v.date));
  keep.vitalsHistory = [...(keep.vitalsHistory || []), ...(merge.vitalsHistory || []).filter(v => !seenDates.has(v.date))]
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!keep.emergencyContact?.phone && merge.emergencyContact?.phone) keep.emergencyContact = merge.emergencyContact;
}

/** Patient 360 records + vitals + dedupe/merge. */
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

  // Likely-duplicate groups: same phone (last 9 digits) or same non-empty ID card.
  app.get('/api/patients/duplicates', (req, res) => {
    const groups = new Map<string, PatientRecord[]>();
    for (const p of dbStore.patients) {
      const keys: string[] = [];
      const ph = digitsOnly(p.phone).slice(-9);
      if (ph.length === 9) keys.push('ph:' + ph);
      if (p.idCard && p.idCard.trim().length >= 8) keys.push('id:' + p.idCard.trim());
      for (const k of keys) {
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(p);
      }
    }
    const dupes = [...groups.entries()]
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({
        key,
        matchedOn: key.startsWith('ph:') ? 'phone' : 'idCard',
        patients: arr
          .map(p => ({ id: p.id, pid: p.pid, name: p.name, phone: p.phone, idCard: p.idCard,
            branchId: p.branchId, totalVisits: p.totalVisits, lastVisitDate: p.lastVisitDate,
            refs: dbStore.appointments.filter(a => a.patientId === p.id).length +
                  dbStore.invoices.filter(i => i.patientId === p.id).length +
                  dbStore.tickets.filter(t => t.patientId === p.id).length }))
          .sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0)),
      }));
    // De-dupe groups that share the exact same member set (phone+idCard both match).
    const seen = new Set<string>();
    const unique = dupes.filter(g => {
      const sig = g.patients.map(p => p.id).sort().join(',');
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
    res.json({ groups: unique, total: unique.length });
  });

  // Merge `mergeId` into `keepId` (admin only — destructive, audited).
  app.post('/api/patients/merge', requireAdmin, (req, res) => {
    const keepId = String(req.body?.keepId || '');
    const mergeId = String(req.body?.mergeId || '');
    if (!keepId || !mergeId || keepId === mergeId) {
      return res.status(400).json({ error: 'Cần keepId và mergeId khác nhau' });
    }
    const keep = dbStore.patients.find(p => p.id === keepId);
    const mIdx = dbStore.patients.findIndex(p => p.id === mergeId);
    if (!keep || mIdx < 0) return res.status(404).json({ error: 'Không tìm thấy một trong hai hồ sơ' });
    const merge = dbStore.patients[mIdx];

    const moved = repointPatientRefs(mergeId, keepId);
    mergePatientFields(keep, merge);
    dbStore.patients.splice(mIdx, 1);

    const totalMoved = Object.values(moved).reduce((a, b) => a + b, 0);
    recordAudit({
      userId: req.authUser?.id || '', userName: req.authUser?.name || '', role: req.authUser?.role || '',
      action: 'PATIENT_MERGE', module: 'Hồ sơ 360', ip: req.ip,
      details: `Gộp ${merge.pid} (${merge.name}) → ${keep.pid} (${keep.name}); dời ${totalMoved} bản ghi: ${JSON.stringify(moved)}`,
    });
    void persistStore();
    emitChange({ type: 'store', path: '/api/patients/merge', method: 'POST' });
    res.json({ success: true, patient: keep, moved, totalMoved });
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
