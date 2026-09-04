 # VitCRM — Tích hợp ngoài

Tất cả tích hợp **tùy chọn**. Chưa cấu hình → chạy chế độ **giả lập** (`mode: "simulated"`):
API vẫn trả `success: true`, ghi log, nhưng không gọi provider thật. Cấu hình đủ biến
env → tự chuyển sang **`mode: "live"`**, không cần đổi code.

Xem trạng thái:
```bash
curl -s http://localhost:3000/api/health | jq '.integrations'
# hoặc (đăng nhập admin):
curl -s http://localhost:3000/api/system/integrations -H "Authorization: Bearer <token>"
```
Log lúc khởi động cũng in bảng `VitCRM integrations` (LIVE / simulated cho từng cái).

---

## 1. AI (Gemini)
| Env | |
|---|---|
| `AI_ENABLED` | `"true"` để bật |
| `GEMINI_API_KEY` | khóa API |

Thiếu → các endpoint `/api/ai/*` trả `503` (đang bị chặn theo policy). Bật đủ 2 biến là dùng ngay.

## 2. Email / SMTP
| Env | Bắt buộc |
|---|---|
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | ✅ |
| `SMTP_PORT` (587), `SMTP_SECURE` (`true` cho 465), `SMTP_FROM` | tùy chọn |

Test: `POST /api/email/send` (admin) `{ "to","subject","html" | "text" }`.

## 3. Zalo ZNS
| Env | |
|---|---|
| `ZALO_OA_ACCESS_TOKEN` | cách 1: token tĩnh |
| `ZALO_APP_ID` + `ZALO_APP_SECRET` + `ZALO_OA_REFRESH_TOKEN` | cách 2: tự làm mới token (khuyến nghị) |
| `ZNS_TEMPLATE_POST_VISIT_CARE`, `ZNS_TEMPLATE_AUTO_RECALL`, `ZNS_TEMPLATE_APPOINTMENT_CONFIRMED`, `ZNS_TEMPLATE_HEALTH_FOLLOWUP` | id template đã được Zalo duyệt |

Dùng qua `POST /api/zns/send-post-visit-care`. Có thể truyền `templateData` (object) khớp
tham số template; nếu không, hệ thống tự tạo `{patient_name, diagnosis, care_notes}`.
Gọi `https://business.openapi.zalo.me/message/template`.

## 4. SMS / OTP
| Env | |
|---|---|
| `SMS_PROVIDER` | `twilio` \| `esms` \| `generic` |
| twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| esms (esms.vn) | `ESMS_API_KEY`, `ESMS_SECRET_KEY`, `ESMS_BRANDNAME` (tùy chọn) |
| generic | `SMS_WEBHOOK_URL` (POST `{to,message}`), `SMS_WEBHOOK_TOKEN` |
| OTP | `OTP_TTL_SECONDS` (300), `OTP_LENGTH` (6), `OTP_DEV_ECHO` (`true` chỉ khi dev) |

OTP endpoints (không cần token, dùng cho luồng đăng nhập 2FA):
```
POST /api/auth/otp/request   { identifier, phone?, email?, purpose? }
POST /api/auth/otp/verify    { identifier, code }
```
Challenge lưu in-memory, TTL ngắn, tối đa 5 lần thử. Gửi SMS trước, không được thì thử email.

> Để bật 2FA thật khi đăng nhập nhân viên: sau khi `loginStaff` thành công mà tài khoản
> có `twoFactorEnabled`, frontend gọi `otp/request` rồi `otp/verify` trước khi vào hệ thống
> (hiện `StaffLoginView` vẫn dùng mã cứng `686868` — thay bằng 2 call này).

## 5. VoIP (click-to-call)
| Env | |
|---|---|
| `VOIP_PROVIDER` | `stringee` \| `generic` |
| stringee | `STRINGEE_API_KEY_SID`, `STRINGEE_API_KEY_SECRET`, `STRINGEE_FROM_NUMBER`, `STRINGEE_ANSWER_URL` (tùy chọn) |
| generic | `VOIP_WEBHOOK_URL` (POST `{from,to,agentId}`), `VOIP_WEBHOOK_TOKEN` |

Dùng qua `POST /api/calls/click-to-call`. Stringee: ký JWT REST và gọi `call2/callout`.

## 6. Thanh toán / đối soát VietQR
- Ảnh QR (`POST /api/payments/vietqr`) **luôn hoạt động**. Ghi đè thông tin ngân hàng bằng
  `VIETQR_BANK_CODE`, `VIETQR_ACCOUNT_NUMBER`, `VIETQR_ACCOUNT_NAME`.
- **Tự đối soát**: đặt `PAYMENT_WEBHOOK_SECRET` (+ `PAYMENT_PROVIDER` = `casso`|`sepay`|`generic`)
  rồi trỏ webhook của dịch vụ (Casso/Sepay/…) tới:
  ```
  POST /api/payments/webhook
  Authorization: Bearer <PAYMENT_WEBHOOK_SECRET>      (hoặc ?secret=..., hoặc header secure-token)
  ```
  Hệ thống dò mã hóa đơn (`HD-YYYY-NNNN`) trong nội dung chuyển khoản, khớp số tiền
  (≥ `patientPayable`) và tự set hóa đơn = "Đã thanh toán" + lưu mã giao dịch.

## 7. Tin nhắn đa kênh (Zalo OA + Facebook Messenger)

Toàn bộ tin khách gửi tới OA Zalo / Fanpage đổ về **tab "Tin nhắn đa kênh"** trong CRM,
cập nhật **realtime** (SSE), trả lời ngay trong CRM.

