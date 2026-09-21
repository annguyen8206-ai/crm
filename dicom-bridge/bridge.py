#!/usr/bin/env python3
"""
VitCRM DICOM worklist bridge.

Polls VitCRM for appointments waiting on a worklist item (GET
/api/dicom/worklist/pending), writes each as a DICOM Modality Worklist file
(.wl) into Orthanc's configured worklist folder, then acks it (POST
/api/dicom/worklist/<id>/ack) so it isn't written twice.

Run once (cron) or --loop (systemd/docker). Config via env vars — see
.env.example. Not exercised against real hardware here; verify against your
actual ultrasound's DICOM conformance statement before going live.
"""
import argparse
import datetime as dt
import os
import sys
import time
from pathlib import Path

import requests
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

VITCRM_BASE_URL = os.environ.get("VITCRM_BASE_URL", "").rstrip("/")
DICOM_BRIDGE_SECRET = os.environ.get("DICOM_BRIDGE_SECRET", "")
ORTHANC_AET = os.environ.get("ORTHANC_AET", "VITCRM_ORTHANC")
WORKLIST_DIR = Path(os.environ.get("WORKLIST_DIR", "./worklists"))
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SECONDS", "30"))

# Vietnamese "Siêu âm tim..." -> DICOM Modality code. Extend as needed.
MODALITY_CODES = {
    "siêu âm tim thai": "US",
    "siêu âm tim nhi": "US",
}


def _session() -> requests.Session:
    if not VITCRM_BASE_URL or not DICOM_BRIDGE_SECRET:
        sys.exit("Thiếu VITCRM_BASE_URL hoặc DICOM_BRIDGE_SECRET trong .env")
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {DICOM_BRIDGE_SECRET}"
    return s


def fetch_pending(s: requests.Session) -> list[dict]:
    r = s.get(f"{VITCRM_BASE_URL}/api/dicom/worklist/pending", timeout=15)
    r.raise_for_status()
    return r.json().get("items", [])


def ack(s: requests.Session, appointment_id: str) -> None:
    r = s.post(f"{VITCRM_BASE_URL}/api/dicom/worklist/{appointment_id}/ack", timeout=15)
    r.raise_for_status()


def dicom_name(full_name: str) -> str:
    """'Nguyễn Văn A' -> 'A^Nguyễn Văn' (DICOM PN: family^given). Good enough
    when the CRM only stores one free-text name field; adjust if you later
    split first/last name."""
    parts = full_name.strip().split()
    if len(parts) < 2:
        return full_name
    return f"{parts[-1]}^{' '.join(parts[:-1])}"


def write_worklist_file(item: dict) -> Path:
    ds = Dataset()
    ds.SpecificCharacterSet = "ISO_IR 100"
    ds.PatientName = dicom_name(item["patientName"])
    ds.PatientID = item["patientId"]
    ds.PatientBirthDate = (item.get("patientBirthDate") or "").replace("-", "")
    ds.PatientSex = item.get("patientSex", "O")
    ds.AccessionNumber = item["accessionNumber"]
    ds.RequestedProcedureID = item["accessionNumber"]
    ds.RequestedProcedureDescription = item.get("modality", "")
    ds.StudyInstanceUID = generate_uid()

    sched_date = (item.get("scheduledDate") or "").replace("-", "")
    time_part = (item.get("scheduledTime") or "").split("-")[0].strip().replace(":", "") + "00"

    step = Dataset()
    step.Modality = MODALITY_CODES.get((item.get("modality") or "").lower(), "US")
    step.ScheduledStationAETitle = ORTHANC_AET
    step.ScheduledProcedureStepStartDate = sched_date
    step.ScheduledProcedureStepStartTime = time_part
    step.ScheduledPerformingPhysicianName = dicom_name(item.get("referringDoctor") or "")
    step.ScheduledProcedureStepID = item["accessionNumber"]
    step.ScheduledProcedureStepStatus = "SCHEDULED"
    ds.ScheduledProcedureStepSequence = [step]

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.31"  # Modality Worklist Information Model
    file_meta.MediaStorageSOPInstanceUID = ds.StudyInstanceUID
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    WORKLIST_DIR.mkdir(parents=True, exist_ok=True)
    out = WORKLIST_DIR / f"{item['accessionNumber']}.wl"
    ds.save_as(out, write_like_original=False)
    return out


def run_once() -> int:
    s = _session()
    items = fetch_pending(s)
    for item in items:
        path = write_worklist_file(item)
        ack(s, item["appointmentId"])
        print(f"[{dt.datetime.now().isoformat(timespec='seconds')}] "
              f"worklist ghi {path.name} cho {item['patientName']} ({item['accessionNumber']})")
    if not items:
        print(f"[{dt.datetime.now().isoformat(timespec='seconds')}] không có mục chờ")
    return len(items)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="chạy 1 lần rồi thoát (cron)")
    parser.add_argument("--loop", action="store_true", help="chạy liên tục, poll mỗi POLL_INTERVAL_SECONDS")
    args = parser.parse_args()

    if args.loop:
        print(f"Bridge chạy liên tục, poll mỗi {POLL_INTERVAL}s. Ctrl+C để dừng.")
        while True:
            try:
                run_once()
            except Exception as e:  # keep the loop alive across transient errors
                print(f"Lỗi: {e}", file=sys.stderr)
            time.sleep(POLL_INTERVAL)
    else:
        run_once()


if __name__ == "__main__":
    main()
