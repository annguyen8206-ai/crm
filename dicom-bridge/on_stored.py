"""
Orthanc Python plugin script — loaded directly into Orthanc (see
docker-compose.yml `ORTHANC__PYTHON_SCRIPT`). Fires once per study, when
Orthanc considers it "stable" (no new instance arrived for `StableAge`
seconds, default 60s — configurable in orthanc.json) rather than once per
image, so the ultrasound study only reports to VitCRM a single time.

Requires VITCRM_BASE_URL + DICOM_BRIDGE_SECRET in the Orthanc container's
environment (already wired in docker-compose.yml).
"""
import json
import os

import orthanc
import requests

VITCRM_BASE_URL = os.environ.get("VITCRM_BASE_URL", "").rstrip("/")
DICOM_BRIDGE_SECRET = os.environ.get("DICOM_BRIDGE_SECRET", "")


def OnChange(changeType, level, resourceId):
    if changeType != orthanc.ChangeType.STABLE_STUDY:
        return
    if not VITCRM_BASE_URL or not DICOM_BRIDGE_SECRET:
        orthanc.LogWarning("[vitcrm] VITCRM_BASE_URL/DICOM_BRIDGE_SECRET chưa cấu hình trong Orthanc")
        return
    try:
        study = json.loads(orthanc.RestApiGet(f"/studies/{resourceId}"))
        tags = study.get("MainDicomTags", {})
        accession = tags.get("AccessionNumber")
        study_uid = tags.get("StudyInstanceUID")
        if not accession or not study_uid:
            orthanc.LogWarning(f"[vitcrm] study {resourceId} thiếu AccessionNumber/StudyInstanceUID, bỏ qua")
            return

        instance_count = 0
        for series_id in study.get("Series", []):
            series = json.loads(orthanc.RestApiGet(f"/series/{series_id}"))
            instance_count += len(series.get("Instances", []))

        requests.post(
            f"{VITCRM_BASE_URL}/api/dicom/webhook",
            json={
                "accessionNumber": accession,
                "studyInstanceUid": study_uid,
                "orthancStudyId": resourceId,
                "instanceCount": instance_count,
            },
            headers={"Authorization": f"Bearer {DICOM_BRIDGE_SECRET}"},
            timeout=10,
        )
        orthanc.LogWarning(f"[vitcrm] đã báo VitCRM: accessionNumber={accession} study={resourceId}")
    except Exception as e:  # never let a webhook failure crash Orthanc's callback
        orthanc.LogError(f"[vitcrm] lỗi gọi webhook VitCRM: {e}")


orthanc.RegisterOnChangeCallback(OnChange)
