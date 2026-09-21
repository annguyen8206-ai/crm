# DICOM bridge — kết nối máy siêu âm với VitCRM

Bộ này chạy **tại phòng khám**, cùng mạng LAN với máy siêu âm — không chạy trên VPS VitCRM.
VitCRM (cloud) chỉ nói chuyện với bộ này qua HTTPS bình thường; không có gói tin DICOM nào
đi ra khỏi mạng LAN của phòng khám.

```
[Máy siêu âm] ⇄ DICOM (LAN) ⇄ [Orthanc]  ⇄  [bridge.py + on_stored.py]  ⇄ HTTPS ⇄  [VitCRM cloud]
```

- **Orthanc**: máy chủ DICOM mã nguồn mở — trả lời C-FIND (worklist) và nhận C-STORE (ảnh) từ máy siêu âm.
- **bridge.py**: script chạy định kỳ (cron/systemd timer), kéo lịch hẹn cần chụp từ VitCRM
  (`GET /api/dicom/worklist/pending`), ghi thành file worklist `.wl` cho Orthanc đọc.
- **on_stored.py**: plugin Python nạp thẳng vào Orthanc, chạy mỗi khi có ảnh mới lưu xong —
  gọi `POST /api/dicom/webhook` báo VitCRM biết ca nào đã có kết quả.

## 1. Cài đặt (Docker — khuyến nghị)

Cần Docker + Docker Compose trên máy tại phòng khám.

```bash
cd dicom-bridge
cp .env.example .env
nano .env   # điền VITCRM_BASE_URL, DICOM_BRIDGE_SECRET (phải khớp VitCRM), AE Title máy siêu âm
mkdir -p worklists orthanc-db
docker compose up -d
```

`docker-compose.yml` chạy:
- Orthanc (cổng DICOM 4242, cổng HTTP/DICOMweb 8042) với plugin Worklist + Python + DICOMweb đã bật sẵn
- `bridge.py` chạy trong cùng container qua cron nội bộ (hoặc container riêng `dicom-bridge`)

## 2. Cấu hình máy siêu âm

Trên máy siêu âm (mục cấu hình DICOM/Network):
- **AE Title đích (Orthanc)**: giá trị `AET` trong `.env` (mặc định `VITCRM_ORTHANC`)
- **IP + cổng**: IP máy chạy Orthanc trong `.env`, cổng DICOM (`4242` mặc định, đổi thành `104` nếu máy yêu cầu cổng chuẩn — cần chạy Docker với quyền bind port <1024)
- **Modality Worklist**: bật, trỏ tới AE Title + IP + cổng ở trên
- **Storage (C-STORE) đích**: cùng AE Title/IP/cổng — Orthanc nhận cả hai trên cùng 1 kết nối

Thêm AE Title của máy siêu âm vào whitelist Orthanc trong `orthanc.json`
(`DicomModalities`) — nếu không, Orthanc từ chối kết nối lạ.

## 3. Cấu hình VitCRM (cloud, admin làm trong app)

**Cấu Hình Tích Hợp → nhóm "DICOM / Máy siêu âm"**:
- `Chuyên khoa sinh Worklist`: đúng tên `department` dùng khi đặt lịch (mặc định
  `Siêu âm tim thai,Siêu âm tim nhi`)
- `Khóa bí mật cho bridge`: chuỗi ngẫu nhiên dài, **giống hệt** `DICOM_BRIDGE_SECRET` trong `.env` ở bước 1
- `URL xem ảnh`: nếu có OHIF Viewer public (xem mục 5) hoặc để trống nếu bác sĩ chỉ xem trong mạng LAN

## 4. Test không cần máy siêu âm thật

```bash
# giả một lịch hẹn "Siêu âm tim thai" đã có sẵn (đặt qua CRM bình thường) rồi:
curl -s https://crm.vitaliahmd.com/api/dicom/worklist/pending \
  -H "Authorization: Bearer $DICOM_BRIDGE_SECRET"
# → phải thấy accessionNumber vừa sinh

# chạy bridge 1 lần thủ công, xem có ghi được file .wl không:
python3 bridge.py --once
ls worklists/

# giả lập máy siêu âm gửi kết quả xong (không cần Orthanc thật):
curl -s -X POST https://crm.vitaliahmd.com/api/dicom/webhook \
  -H "Authorization: Bearer $DICOM_BRIDGE_SECRET" -H 'Content-Type: application/json' \
  -d '{"accessionNumber":"<lấy từ bước trên>","studyInstanceUid":"1.2.3.4.5","instanceCount":42}'
# → mở CRM, tab Lịch hẹn, badge phải chuyển "Xem ảnh siêu âm"
```

## 5. Cho bác sĩ xem ảnh từ xa (tùy chọn)

Orthanc chỉ nghe trong LAN theo mặc định — an toàn nhưng bác sĩ off-site không xem được.
Muốn xem ngoài phòng khám, chọn 1 trong:
- **Cloudflare Tunnel** (miễn phí, dễ nhất): expose cổng 8042 (DICOMweb) qua tunnel, không cần mở port router
- **VPN** (WireGuard/Tailscale) nối máy bác sĩ vào mạng phòng khám
- **OHIF Viewer** cài thêm, trỏ vào Orthanc DICOMweb (`http://<orthanc>:8042/dicom-web`), rồi expose OHIF (không phải Orthanc) qua tunnel/VPN — an toàn hơn vì OHIF chỉ đọc

Dán URL công khai (sau tunnel/VPN) vào ô `URL xem ảnh` ở bước 3.

## An toàn dữ liệu

- Ảnh DICOM gốc **không** rời khỏi phòng khám — chỉ metadata (tên, mã BN, accession number,
  study UID) đi qua HTTPS về VitCRM.
- `DICOM_BRIDGE_SECRET` là bí mật dùng chung — đừng commit vào git, chỉ đặt trong `.env` tại chỗ
  và ô cấu hình VitCRM.
