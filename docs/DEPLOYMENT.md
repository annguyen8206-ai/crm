# VitCRM — Triển khai & khắc phục lỗi đăng nhập

## 1. Vì sao "Không thể xác thực với máy chủ"

Đăng nhập đi qua `POST /api/auth/staff/login` → `server/auth.ts`. Auth chỉ bật khi
**có đủ** các biến môi trường sau. Thiếu bất kỳ biến nào thì login trả lỗi (bản
production không còn fallback tài khoản demo).

| Biến | Bắt buộc | Hậu quả khi thiếu |
|------|----------|-------------------|
| `DATABASE_URL` | ✅ | Không có pool PostgreSQL → login báo "chưa cấu hình DATABASE_URL" |
| `JWT_SECRET` | ✅ | Không cấp được token → login báo "chưa cấu hình JWT_SECRET" |
| `AUTH_BOOTSTRAP_EMAIL` | ✅ (lần đầu) | Không có dòng admin nào trong `auth_users` → "Tài khoản hoặc mật khẩu không chính xác" |
| `AUTH_BOOTSTRAP_PASSWORD` | ✅ (lần đầu) | như trên |
| `DATABASE_SSL` | Tùy DB | Nếu PG yêu cầu TLS mà không đặt `"true"` → server crash lúc khởi động |

Khi `NODE_ENV=production`, server **thoát ngay** nếu thiếu biến, kèm log liệt kê
đúng biến còn thiếu.

## 2. Checklist trên VPS

1. Tạo file `.env` cạnh `server.ts` (hoặc set trong systemd unit). Xem `.env.example`.
   ```bash
   cp .env.example .env
   nano .env
   ```
   Bắt buộc điền: `DATABASE_URL`, `JWT_SECRET` (>=32 ký tự ngẫu nhiên,
   `openssl rand -hex 32`), `AUTH_BOOTSTRAP_EMAIL`, `AUTH_BOOTSTRAP_PASSWORD`,
   `NODE_ENV=production`, và `DATABASE_SSL=true` nếu PostgreSQL managed.

2. Kiểm tra kết nối DB từ VPS:
   ```bash
   psql "$DATABASE_URL" -c "select 1"
   ```

3. Build & chạy:
   ```bash
   npm ci
   npm run build
   npm start        # node dist/server.cjs
   ```

4. Xác nhận qua health-check — `authentication.configured` phải `true`,
   `authentication.missing` phải là `[]`:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.databaseConnection, .authentication'
   ```

5. Đăng nhập lần đầu bằng `AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD`,
   rồi vào **Quản trị nhân sự** để tạo tài khoản cho nhân viên (ghi thẳng vào
   bảng `auth_users`, đăng nhập được ngay).

### Đọc log khởi động
Server in sẵn khối chẩn đoán:
```
VitCRM startup diagnostics
  DATABASE_URL          : set | MISSING
  JWT_SECRET            : set | MISSING
  ...
[auth] auth_users schema verified.
[auth] Bootstrap admin created: info@vitaliahmd.com   (hoặc "already present")
[auth] Ready — N account(s) in auth_users.
[startup] Database: configured=true connected=true
[startup] Authentication: ENABLED | auth_users table: present
```
Nếu `initializeAuth` lỗi, server **thoát** kèm dòng `[startup] initializeAuth failed: …`
(PM2 sẽ restart-loop). Xem `pm2 logs` để đọc lỗi PostgreSQL gốc.

### Nếu bảng auth_users chưa được tạo

Chạy script độc lập (KHÔNG cần restart PM2, KHÔNG cần build, idempotent):
```bash
npm run init:auth
# hoặc chỉ định tài khoản admin trực tiếp:
npm run init:auth -- --email info@vitaliahmd.com --password 'MatKhauManh!'
```
Script dùng đúng `DATABASE_URL` / `DATABASE_SSL` / `AUTH_BOOTSTRAP_*` trong `.env`,
tạo `auth_users` + index, upsert bootstrap admin, rồi in ra schema và danh sách
tài khoản để xác nhận.

Nguyên nhân thường gặp khiến bảng không được tạo:
- PM2 khởi động **trước khi** có `.env` (lúc đó `DATABASE_URL` rỗng → `initializeAuth`
  bỏ qua). Khắc phục: `pm2 restart <app> --update-env` sau khi set env, hoặc chạy `npm run init:auth`.
- Đang chạy `dist/server.cjs` **bản build cũ**. Khắc phục: `git pull && npm ci && npm run build && pm2 restart <app>`.
- Role PostgreSQL trong `DATABASE_URL` không có quyền `CREATE` trên schema `public`.

## 3. Dữ liệu được lưu ở đâu

- **Toàn bộ nghiệp vụ** (`patients`, `appointments`, `tickets`, `leads`,
  `invoices`, `recalls`, `zns`, `voip`, `csat`, `auditLogs`) nằm trong
  `dbStore` và được ghi lại thành **1 snapshot JSONB** ở bảng `vitcrm_store`
  sau mỗi request ghi thành công (`server/database.ts`).
- **Các module còn lại của giao diện** (`branches`, `b2bContracts`, `b2cDeals`,
  `campaigns`, `automationRules`, `referrals`, `partners`, `partnerPayouts`,
  `interactions`) được lưu qua `GET/PUT /api/collections/:name` — cùng nằm
  trong snapshot đó. Frontend nạp lúc đăng nhập và tự lưu lại khi thay đổi
  (`usePersistedCollection` trong `src/App.tsx`).
- **Tài khoản nhân viên** nằm ở bảng quan hệ `auth_users` (không phải snapshot).

Chỉ có **2 bảng** app đụng tới: `vitcrm_store` và `auth_users` — cả hai tự tạo
lúc khởi động. Không có hệ migration nào khác. Nếu DB còn các bảng quan hệ cũ
(`patients`, `appointments`, `users`, `schema_migrations`, …) từ schema không dùng
nữa, xoá bằng (sao lưu trước):
```bash
pg_dump "$DATABASE_URL" > backup_before_cleanup.sql
psql "$DATABASE_URL" -f scripts/drop-legacy-tables.sql
```

## 4. Chạy DB tại máy dev (không cần cài PostgreSQL)

```bash
docker run -d --name vitcrm-pg \
  -e POSTGRES_USER=vitcrm -e POSTGRES_PASSWORD=vitcrm_local_pw -e POSTGRES_DB=vitcrm \
  -p 5433:5432 postgres:16-alpine
```
Rồi đặt trong `.env`:
`DATABASE_URL="postgresql://vitcrm:vitcrm_local_pw@127.0.0.1:5433/vitcrm"`.
Dừng: `docker rm -f vitcrm-pg`.
