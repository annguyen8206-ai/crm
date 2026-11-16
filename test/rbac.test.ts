import { describe, it, expect } from 'vitest';
import { getRoleConfig, isTabAllowedForRole, getAllowedTabsForRole, can } from '../src/utils/rbac';

describe('getRoleConfig', () => {
  it('maps roles to FMCG role configs', () => {
    expect(getRoleConfig('Ban Giám Đốc').defaultTab).toBe('dashboard');
    expect(getRoleConfig('Marketing Lead').defaultTab).toBe('marketing');
    expect(getRoleConfig('Nhân viên kinh doanh').defaultTab).toBe('sales');
    expect(getRoleConfig('Kế toán công nợ').defaultTab).toBe('orders');
  });

  it('fuzzy-matches free-text role names', () => {
    expect(getRoleConfig('Trưởng nhóm Marketing').roleKey).toBe('marketing_lead');
    expect(getRoleConfig('nhân viên CSKH').roleKey).toBe('cskh_sales_consultant');
    expect(getRoleConfig('RSM miền Nam').roleKey).toBe('sales_manager');
  });

  it('falls back to read-only for anything unrecognised', () => {
    expect(getRoleConfig('').roleKey).toBe('viewer');
    expect(getRoleConfig('vai trò lạ').allowedTabs).not.toContain('orders');
  });
});

describe('tabs & permissions', () => {
  it('gates tabs by role', () => {
    expect(isTabAllowedForRole('marketing', 'Nhân viên kinh doanh')).toBe(false);
    expect(isTabAllowedForRole('sales', 'Nhân viên kinh doanh')).toBe(true);
    expect(isTabAllowedForRole('dashboard', 'Ban Giám Đốc')).toBe(true);
  });

  it('every default tab is an allowed tab', () => {
    for (const r of ['Ban Giám Đốc', 'Quản lý kinh doanh', 'Nhân viên kinh doanh', 'Kế toán', 'CSKH', 'Marketing Lead', 'x']) {
      expect(getAllowedTabsForRole(r)).toContain(getRoleConfig(r).defaultTab);
    }
  });

  it('client permission checks match the server', () => {
    expect(can('Nhân viên kinh doanh', 'canApproveOrders')).toBe(false);
    expect(can('Quản lý kinh doanh', 'canApproveOrders')).toBe(true);
  });
});
