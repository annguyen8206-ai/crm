import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';
import { dbStore } from '../server/store';
import { isDicomDepartment, generateAccessionNumber, maybeCreateWorklistItem, orthancViewerUrl } from '../server/dicom';

describe('dicom helpers', () => {
  const saved = { dept: process.env.DICOM_DEPARTMENTS, viewer: process.env.ORTHANC_VIEWER_URL };
  afterEach(() => {
    if (saved.dept === undefined) delete process.env.DICOM_DEPARTMENTS; else process.env.DICOM_DEPARTMENTS = saved.dept;
    if (saved.viewer === undefined) delete process.env.ORTHANC_VIEWER_URL; else process.env.ORTHANC_VIEWER_URL = saved.viewer;
  });

  it('matches configured departments case-insensitively, defaults to the two cardiac ultrasound types', () => {
    delete process.env.DICOM_DEPARTMENTS;
    expect(isDicomDepartment('Siêu âm tim thai')).toBe(true);
    expect(isDicomDepartment('siêu âm tim thai')).toBe(true);
    expect(isDicomDepartment('Khoa Nội')).toBe(false);
  });

  it('generateAccessionNumber is date-prefixed and unique-ish', () => {
    const a = generateAccessionNumber('2026-09-21');
    const b = generateAccessionNumber('2026-09-21');
    expect(a).toMatch(/^ACC20260921\d+$/);
    expect(a).not.toBe(b);
  });

  it('maybeCreateWorklistItem assigns an accession number only for configured departments, once', () => {
    process.env.DICOM_DEPARTMENTS = 'Siêu âm tim thai';
    const apt: any = { department: 'Siêu âm tim thai', date: '2026-09-21' };
    maybeCreateWorklistItem(apt);
    expect(apt.accessionNumber).toMatch(/^ACC/);
    expect(apt.dicomStatus).toBe('pending');

    const already = apt.accessionNumber;
    maybeCreateWorklistItem(apt); // idempotent
    expect(apt.accessionNumber).toBe(already);

    const other: any = { department: 'Khoa Nội', date: '2026-09-21' };
    maybeCreateWorklistItem(other);
    expect(other.accessionNumber).toBeUndefined();
  });

  it('orthancViewerUrl is null when unconfigured, appends StudyInstanceUIDs otherwise', () => {
    delete process.env.ORTHANC_VIEWER_URL;
    expect(orthancViewerUrl('1.2.3')).toBeNull();
    process.env.ORTHANC_VIEWER_URL = 'https://pacs.example.vn/ohif/viewer';
    expect(orthancViewerUrl('1.2.3')).toBe('https://pacs.example.vn/ohif/viewer?StudyInstanceUIDs=1.2.3');
  });
});

describe('DICOM bridge routes', () => {
  let app: Express;
  beforeAll(async () => { app = await createApp({ serveClient: false }); });

  const saved = { secret: process.env.DICOM_BRIDGE_SECRET, dept: process.env.DICOM_DEPARTMENTS };
  beforeEach(() => {
    process.env.DICOM_BRIDGE_SECRET = 'test-bridge-secret';
    process.env.DICOM_DEPARTMENTS = 'Siêu âm tim thai';
    dbStore.appointments.length = 0;
    dbStore.patients.length = 0;
  });
  afterEach(() => {
    if (saved.secret === undefined) delete process.env.DICOM_BRIDGE_SECRET; else process.env.DICOM_BRIDGE_SECRET = saved.secret;
    if (saved.dept === undefined) delete process.env.DICOM_DEPARTMENTS; else process.env.DICOM_DEPARTMENTS = saved.dept;
  });

  it('rejects worklist/pending without the bridge secret', async () => {
    const res = await request(app).get('/api/dicom/worklist/pending');
    expect(res.status).toBe(401);
  });

  it('lists pending items, acks them, and the webhook links a completed study back by accessionNumber', async () => {
    dbStore.patients.push({ id: 'p1', pid: 'BN-1', name: 'Nguyễn Thị A', gender: 'Nữ', dob: '1995-01-01' } as any);
    const apt: any = {
      id: 'apt-1', patientId: 'p1', patientName: 'Nguyễn Thị A', department: 'Siêu âm tim thai',
      date: '2026-09-21', timeSlot: '09:00', doctorName: 'BS. B',
    };
    maybeCreateWorklistItem(apt);
    dbStore.appointments.push(apt);

    const pending = await request(app).get('/api/dicom/worklist/pending').set('Authorization', 'Bearer test-bridge-secret');
    expect(pending.status).toBe(200);
    expect(pending.body.items).toHaveLength(1);
    expect(pending.body.items[0].accessionNumber).toBe(apt.accessionNumber);
    expect(pending.body.items[0].patientSex).toBe('F');

    const ack = await request(app).post(`/api/dicom/worklist/${apt.id}/ack`).set('Authorization', 'Bearer test-bridge-secret');
    expect(ack.status).toBe(200);
    expect(apt.dicomStatus).toBe('worklist_sent');

    const webhook = await request(app).post('/api/dicom/webhook')
      .set('Authorization', 'Bearer test-bridge-secret')
      .send({ accessionNumber: apt.accessionNumber, studyInstanceUid: '1.2.840.1', orthancStudyId: 'orthanc-id-1', instanceCount: 42 });
    expect(webhook.status).toBe(200);
    expect(apt.dicomStatus).toBe('completed');
    expect(apt.dicomStudyUid).toBe('1.2.840.1');

    const after = await request(app).get('/api/dicom/worklist/pending').set('Authorization', 'Bearer test-bridge-secret');
    expect(after.body.items).toHaveLength(0); // no longer pending
  });

  it('webhook 404s for an unknown accessionNumber', async () => {
    const res = await request(app).post('/api/dicom/webhook')
      .set('Authorization', 'Bearer test-bridge-secret')
      .send({ accessionNumber: 'ACC-DOES-NOT-EXIST', studyInstanceUid: '1.2' });
    expect(res.status).toBe(404);
  });
});
