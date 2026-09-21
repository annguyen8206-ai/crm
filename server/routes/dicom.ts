import type { Express } from 'express';
import { dbStore } from '../store';
import { verifyDicomBridgeAuth, orthancViewerUrl } from '../dicom';

/**
 * Machine-to-machine endpoints for the on-prem DICOM bridge (see dicom-bridge/).
 * Public routes (no staff bearer — the bridge runs unattended on a clinic PC),
 * guarded by DICOM_BRIDGE_SECRET instead. Unconfigured → 503, never silently open.
 */
export function registerDicomRoutes(app: Express): void {
  const requireBridgeAuth = (req: any, res: any, next: any) => {
    if (!process.env.DICOM_BRIDGE_SECRET) {
      return res.status(503).json({ error: 'Chưa cấu hình DICOM_BRIDGE_SECRET' });
    }
    if (!verifyDicomBridgeAuth(req.headers, req.query)) {
      return res.status(401).json({ error: 'Sai hoặc thiếu khóa bridge DICOM' });
    }
    next();
  };

  // Worklist items the bridge hasn't written to Orthanc yet.
  app.get('/api/dicom/worklist/pending', requireBridgeAuth, (req, res) => {
    const items = dbStore.appointments
      .filter(a => a.accessionNumber && a.dicomStatus === 'pending')
      .map(a => {
        const patient = dbStore.patients.find(p => p.id === a.patientId);
        return {
          appointmentId: a.id,
          accessionNumber: a.accessionNumber,
          scheduledDate: a.date,
          scheduledTime: a.timeSlot,
          modality: a.department,
          patientId: patient?.pid || a.patientId,
          patientName: patient?.name || a.patientName,
          patientSex: patient?.gender === 'Nam' ? 'M' : patient?.gender === 'Nữ' ? 'F' : 'O',
          patientBirthDate: patient?.dob || '',
          referringDoctor: a.doctorName,
        };
      });
    res.json({ items });
  });

  // Bridge marks an item as written into Orthanc's worklist folder.
  app.post('/api/dicom/worklist/:appointmentId/ack', requireBridgeAuth, (req, res) => {
    const apt = dbStore.appointments.find(a => a.id === req.params.appointmentId);
    if (!apt) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    apt.dicomStatus = 'worklist_sent';
    res.json({ success: true });
  });

  // Orthanc's OnStoredInstance hook (via the bridge) reports a finished study.
  app.post('/api/dicom/webhook', requireBridgeAuth, (req, res) => {
    const { accessionNumber, studyInstanceUid, orthancStudyId, instanceCount } = req.body || {};
    if (!accessionNumber || !studyInstanceUid) {
      return res.status(400).json({ error: 'Cần accessionNumber và studyInstanceUid' });
    }
    const apt = dbStore.appointments.find(a => a.accessionNumber === accessionNumber);
    if (!apt) return res.status(404).json({ error: `Không tìm thấy lịch hẹn cho accessionNumber ${accessionNumber}` });
    apt.dicomStudyUid = String(studyInstanceUid);
    apt.orthancStudyId = orthancStudyId ? String(orthancStudyId) : apt.orthancStudyId;
    apt.dicomInstanceCount = Number(instanceCount) || apt.dicomInstanceCount;
    apt.dicomStatus = 'completed';
    apt.dicomStoredAt = new Date().toISOString();
    dbStore.addAuditLog('dicom-bridge', 'Bridge DICOM', 'System', 'DICOM_STUDY_STORED', 'Siêu âm',
      `${accessionNumber} → ${apt.patientName} (${apt.id})`);
    res.json({ success: true, appointmentId: apt.id, viewerUrl: orthancViewerUrl(String(studyInstanceUid)) });
  });
}
