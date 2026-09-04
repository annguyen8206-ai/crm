import { describe, it, expect } from 'vitest';
import { roleKeyOf, hasPerm, isAdmin, requirePerm } from '../server/rbac';

describe('roleKeyOf', () => {
  it('maps free-text roles to known keys', () => {
    expect(roleKeyOf('admin')).toBe('admin');
    expect(roleKeyOf('Ban Giám Đốc')).toBe('admin');
    expect(roleKeyOf('Quản Trị Viên Hệ Thống (Admin)')).toBe('admin');
    expect(roleKeyOf('Bác sĩ Trưởng Khoa')).toBe('doctor');
    expect(roleKeyOf('Chuyên viên Tiếp đón & Lễ Tân')).toBe('receptionist');
    expect(roleKeyOf('Khối Tư Vấn, Kinh Doanh & CSKH')).toBe('cskh_sales_consultant');
    expect(roleKeyOf('Marketing Lead')).toBe('marketing_lead');
  });
  it('defaults unknown roles to least privilege', () => {
    expect(roleKeyOf('người lạ')).toBe('receptionist');
    expect(roleKeyOf('')).toBe('receptionist');
  });
});

describe('hasPerm', () => {
  it('admin holds everything', () => {
    expect(hasPerm('admin', 'canViewFinancialBI')).toBe(true);
    expect(hasPerm('admin', 'canManageMarketing')).toBe(true);
    expect(isAdmin('Ban Giám Đốc')).toBe(true);
  });
  it('doctor cannot manage marketing or see finance', () => {
    expect(hasPerm('Bác sĩ Trưởng Khoa', 'canManageMarketing')).toBe(false);
    expect(hasPerm('Bác sĩ Trưởng Khoa', 'canViewFinancialBI')).toBe(false);
    expect(hasPerm('Bác sĩ Trưởng Khoa', 'canEditClinicalEMR')).toBe(true);
  });
  it('receptionist cannot create leads or tickets', () => {
    expect(hasPerm('Lễ tân', 'canManageB2BContracts')).toBe(false);
    expect(hasPerm('Lễ tân', 'canManageTickets')).toBe(false);
    expect(hasPerm('Lễ tân', 'canManageAppointments')).toBe(true);
  });
  it('OR semantics: any listed perm is enough', () => {
    expect(hasPerm('Bác sĩ', 'canViewFinancialBI', 'canManageAppointments')).toBe(true);
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
    const r = run('Bác sĩ Trưởng Khoa', ['canManageMarketing']);
    expect(r.nexted).toBe(false);
    expect(r.status).toBe(403);
  });
  it('401s when unauthenticated', () => {
    expect(run(undefined, ['canManageAppointments']).status).toBe(401);
  });
});
