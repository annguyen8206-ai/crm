/**
 * Consumer-goods (FMCG) CRM domain: B2B accounts (distributors, dealers, GT/MT
 * outlets) and B2C consumers share one Customer record; Products carry a price
 * per price tier; Orders drive revenue, receivables and loyalty; Visits are
 * field-sales check-ins at outlets.
 */

export type CustomerType = 'B2B' | 'B2C';

/** Price list a customer buys at. LE = retail (consumer) price. */
export type PriceTier = 'LE' | 'NPP' | 'DL1' | 'DL2' | 'GT' | 'MT';
export const PRICE_TIERS: PriceTier[] = ['LE', 'NPP', 'DL1', 'DL2', 'GT', 'MT'];
export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  LE: 'Giá bán lẻ',
  NPP: 'Giá nhà phân phối',
  DL1: 'Giá đại lý cấp 1',
  DL2: 'Giá đại lý cấp 2',
  GT: 'Giá tạp hoá (GT)',
  MT: 'Giá siêu thị/chuỗi (MT)',
};

/** Kind of B2B account. */
export type B2BChannel =
  | 'Nhà phân phối'
  | 'Đại lý cấp 1'
  | 'Đại lý cấp 2'
  | 'Tạp hoá (GT)'
  | 'Siêu thị/Chuỗi (MT)'
  | 'HoReCa'
  | 'Doanh nghiệp';

/** Default price tier for each B2B channel. */
export const CHANNEL_DEFAULT_TIER: Record<B2BChannel, PriceTier> = {
  'Nhà phân phối': 'NPP',
  'Đại lý cấp 1': 'DL1',
  'Đại lý cấp 2': 'DL2',
  'Tạp hoá (GT)': 'GT',
  'Siêu thị/Chuỗi (MT)': 'MT',
  'HoReCa': 'GT',
  'Doanh nghiệp': 'DL2',
};

export type LoyaltyTier = 'Thành viên' | 'Bạc' | 'Vàng' | 'Kim cương';

export type CustomerStatus = 'Tiềm năng' | 'Đang hoạt động' | 'Ngừng giao dịch';

export interface GeoPoint { lat: number; lng: number; accuracy?: number }

export interface CustomerRecord {
  id: string;
  code: string;              // KH-B2C-000123 / KH-B2B-000045
  type: CustomerType;
  name: string;              // consumer full name, or outlet / company trading name
  phone: string;
  email?: string;
  address?: string;
  province?: string;
  district?: string;
  branchId: string;          // sales branch / region office
  status: CustomerStatus;
  source?: string;           // Zalo, Facebook, Website, Sàn TMĐT, Sales thị trường, Giới thiệu...
  tags: string[];
  assignedRep?: string;      // owning sales rep / account manager
  notes?: string;

  // B2C
  gender?: 'Nam' | 'Nữ' | 'Khác';
  dob?: string;
  loyaltyTier?: LoyaltyTier;
  loyaltyPoints?: number;    // redeemable balance
  lifetimePoints?: number;   // never decreases — drives tier

  // B2B
  companyName?: string;      // legal name on invoices
  taxCode?: string;
  contactPerson?: string;
  contactTitle?: string;
  channel?: B2BChannel;
  parentDistributorId?: string; // outlet served by this distributor
  creditLimit?: number;      // 0 / undefined = cash only, no credit check
  paymentTermDays?: number;  // days until an order is due
  routeName?: string;        // field-sales route (tuyến)
  visitFrequency?: 'Hàng tuần' | '2 tuần/lần' | 'Hàng tháng';
  location?: GeoPoint;

  priceTier: PriceTier;

  // Derived from orders (recomputed on every order change)
  totalOrders: number;
  totalRevenue: number;
  outstandingDebt: number;
  firstOrderDate?: string;
  lastOrderDate?: string;

  createdAt: string;
  updatedAt?: string;
}

export type ProductStatus = 'Đang bán' | 'Ngừng bán' | 'Sắp ra mắt';

export interface ProductRecord {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  brand?: string;
  category: string;          // Đồ uống, Bánh kẹo, Sữa, Hoá mỹ phẩm, Gia vị...
  unit: string;              // Thùng, Hộp, Chai, Gói, Lốc
  packSize?: number;         // units per carton
  prices: Partial<Record<PriceTier, number>>; // VAT-inclusive, per `unit`
  cost?: number;
  vatRate?: number;          // % — for invoicing only
  repurchaseCycleDays?: number; // typical consumption cycle → repurchase reminder
  stock?: number;
  status: ProductStatus;
  imageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export type OrderStatus = 'Chờ duyệt' | 'Đã xác nhận' | 'Đang giao' | 'Đã giao' | 'Đã huỷ' | 'Trả hàng';
export type PaymentStatus = 'Chưa thanh toán' | 'Thanh toán một phần' | 'Đã thanh toán';
export type OrderChannel = 'Sales thị trường' | 'Zalo' | 'Facebook' | 'Website' | 'Sàn TMĐT' | 'Hotline' | 'Cửa hàng';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

export interface OrderPayment {
  id: string;
  amount: number;
  method: 'Tiền mặt' | 'Chuyển khoản' | 'VietQR' | 'COD' | 'Ví điện tử' | 'Bù trừ công nợ' | string;
  reference?: string;
  at: string;
  by?: string;
}

export interface OrderRecord {
  id: string;
  code: string;              // DH-261116-0042
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  branchId: string;
  channel: OrderChannel | string;
  salesRep?: string;
  priceTier: PriceTier;
  items: OrderItem[];
  subtotal: number;          // sum of line totals
  discountAmount: number;    // order-level discount
  promotionCode?: string;
  shippingFee: number;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  payments: OrderPayment[];
  status: OrderStatus;
  approvalReasons?: string[];   // why it needs approval (credit limit, discount...)
  approvedBy?: string;
  approvedAt?: string;
  dueDate?: string;          // B2B credit due date (YYYY-MM-DD)
  deliveryAddress?: string;
  expectedDeliveryDate?: string;
  deliveredAt?: string;
  cancelledReason?: string;
  visitId?: string;
  pointsEarned?: number;     // loyalty points credited (B2C, once delivered & paid)
  notes?: string;
  createdBy?: string;
  createdAt: string;         // ISO
  updatedAt?: string;
}

export type VisitStatus = 'Kế hoạch' | 'Đã check-in' | 'Hoàn thành' | 'Bỏ lỡ';
export type VisitPurpose = 'Chào hàng' | 'Lấy đơn' | 'Thu nợ' | 'Trưng bày' | 'Kiểm tồn' | 'Chăm sóc khách hàng';

export interface VisitRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  salesRep: string;
  branchId: string;
  plannedDate: string;       // YYYY-MM-DD
  purpose: VisitPurpose | string;
  status: VisitStatus;
  checkInAt?: string;
  checkInLocation?: GeoPoint;
  distanceMeters?: number;   // check-in distance from the outlet's saved location
  locationFlag?: boolean;    // true when too far from the outlet
  checkOutAt?: string;
  outcome?: string;
  notes?: string;
  orderId?: string;
  collectedAmount?: number;  // debt collected during the visit
  stockCheck?: Array<{ productId: string; quantity: number }>;
  photoFileIds?: string[];
  createdAt: string;
}

export interface SalesTarget {
  salesRep: string;
  month: string;             // YYYY-MM
  revenueTarget: number;
  visitTarget?: number;
  newCustomerTarget?: number;
}
