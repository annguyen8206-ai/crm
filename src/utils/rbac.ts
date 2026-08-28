import { ActiveTab, UserRole } from '../types';

export interface RoleConfig {
  id: string;
  roleKey: string;
  title: string;
  shortTitle: string;
  department: string;
  badgeColor: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  description: string;
  defaultTab: ActiveTab;
  allowedTabs: ActiveTab[];
  permissions: {
    canViewClinicalEMR: boolean; // Xem lịch sử hồ sơ khách hàng 360°, ghi chú CSKH
    canEditClinicalEMR: boolean; // Cập nhật hồ sơ, ghi chú tư vấn
    canManageAppointments: boolean; // Đặt lịch, check-in, đổi giờ
    canManageB2BContracts: boolean; // Tạo, sửa hợp đồng KSK Doanh nghiệp
    canManageMarketing: boolean; // Tạo campaign ZNS, automation rules
    canManageTickets: boolean; // Xử lý ticket khiếu nại CSKH
    canManageInsurance: boolean; // Quản lý quyền lợi & bảo hiểm khách hàng
    canManageLoyalty: boolean; // Duyệt hoa hồng referral, voucher
    canViewFinancialBI: boolean; // Xem doanh thu, giá trị vòng đời khách hàng
    canUseAiTriage: boolean; // Dùng trợ lý AI CSKH
  };
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  'Quản Trị Viên Hệ Thống (Admin)': {
    id: 'role-sysadmin',
    roleKey: 'admin',
    title: 'Quản Trị Viên Hệ Thống (Admin & IT)',
    shortTitle: 'Admin Hệ Thống (IT)',
    department: 'Phòng Công Nghệ Thông Tin (IT & Chuyển Đổi Số)',
    badgeColor: 'bg-slate-900 text-cyan-300 border-cyan-500/40',
    bgLight: 'bg-slate-800',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500',
    description: 'Toàn quyền cấu hình hệ thống, quản trị phân quyền nhân viên, cơ sở dữ liệu và tích hợp các kênh truyền thông CSKH (Zalo ZNS, VoIP, SMS).',
    defaultTab: 'dashboard',
    allowedTabs: [
      'dashboard',
      'patients',
      'appointments',
      'sales',
      'marketing',
      'care',
      'inbox',
      'catalog',
      'billing',
      'loyalty'
    ],
    permissions: {
      canViewClinicalEMR: true,
      canEditClinicalEMR: true,
      canManageAppointments: true,
      canManageB2BContracts: true,
      canManageMarketing: true,
      canManageTickets: true,
      canManageInsurance: true,
      canManageLoyalty: true,
      canViewFinancialBI: true,
      canUseAiTriage: true
    }
  },

  'Ban Giám Đốc': {
    id: 'role-admin',
    roleKey: 'admin',
    title: 'Ban Giám Đốc (Quản trị Toàn diện)',
    shortTitle: 'Ban Giám Đốc',
    department: 'Ban Lãnh Đạo & HĐQT',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    description: 'Toàn quyền truy cập tất cả phân hệ: Báo cáo tài chính BI, Hồ sơ khách hàng 360°, KSK Doanh nghiệp B2B, Marketing Automation, CSKH & Quản trị SLA, Loyalty.',
    defaultTab: 'dashboard',
    allowedTabs: [
      'dashboard',
      'patients',
      'appointments',
      'sales',
      'marketing',
      'care',
      'inbox',
      'catalog',
      'billing',
      'loyalty'
    ],
    permissions: {
      canViewClinicalEMR: true,
      canEditClinicalEMR: true,
      canManageAppointments: true,
      canManageB2BContracts: true,
      canManageMarketing: true,
      canManageTickets: true,
      canManageInsurance: false,
      canManageLoyalty: true,
      canViewFinancialBI: true,
      canUseAiTriage: true
    }
  },

  'Bác sĩ Trưởng Khoa': {
    id: 'role-doctor',
    roleKey: 'doctor',
    title: 'Bác sĩ Trưởng Khoa & Cố Vấn',
    shortTitle: 'Bác sĩ Cố Vấn',
    department: 'Khối Chuyên Môn & Tư Vấn',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Tập trung lịch khám và tư vấn khách hàng: Lịch khám phòng khám, Hồ sơ khách hàng 360°, Lịch hẹn đặt trực tuyến.',
    defaultTab: 'appointments',
    allowedTabs: [
      'dashboard',
      'patients',
      'appointments'
    ],
    permissions: {
      canViewClinicalEMR: true,
      canEditClinicalEMR: true,
      canManageAppointments: true,
      canManageB2BContracts: false,
      canManageMarketing: false,
      canManageTickets: false,
      canManageInsurance: false,
      canManageLoyalty: false,
      canViewFinancialBI: false,
      canUseAiTriage: true
    }
  },

  'Chuyên viên Tiếp đón': {
    id: 'role-receptionist',
    roleKey: 'receptionist',
    title: 'Chuyên viên Tiếp đón & Lễ Tân',
    shortTitle: 'Lễ Tân / Tiếp Đón',
    department: 'Bộ phận Tiếp tân & Điều phối Sảnh',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    description: 'Nhiệm vụ tiếp đón tại quầy: Check-in khách hàng, Điều phối phòng khám, Đặt lịch hẹn mới, Tra cứu hồ sơ khách hàng.',
    defaultTab: 'appointments',
    allowedTabs: [
      'appointments',
      'patients',
      'inbox',
      'billing'
    ],
    permissions: {
      canViewClinicalEMR: false,
      canEditClinicalEMR: false,
      canManageAppointments: true,
      canManageB2BContracts: false,
      canManageMarketing: false,
      canManageTickets: false,
      canManageInsurance: false,
      canManageLoyalty: false,
      canViewFinancialBI: false,
      canUseAiTriage: true
    }
  },

