import type { Request, Response, NextFunction } from 'express';

/**
 * Server-side RBAC. The front-end already hides tabs per role (src/utils/rbac.ts);
 * this enforces the same policy on the API so a crafted request can't bypass it.
 *
 * Roles in `auth_users.role` are free text — `roleKeyOf()` normalises them to one
 * of the known keys, then PERMISSIONS decides what that key may do.
 */

export type Permission =
  | 'canManageCustomers'     // create / edit B2B accounts & B2C consumers
  | 'canManageOrders'        // create orders, record payments, update delivery
  | 'canApproveOrders'       // approve credit-limit / discount exceptions, cancel
  | 'canManageProducts'      // product catalogue & price lists
  | 'canManageVisits'        // field-sales visit plans & check-ins
  | 'canManageB2BContracts'  // sales pipeline (deals / opportunities)
  | 'canManageMarketing'
  | 'canManageTickets'
  | 'canManageLoyalty'
  | 'canViewFinancialBI'
  | 'canExportData'          // download customer / order / receivable lists (contains PII)
  | 'canManageInventory'     // warehouse receipts / issues / stock counts by lot
  // ---- read access (the API enforces these, not only the hidden tabs)
  | 'canViewCustomers'       // customer list / detail / RFM (names, phones, addresses)
  | 'canViewOrders'          // order list / detail
  | 'canViewReceivables'     // open receivables, aging, customer debt
  | 'canViewInventory'       // lots, expiry, stock card, vouchers
  | 'canViewSales'           // visits, KPI & targets, inactive outlets
  | 'canUseInbox'            // read / answer Zalo OA + Facebook conversations
  | 'canAdminister';

export type RoleKey =
  | 'admin'
  | 'sales_manager'
  | 'sales_rep'
  | 'accountant'
  | 'cskh_sales_consultant'
  | 'marketing_lead'
  | 'warehouse_keeper'
  | 'viewer';

/** The fixed set of roles. New / edited staff accounts store one of these keys. */
export const ROLE_KEYS: RoleKey[] = [
  'admin', 'sales_manager', 'sales_rep', 'accountant', 'warehouse_keeper', 'cskh_sales_consultant', 'marketing_lead', 'viewer',
];
export const isRoleKey = (v: unknown): v is RoleKey => typeof v === 'string' && (ROLE_KEYS as string[]).includes(v);

const ALL: Permission[] = [
  'canManageCustomers', 'canManageOrders', 'canApproveOrders', 'canManageProducts', 'canManageVisits',
  'canManageB2BContracts', 'canManageMarketing', 'canManageTickets', 'canManageLoyalty',
  'canViewFinancialBI', 'canExportData', 'canManageInventory',
  'canViewCustomers', 'canViewOrders', 'canViewReceivables', 'canViewInventory', 'canViewSales', 'canUseInbox',
  'canAdminister',
];

const PERMISSIONS: Record<RoleKey, Set<Permission>> = {
  admin: new Set(ALL),
  sales_manager: new Set<Permission>([
    'canManageCustomers', 'canManageOrders', 'canApproveOrders', 'canManageVisits',
    'canManageB2BContracts', 'canManageTickets', 'canManageLoyalty', 'canViewFinancialBI', 'canExportData',
    'canViewCustomers', 'canViewOrders', 'canViewReceivables', 'canViewInventory', 'canViewSales', 'canUseInbox',
  ]),
  sales_rep: new Set<Permission>([
    'canManageCustomers', 'canManageOrders', 'canManageVisits', 'canManageB2BContracts',
    'canViewCustomers', 'canViewOrders', 'canViewReceivables', 'canViewSales',
  ]),
  accountant: new Set<Permission>([
    'canManageOrders', 'canApproveOrders', 'canViewFinancialBI', 'canExportData', 'canManageInventory',
    'canViewCustomers', 'canViewOrders', 'canViewReceivables', 'canViewInventory',
  ]),
  warehouse_keeper: new Set<Permission>(['canManageInventory', 'canExportData', 'canViewOrders', 'canViewInventory']),
  cskh_sales_consultant: new Set<Permission>([
    'canManageCustomers', 'canManageOrders', 'canManageB2BContracts', 'canManageTickets', 'canManageLoyalty',
    'canViewCustomers', 'canViewOrders', 'canViewReceivables', 'canUseInbox',
  ]),
  marketing_lead: new Set<Permission>(['canManageMarketing', 'canManageLoyalty', 'canViewCustomers']),
  viewer: new Set<Permission>([]),
};

/**
 * Map a stored role to a key. New accounts store the key itself (exact match).
 * Older accounts hold free text (a job title), which is matched by keyword —
 * department words win over a generic "giám đốc", so "Giám đốc Marketing" is
 * Marketing, not a full administrator.
 */
