import type { Request, Response, NextFunction } from 'express';

/**
 * Server-side RBAC. The front-end already hides tabs per role (src/utils/rbac.ts);
 * this enforces the same policy on the API so a crafted request can't bypass it.
 *
 * Roles in `auth_users.role` are free text — `roleKeyOf()` normalises them to one
 * of the known keys, then PERMISSIONS decides what that key may do.
 */

export type Permission =
  | 'canViewClinicalEMR'
  | 'canEditClinicalEMR'
  | 'canManageAppointments'
  | 'canManageB2BContracts'
  | 'canManageMarketing'
  | 'canManageTickets'
  | 'canManageInsurance'
  | 'canManageLoyalty'
  | 'canViewFinancialBI'
  | 'canUseAiTriage'
  | 'canAdminister';

export type RoleKey = 'admin' | 'doctor' | 'receptionist' | 'cskh_sales_consultant' | 'marketing_lead';

const ALL: Permission[] = [
  'canViewClinicalEMR', 'canEditClinicalEMR', 'canManageAppointments', 'canManageB2BContracts',
  'canManageMarketing', 'canManageTickets', 'canManageInsurance', 'canManageLoyalty',
  'canViewFinancialBI', 'canUseAiTriage', 'canAdminister',
];

const PERMISSIONS: Record<RoleKey, Set<Permission>> = {
  admin: new Set(ALL),
  doctor: new Set<Permission>(['canViewClinicalEMR', 'canEditClinicalEMR', 'canManageAppointments', 'canUseAiTriage']),
  receptionist: new Set<Permission>(['canManageAppointments', 'canUseAiTriage']),
  cskh_sales_consultant: new Set<Permission>([
    'canManageAppointments', 'canManageB2BContracts', 'canManageTickets', 'canManageLoyalty', 'canUseAiTriage',
  ]),
  marketing_lead: new Set<Permission>(['canManageMarketing', 'canManageLoyalty']),
};

/** Fuzzy-map a free-text role to a known key (mirrors front-end getRoleConfig). */
export function roleKeyOf(role: string | undefined | null): RoleKey {
  const r = (role || '').toLowerCase();
  if (r.includes('admin') || r.includes('quản trị') || r.includes('giám đốc') || r.includes('lãnh đạo') || r.includes('hđqt') || r === 'it' || r.includes('công nghệ') || r.includes('hệ thống')) return 'admin';
  if (r.includes('bác sĩ') || r.includes('doctor') || r.includes('khoa')) return 'doctor';
  if (r.includes('tiếp đón') || r.includes('lễ tân') || r.includes('receptionist')) return 'receptionist';
  if (r.includes('marketing') || r.includes('tiếp thị')) return 'marketing_lead';
  if (r.includes('cskh') || r.includes('chăm sóc') || r.includes('kinh doanh') || r.includes('sales') || r.includes('b2b') || r.includes('tư vấn') || r.includes('consultant') || r.includes('bảo hiểm') || r.includes('insurance')) return 'cskh_sales_consultant';
  // Unknown role → least privilege.
  return 'receptionist';
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
  referrals: 'canManageLoyalty',
  partners: 'canManageLoyalty',
  partnerPayouts: 'canManageLoyalty',
  branches: 'canAdminister',
  medicalServices: 'canAdminister',
  medicalPackages: 'canAdminister',
  doctors: 'canAdminister',
  // interactions: left open to any authenticated staff (CSKH notes).
};
