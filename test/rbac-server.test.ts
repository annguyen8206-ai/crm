import { describe, it, expect } from 'vitest';
import { roleKeyOf, hasPerm, isAdmin, requirePerm } from '../server/rbac';

describe('roleKeyOf', () => {
  it('maps free-text roles to known keys', () => {
    expect(roleKeyOf('admin')).toBe('admin');
    expect(roleKeyOf('Ban Giám Đốc')).toBe('admin');
    expect(roleKeyOf('Quản Trị Viên Hệ Thống (Admin)')).toBe('admin');
    expect(roleKeyOf('Giám đốc kinh doanh')).toBe('sales_manager');
    expect(roleKeyOf('Quản lý Kinh doanh B2B')).toBe('sales_manager');
    expect(roleKeyOf('ASM Miền Bắc')).toBe('sales_manager');
    expect(roleKeyOf('Nhân viên kinh doanh')).toBe('sales_rep');
    expect(roleKeyOf('Sales thị trường')).toBe('sales_rep');
    expect(roleKeyOf('Kế toán công nợ')).toBe('accountant');
    expect(roleKeyOf('Khối Tư Vấn, Kinh Doanh & CSKH')).toBe('cskh_sales_consultant');
    expect(roleKeyOf('Marketing Lead')).toBe('marketing_lead');
  });
  it('defaults unknown roles to least privilege', () => {
    expect(roleKeyOf('người lạ')).toBe('viewer');
    expect(roleKeyOf('')).toBe('viewer');
    expect(hasPerm('người lạ', 'canManageOrders', 'canManageCustomers')).toBe(false);
  });
});

describe('hasPerm', () => {
  it('admin holds everything', () => {
    expect(hasPerm('admin', 'canViewFinancialBI')).toBe(true);
    expect(hasPerm('admin', 'canManageMarketing')).toBe(true);
    expect(hasPerm('admin', 'canManageProducts')).toBe(true);
    expect(isAdmin('Ban Giám Đốc')).toBe(true);
  });
  it('sales rep sells but cannot approve or see company finance', () => {
    expect(hasPerm('Nhân viên kinh doanh', 'canManageOrders')).toBe(true);
    expect(hasPerm('Nhân viên kinh doanh', 'canManageVisits')).toBe(true);
    expect(hasPerm('Nhân viên kinh doanh', 'canApproveOrders')).toBe(false);
    expect(hasPerm('Nhân viên kinh doanh', 'canViewFinancialBI')).toBe(false);
    expect(hasPerm('Nhân viên kinh doanh', 'canManageProducts')).toBe(false);
  });
  it('sales manager and accountant can approve orders', () => {
    expect(hasPerm('Quản lý kinh doanh', 'canApproveOrders')).toBe(true);
    expect(hasPerm('Kế toán', 'canApproveOrders')).toBe(true);
    expect(hasPerm('Kế toán', 'canManageCustomers')).toBe(false);
  });
  it('marketing manages campaigns, not orders', () => {
    expect(hasPerm('Marketing Lead', 'canManageMarketing')).toBe(true);
    expect(hasPerm('Marketing Lead', 'canManageOrders')).toBe(false);
  });
  it('OR semantics: any listed perm is enough', () => {
    expect(hasPerm('Kế toán', 'canManageMarketing', 'canManageOrders')).toBe(true);
  });
});

describe('requirePerm middleware', () => {
  const run = (role: string | undefined, perms: any[]) => {
    let status = 200; let body: any = null; let nexted = false;
    const req: any = { authUser: role ? { role } : undefined };
    const res: any = { status(c: number) { status = c; return this; }, json(b: any) { body = b; return this; } };
    requirePerm(...perms)(req, res, () => { nexted = true; });
    return { status, body, nexted };
  };
  it('calls next() when permitted', () => {
    expect(run('admin', ['canManageMarketing']).nexted).toBe(true);
  });
  it('403s when the role lacks the perm', () => {
    const r = run('Nhân viên kinh doanh', ['canManageMarketing']);
    expect(r.nexted).toBe(false);
    expect(r.status).toBe(403);
  });
  it('401s when unauthenticated', () => {
    expect(run(undefined, ['canManageOrders']).status).toBe(401);
  });
});