export function roleKeyOf(role: string | undefined | null): RoleKey {
  const r = (role || '').toLowerCase().trim();
  if (isRoleKey(r)) return r;
  // Explicit top-management / system-admin titles.
  if (r.includes('admin') || r.includes('quản trị') || r.includes('ban giám đốc') || r.includes('tổng giám đốc') ||
      r.includes('lãnh đạo') || r.includes('hđqt') || r === 'it' || r === 'giám đốc') return 'admin';
  if (r.includes('quản lý kinh doanh') || r.includes('trưởng phòng kinh doanh') || r.includes('giám đốc kinh doanh') ||
      r.includes('giám đốc bán hàng') || r.includes('giám sát bán hàng') || r.includes('trưởng nhóm kinh doanh') ||
      r.includes('trưởng nhóm sales') || r.includes('sales manager') || /\b(asm|rsm|sup)\b/.test(r)) return 'sales_manager';
  if (r.includes('kế toán') || r.includes('công nợ') || r.includes('accountant') || r.includes('thủ quỹ')) return 'accountant';
  // "kho" as a whole word only — "khoa", "tài khoản" must not match.
  if (/(^|[\s,/(-])kho($|[\s,/)-])/.test(r) || r.includes('warehouse') || r.includes('logistics')) return 'warehouse_keeper';
  if (r.includes('marketing') || r.includes('tiếp thị')) return 'marketing_lead';
  if (r.includes('nhân viên kinh doanh') || r.includes('nvkd') || r.includes('nhân viên bán hàng') ||
      r.includes('thị trường') || r.includes('sales rep') || r.includes('sale thị trường')) return 'sales_rep';
  if (r.includes('cskh') || r.includes('chăm sóc') || r.includes('kinh doanh') || r.includes('sales') || r.includes('b2b') || r.includes('tư vấn') || r.includes('consultant')) return 'cskh_sales_consultant';
  // Any other "giám đốc" (e.g. Giám đốc chi nhánh) keeps its historical admin mapping.
  if (r.includes('giám đốc')) return 'admin';
  // Unknown role → least privilege (read-only).
  return 'viewer';
}

export function hasPerm(role: string | undefined, ...perms: Permission[]): boolean {
  const set = PERMISSIONS[roleKeyOf(role)];
  return perms.some(p => set.has(p));
}

export function isAdmin(role: string | undefined): boolean {
  return roleKeyOf(role) === 'admin';
}

/** Express middleware: allow if the caller's role holds ANY of the listed perms. */
export function requirePerm(...perms: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.authUser?.role;
    if (!role) { res.status(401).json({ error: 'Yêu cầu đăng nhập hợp lệ' }); return; }
    if (hasPerm(role, ...perms)) { next(); return; }
    res.status(403).json({ error: 'Vai trò của bạn không được phép thực hiện thao tác này' });
  };
}

/** View permission each Excel report needs on top of canExportData (products: anyone who may export). */
export const EXPORT_VIEW_PERM: Record<string, Permission | undefined> = {
  customers: 'canViewCustomers', orders: 'canViewOrders', 'order-items': 'canViewOrders', receivables: 'canViewReceivables',
  products: undefined, visits: 'canViewSales', 'stock-lots': 'canViewInventory', 'stock-moves': 'canViewInventory',
};

/**
 * Permission needed to READ a generic collection (GET /api/collections/:name).
 * Not listed → any signed-in staff (branches, categories, rewards, promotions…).
 */
export const COLLECTION_READ_PERM: Record<string, Permission> = {
  campaigns: 'canManageMarketing',
  automationRules: 'canManageMarketing',
  segments: 'canManageMarketing',
  b2bContracts: 'canManageB2BContracts',
  b2cDeals: 'canManageB2BContracts',
  salesTargets: 'canViewSales',
  referrals: 'canManageLoyalty',
  partners: 'canManageLoyalty',
  partnerPayouts: 'canManageLoyalty',
};

/** Permission needed to write each generic collection (PUT /api/collections/:name). */
export const COLLECTION_WRITE_PERM: Record<string, Permission> = {
  campaigns: 'canManageMarketing',
  automationRules: 'canManageMarketing',
  segments: 'canManageMarketing',
  b2bContracts: 'canManageB2BContracts',
  b2cDeals: 'canManageB2BContracts',
  salesTargets: 'canApproveOrders',
  promotions: 'canManageMarketing',
  loyaltyRewards: 'canManageLoyalty',
  referrals: 'canManageLoyalty',
  partners: 'canManageLoyalty',
  partnerPayouts: 'canManageLoyalty',
  branches: 'canAdminister',
  productCategories: 'canManageProducts',
  // interactions: left open to any authenticated staff (CSKH notes).
};
