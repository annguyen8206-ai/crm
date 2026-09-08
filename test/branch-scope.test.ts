import { describe, it, expect } from 'vitest';
import { branchScope, scopeList, canAccessBranch, enforceBranchOnCreate } from '../server/branch-scope';

const req = (role: string, branchId: string | null): any => ({ authUser: { role, branchId } });
const rows = [
  { id: 'a', branchId: 'hn-central' },
  { id: 'b', branchId: 'hn-caugiay' },
  { id: 'c', branchId: '' },
  { id: 'd' },
];

describe('branchScope', () => {
  it('is null for admins even with a branch', () => {
    expect(branchScope(req('Quản Trị Viên Hệ Thống (Admin)', 'hn-central'))).toBeNull();
  });
  it('is null for HQ / ALL / empty', () => {
    expect(branchScope(req('Chuyên viên Tiếp đón', 'ALL'))).toBeNull();
    expect(branchScope(req('Chuyên viên Tiếp đón', ''))).toBeNull();
    expect(branchScope(req('Chuyên viên Tiếp đón', null))).toBeNull();
  });
  it('is the branch id for a branch-locked non-admin', () => {
    expect(branchScope(req('Chuyên viên Tiếp đón', 'hn-caugiay'))).toBe('hn-caugiay');
  });
});

describe('scopeList', () => {
  it('returns everything for an unrestricted request', () => {
    expect(scopeList(req('Chuyên viên Tiếp đón', 'ALL'), rows, r => r.branchId)).toHaveLength(4);
  });
  it('keeps only the matching branch and hides branch-less rows', () => {
    const out = scopeList(req('Chuyên viên Tiếp đón', 'hn-central'), rows, r => r.branchId);
    expect(out.map(r => r.id)).toEqual(['a']);
  });
});

describe('canAccessBranch', () => {
  const r = req('Chuyên viên Tiếp đón', 'hn-central');
  it('allows the own branch, blocks others and blank', () => {
    expect(canAccessBranch(r, 'hn-central')).toBe(true);
    expect(canAccessBranch(r, 'hn-caugiay')).toBe(false);
    expect(canAccessBranch(r, '')).toBe(false);
  });
  it('always allows an unrestricted request', () => {
    expect(canAccessBranch(req('Ban Giám Đốc', 'ALL'), 'anything')).toBe(true);
  });
});

describe('enforceBranchOnCreate', () => {
  it('pins a locked account to its branch, ignoring the requested value', () => {
    expect(enforceBranchOnCreate(req('Chuyên viên Tiếp đón', 'hn-central'), 'hn-caugiay')).toBe('hn-central');
  });
  it('keeps the requested value for an unrestricted account', () => {
    expect(enforceBranchOnCreate(req('Ban Giám Đốc', 'ALL'), 'beauty-center')).toBe('beauty-center');
  });
});
