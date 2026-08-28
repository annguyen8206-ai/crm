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

---

### Chế độ giả lập có phá gì không?
Không. Mọi endpoint hành xử y như trước khi có tích hợp: tạo bản ghi (`znsLogs`, `voipCalls`…),
trả `success: true`, thêm `mode: "simulated"`. Khi bạn điền env thật, cùng endpoint đó gọi ra ngoài.
