import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { pool } from './database';
import { verifyOtp } from './integrations/otp';

export interface AuthUser {
  id: string;
  email: string;
  staffCode: string | null;
  name: string;
  role: string;
  roleTitle: string;
  department: string | null;
  branchId: string | null;
}

declare global {
  namespace Express { interface Request { authUser?: AuthUser } }
}

const jwtSecret = process.env.JWT_SECRET;
export const authConfigured = Boolean(jwtSecret && pool);

/**
 * Returns exactly which environment pieces are missing so the failure is
 * diagnosable from /api/health and the startup log instead of a generic 401.
 */
export function authStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!jwtSecret) missing.push('JWT_SECRET');
  if (!process.env.AUTH_BOOTSTRAP_EMAIL) missing.push('AUTH_BOOTSTRAP_EMAIL');
  if (!process.env.AUTH_BOOTSTRAP_PASSWORD) missing.push('AUTH_BOOTSTRAP_PASSWORD');
  return { configured: authConfigured, missing };
}

/** Minimal shape shared by pg.Pool and pg.Client. */
export interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

/** DDL for the auth schema. Each statement is idempotent and run separately so a
 *  failure names the exact statement in the log. */
const AUTH_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS auth_users (
     id TEXT PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     staff_code TEXT UNIQUE,
     name TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     role TEXT NOT NULL,
     role_title TEXT NOT NULL,
     department TEXT,
     branch_id TEXT,
     status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
     failed_attempts INTEGER NOT NULL DEFAULT 0,
     locked_until TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     last_login_at TIMESTAMPTZ
   )`,
  `ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_lower_idx ON auth_users (LOWER(email))`,
  `CREATE INDEX IF NOT EXISTS auth_users_staff_code_idx ON auth_users (LOWER(staff_code))`
];

/**
 * Creates the auth_users table + indexes if missing. Safe to call repeatedly and
 * from a standalone script (pass a pg.Client). Throws with a clear message on the
 * first failing statement so it is visible in PM2 logs.
 */
export async function ensureAuthSchema(db: Queryable): Promise<void> {
  for (const statement of AUTH_DDL) {
    try {
      await db.query(statement);
    } catch (error: any) {
      const head = statement.trim().split('\n')[0];
      throw new Error(`[auth] Failed running DDL "${head}…": ${error.message}`);
    }
  }
  const check = await db.query(`SELECT to_regclass('public.auth_users') AS tbl`);
  if (!check.rows[0]?.tbl) {
    throw new Error('[auth] auth_users still does not exist after DDL — check DB permissions / search_path.');
  }
}

/**
 * Inserts (or leaves untouched) the bootstrap admin. Returns what happened so the
 * caller can log a definitive line.
 */
export async function ensureBootstrapAdmin(db: Queryable, opts?: { email?: string; password?: string }): Promise<
  { status: 'created' | 'exists' | 'skipped'; email?: string }
> {
  const email = (opts?.email ?? process.env.AUTH_BOOTSTRAP_EMAIL)?.trim().toLowerCase();
  const password = opts?.password ?? process.env.AUTH_BOOTSTRAP_PASSWORD;
  if (!email || !password) return { status: 'skipped' };

  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO auth_users (id, email, staff_code, name, password_hash, role, role_title)
     VALUES ('bootstrap-admin', $1, 'ADMIN-001', 'Quản trị viên hệ thống', $2, 'admin', 'Quản trị viên hệ thống')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, hash]
  );
  return { status: result.rowCount ? 'created' : 'exists', email };
}

export async function initializeAuth(): Promise<void> {
  if (!pool) {
    console.warn('[auth] DATABASE_URL missing → authentication is DISABLED. Login will return 503 until it is set.');
    return;
  }

  await ensureAuthSchema(pool);
  console.log('[auth] auth_users schema verified.');

  const bootstrap = await ensureBootstrapAdmin(pool);
  if (bootstrap.status === 'created') console.log(`[auth] Bootstrap admin created: ${bootstrap.email}`);
  else if (bootstrap.status === 'exists') console.log(`[auth] Bootstrap admin already present: ${bootstrap.email}`);
  else console.warn('[auth] AUTH_BOOTSTRAP_EMAIL / AUTH_BOOTSTRAP_PASSWORD not set → no bootstrap admin created.');

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM auth_users');
  const userCount = Number(rows[0]?.count || 0);
  if (userCount === 0) {
    console.warn('[auth] auth_users is EMPTY. Nobody can log in — set AUTH_BOOTSTRAP_* and restart, or run `npm run init:auth`.');
  } else {
    console.log(`[auth] Ready — ${userCount} account(s) in auth_users.`);
  }

  if (!jwtSecret) {
    console.warn('[auth] JWT_SECRET missing → tokens cannot be issued. Login will fail until it is set.');
  }
}

/** True when the auth_users table physically exists — surfaced in /api/health. */
export async function authTableReady(): Promise<boolean> {
  if (!pool) return false;
  try {
    const { rows } = await pool.query(`SELECT to_regclass('public.auth_users') AS tbl`);
    return Boolean(rows[0]?.tbl);
  } catch {
    return false;
  }
}

const ROLE_TITLES: Record<string, string> = {
  admin: 'Quản trị viên hệ thống',
  doctor: 'Bác sĩ',
  receptionist: 'Chuyên viên Tiếp đón',
  cskh: 'Chuyên viên CSKH',
  sales: 'Chuyên viên Kinh doanh',
  marketing: 'Chuyên viên Marketing'
};

function rowToAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    staffCode: user.staff_code,
    name: user.name,
    role: user.role,
    roleTitle: user.role_title,
    department: user.department,
    branchId: user.branch_id
  };
}

export type StaffLoginResult =
  | { kind: 'session'; user: AuthUser; token: string }
  | { kind: '2fa'; preAuthToken: string; userId: string; phone: string | null; email: string };

export async function loginStaff(identifier: string, password: string): Promise<StaffLoginResult> {
  if (!pool) {
    console.error('[auth] login blocked: DATABASE_URL not configured.');
    throw new Error('Máy chủ chưa cấu hình DATABASE_URL nên chưa thể xác thực. Liên hệ quản trị viên.');
  }
  if (!jwtSecret) {
    console.error('[auth] login blocked: JWT_SECRET not configured.');
    throw new Error('Máy chủ chưa cấu hình JWT_SECRET nên chưa thể cấp phiên đăng nhập. Liên hệ quản trị viên.');
  }

  const result = await pool.query<any>(
    `SELECT * FROM auth_users WHERE LOWER(email) = LOWER($1) OR LOWER(staff_code) = LOWER($1) LIMIT 1`,
    [identifier.trim()]
  );
  const user = result.rows[0];
  const lockedOut = user?.locked_until && new Date(user.locked_until) > new Date();

  if (!user || user.status !== 'active' || lockedOut || !(await bcrypt.compare(password, user.password_hash))) {
    if (user) {
      await pool.query(
        `UPDATE auth_users
           SET failed_attempts = failed_attempts + 1,
               locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
         WHERE id = $1`,
        [user.id]
      );
    }
    const reason = !user ? 'tài khoản không tồn tại'
      : user.status !== 'active' ? 'tài khoản bị tạm khóa'
      : lockedOut ? 'tài khoản đang bị khóa tạm thời do đăng nhập sai nhiều lần'
      : 'sai mật khẩu';
    console.warn(`[auth] login failed for "${identifier}" — ${reason}.`);
    if (user && user.status !== 'active') throw new Error('Tài khoản này đã bị tạm khóa. Vui lòng liên hệ quản trị viên.');
    if (lockedOut) throw new Error('Tài khoản tạm khóa 15 phút do nhập sai quá 5 lần. Vui lòng thử lại sau.');
    throw new Error('Tài khoản hoặc mật khẩu không chính xác');
  }

  // Password OK — clear the failed-attempt counter.
  await pool.query('UPDATE auth_users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

  if (user.two_factor_enabled === true) {
    const preAuthToken = jwt.sign({ sub: user.id, scope: 'pre-2fa' }, jwtSecret, { expiresIn: '5m' });
    return { kind: '2fa', preAuthToken, userId: user.id, phone: user.phone ?? null, email: user.email };
  }

  await pool.query('UPDATE auth_users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  const authUser = rowToAuthUser(user);
  return { kind: 'session', user: authUser, token: jwt.sign(authUser, jwtSecret, { expiresIn: '8h' }) };
}

/** Verifies the short-lived token issued between password step and OTP step. */
export function verifyPreAuthToken(token: string): { userId: string } {
  if (!jwtSecret) throw new Error('Máy chủ chưa cấu hình JWT_SECRET');
  let payload: any;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new Error('Phiên xác thực 2 lớp đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (payload?.scope !== 'pre-2fa' || !payload?.sub) throw new Error('Token xác thực 2 lớp không hợp lệ');
  return { userId: String(payload.sub) };
}

/** Second step of a 2FA login: exchange (preAuthToken + OTP) for a real session token. */
export async function completeStaff2fa(preAuthToken: string, code: string): Promise<{ user: AuthUser; token: string }> {
  if (!pool || !jwtSecret) throw new Error('Authentication chưa được cấu hình');
  const { userId } = verifyPreAuthToken(preAuthToken);
  const otp = verifyOtp(`2fa:${userId}`, code);
  if (!otp.ok) throw new Error(otp.error || 'Mã OTP không đúng');

  const { rows } = await pool.query<any>('SELECT * FROM auth_users WHERE id = $1 LIMIT 1', [userId]);
  const user = rows[0];
  if (!user || user.status !== 'active') throw new Error('Tài khoản không khả dụng');

  await pool.query('UPDATE auth_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [userId]);
  const authUser = rowToAuthUser(user);
  return { user: authUser, token: jwt.sign(authUser, jwtSecret, { expiresIn: '8h' }) };
}

type StaffRecord = AuthUser & { status: string; phone: string | null; twoFactorEnabled: boolean };

function rowToStaff(row: any): StaffRecord {
  return { ...rowToAuthUser(row), status: row.status, phone: row.phone ?? null, twoFactorEnabled: row.two_factor_enabled === true };
}

export async function listStaff(): Promise<Array<StaffRecord & { lastLoginAt: string | null }>> {
  if (!pool) return [];
  const { rows } = await pool.query<any>('SELECT * FROM auth_users ORDER BY created_at ASC');
  return rows.map((row: any) => ({ ...rowToStaff(row), lastLoginAt: row.last_login_at }));
}

export async function createStaff(input: {
  email: string; password: string; name: string; role?: string; roleTitle?: string;
  staffCode?: string | null; department?: string | null; branchId?: string | null; status?: string;
  phone?: string | null; twoFactorEnabled?: boolean;
}): Promise<StaffRecord> {
  if (!pool) throw new Error('Máy chủ chưa cấu hình DATABASE_URL nên chưa thể tạo tài khoản.');
  if (!input.email || !input.password || !input.name) throw new Error('Email, mật khẩu và tên là bắt buộc');
  const role = input.role || 'receptionist';
  const roleTitle = input.roleTitle || ROLE_TITLES[role] || role;
  const id = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const hash = await bcrypt.hash(input.password, 12);
  try {
    const { rows } = await pool.query<any>(
      `INSERT INTO auth_users (id, email, staff_code, name, password_hash, role, role_title, department, branch_id, status, phone, two_factor_enabled)
       VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'active'), $11, COALESCE($12, FALSE))
       RETURNING *`,
      [id, input.email, input.staffCode || null, input.name, hash, role, roleTitle,
       input.department || null, input.branchId || null, input.status || null,
       input.phone || null, input.twoFactorEnabled ?? null]
    );
    return rowToStaff(rows[0]);
  } catch (error: any) {
    if (error.code === '23505') throw new Error('Email hoặc mã nhân viên đã tồn tại trong hệ thống');
    throw error;
  }
}

export async function updateStaff(id: string, input: {
  name?: string; role?: string; roleTitle?: string; staffCode?: string | null;
  department?: string | null; branchId?: string | null; status?: string; password?: string;
  phone?: string | null; twoFactorEnabled?: boolean;
}): Promise<StaffRecord> {
  if (!pool) throw new Error('Máy chủ chưa cấu hình DATABASE_URL nên chưa thể cập nhật tài khoản.');
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const set = (col: string, val: unknown) => { fields.push(`${col} = $${i++}`); values.push(val); };
  if (input.name !== undefined) set('name', input.name);
  if (input.role !== undefined) { set('role', input.role); set('role_title', input.roleTitle || ROLE_TITLES[input.role] || input.role); }
  else if (input.roleTitle !== undefined) set('role_title', input.roleTitle);
  if (input.staffCode !== undefined) set('staff_code', input.staffCode);
  if (input.department !== undefined) set('department', input.department);
  if (input.branchId !== undefined) set('branch_id', input.branchId);
  if (input.status !== undefined) set('status', input.status);
  if (input.phone !== undefined) set('phone', input.phone);
  if (input.twoFactorEnabled !== undefined) set('two_factor_enabled', input.twoFactorEnabled);
  if (input.password) set('password_hash', await bcrypt.hash(input.password, 12));
  if (!fields.length) throw new Error('Không có trường nào để cập nhật');
  values.push(id);
  const { rows } = await pool.query<any>(`UPDATE auth_users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (!rows.length) throw new Error('Không tìm thấy tài khoản');
  return rowToStaff(rows[0]);
}

/** Verify a session bearer token outside the middleware (e.g. SSE ?token=). */
export function verifySessionToken(token: string): AuthUser | null {
  if (!jwtSecret || !token) return null;
  try {
    return jwt.verify(token, jwtSecret) as AuthUser;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!authConfigured) { res.status(503).json({ error: 'Authentication chưa được cấu hình trên máy chủ' }); return; }
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  try { req.authUser = jwt.verify(token, jwtSecret!) as AuthUser; next(); }
  catch { res.status(401).json({ error: 'Yêu cầu đăng nhập hợp lệ' }); }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role)) { res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' }); return; }
    next();
  };
}