  'Tư Vấn, Kinh Doanh & CSKH': {
    id: 'role-cskh-sales-consultant',
    roleKey: 'cskh_sales_consultant',
    title: 'Khối Tư Vấn, Kinh Doanh & CSKH',
    shortTitle: 'Tư Vấn, KD & CSKH',
    department: 'Khối Tư Vấn, Kinh Doanh & Chăm Sóc Khách Hàng',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Hợp nhất toàn diện nghiệp vụ khách hàng: Tư vấn & xác nhận lịch khám, Phát triển hợp đồng KSK doanh nghiệp B2B & Deals gói khám, Xử lý khiếu nại Ticket SLA, Cuộc gọi sau khám D+3 và Quản trị Hội viên & Tích điểm.',
    defaultTab: 'care',
    allowedTabs: [
      'care',
      'inbox',
      'sales',
      'catalog',
      'billing',
      'appointments',
      'patients',
      'loyalty',
      'dashboard'
    ],
    permissions: {
      canViewClinicalEMR: false,
      canEditClinicalEMR: false,
      canManageAppointments: true,
      canManageB2BContracts: true,
      canManageMarketing: false,
      canManageTickets: true,
      canManageInsurance: false,
      canManageLoyalty: true,
      canViewFinancialBI: false,
      canUseAiTriage: true
    }
  },

  'Marketing Lead': {
    id: 'role-marketing',
    roleKey: 'marketing_lead',
    title: 'Marketing Lead & Automation',
    shortTitle: 'Marketing Lead',
    department: 'Phòng Truyền Thông & Tăng Trưởng',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    description: 'Nhiệm vụ tăng trưởng tệp khách hàng: Kịch bản Zalo ZNS / SMS tự động, Phân khúc khách hàng Target, Báo cáo hiệu quả ROI chiến dịch tiếp thị.',
    defaultTab: 'marketing',
    allowedTabs: [
      'marketing',
      'inbox',
      'loyalty',
      'dashboard',
      'patients'
    ],
    permissions: {
      canViewClinicalEMR: false,
      canEditClinicalEMR: false,
      canManageAppointments: false,
      canManageB2BContracts: false,
      canManageMarketing: true,
      canManageTickets: false,
      canManageInsurance: false,
      canManageLoyalty: true,
      canViewFinancialBI: false,
      canUseAiTriage: false
    }
  }
};

/**
 * Normalizes role string to standard configuration
 */
export function getRoleConfig(roleName: UserRole | string): RoleConfig {
  if (ROLE_CONFIGS[roleName]) {
    return ROLE_CONFIGS[roleName];
  }
  
  // Fuzzy match by key or partial name
  const roleLower = (roleName || '').toLowerCase();
  if (roleLower.includes('quản trị viên') || roleLower.includes('sysadmin') || roleLower.includes('admin') || roleLower.includes('it') || roleLower.includes('công nghệ') || roleLower.includes('hệ thống')) {
    return ROLE_CONFIGS['Quản Trị Viên Hệ Thống (Admin)'];
  }
  if (roleLower.includes('giám đốc') || roleLower.includes('lãnh đạo') || roleLower.includes('hđqt')) {
    return ROLE_CONFIGS['Ban Giám Đốc'];
  }
  if (roleLower.includes('bác sĩ') || roleLower.includes('doctor') || roleLower.includes('khoa')) {
    return ROLE_CONFIGS['Bác sĩ Trưởng Khoa'];
  }
  if (roleLower.includes('tiếp đón') || roleLower.includes('lễ tân') || roleLower.includes('receptionist')) {
    return ROLE_CONFIGS['Chuyên viên Tiếp đón'];
  }
  if (
    roleLower.includes('cskh') ||
    roleLower.includes('chăm sóc') ||
    roleLower.includes('kinh doanh') ||
    roleLower.includes('sales') ||
    roleLower.includes('b2b') ||
    roleLower.includes('tư vấn') ||
    roleLower.includes('consultant')
  ) {
    return ROLE_CONFIGS['Tư Vấn, Kinh Doanh & CSKH'];
  }
  if (roleLower.includes('marketing') || roleLower.includes('tiếp thị')) {
    return ROLE_CONFIGS['Marketing Lead'];
  }
  if (roleLower.includes('bảo hiểm') || roleLower.includes('insurance')) {
    return ROLE_CONFIGS['Ban Giám Đốc'];
  }

  return ROLE_CONFIGS['Ban Giám Đốc'];
}

/**
 * Checks if a tab is allowed for a given role
 */
export function isTabAllowedForRole(tabId: ActiveTab, roleName: UserRole | string): boolean {
  const config = getRoleConfig(roleName);
  return config.allowedTabs.includes(tabId);
}

/**
 * Returns list of allowed tabs for a role
 */
export function getAllowedTabsForRole(roleName: UserRole | string): ActiveTab[] {
  const config = getRoleConfig(roleName);
  return config.allowedTabs;
}
