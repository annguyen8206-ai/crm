import type { Request } from 'express';
import { isAdmin } from './rbac';

/**
 * Branch-level data isolation.
 *
 * A staff account (`auth_users.branch_id`, surfaced as `req.authUser.branchId`)
 * is either:
 *   - null / '' / 'ALL'  → head-office / multi-branch: sees everything
 *   - a specific branch id → "branch-locked": sees only that branch's data
 * Admins are never branch-locked, regardless of their branch_id.
 *
 * Records with no `branchId` are hidden from branch-locked users (fail closed).
 */

/** The branch this request is locked to, or null when it may see everything. */
export function branchScope(req: Request): string | null {
  const u = req.authUser;
  if (!u || isAdmin(u.role)) return null;
  const b = String(u.branchId || '').trim();
  if (!b || b.toUpperCase() === 'ALL') return null;
  return b;
}

/**
 * The branch an unrestricted user picked in the navbar branch selector
 * (`X-View-Branch` header). It only NARROWS lists — it never widens what a
 * branch-locked user may see, and it does not affect per-record access checks
 * (so a head-office user can still open a record linked from another branch).
 */
export function viewBranch(req: Request): string | null {
  const raw = req.headers?.['x-view-branch'];
  const b = String(Array.isArray(raw) ? raw[0] : raw || '').trim().slice(0, 80);
  if (!b || b.toUpperCase() === 'ALL') return null;
  return b;
}

/** Filter a list to the request's branch (lock, else the selected view branch). */
export function scopeList<T>(
  req: Request,
  rows: T[],
  getBranch: (r: T) => string | undefined | null
): T[] {
  const scope = branchScope(req) ?? viewBranch(req);
  if (!scope) return rows;
  return rows.filter(r => String(getBranch(r) || '') === scope);
}

/** Whether a branch-locked request may read/write a record of this branch. */
export function canAccessBranch(req: Request, recordBranchId: string | undefined | null): boolean {
  const scope = branchScope(req);
  if (!scope) return true;
  return String(recordBranchId || '') === scope;
}

/** For POSTs: pin a new record to the caller's branch when they are branch-locked. */
export function enforceBranchOnCreate<T extends string | undefined | null>(
  req: Request,
  requested: T
): string | T {
  return branchScope(req) ?? requested;
}
