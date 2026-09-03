import { describe, it, expect } from 'vitest';
import { getRoleConfig, isTabAllowedForRole, getAllowedTabsForRole } from '../src/utils/rbac';

describe('getRoleConfig', () => {
  it('returns the exact config for a known role key', () => {
    expect(getRoleConfig('Ban Giám Đốc').defaultTab).toBe('dashboard');
    expect(getRoleConfig('Marketing Lead').defaultTab).toBe('marketing');
  });

  it('fuzzy-matches partial / free-text role names', () => {
    expect(getRoleConfig('Trưởng nhóm Marketing').roleKey).toBe('marketing_lead');
    expect(getRoleConfig('Lễ tân sảnh A').roleKey).toBe('receptionist');
    expect(getRoleConfig('BÁC SĨ nội trú').roleKey).toBe('doctor');
    expect(getRoleConfig('nhân viên CSKH').roleKey).toBe('cskh_sales_consultant');
  });

  it('falls back to Ban Giám Đốc for anything unrecognised', () => {
    expect(getRoleConfig('').id).toBe('role-admin');
    expect(getRoleConfig('vai trò lạ').id).toBe('role-admin');
  });
});

describe('isTabAllowedForRole', () => {
  it('gates tabs by role', () => {
    expect(isTabAllowedForRole('marketing', 'Bác sĩ Trưởng Khoa')).toBe(false);
    expect(isTabAllowedForRole('appointments', 'Bác sĩ Trưởng Khoa')).toBe(true);
    expect(isTabAllowedForRole('dashboard', 'Ban Giám Đốc')).toBe(true);
  });

  it('getAllowedTabsForRole is consistent with isTabAllowedForRole', () => {
    for (const tab of getAllowedTabsForRole('Marketing Lead')) {
      expect(isTabAllowedForRole(tab, 'Marketing Lead')).toBe(true);
    }
  });
});
