/**
 * Demo data for the consumer-goods CRM (only loaded when SEED_DEMO_DATA=true).
 * Fictional brand "VitFood". Dates are generated relative to "now" with a
 * seeded PRNG so every boot looks the same shape and stays fresh.
 */
import type { CustomerRecord, ProductRecord, OrderRecord, VisitRecord, SalesTarget, B2BChannel } from './commerce-types';
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
  orders.push({
    id: 'ord-demo-pending', code: `DH-${today.slice(2, 4)}${today.slice(5, 7)}${today.slice(8, 10)}-9001`,
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

  return { products, customers, orders, visits, salesTargets };
}
