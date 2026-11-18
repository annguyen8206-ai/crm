/**
 * Demo data for Pure Essential Oils (only loaded when SEED_DEMO_DATA=true or
 * `npm run seed:demo`). Customers, deals and orders are fictional. Dates are generated relative to "now" with a
 * seeded PRNG so every boot looks the same shape and stays fresh.
 */
import type { CustomerRecord, ProductRecord, OrderRecord, VisitRecord, SalesTarget, B2BChannel } from './commerce-types';
import type { SupportTicketRecord, LeadDealRecord, ConversationRecord, MessageRecord, MessageChannel } from './store';
import type { PromotionRecord } from './promotions';
import { receive, type InventoryStore } from './inventory';
import { CHANNEL_DEFAULT_TIER } from './commerce-types';
import { buildOrderItems, orderTotals, paymentStatusOf, customerStats, tierForPoints, pointsForAmount, addDays, ymd } from './commerce';

function prng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

export function buildFmcgDemo(now = new Date()) {
  const rnd = prng(20261116);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const today = ymd(now);

  const P = (id: string, sku: string, name: string, category: string, unit: string, le: number, cycle?: number, stock = 800, extra: Partial<ProductRecord> = {}): ProductRecord => ({
    id, sku, name, brand: 'Pure', category, unit, packSize: unit === 'Chai' ? 24 : undefined,
    prices: { LE: le, NPP: Math.round(le * 0.65), DL1: Math.round(le * 0.72), DL2: Math.round(le * 0.78), GT: Math.round(le * 0.82), MT: Math.round(le * 0.8) },
    cost: Math.round(le * 0.4), vatRate: 8, repurchaseCycleDays: cycle, stock, status: 'Đang bán', createdAt: addDays(today, -200), ...extra,
  });
  const products: ProductRecord[] = [
    P('prd-1', 'PO-LAV10', 'Tinh dầu Oải hương 10ml', 'Tinh dầu nguyên chất', 'Chai', 150_000, 45, 800, { description: 'Thư giãn, dễ ngủ. Nhập khẩu Pháp.' }),
    P('prd-2', 'PO-SA10', 'Tinh dầu Sả chanh 10ml', 'Tinh dầu nguyên chất', 'Chai', 90_000, 30, 800, { description: 'Khử mùi, đuổi muỗi, thơm phòng.' }),
    P('prd-3', 'PO-TT10', 'Tinh dầu Tràm trà 10ml', 'Tinh dầu nguyên chất', 'Chai', 120_000, 45, 800, { description: 'Kháng khuẩn, hỗ trợ trị mụn.' }),
    P('prd-4', 'PO-BH10', 'Tinh dầu Bạc hà 10ml', 'Tinh dầu nguyên chất', 'Chai', 110_000, 45),
    P('prd-5', 'PO-QUE10', 'Tinh dầu Quế 10ml', 'Tinh dầu nguyên chất', 'Chai', 100_000, 60),
    P('prd-6', 'PO-TG50', 'Tinh dầu Tràm gió cho bé 50ml', 'Mẹ & bé', 'Chai', 180_000, 30, 800, { description: 'Giữ ấm, phòng cảm cho trẻ sơ sinh.' }),
    P('prd-7', 'PO-SA100', 'Tinh dầu Sả chanh 100ml', 'Tinh dầu nguyên chất', 'Chai', 390_000, 60),
    P('prd-8', 'PO-BUOI30', 'Tinh dầu Vỏ bưởi dưỡng tóc 30ml', 'Chăm sóc tóc & da', 'Chai', 160_000, 30),
    P('prd-9', 'PO-XIT100', 'Xịt phòng hương Sả chanh 100ml', 'Xịt & nến thơm', 'Chai', 85_000, 21),
    P('prd-10', 'PO-MKT300', 'Máy khuếch tán tinh dầu vân gỗ 300ml', 'Máy khuếch tán', 'Cái', 650_000, undefined, 8, { packSize: undefined }),
    P('prd-11', 'PO-NEN200', 'Nến thơm tinh dầu Oải hương 200g', 'Xịt & nến thơm', 'Hũ', 220_000, 45),
    P('prd-12', 'PO-SET5', 'Bộ quà tặng 5 tinh dầu 10ml', 'Quà tặng', 'Hộp', 520_000, undefined, 0, { status: 'Sắp ra mắt' }),
  ];

  const reps = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh Cường'];
  const provinces = ['Hà Nội', 'Hải Phòng', 'Bắc Ninh', 'Hưng Yên', 'Nam Định'];

  const customers: CustomerRecord[] = [];
  const b2b: Array<[string, B2BChannel, number, number, CustomerRecord['visitFrequency']]> = [
    ['NPP Hương Việt', 'Nhà phân phối', 500_000_000, 30, 'Hàng tuần'],
    ['NPP Thảo Mộc Miền Bắc', 'Nhà phân phối', 300_000_000, 30, 'Hàng tuần'],
    ['Đại lý An Nhiên', 'Đại lý cấp 1', 120_000_000, 15, 'Hàng tuần'],
    ['Đại lý Mộc Lan', 'Đại lý cấp 1', 80_000_000, 15, '2 tuần/lần'],
    ['Đại lý Hương Quê', 'Đại lý cấp 2', 40_000_000, 7, '2 tuần/lần'],
    ['Nhà thuốc Minh Châu', 'Tạp hoá (GT)', 40_000_000, 7, 'Hàng tuần'],
    ['Cửa hàng Mẹ & Bé Bống', 'Tạp hoá (GT)', 40_000_000, 7, 'Hàng tuần'],
    ['Nhà thuốc Phúc Khang', 'Tạp hoá (GT)', 25_000_000, 7, 'Hàng tuần'],
    ['Shop mỹ phẩm Hồng Nhung', 'Tạp hoá (GT)', 30_000_000, 7, '2 tuần/lần'],
    ['Siêu thị Mini Gia Đình', 'Siêu thị/Chuỗi (MT)', 150_000_000, 45, 'Hàng tháng'],
    ['Chuỗi nhà thuốc An Tâm', 'Siêu thị/Chuỗi (MT)', 250_000_000, 45, 'Hàng tháng'],
    ['Spa & Yoga Sen Vàng', 'HoReCa', 20_000_000, 15, '2 tuần/lần'],
    ['Công ty TNHH Quà Tặng Việt', 'Doanh nghiệp', 30_000_000, 30, 'Hàng tháng'],
  ];
  b2b.forEach(([name, channel, creditLimit, paymentTermDays, visitFrequency], i) => {
    customers.push({
      id: `cus-b2b-${i + 1}`, code: `KH-B2B-${String(i + 1).padStart(6, '0')}`, type: 'B2B', name,
      companyName: channel === 'Tạp hoá (GT)' ? undefined : `Công ty TNHH ${name.replace(/^(NPP|Đại lý|Siêu thị|Chuỗi|Nhà hàng|Công ty TNHH) /, '')}`,
      taxCode: channel === 'Tạp hoá (GT)' ? undefined : `01${String(10_000_000 + i * 7919).slice(0, 8)}`,
      phone: `09${String(12_000_000 + i * 104_729).slice(0, 8)}`, contactPerson: pick(['Anh Hùng', 'Chị Mai', 'Anh Đức', 'Chị Hạnh', 'Cô Ba']),
      address: `${10 + i} Đường số ${i + 3}`, province: provinces[i % provinces.length], branchId: 'ALL',
      status: 'Đang hoạt động', source: 'Sales thị trường', tags: i < 2 ? ['Key account'] : [], assignedRep: reps[i % reps.length],
      channel, priceTier: CHANNEL_DEFAULT_TIER[channel], creditLimit, paymentTermDays, visitFrequency,
      routeName: `Tuyến ${['T2', 'T3', 'T4', 'T5', 'T6'][i % 5]}`,
      parentDistributorId: channel === 'Tạp hoá (GT)' ? 'cus-b2b-1' : undefined,
      location: { lat: 21.0 + rnd() * 0.08, lng: 105.78 + rnd() * 0.1 },
      totalOrders: 0, totalRevenue: 0, outstandingDebt: 0, createdAt: addDays(today, -180 + i * 3) + 'T02:00:00.000Z',
    });
  });
  const names = ['Nguyễn Thị Lan', 'Trần Văn Hải', 'Phạm Thu Hà', 'Lê Thị Hoa', 'Hoàng Minh Đức', 'Vũ Thị Mai', 'Đỗ Quang Huy',
    'Bùi Thị Ngọc', 'Ngô Thanh Tâm', 'Đặng Thu Trang', 'Phan Văn Long', 'Trịnh Thị Yến', 'Lý Gia Bảo', 'Mai Anh Thư', 'Cao Văn Toàn',
    'Đinh Thị Thảo', 'Tạ Minh Khoa', 'Hồ Thị Linh'];
  names.forEach((name, i) => {
    customers.push({
      id: `cus-b2c-${i + 1}`, code: `KH-B2C-${String(i + 1).padStart(6, '0')}`, type: 'B2C', name,
      phone: `08${String(31_000_000 + i * 15_485).slice(0, 8)}`, email: i % 3 === 0 ? `khach${i + 1}@example.com` : undefined,
      gender: i % 3 === 1 ? 'Nam' : 'Nữ', dob: `19${80 + (i % 20)}-0${1 + (i % 9)}-1${i % 9}`,
      address: `Ngõ ${20 + i}, ${pick(['Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Long Biên', 'Thanh Xuân'])}`, province: 'Hà Nội',
      branchId: 'ALL', status: 'Đang hoạt động', source: pick(['Zalo', 'Facebook', 'Website', 'Sàn TMĐT', 'Giới thiệu']),
      tags: i % 4 === 0 ? ['Mẹ bỉm'] : i % 5 === 0 ? ['Văn phòng'] : [], priceTier: 'LE',
      loyaltyTier: 'Thành viên', loyaltyPoints: 0, lifetimePoints: 0,
      totalOrders: 0, totalRevenue: 0, outstandingDebt: 0, createdAt: addDays(today, -150 + i * 7) + 'T03:00:00.000Z',
    });
  });

  const orders: OrderRecord[] = [];
  const visits: VisitRecord[] = [];
  let seq = 0;
  const sellable = products.filter(p => p.status === 'Đang bán');
  for (const c of customers) {
    const created = c.createdAt.slice(0, 10);
    // B2C: some customers churn early (stop ordering), some are new.
    const gap = c.type === 'B2B' ? (c.visitFrequency === 'Hàng tuần' ? 7 : c.visitFrequency === '2 tuần/lần' ? 14 : 30) : 12 + Math.floor(rnd() * 25);
    const stopAfter = c.type === 'B2C' && rnd() < 0.3 ? addDays(today, -70 - Math.floor(rnd() * 50)) : today;
    for (let d = addDays(created, Math.floor(rnd() * gap)); d <= stopAfter; d = addDays(d, gap + Math.floor(rnd() * 5) - 2)) {
      const lines = Array.from({ length: c.type === 'B2B' ? 2 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 3) }, () => {
        const p = pick(sellable);
        const q = c.type === 'B2B' ? (c.channel === 'Nhà phân phối' ? 50 : c.channel?.startsWith('Siêu thị') ? 30 : 3) + Math.floor(rnd() * (c.channel === 'Tạp hoá (GT)' ? 6 : 20)) : 1 + Math.floor(rnd() * 3);
        // Big-ticket items (diffusers) sell in far smaller quantities than 10ml bottles.
        const quantity = (p.prices.LE || 0) >= 500_000 ? Math.max(1, Math.round(q / 10)) : q;
        return { productId: p.id, quantity };
      });
      const merged = [...new Map(lines.map(l => [l.productId, l])).values()];
      const items = buildOrderItems(merged, products, c.priceTier);
      const t = orderTotals(items, 0, c.type === 'B2C' && rnd() < 0.5 ? 20_000 : 0);
      const ageDays = Math.floor((now.getTime() - new Date(d).getTime()) / 86_400_000);
      const status: OrderRecord['status'] = ageDays > 3 ? (rnd() < 0.04 ? 'Đã huỷ' : 'Đã giao') : ageDays > 1 ? 'Đang giao' : 'Đã xác nhận';
      const dueDate = addDays(d, c.paymentTermDays || 0);
      const paid = status === 'Đã huỷ' ? 0
        : c.type === 'B2C' ? (status === 'Đã giao' ? t.total : 0)
        : dueDate < addDays(today, -10) && rnd() < 0.85 ? t.total : rnd() < 0.3 ? Math.round(t.total * 0.5) : 0;
      seq += 1;
      const o: OrderRecord = {
        id: `ord-demo-${seq}`, code: `DH-${d.slice(2, 4)}${d.slice(5, 7)}${d.slice(8, 10)}-${String(seq).padStart(4, '0')}`,
        customerId: c.id, customerName: c.name, customerPhone: c.phone, customerType: c.type, branchId: c.branchId,
        channel: c.type === 'B2B' ? 'Sales thị trường' : (c.source === 'Sàn TMĐT' ? 'Sàn TMĐT' : pick(['Zalo', 'Website', 'Facebook', 'Hotline'])),
        salesRep: c.type === 'B2B' ? c.assignedRep : 'CSKH Online', priceTier: c.priceTier, items, ...t,
        paidAmount: paid, paymentStatus: paymentStatusOf(t.total, paid),
        payments: paid ? [{ id: `pay-demo-${seq}`, amount: paid, method: c.type === 'B2C' ? 'COD' : 'Chuyển khoản', at: `${d}T10:00:00.000Z` }] : [],
        status, dueDate, deliveryAddress: c.address, createdBy: c.assignedRep || 'CSKH Online', createdAt: `${d}T0${2 + (seq % 7)}:15:00.000Z`,
        deliveredAt: status === 'Đã giao' ? `${addDays(d, 2)}T08:00:00.000Z` : undefined,
      };
      if (c.type === 'B2C' && status === 'Đã giao' && o.paymentStatus === 'Đã thanh toán') {
        o.pointsEarned = pointsForAmount(o.total);
        c.loyaltyPoints = (c.loyaltyPoints || 0) + o.pointsEarned;
        c.lifetimePoints = (c.lifetimePoints || 0) + o.pointsEarned;
      }
      orders.push(o);
      if (c.type === 'B2B' && d >= addDays(today, -30)) {
        visits.push({
          id: `vis-demo-${seq}`, customerId: c.id, customerName: c.name, customerAddress: c.address, salesRep: c.assignedRep!,
          branchId: c.branchId, plannedDate: d, purpose: 'Lấy đơn', status: 'Hoàn thành',
          checkInAt: `${d}T02:00:00.000Z`, checkOutAt: `${d}T02:25:00.000Z`, distanceMeters: Math.floor(rnd() * 120),
          outcome: 'Có đơn', orderId: o.id, createdAt: `${d}T00:00:00.000Z`,
        });
      }
    }
  }
  // A pending-approval order (over credit limit) for the approvals queue.
  const tapHoa = customers.find(c => c.id === 'cus-b2b-8')!;
  const bigItems = buildOrderItems([{ productId: 'prd-3', quantity: 120 }, { productId: 'prd-1', quantity: 120 }], products, tapHoa.priceTier);
  const bigT = orderTotals(bigItems);
  // Next free per-day number, so orders created later today continue the sequence naturally.
  const todayPrefix = `DH-${today.slice(2, 4)}${today.slice(5, 7)}${today.slice(8, 10)}-`;
  const nextToday = 1 + Math.max(0, ...orders.filter(o => o.code.startsWith(todayPrefix)).map(o => Number(o.code.slice(todayPrefix.length)) || 0));
  orders.push({
    id: 'ord-demo-pending', code: `${todayPrefix}${String(nextToday).padStart(4, '0')}`,
    customerId: tapHoa.id, customerName: tapHoa.name, customerPhone: tapHoa.phone, customerType: 'B2B', branchId: 'ALL',
    channel: 'Sales thị trường', salesRep: tapHoa.assignedRep, priceTier: tapHoa.priceTier, items: bigItems, ...bigT,
    paidAmount: 0, paymentStatus: 'Chưa thanh toán', payments: [], status: 'Chờ duyệt',
    approvalReasons: ['Vượt hạn mức công nợ'], dueDate: addDays(today, 7), createdBy: tapHoa.assignedRep, createdAt: `${today}T01:30:00.000Z`,
  });

  // Today's visit plan.
  customers.filter(c => c.type === 'B2B' && c.visitFrequency === 'Hàng tuần' && !visits.some(v => v.customerId === c.id && v.plannedDate === today)).forEach((c, i) => {
    visits.push({
      id: `vis-today-${i}`, customerId: c.id, customerName: c.name, customerAddress: c.address, salesRep: c.assignedRep!,
      branchId: c.branchId, plannedDate: today, purpose: i % 3 === 0 ? 'Thu nợ' : 'Lấy đơn', status: 'Kế hoạch', createdAt: `${today}T00:00:00.000Z`,
    });
  });

  for (const c of customers) {
    Object.assign(c, customerStats(c.id, orders));
    if (c.type === 'B2C') c.loyaltyTier = tierForPoints(c.lifetimePoints || 0);
  }

  const month = today.slice(0, 7);
  const salesTargets: SalesTarget[] = reps.map((salesRep, i) => ({ salesRep, month, revenueTarget: [450_000_000, 250_000_000, 300_000_000][i], visitTarget: 80 }));

  // ------------------------------------------------------------- CSKH tickets
  const stamp = (msAgo: number) => {
    const d = new Date(now.getTime() - msAgo);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const H = 3_600_000;
  const cust = (id: string) => customers.find(c => c.id === id)!;
  const lastOrderOf = (id: string) => orders.filter(o => o.customerId === id && o.status === 'Đã giao').at(-1);
  const ticketSpec: Array<[string, string, SupportTicketRecord['priority'], SupportTicketRecord['status'], number, number, string, string?]> = [
    // customer, category, priority, status, created h ago, SLA h, description, resolution
    ['cus-b2b-6', 'Giao hàng chậm / sai hàng', 'Cao (SLA 2h)', 'Mới tiếp nhận', 0.5, 2, 'Giao thiếu 6 chai tinh dầu Tràm trà 10ml so với phiếu xuất kho.'],
    ['cus-b2c-3', 'Chất lượng sản phẩm', 'Cao (SLA 2h)', 'Đang xử lý', 3, 2, 'Chai Oải hương 10ml bị rò ở nắp nhỏ giọt, mùi nhạt hơn lần trước. Lô in trên hộp: L2611. Khách gửi ảnh qua Zalo.'],
    ['cus-b2b-10', 'Trưng bày & hỗ trợ điểm bán', 'Trung bình (SLA 8h)', 'Đang xử lý', 5, 8, 'Siêu thị cần kệ trưng bày + tester và máy khuếch tán mẫu cho quầy tinh dầu.'],
    ['cus-b2c-7', 'Đổi trả hàng', 'Trung bình (SLA 8h)', 'Mới tiếp nhận', 1, 8, 'Đặt nhầm Sả chanh 100ml, muốn đổi sang chai 10ml + xịt phòng.'],
    ['cus-b2b-3', 'Công nợ / hoá đơn', 'Thấp (SLA 24h)', 'Đang xử lý', 30, 24, 'Đại lý đề nghị xuất lại hoá đơn VAT, sai mã số thuế.'],
    ['cus-b2c-1', 'Giá & khuyến mãi', 'Thấp (SLA 24h)', 'Đã giải quyết', 50, 24, 'Mã giảm giá trên Zalo không áp dụng được.', 'Đã cộng bù 50 điểm thưởng và hướng dẫn lại cách nhập mã.'],
    ['cus-b2b-12', 'Giao hàng chậm / sai hàng', 'Cao (SLA 2h)', 'Đã giải quyết', 72, 2, 'Spa cần gấp 10 chai Oải hương cho buổi trị liệu chiều nay.', 'Điều xe giao bổ sung lúc 10h20, khách xác nhận đã nhận.'],
    ['cus-b2c-11', 'Chất lượng sản phẩm', 'Trung bình (SLA 8h)', 'Đã đóng', 120, 8, 'Máy khuếch tán phun sương yếu sau 2 tuần sử dụng.', 'Đổi máy mới theo bảo hành, hướng dẫn vệ sinh màng rung định kỳ.'],
  ];
  const tickets: SupportTicketRecord[] = ticketSpec.map(([cid, category, priority, status, agoH, slaH, description, resolution], i) => {
    const c = cust(cid);
    const lo = lastOrderOf(cid);
    return {
      id: `ticket-demo-${i + 1}`, ticketCode: `CS-${today.slice(2, 4)}${today.slice(5, 7)}${today.slice(8, 10)}-${String(i + 1).padStart(3, '0')}`,
      patientId: c.id, patientName: c.name, patientPhone: c.phone, category, priority, status,
      department: 'Phòng CSKH', branchId: c.branchId, assignedStaff: i % 2 ? 'CSKH Phạm Thu' : 'CSKH Lê Hằng',
      description, resolution, orderCode: lo?.code,
      slaDeadline: stamp((agoH - slaH) * H), isOverdue: false, createdAt: stamp(agoH * H),
      resolvedAt: resolution ? stamp((agoH - slaH * 0.6) * H) : undefined,
      compensationVoucher: i === 5 ? '50 điểm' : undefined,
    };
  });

  // ----------------------------------------------------------- deals pipeline
  const leadSpec: Array<[string, 'B2B' | 'B2C', string, string, number, LeadDealRecord['stage'], number, string, number]> = [
    ['Chuỗi nhà thuốc Bình An (32 cửa hàng)', 'B2B', 'Chị Thu Hà - Trưởng ngành hàng', 'Listing 6 SKU tinh dầu + Tràm gió cho bé vào toàn chuỗi', 1_200_000_000, 'Đàm phán', 70, 'Hội chợ / Triển lãm', 5],
    ['NPP Đông Anh', 'B2B', 'Anh Quân - Giám đốc', 'Mở nhà phân phối độc quyền khu vực Đông Anh – Sóc Sơn', 800_000_000, 'Gửi báo giá', 50, 'Giới thiệu', 3],
    ['Khách sạn Lotus Garden', 'B2B', 'Chị Loan - Quản lý buồng phòng', 'Tinh dầu + máy khuếch tán cho 120 phòng, cấp hàng hằng tháng', 240_000_000, 'Đã liên hệ', 35, 'Website', 7],
    ['Cửa hàng Mẹ & Bé Su Su', 'B2B', 'Chị Châu', 'Mở điểm bán mới tuyến T4', 25_000_000, 'Mới tiếp nhận', 20, 'Sales thị trường', 1],
    ['Hệ thống Spa Thanh Tâm', 'B2B', 'Chị Hạnh - Chủ spa', 'Tinh dầu massage & xông hơi cho 4 cơ sở, giao 2 lần/tháng', 180_000_000, 'Chốt thành công (Won)', 100, 'Giới thiệu', -2],
    ['Công ty CP Công nghệ Ánh Dương (quà Tết)', 'B2C', 'Phòng Hành chính', '500 bộ quà tặng tinh dầu Tết cho nhân viên', 450_000_000, 'Gửi báo giá', 60, 'Hotline', 4],
    ['Siêu thị Hoàng Gia', 'B2B', 'Anh Tùng', 'Listing xịt phòng + nến thơm', 300_000_000, 'Thất bại (Lost)', 0, 'Sales thị trường', -10],
  ];
  const leads: LeadDealRecord[] = leadSpec.map(([customerName, type, contactPerson, serviceCategory, expectedValue, stage, probability, source, followIn], i) => ({
    id: `deal-demo-${i + 1}`, customerName, type, contactPerson, phone: `09${String(77_000_000 + i * 31_337).slice(0, 8)}`, email: '',
    serviceCategory, expectedValue, stage, probability, assignedStaff: reps[i % reps.length], source,
    notes: stage === 'Thất bại (Lost)' ? 'Đối thủ giảm giá sâu hơn 8%.' : '', followUpDate: addDays(today, followIn), createdAt: addDays(today, -20 + i * 2),
  }));

  // --------------------------------------------------------- inbox (Zalo / FB)
  const conversations: ConversationRecord[] = [];
  const messages: MessageRecord[] = [];
  const convSpec: Array<[MessageChannel, string, string | undefined, number, Array<[('in' | 'out'), string]>]> = [
    ['zalo', 'Nguyễn Thị Lan', 'cus-b2c-1', 1, [['in', 'Shop ơi tinh dầu Tràm gió cho bé còn hàng không ạ? Mình lấy 2 chai giao Cầu Giấy.'], ['out', 'Dạ còn ạ, chị cho em xin địa chỉ cụ thể để em lên đơn nhé.'], ['in', 'Ngõ 20 Cầu Giấy, sđt như Zalo này nhé']]],
    ['facebook', 'Hoàng Minh Đức', 'cus-b2c-5', 0, [['in', 'Máy khuếch tán vân gỗ chạy được bao lâu 1 lần đổ nước vậy shop? Dùng phòng 20m² được không?']]],
    ['zalo', 'Nhà thuốc Minh Châu', 'cus-b2b-6', 2, [['in', 'Em ơi tuần này có chương trình gì cho nhà thuốc không?'], ['in', 'Chị lấy thêm 10 chai Tràm gió nhé']]],
    ['facebook', 'Trần Mai Phương', undefined, 1, [['in', 'Mình muốn làm đại lý tinh dầu Pure ở Thái Bình thì liên hệ ai ạ?']]],
  ];
  convSpec.forEach(([channel, displayName, customerId, unread, thread], i) => {
    const convId = `conv-demo-${i + 1}`;
    const base = now.getTime() - (i * 3 + 1) * H;
    thread.forEach(([direction, text], j) => {
      messages.push({
        id: `msg-demo-${i + 1}-${j}`, conversationId: convId, channel, direction,
        senderId: direction === 'in' ? `ext-${i + 1}` : 'staff', senderName: direction === 'in' ? displayName : 'CSKH Lê Hằng',
        text, attachments: [], status: direction === 'in' ? 'received' : 'sent', at: new Date(base + j * 4 * 60_000).toISOString(),
      });
    });
    const last = messages[messages.length - 1];
    conversations.push({
      id: convId, channel, externalUserId: `ext-${i + 1}`, displayName, patientId: customerId,
      lastMessageAt: last.at, lastMessagePreview: last.text.slice(0, 140), unreadCount: unread, status: 'open',
      createdAt: new Date(base).toISOString(),
    });
  });
  conversations.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

  // ------------------------------------------------------------ campaign log
  const campaigns = [
    { id: 'cmp-demo-1', name: 'Nhắc mua lại tinh dầu', channel: 'zns', segment: 'Sắp hết hàng', customerType: 'B2C', recipients: 14, message: 'Chai tinh dầu Pure của {ten} có lẽ sắp hết — đặt lại hôm nay giảm 5%, giao trong ngày.', sentAt: `${addDays(today, -3)}T02:00:00.000Z`, sentBy: 'Marketing' },
    { id: 'cmp-demo-2', name: 'CTKM nhà thuốc & mẹ bé tháng này', channel: 'sms', segment: 'Tạp hoá (GT)', customerType: 'B2B', recipients: 4, message: 'Mua 10 chai Tràm gió cho bé tặng 1 chai, áp dụng đến cuối tháng.', sentAt: `${addDays(today, -8)}T03:00:00.000Z`, sentBy: 'Marketing' },
  ];

  // ------------------------------------------------------------- promotions
  const monthStart = `${today.slice(0, 7)}-01`;
  const promotions: PromotionRecord[] = [
    { id: 'promo-demo-1', code: 'TRAMGIO10T1', name: 'Mua 10 Tràm gió cho bé tặng 1', description: 'Áp dụng cho nhà thuốc, cửa hàng mẹ & bé, đại lý', type: 'gift',
      buyProductId: 'prd-6', buyQty: 10, giftProductId: 'prd-6', giftQty: 1, customerType: 'B2B', channels: ['Tạp hoá (GT)', 'Đại lý cấp 1', 'Đại lý cấp 2'],
      startDate: monthStart, endDate: addDays(today, 20), active: true, createdAt: `${monthStart}T01:00:00.000Z`, createdBy: 'Marketing' },
    { id: 'promo-demo-2', code: 'NPP5', name: 'Giảm 5% Oải hương & Tràm trà cho NPP', type: 'percent', value: 5, maxDiscount: 5_000_000, minOrderValue: 10_000_000,
      productIds: ['prd-1', 'prd-3'], customerType: 'B2B', channels: ['Nhà phân phối'],
      startDate: monthStart, endDate: addDays(today, 30), active: true, createdAt: `${monthStart}T01:00:00.000Z`, createdBy: 'Marketing' },
    { id: 'promo-demo-3', code: 'CHAOBAN50K', name: 'Giảm 50k đơn online từ 300k', type: 'amount', value: 50_000, minOrderValue: 300_000,
      customerType: 'B2C', perCustomerLimit: 1, startDate: addDays(today, -10), endDate: addDays(today, 45), active: true,
      createdAt: `${addDays(today, -10)}T01:00:00.000Z`, createdBy: 'Marketing' },
    { id: 'promo-demo-4', code: 'HE2026', name: 'Mùa hè không muỗi — giảm 8% Sả chanh & xịt phòng', type: 'percent', value: 8, productIds: ['prd-2', 'prd-7', 'prd-9'],
      customerType: 'ALL', startDate: addDays(today, -150), endDate: addDays(today, -60), active: true,
      createdAt: `${addDays(today, -150)}T01:00:00.000Z`, createdBy: 'Marketing' },
  ];

  // -------------------------------------------------------------- warehouse
  // Two receipts: an older batch (some lots now near expiry, one expired) and a
  // recent batch with long shelf life. The diffuser has no expiry date.
  const inv: InventoryStore = { products, lots: [], stockMoves: [], inventoryVouchers: [] };
  const batch = (code: string, daysAgo: number, partner: string, lines: Array<{ p: ProductRecord; lotNo: string; qty: number; mfg?: number; exp?: number }>) => {
    const at = `${addDays(today, -daysAgo)}T03:00:00.000Z`;
    const vLines = lines.map(({ p, lotNo, qty, mfg, exp }) => {
      const lot = receive(inv, {
        productId: p.id, lotNo, qty, type: 'Nhập mua', ref: code, by: 'Thủ kho Hoàng Nam', note: partner, at,
        mfgDate: mfg !== undefined ? addDays(today, mfg) : undefined, expiryDate: exp !== undefined ? addDays(today, exp) : undefined, cost: p.cost,
      });
      return { productId: p.id, sku: p.sku, name: p.name, lotId: lot.id, lotNo: lot.lotNo, expiryDate: lot.expiryDate, qty, cost: p.cost };
    });
    inv.inventoryVouchers.unshift({ id: `iv-demo-${code}`, code, kind: 'in', reason: 'Nhập mua', partner, lines: vLines, createdBy: 'Thủ kho Hoàng Nam', createdAt: at });
  };
  const stamp6 = (daysAgo: number) => addDays(today, -daysAgo).slice(2).replace(/-/g, '');
  const sellableP = products.filter(p => p.status !== 'Sắp ra mắt');
  products.find(p => p.id === 'prd-10')!.trackExpiry = false;
  for (const p of products) p.stock = 0; // stock now comes from the lots below
  batch(`PN-${stamp6(150)}-01`, 150, 'Nhà máy Pure — Bình Dương', sellableP.map((p, i) => p.id === 'prd-10'
    ? { p, lotNo: 'MKT-2606', qty: 8 }
    : { p, lotNo: `L${stamp6(170).slice(0, 4)}-${String(i + 1).padStart(2, '0')}`, qty: p.id === 'prd-4' ? 24 : 300, mfg: -400,
      // Sả chanh & xịt phòng: cận date; Bạc hà: one small lot already expired; the rest well in date.
      exp: p.id === 'prd-4' ? -10 : (p.id === 'prd-2' || p.id === 'prd-9') ? 45 : 300 + i * 9 }));
  batch(`PN-${stamp6(20)}-01`, 20, 'Nhà máy Pure — Bình Dương', sellableP.filter(p => p.id !== 'prd-10').map((p, i) => (
    { p, lotNo: `L${stamp6(40).slice(0, 4)}-${String(i + 1).padStart(2, '0')}`, qty: p.id === 'prd-4' ? 776 : 500, mfg: -40, exp: 690 + i * 5 })));

  return {
    products, customers, orders, visits, salesTargets, tickets, leads, conversations, messages, campaigns, promotions,
    lots: inv.lots, stockMoves: inv.stockMoves, inventoryVouchers: inv.inventoryVouchers,
  };
}
