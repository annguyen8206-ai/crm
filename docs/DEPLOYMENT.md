# Pure CRM — Triển khai lên VPS (crm.pure.vn)

Ứng dụng: 1 tiến trình Node (`dist/server.cjs`) chạy sau nginx, dữ liệu trong PostgreSQL.
Nhánh triển khai: **`fmcg-crm`**. (Nhánh `main` là bản y tế cũ, deploy riêng bằng `deploy.yml` — không liên quan.)

```
Internet ──HTTPS──▶ nginx (crm.pure.vn) ──▶ 127.0.0.1:3000  node dist/server.cjs (PM2 "purecrm")
                                                   └──▶ PostgreSQL  db "purecrm"
```

## 1. Cài lần đầu trên VPS mới (Ubuntu 22.04 / 24.04)

1. Trỏ DNS: bản ghi **A** `crm.pure.vn` → IP VPS.
2. Nếu repo private: tạo *deploy key* (`ssh-keygen -t ed25519`) cho user `deploy` và thêm vào GitHub → Settings → Deploy keys (read-only), rồi dùng URL dạng `git@github.com:…`.
3. Chạy với quyền root:
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/<org>/<repo>/fmcg-crm/deploy/setup-vps.sh
   bash setup-vps.sh <git-repo-url>
   ```
   Script cài Node 20, PostgreSQL, nginx, certbot, PM2, tường lửa (chỉ mở SSH/80/443); tạo DB `purecrm`,
   user `deploy`; clone code vào `/var/www/purecrm`; sinh `.env` với **mật khẩu DB, JWT_SECRET và mật khẩu admin ngẫu nhiên**
   (in ra màn hình một lần — lưu lại); build; chạy PM2; cấu hình nginx; sao lưu DB hằng ngày lúc 03:00 (giữ 14 bản).
4. Bật HTTPS khi DNS đã trỏ đúng:
   ```bash
   certbot --nginx -d crm.pure.vn --redirect -m <email> --agree-tos
   ```
5. Đổi `APP_URL="https://crm.pure.vn"` trong `/var/www/purecrm/.env`, rồi:
   ```bash
   sudo -u deploy pm2 restart purecrm --update-env
   ```
   > Chỉ đặt `https://` **sau khi** có chứng chỉ: khi APP_URL là https, server bật HSTS + `upgrade-insecure-requests`;
   > nếu trang vẫn chạy http thì trình duyệt sẽ không tải được CSS/JS (trang trắng).
6. Đăng nhập `https://crm.pure.vn` bằng `admin@pure.vn` + mật khẩu đã in ở bước 3 → đổi mật khẩu, tạo tài khoản nhân viên
   (menu tài khoản → *Tài khoản nhân viên*).

## 2. Deploy tự động (GitHub Actions)

Workflow `.github/workflows/deploy-pure.yml` chạy khi push lên `fmcg-crm`: typecheck + test + build, rồi SSH vào VPS,
sao lưu DB, `git reset --hard origin/fmcg-crm`, `npm ci --include=dev`, build, `pm2 reload`, kiểm tra `/api/health`.

Thêm secrets trong GitHub → Settings → Secrets → Actions:

| Secret | Giá trị |
|---|---|
| `PURE_HOST` | IP VPS |
| `PURE_USER` | `deploy` |
| `PURE_PORT` | `22` |
| `PURE_SSH_KEY` | private key có public key nằm trong `/home/deploy/.ssh/authorized_keys` |

Deploy tay (trên VPS, user `deploy`):
```bash
cd /var/www/purecrm && git pull && npm ci --include=dev && npm run build && pm2 reload deploy/ecosystem.config.cjs
```

## 3. Biến môi trường (`/var/www/purecrm/.env`)

Xem đầy đủ trong `.env.example`. Bắt buộc:

| Biến | Ghi chú |
|---|---|
| `DATABASE_URL` | `postgresql://purecrm:<mk>@127.0.0.1:5432/purecrm` |
| `JWT_SECRET` | ≥ 32 ký tự ngẫu nhiên (`openssl rand -hex 32`). Đổi biến này = mọi người phải đăng nhập lại |
| `AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD` | Chỉ dùng để tạo admin **lần đầu** (≥ 10 ký tự) |
| `APP_URL` | `https://crm.pure.vn` (http://… khi chưa có SSL) |
| `HOST=127.0.0.1`, `PORT=3000` | Chỉ nghe nội bộ, nginx đứng trước |

Ở `NODE_ENV=production`, server **từ chối khởi động** nếu thiếu biến bắt buộc hoặc còn giá trị mẫu
(`CHANGE_ME`, `change-this-immediately`, JWT ngắn) — đọc lý do bằng `pm2 logs purecrm`.

Không đặt `SEED_DEMO_DATA=true` trên production (CRM khởi tạo rỗng).

## 4. Vận hành

| Việc | Lệnh |
|---|---|
| Log | `pm2 logs purecrm` |
| Trạng thái | `pm2 status` · `curl -s localhost:3000/api/health` |
| Khởi động lại | `pm2 restart purecrm --update-env` |
| Quên mật khẩu admin | `npm run init:auth -- --email admin@pure.vn --password '<mới>' --reset-password` |
| Sao lưu tay | `pg_dump "$DATABASE_URL" \| gzip > backup.sql.gz` |
| Khôi phục | `gunzip -c backup.sql.gz \| psql "$DATABASE_URL"` (dừng app trước) |

- **Chỉ chạy 1 instance** (PM2 `fork`, không `cluster`): dữ liệu nghiệp vụ là một snapshot JSONB trong bảng
  `vitcrm_store` (kèm 50 bản lịch sử trong `vitcrm_store_history`); 2 instance sẽ ghi đè lẫn nhau.
- Bảng `customers`, `orders`, `order_items`, `products`, `tickets` là **bản sao để báo cáo SQL**, tự đồng bộ — không sửa trực tiếp.
- Tài khoản nhân viên: bảng `auth_users`. Nhật ký thao tác: `audit_log`. File đính kèm: thư mục `uploads/` (nằm ngoài git — đưa vào sao lưu nếu dùng).
- Webhook đối soát ngân hàng: `POST https://crm.pure.vn/api/payments/webhook` với `PAYMENT_WEBHOOK_SECRET`; nội dung chuyển khoản phải chứa mã đơn `DH-YYMMDD-NNNN`.

## 5. Chạy ở máy dev

```bash
docker run -d --name purecrm-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=purecrm -p 55432:5432 postgres:16-alpine
# .env: DATABASE_URL="postgresql://postgres:devpass@127.0.0.1:55432/purecrm"  NODE_ENV="development"  SEED_DEMO_DATA="true"
npm install && npm run dev        # http://localhost:3000
npm run seed:demo -- --yes        # nạp lại dữ liệu demo theo ngày hôm nay
```