| Env | |
|---|---|
| Zalo | `ZALO_APP_ID` + `ZALO_APP_SECRET` (xác thực webhook) + `ZALO_OA_ACCESS_TOKEN` hoặc bộ refresh (gửi trả lời) |
| Facebook | `FACEBOOK_APP_SECRET`, `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_VERIFY_TOKEN` |

**Khai báo webhook ở phía provider** (không cần code):
- Zalo OA → Webhook URL: `https://<domain>/api/webhooks/zalo`
- Meta App (Messenger) → Callback URL: `https://<domain>/api/webhooks/facebook`,
  Verify Token = `FACEBOOK_VERIFY_TOKEN`; subscribe field `messages`.

Endpoint nội bộ:
```
GET  /api/conversations                 # danh sách hội thoại + số chưa đọc
GET  /api/conversations/:id/messages    # tin trong hội thoại (đánh dấu đã đọc)
POST /api/conversations/:id/reply       { text }
PUT  /api/conversations/:id             { status | assignedStaff | patientId }
GET  /api/stream?token=<jwt>            # SSE realtime cho toàn CRM
POST /api/webhooks/:channel/simulate    { externalUserId, senderName, text }  # kiểm thử
```
Chưa cấu hình provider → webhook vẫn nhận (bỏ qua kiểm chữ ký, có cảnh báo log), trả lời ở
chế độ "simulated". Dùng nút **"Mô phỏng tin đến"** trong tab để thử pipeline.

---

### Chế độ giả lập có phá gì không?
Không. Mọi endpoint hành xử y như trước khi có tích hợp: tạo bản ghi (`znsLogs`, `voipCalls`…),
trả `success: true`, thêm `mode: "simulated"`. Khi bạn điền env thật, cùng endpoint đó gọi ra ngoài.

---

## Cấu hình ngay trong phần mềm (không cần sửa `.env`)

Đăng nhập tài khoản **Quản trị viên** → menu **Quản Trị** (góc phải Navbar) có 2 mục:

### A. "Cấu Hình Khóa Tích Hợp"

Bảng nhập trực tiếp toàn bộ khóa tích hợp, chia 9 nhóm: **Zalo OA & ZNS · SMS · OTP ·
Email (SMTP) · Facebook Messenger · Thanh toán/VietQR · VoIP · AI (Gemini) · Ứng dụng**.

| Thao tác | Cách làm |
|---|---|
| Nhập giá trị mới | Gõ vào ô rồi bấm **Lưu cấu hình** (dưới cùng) — áp dụng **ngay, không cần restart** |
| Xem giá trị bí mật | Ô secret hiện dạng che `••••1234`; bấm 👁 để lộ khi đang gõ |
| Xóa 1 giá trị (quay về `.env`) | Bấm **✕** cạnh ô → khi lưu, override bị xóa, hệ thống dùng lại giá trị trong `.env` (nếu có) |
| Hoàn tác thay đổi chưa lưu | Bấm ↩ cạnh ô |
| Biết giá trị đang từ đâu | Nhãn **`UI`** = nhập trong phần mềm · **`.env`** = từ biến môi trường |
| Kiểm tra đã "live" chưa | Badge **ĐANG HOẠT ĐỘNG / GIẢ LẬP** ở đầu mỗi nhóm, cập nhật ngay sau khi lưu |

**Thứ tự ưu tiên:** giá trị nhập trong UI **đè** `.env`. `.env` chỉ là mặc định ban đầu.

**Lưu trữ & bảo mật:**
- Lưu ở bảng Postgres riêng `app_settings` (không nằm trong bản sao lưu JSONB nghiệp vụ).
- Khóa bí mật được **mã hóa AES-256-GCM** khi lưu vào DB. Khóa mã hóa lấy từ
  `SETTINGS_ENC_KEY` (64 ký tự hex — tạo bằng `openssl rand -hex 32`); nếu không đặt thì
  suy ra từ `JWT_SECRET`. **Đổi `JWT_SECRET` sau khi đã lưu secret → phải nhập lại secret.**
- Chỉ Quản trị viên gọi được `GET/PUT /api/system/settings`; API luôn trả secret ở dạng che.
- Mọi lần lưu được ghi vào `audit_log` (nội dung `values` bị ẩn).

**Ví dụ bật OTP qua Zalo:** mở nhóm *Zalo OA & ZNS* → điền `App ID` / `App Secret` /
`OA Refresh Token` + `Template ID — OTP` + `Tên tham số mã` (mặc định `otp`) → **Lưu**.
Nhóm *OTP* có thể đặt `Thứ tự kênh` = `zalo,sms,email` (thử Zalo trước, rớt xuống SMS).

### B. "Tài Liệu API Backend"

Danh mục tra cứu các endpoint `/api/*` (đường dẫn, method, mô tả, ví dụ payload) — **chỉ để
xem/tham khảo**, không phải nơi cấu hình. Dùng khi cần tích hợp hệ thống ngoài gọi vào VitCRM
hoặc để nhân viên IT nắm nhanh API. Trạng thái tích hợp thật xem ở
`GET /api/health` hoặc `GET /api/system/integrations`.

---

## Phân trang API

Các endpoint danh sách (`/api/appointments`, `/tickets`, `/invoices`, `/leads`, `/recalls`,
`/follow-ups`, `/csat/feedbacks`, `/conversations`) nhận `?limit=` & `?offset=` và trả kèm
`total`, `limit`, `offset`. Mặc định `limit=1000` (giữ nguyên hành vi cũ), tối đa `5000`.

## Phiên đăng nhập cổng bệnh nhân

- Mặc định token **12h** (`PORTAL_TOKEN_TTL`).
- Bệnh nhân tick **"Ghi nhớ đăng nhập 30 ngày"** khi nhập OTP → token dài hạn
  (`PORTAL_REMEMBER_TTL`, mặc định `30d`).
