// Front-end RBAC. Role → permission mapping is shared with the server
// (server/rbac.ts) so the UI never offers an action the API would reject.
import { roleKeyOf, hasPerm, type Permission, type RoleKey } from '../../server/rbac';
import type { ActiveTab } from '../types';

export { roleKeyOf, hasPerm };
export type { Permission, RoleKey };

export interface RoleConfig {
  roleKey: RoleKey;
  title: string;
  description: string;
  defaultTab: ActiveTab;
  allowedTabs: ActiveTab[];
  badge: string;
}

export const ROLE_CONFIGS: Record<RoleKey, RoleConfig> = {
  admin: {
    roleKey: 'admin',
    title: 'Ban Giám đốc / Quản trị hệ thống',
    description: 'Toàn quyền: báo cáo, khách hàng, đơn hàng, sản phẩm & bảng giá, kinh doanh, marketing, loyalty, cấu hình hệ thống.',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'customers', 'orders', 'products', 'inventory', 'sales', 'marketing', 'loyalty', 'care', 'inbox'],
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  sales_manager: {
    roleKey: 'sales_manager',
    title: 'Quản lý kinh doanh (ASM/RSM)',
    description: 'Quản lý đội sales, duyệt đơn vượt hạn mức/chiết khấu, giao chỉ tiêu, theo dõi công nợ và KPI.',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'customers', 'orders', 'products', 'inventory', 'sales', 'loyalty', 'care', 'inbox'],
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  sales_rep: {
    roleKey: 'sales_rep',
    title: 'Nhân viên kinh doanh',
    description: 'Viếng thăm điểm bán theo tuyến, check-in, lên đơn, thu nợ, chăm sóc khách hàng được giao.',
    defaultTab: 'sales',
    allowedTabs: ['dashboard', 'sales', 'customers', 'orders', 'products'],
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  accountant: {
    roleKey: 'accountant',
    title: 'Kế toán công nợ',
    description: 'Ghi nhận thanh toán, đối soát công nợ, duyệt đơn vượt hạn mức, báo cáo doanh thu, nhập xuất kho.',
    defaultTab: 'orders',
    allowedTabs: ['dashboard', 'orders', 'customers', 'products', 'inventory'],
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  warehouse_keeper: {
    roleKey: 'warehouse_keeper',
    title: 'Thủ kho',
    description: 'Nhập kho theo lô và hạn sử dụng, xuất huỷ, kiểm kê, theo dõi hàng cận date, xem đơn cần giao.',
    defaultTab: 'inventory',
    allowedTabs: ['inventory', 'products', 'orders'],
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  cskh_sales_consultant: {
    roleKey: 'cskh_sales_consultant',
    title: 'CSKH & Bán hàng online',
    description: 'Tư vấn, chốt đơn B2C qua Zalo/Facebook/hotline, xử lý khiếu nại, chăm sóc hội viên.',
    defaultTab: 'customers',
    allowedTabs: ['dashboard', 'customers', 'orders', 'products', 'loyalty', 'care', 'inbox'],
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  marketing_lead: {
    roleKey: 'marketing_lead',
    title: 'Marketing',
    description: 'Phân khúc RFM, chiến dịch Zalo/SMS, chương trình hội viên và nhắc mua lại.',
    defaultTab: 'marketing',
    allowedTabs: ['dashboard', 'marketing', 'loyalty', 'customers', 'products'],
    badge: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  viewer: {
    roleKey: 'viewer',
    title: 'Chỉ xem',
    description: 'Tài khoản chưa được gán vai trò — chỉ xem tổng quan và sản phẩm.',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'products'],
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

/**
 * The roles a staff account can hold. The account stores the KEY (permissions
 * come from it); the job title ("Chức danh") is separate free text.
 */
export const ROLE_OPTIONS: Array<{ value: RoleKey; label: string }> = [
  { value: 'admin', label: 'Quản trị / Ban Giám đốc (toàn quyền)' },
  { value: 'sales_manager', label: 'Quản lý kinh doanh (ASM/RSM)' },
  { value: 'sales_rep', label: 'Nhân viên kinh doanh / Sales thị trường' },
  { value: 'accountant', label: 'Kế toán công nợ' },
  { value: 'warehouse_keeper', label: 'Thủ kho' },
  { value: 'cskh_sales_consultant', label: 'CSKH & Bán hàng online' },
  { value: 'marketing_lead', label: 'Marketing' },
  { value: 'viewer', label: 'Chỉ xem' },
];
export const DEFAULT_STAFF_ROLE: RoleKey = 'sales_rep';

export function roleLabel(role: string | undefined | null): string {
  const key = roleKeyOf(role);
  return ROLE_OPTIONS.find(o => o.value === key)?.label || key;
}

export function getRoleConfig(role: string | undefined | null): RoleConfig {
  return ROLE_CONFIGS[roleKeyOf(role)];
}

export function isTabAllowedForRole(tab: ActiveTab, role: string | undefined | null): boolean {
  return getRoleConfig(role).allowedTabs.includes(tab);
}

export function getAllowedTabsForRole(role: string | undefined | null): ActiveTab[] {
  return getRoleConfig(role).allowedTabs;
}

export function can(role: string | undefined | null, perm: Permission): boolean {
  return hasPerm(role || undefined, perm);
}
