# Pure CRM

CRM cho doanh nghiệp hàng tiêu dùng (FMCG) — bán B2B qua nhà phân phối / điểm bán
và B2C trực tiếp tới người tiêu dùng. Một ứng dụng Node + React duy nhất:
Express phục vụ cả API (`/api/*`) lẫn giao diện (Vite build).

## Phân hệ

| Phân hệ | Nội dung |
|---|---|
| Tổng quan | Doanh thu B2B/B2C, top SKU/khách, công nợ theo tuổi nợ, cảnh báo |
| Khách hàng | B2B (NPP, tạp hoá, siêu thị…) và B2C; hạn mức công nợ, bảng giá theo kênh, RFM |
| Đơn hàng | Giá theo kênh, chiết khấu, CTKM, duyệt đơn vượt hạn mức/chiết khấu, thanh toán, VietQR |
| Sản phẩm | Danh mục, giá theo từng kênh, chu kỳ mua lại |
| Kho | Tồn theo **lô + hạn sử dụng**, xuất FEFO, phiếu nhập/xuất/kiểm kê, thẻ kho, truy vết lô |
| Kinh doanh | Tuyến viếng thăm, check-in GPS, thu nợ tại điểm bán, KPI & chỉ tiêu |
| Marketing / Loyalty | Phân khúc, chiến dịch ZNS/SMS, hạng hội viên, tích & đổi điểm, nhắc mua lại |
| CSKH / Inbox | Ticket SLA, hộp thư đa kênh Zalo OA + Facebook Messenger |

Phân quyền theo vai trò (Admin, Quản lý KD, NVKD, Kế toán, Thủ kho, CSKH, Marketing)
được áp **ở cả server** (`server/rbac.ts`) và giao diện (`src/utils/rbac.ts`).
Tài khoản gắn chi nhánh chỉ thấy dữ liệu chi nhánh đó (`server/branch-scope.ts`);
người dùng trụ sở có thể lọc theo chi nhánh bằng ô chọn trên thanh điều hướng.

## Chạy trên máy

Yêu cầu: Node.js ≥ 20 và PostgreSQL (máy cục bộ hoặc Docker).

```bash
npm install
cp .env.example .env          # rồi sửa DATABASE_URL, JWT_SECRET, AUTH_BOOTSTRAP_*
npm run dev                   # http://localhost:3000
```

Ví dụ Postgres bằng Docker:

```bash
docker run -d --name purecrm-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=purecrm -p 55432:5432 postgres:16-alpine
# .env: DATABASE_URL="postgresql://postgres:devpass@127.0.0.1:55432/purecrm"
```

Đăng nhập bằng `AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD` (tài khoản admin
được tạo lần đầu khởi động). Đặt `SEED_DEMO_DATA=true` để nạp dữ liệu mẫu.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Server + Vite dev (hot reload) |
| `npm run build` | Build giao diện vào `dist/` và bundle server `dist/server.cjs` |
| `npm start` | Chạy bản build (production) |
| `npm run lint` | Kiểm tra kiểu TypeScript |
| `npm test` | Bộ test Vitest (không cần database) |
| `npm run seed:demo -- --yes` | Nạp lại dữ liệu mẫu theo ngày hôm nay |
| `npm run reset:data` | Xoá toàn bộ dữ liệu nghiệp vụ |
| `npm run init:auth` | Tạo bảng tài khoản + admin khởi tạo |

## Tài liệu

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — triển khai lên VPS (`deploy/setup-vps.sh`, PM2, nginx/Caddy)
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — Zalo OA/ZNS, SMS, email, VoIP, Facebook, thanh toán
- [.env.example](.env.example) — mọi biến cấu hình, kèm giải thích

## Cấu trúc

```
server.ts              Khởi tạo Express, middleware, đăng ký route
server/                Nghiệp vụ (commerce.ts, inventory.ts, promotions.ts…), lưu trữ, auth, RBAC
server/routes/         Các nhóm API
server/integrations/   Zalo, SMS, email, VoIP, thanh toán
src/                   Giao diện React (src/fmcg/* là các màn hình)
test/                  Test Vitest
deploy/                Script & cấu hình triển khai
```
