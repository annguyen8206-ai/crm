import type { AppointmentRecord } from './store';

/**
 * DICOM modality worklist integration (e.g. cardiac ultrasound).
 *
 * VitCRM never speaks DICOM directly — an on-prem bridge (same LAN as the
 * modality, see dicom-bridge/) polls GET /api/dicom/worklist/pending, writes
 * a DICOM worklist (.wl) file for Orthanc's Worklist plugin, then the
 * ultrasound queries Orthanc via C-FIND and stores results back to Orthanc
 * via C-STORE. Orthanc's OnStoredInstance Lua hook then POSTs
 * /api/dicom/webhook so the result links back to the right appointment via
 * Accession Number.
 *
 *   DICOM_DEPARTMENTS     comma list of `department` values that get an
 *                         Accession Number + worklist item on booking
 *                         (default: "Siêu âm tim thai,Siêu âm tim nhi")
 *   DICOM_BRIDGE_SECRET   shared secret the on-prem bridge sends as
 *                         `Authorization: Bearer <secret>` (or
 *                         x-bridge-secret / ?secret=)
 *   ORTHANC_VIEWER_URL    base URL of the OHIF/Orthanc viewer reachable by
 *                         staff, e.g. https://pacs.phongkham.vn/ohif/viewer
 *                         — the "Xem kết quả siêu âm" link appends
 *                         ?StudyInstanceUIDs=<uid>
 */

export function dicomDepartments(): string[] {
  const raw = process.env.DICOM_DEPARTMENTS || 'Siêu âm tim thai,Siêu âm tim nhi';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function isDicomDepartment(department: string): boolean {
  return dicomDepartments().some(d => d.toLowerCase() === (department || '').toLowerCase());
}

let accessionCounter = 0;

/** `ACC` + date (no dashes) + a time-based sequence + an in-process counter — unique
 *  even for two calls in the same millisecond. */
export function generateAccessionNumber(date: string): string {
  const datePart = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  accessionCounter = (accessionCounter + 1) % 1000;
  const seq = String(Date.now()).slice(-7) + String(accessionCounter).padStart(3, '0');
  return `ACC${datePart}${seq}`;
}

/** Assigns an Accession Number + dicomStatus='pending' in place if the appointment's
 *  department is configured for DICOM worklist and it doesn't have one yet. */
export function maybeCreateWorklistItem(apt: AppointmentRecord): void {
  if (apt.accessionNumber) return;
  if (!isDicomDepartment(apt.department)) return;
  apt.accessionNumber = generateAccessionNumber(apt.date);
  apt.dicomStatus = 'pending';
}

export function verifyDicomBridgeAuth(headers: Record<string, unknown>, query: Record<string, unknown>): boolean {
  const secret = process.env.DICOM_BRIDGE_SECRET;
  if (!secret) return false;
  const bearer = String(headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const candidates = [bearer, headers['x-bridge-secret'], query['secret']]
    .map(v => (v == null ? '' : String(v)));
  return candidates.some(c => c.length > 0 && c === secret);
}

export function orthancViewerUrl(studyInstanceUid: string): string | null {
  const base = process.env.ORTHANC_VIEWER_URL;
  if (!base || !studyInstanceUid) return null;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}StudyInstanceUIDs=${encodeURIComponent(studyInstanceUid)}`;
}
