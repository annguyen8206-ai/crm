/**
 * Demo data for the consumer-goods CRM (only loaded when SEED_DEMO_DATA=true).
 * Fictional brand "VitFood". Dates are generated relative to "now" with a
 * seeded PRNG so every boot looks the same shape and stays fresh.
 */
import type { CustomerRecord, ProductRecord, OrderRecord, VisitRecord, SalesTarget, B2BChannel } from './commerce-types';
import type { SupportTicketRecord, LeadDealRecord, ConversationRecord, MessageRecord, MessageChannel } from './store';
import type { PromotionRecord } from './promotions';
import { CHANNEL_DEFAULT_TIER } from './commerce-types';
import { buildOrderItems, orderTotals, paymentStatusOf, customerStats, tierForPoints, pointsForAmount, addDays, ymd } from './commerce';

function prng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

export function buildFmcgDemo(now = new Date()) {
  const rnd = prng(20261116);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const today = ymd(now);

  const P = (id: string, sku: string, name: string, category: string, unit: string, le: number, cycle?: number, stock = 500): ProductRecord => ({
    id, sku, name, brand: 'VitFood', category, unit, packSize: unit === 'Thùng' ? 24 : undefined,
    prices: { LE: le, NPP: Math.round(le * 0.72), DL1: Math.round(le * 0.78), DL2: Math.round(le * 0.82), GT: Math.round(le * 0.86), MT: Math.round(le * 0.84) },
    cost: Math.round(le * 0.55), vatRate: 8, repurchaseCycleDays: cycle, stock, status: 'Đang bán', createdAt: addDays(today, -200),
  });
  const products: ProductRecord[] = [
    P('prd-1', 'VF-NS500', 'Nước suối VitFood 500ml', 'Đồ uống', 'Thùng', 120_000, 14),
    P('prd-2', 'VF-TX330', 'Trà xanh chanh 330ml', 'Đồ uống', 'Thùng', 168_000, 14),
    P('prd-3', 'VF-ST1L', 'Sữa tươi tiệt trùng 1L', 'Sữa', 'Thùng', 396_000, 10),
    P('prd-4', 'VF-SC180', 'Sữa chua uống 180ml', 'Sữa', 'Lốc', 32_000, 7),
    P('prd-5', 'VF-BQ300', 'Bánh quy bơ 300g', 'Bánh kẹo', 'Hộp', 65_000, 30),
    P('prd-6', 'VF-KD100', 'Kẹo dẻo trái cây 100g', 'Bánh kẹo', 'Gói', 18_000),
    P('prd-7', 'VF-MG75', 'Mì gói tôm chua cay 75g', 'Thực phẩm khô', 'Thùng', 110_000, 21),
    P('prd-8', 'VF-NM500', 'Nước mắm cá cơm 500ml', 'Gia vị', 'Chai', 45_000, 45),
    P('prd-9', 'VF-DA1L', 'Dầu ăn đậu nành 1L', 'Gia vị', 'Chai', 52_000, 30),
    P('prd-10', 'VF-NG3', 'Nước giặt hương hoa 3kg', 'Hoá phẩm', 'Can', 159_000, 40, 8),
    P('prd-11', 'VF-RB750', 'Nước rửa bát chanh 750ml', 'Hoá phẩm', 'Chai', 35_000, 30),
    { ...P('prd-12', 'VF-CF', 'Cà phê hoà tan 3in1 (sắp ra mắt)', 'Đồ uống', 'Hộp', 58_000), status: 'Sắp ra mắt', stock: 0 },
  ];

  const reps = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh Cường'];
  const provinces = ['Hà Nội', 'Hải Phòng', 'Bắc Ninh', 'Hưng Yên', 'Nam Định'];

  const customers: CustomerRecord[] = [];
  const b2b: Array<[string, B2BChannel, number, number, CustomerRecord['visitFrequency']]> = [
    ['NPP Minh Phát', 'Nhà phân phối', 500_000_000, 30, 'Hàng tuần'],
    ['NPP Hải Long', 'Nhà phân phối', 300_000_000, 30, 'Hàng tuần'],
    ['Đại lý Thành Công', 'Đại lý cấp 1', 120_000_000, 15, 'Hàng tuần'],
    ['Đại lý Hoa Mai', 'Đại lý cấp 1', 80_000_000, 15, '2 tuần/lần'],
    ['Đại lý Phúc An', 'Đại lý cấp 2', 40_000_000, 7, '2 tuần/lần'],
    ['Tạp hoá Cô Ba', 'Tạp hoá (GT)', 40_000_000, 7, 'Hàng tuần'],
    ['Tạp hoá Anh Tuấn', 'Tạp hoá (GT)', 40_000_000, 7, 'Hàng tuần'],
    ['Tạp hoá Bà Sáu', 'Tạp hoá (GT)', 25_000_000, 7, 'Hàng tuần'],
    ['Tạp hoá Hồng Nhung', 'Tạp hoá (GT)', 30_000_000, 7, '2 tuần/lần'],
    ['Siêu thị Mini Gia Đình', 'Siêu thị/Chuỗi (MT)', 150_000_000, 45, 'Hàng tháng'],
    ['Chuỗi CửaHàng Xanh', 'Siêu thị/Chuỗi (MT)', 250_000_000, 45, 'Hàng tháng'],
    ['Nhà hàng Sen Vàng', 'HoReCa', 20_000_000, 15, '2 tuần/lần'],
    ['Công ty TNHH Bao Bì Việt', 'Doanh nghiệp', 30_000_000, 30, 'Hàng tháng'],
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
      const lines = Array.from({ length: c.type === 'B2B' ? 2 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 3) }, () => ({
        productId: pick(sellable).id,
        quantity: c.type === 'B2B' ? (c.channel === 'Nhà phân phối' ? 50 : c.channel?.startsWith('Siêu thị') ? 30 : 3) + Math.floor(rnd() * (c.channel === 'Tạp hoá (GT)' ? 6 : 20)) : 1 + Math.floor(rnd() * 3),
      }));
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
  const bigItems = buildOrderItems([{ productId: 'prd-3', quantity: 20 }, { productId: 'prd-1', quantity: 20 }], products, tapHoa.priceTier);
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
    ['cus-b2b-6', 'Giao hàng chậm / sai hàng', 'Cao (SLA 2h)', 'Mới tiếp nhận', 0.5, 2, 'Giao thiếu 2 thùng trà xanh so với phiếu xuất kho.'],
    ['cus-b2c-3', 'Chất lượng sản phẩm', 'Cao (SLA 2h)', 'Đang xử lý', 3, 2, 'Hộp sữa tươi bị phồng, mùi lạ. Lô in trên hộp: L2611. Khách gửi ảnh qua Zalo.'],
    ['cus-b2b-10', 'Trưng bày & hỗ trợ điểm bán', 'Trung bình (SLA 8h)', 'Đang xử lý', 5, 8, 'Siêu thị cần kệ trưng bày đầu quầy + POSM cho đợt khuyến mãi cuối tháng.'],
    ['cus-b2c-7', 'Đổi trả hàng', 'Trung bình (SLA 8h)', 'Mới tiếp nhận', 1, 8, 'Đặt nhầm nước giặt 3kg, muốn đổi sang loại 1.8kg.'],
    ['cus-b2b-3', 'Công nợ / hoá đơn', 'Thấp (SLA 24h)', 'Đang xử lý', 30, 24, 'Đại lý đề nghị xuất lại hoá đơn VAT, sai mã số thuế.'],
    ['cus-b2c-1', 'Giá & khuyến mãi', 'Thấp (SLA 24h)', 'Đã giải quyết', 50, 24, 'Mã giảm giá trên Zalo không áp dụng được.', 'Đã cộng bù 50 điểm thưởng và hướng dẫn lại cách nhập mã.'],
    ['cus-b2b-12', 'Giao hàng chậm / sai hàng', 'Cao (SLA 2h)', 'Đã giải quyết', 72, 2, 'Nhà hàng cần gấp 10 chai dầu ăn trước 11h.', 'Điều xe giao bổ sung lúc 10h20, khách xác nhận đã nhận.'],
    ['cus-b2c-11', 'Chất lượng sản phẩm', 'Trung bình (SLA 8h)', 'Đã đóng', 120, 8, 'Bánh quy bị vỡ nhiều trong hộp.', 'Gửi tặng 1 hộp mới, chuyển phản ánh cho bộ phận đóng gói.'],
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
    ['Chuỗi WinMart+ khu vực Hà Đông', 'B2B', 'Chị Thu Hà - Trưởng ngành hàng', 'Listing 8 SKU đồ uống + sữa vào 40 cửa hàng', 1_200_000_000, 'Đàm phán', 70, 'Hội chợ / Triển lãm', 5],
    ['NPP Đông Anh', 'B2B', 'Anh Quân - Giám đốc', 'Mở nhà phân phối độc quyền khu vực Đông Anh – Sóc Sơn', 800_000_000, 'Gửi báo giá', 50, 'Giới thiệu', 3],
    ['Bếp ăn công nghiệp Sao Mai', 'B2B', 'Chị Loan - Bếp trưởng', 'Cung cấp dầu ăn, nước mắm, mì gói hàng tháng', 240_000_000, 'Đã liên hệ', 35, 'Website', 7],
    ['Tạp hoá Minh Châu', 'B2B', 'Cô Châu', 'Mở điểm bán mới tuyến T4', 25_000_000, 'Mới tiếp nhận', 20, 'Sales thị trường', 1],
    ['Trường Mầm non Hoa Sen', 'B2B', 'Cô Hiệu trưởng', 'Sữa chua uống cho 300 bé, giao 2 lần/tuần', 180_000_000, 'Chốt thành công (Won)', 100, 'Giới thiệu', -2],
    ['Công ty CP Phần mềm FPT (quà Tết)', 'B2C', 'Phòng Hành chính', '500 giỏ quà Tết nhân viên', 450_000_000, 'Gửi báo giá', 60, 'Hotline', 4],
    ['Siêu thị Hapro', 'B2B', 'Anh Tùng', 'Listing nước giặt + nước rửa bát', 300_000_000, 'Thất bại (Lost)', 0, 'Sales thị trường', -10],
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
    ['zalo', 'Nguyễn Thị Lan', 'cus-b2c-1', 1, [['in', 'Shop ơi sữa tươi 1L còn hàng không ạ? Mình lấy 2 thùng giao Cầu Giấy.'], ['out', 'Dạ còn ạ, chị cho em xin địa chỉ cụ thể để em lên đơn nhé.'], ['in', 'Ngõ 20 Cầu Giấy, sđt như Zalo này nhé']]],
    ['facebook', 'Hoàng Minh Đức', 'cus-b2c-5', 0, [['in', 'Nước giặt hương hoa có loại túi nhỏ không shop?']]],
    ['zalo', 'Tạp hoá Cô Ba', 'cus-b2b-6', 2, [['in', 'Em ơi tuần này có chương trình gì cho tạp hoá không?'], ['in', 'Cô lấy thêm 5 thùng mì nhé']]],
    ['facebook', 'Trần Mai Phương', undefined, 1, [['in', 'Mình muốn làm đại lý ở Thái Bình thì liên hệ ai ạ?']]],
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
    { id: 'cmp-demo-1', name: 'Nhắc mua lại sữa tươi', channel: 'zns', segment: 'Sắp hết hàng', customerType: 'B2C', recipients: 14, message: 'Sữa tươi VitFood của {ten} sắp hết — đặt ngay giảm 5%.', sentAt: `${addDays(today, -3)}T02:00:00.000Z`, sentBy: 'Marketing' },
    { id: 'cmp-demo-2', name: 'CTKM tạp hoá tháng này', channel: 'sms', segment: 'Tạp hoá (GT)', customerType: 'B2B', recipients: 4, message: 'Mua 10 thùng mì tặng 1 thùng, áp dụng đến cuối tháng.', sentAt: `${addDays(today, -8)}T03:00:00.000Z`, sentBy: 'Marketing' },
  ];

  // ------------------------------------------------------------- promotions
  const monthStart = `${today.slice(0, 7)}-01`;
  const promotions: PromotionRecord[] = [
    { id: 'promo-demo-1', code: 'MI10TANG1', name: 'Mua 10 thùng mì tặng 1 thùng', description: 'Áp dụng cho tạp hoá & đại lý', type: 'gift',
      buyProductId: 'prd-7', buyQty: 10, giftProductId: 'prd-7', giftQty: 1, customerType: 'B2B', channels: ['Tạp hoá (GT)', 'Đại lý cấp 1', 'Đại lý cấp 2'],
      startDate: monthStart, endDate: addDays(today, 20), active: true, createdAt: `${monthStart}T01:00:00.000Z`, createdBy: 'Marketing' },
    { id: 'promo-demo-2', code: 'SUA5', name: 'Giảm 5% ngành Sữa cho NPP', type: 'percent', value: 5, maxDiscount: 5_000_000, minOrderValue: 10_000_000,
      productIds: ['prd-3', 'prd-4'], customerType: 'B2B', channels: ['Nhà phân phối'],
      startDate: monthStart, endDate: addDays(today, 30), active: true, createdAt: `${monthStart}T01:00:00.000Z`, createdBy: 'Marketing' },
    { id: 'promo-demo-3', code: 'CHAOBAN50K', name: 'Giảm 50k đơn online từ 300k', type: 'amount', value: 50_000, minOrderValue: 300_000,
      customerType: 'B2C', perCustomerLimit: 1, startDate: addDays(today, -10), endDate: addDays(today, 45), active: true,
      createdAt: `${addDays(today, -10)}T01:00:00.000Z`, createdBy: 'Marketing' },
    { id: 'promo-demo-4', code: 'HE2026', name: 'Hè sảng khoái — giảm 8% đồ uống', type: 'percent', value: 8, productIds: ['prd-1', 'prd-2'],
      customerType: 'ALL', startDate: addDays(today, -150), endDate: addDays(today, -60), active: true,
      createdAt: `${addDays(today, -150)}T01:00:00.000Z`, createdBy: 'Marketing' },
  ];

  return { products, customers, orders, visits, salesTargets, tickets, leads, conversations, messages, campaigns, promotions };
}
