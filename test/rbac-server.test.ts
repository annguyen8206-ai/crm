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
  it('exact role keys win (new accounts store the key)', () => {
    for (const k of ['admin', 'sales_manager', 'sales_rep', 'accountant', 'warehouse_keeper', 'cskh_sales_consultant', 'marketing_lead', 'viewer']) {
      expect(roleKeyOf(k)).toBe(k);
    }
  });
  it('a department word beats a generic "giám đốc" (no accidental full admin)', () => {
    expect(roleKeyOf('Giám đốc Marketing')).toBe('marketing_lead');
    expect(roleKeyOf('Phó giám đốc kho')).toBe('warehouse_keeper');
    expect(roleKeyOf('Giám đốc tài chính - Kế toán trưởng')).toBe('accountant');
    expect(roleKeyOf('Trưởng nhóm sales')).toBe('sales_manager');
    expect(roleKeyOf('Thủ quỹ')).toBe('accountant');
    expect(roleKeyOf('Tổng giám đốc')).toBe('admin');
    expect(roleKeyOf('Nhân viên kinh doanh hệ thống siêu thị')).toBe('sales_rep');
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

describe('read permissions', () => {
  it('only inbox roles can use the Zalo / Facebook inbox', () => {
    expect(hasPerm('sales_manager', 'canUseInbox')).toBe(true);
    expect(hasPerm('cskh_sales_consultant', 'canUseInbox')).toBe(true);
    for (const r of ['sales_rep', 'accountant', 'warehouse_keeper', 'marketing_lead', 'viewer']) expect(hasPerm(r, 'canUseInbox')).toBe(false);
  });
  it('warehouse keeper sees stock and orders, not customers or debt', () => {
    expect(hasPerm('warehouse_keeper', 'canViewInventory')).toBe(true);
    expect(hasPerm('warehouse_keeper', 'canViewOrders')).toBe(true);
    expect(hasPerm('warehouse_keeper', 'canViewCustomers')).toBe(false);
    expect(hasPerm('warehouse_keeper', 'canViewReceivables')).toBe(false);
  });
  it('marketing sees customers but not debt; viewer sees none of it', () => {
    expect(hasPerm('marketing_lead', 'canViewCustomers')).toBe(true);
    expect(hasPerm('marketing_lead', 'canViewReceivables')).toBe(false);
    for (const p of ['canViewCustomers', 'canViewOrders', 'canViewReceivables', 'canViewInventory', 'canViewSales'] as const) {
      expect(hasPerm('viewer', p)).toBe(false);
    }
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
