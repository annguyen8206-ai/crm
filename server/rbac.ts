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
  | 'canAdminister';

export type RoleKey =
  | 'admin'
  | 'sales_manager'
  | 'sales_rep'
  | 'accountant'
  | 'cskh_sales_consultant'
  | 'marketing_lead'
  | 'viewer';

const ALL: Permission[] = [
  'canManageCustomers', 'canManageOrders', 'canApproveOrders', 'canManageProducts', 'canManageVisits',
  'canManageB2BContracts', 'canManageMarketing', 'canManageTickets', 'canManageLoyalty',
  'canViewFinancialBI', 'canExportData', 'canAdminister',
];

const PERMISSIONS: Record<RoleKey, Set<Permission>> = {
  admin: new Set(ALL),
  sales_manager: new Set<Permission>([
    'canManageCustomers', 'canManageOrders', 'canApproveOrders', 'canManageVisits',
    'canManageB2BContracts', 'canManageTickets', 'canManageLoyalty', 'canViewFinancialBI', 'canExportData',
  ]),
  sales_rep: new Set<Permission>([
    'canManageCustomers', 'canManageOrders', 'canManageVisits', 'canManageB2BContracts',
  ]),
  accountant: new Set<Permission>(['canManageOrders', 'canApproveOrders', 'canViewFinancialBI', 'canExportData']),
  cskh_sales_consultant: new Set<Permission>([
    'canManageCustomers', 'canManageOrders', 'canManageB2BContracts', 'canManageTickets', 'canManageLoyalty',
  ]),
  marketing_lead: new Set<Permission>(['canManageMarketing', 'canManageLoyalty']),
  viewer: new Set<Permission>([]),
};

/** Fuzzy-map a free-text role to a known key (mirrors front-end getRoleConfig). */
export function roleKeyOf(role: string | undefined | null): RoleKey {
  const r = (role || '').toLowerCase().trim();
  if (r === 'sales_manager' || r.includes('quản lý kinh doanh') || r.includes('trưởng phòng kinh doanh') ||
      r.includes('giám đốc kinh doanh') || r.includes('giám sát bán hàng') || r.includes('sales manager') ||
      /\b(asm|rsm|sup)\b/.test(r)) return 'sales_manager';
  if (r.includes('admin') || r.includes('quản trị') || r.includes('giám đốc') || r.includes('lãnh đạo') || r.includes('hđqt') || r === 'it' || r.includes('công nghệ') || r.includes('hệ thống')) return 'admin';
  if (r === 'accountant' || r.includes('kế toán') || r.includes('công nợ') || r.includes('accountant')) return 'accountant';
  if (r === 'sales_rep' || r.includes('nhân viên kinh doanh') || r.includes('nvkd') || r.includes('nhân viên bán hàng') ||
      r.includes('thị trường') || r.includes('sales rep') || r.includes('sale thị trường')) return 'sales_rep';
  if (r.includes('marketing') || r.includes('tiếp thị')) return 'marketing_lead';
  if (r.includes('cskh') || r.includes('chăm sóc') || r.includes('kinh doanh') || r.includes('sales') || r.includes('b2b') || r.includes('tư vấn') || r.includes('consultant')) return 'cskh_sales_consultant';
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
