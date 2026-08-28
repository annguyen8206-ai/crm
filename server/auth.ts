import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { pool } from './database';

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

export async function initializeAuth(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
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
    );
    CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth_users (LOWER(email));
  `);
  const email = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_BOOTSTRAP_PASSWORD;
  if (email && password) {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(`INSERT INTO auth_users (id, email, staff_code, name, password_hash, role, role_title)
      VALUES ('bootstrap-admin', $1, 'ADMIN-001', 'Quản trị viên hệ thống', $2, 'admin', 'Quản trị viên hệ thống')
      ON CONFLICT (email) DO NOTHING`, [email, hash]);
  }
}

export async function loginStaff(identifier: string, password: string): Promise<AuthUser & { token: string }> {
  if (!pool || !jwtSecret) throw new Error('Authentication chưa được cấu hình');
  const result = await pool.query<any>(`SELECT * FROM auth_users WHERE LOWER(email) = LOWER($1) OR LOWER(staff_code) = LOWER($1) LIMIT 1`, [identifier.trim()]);
  const user = result.rows[0];
  if (!user || user.status !== 'active' || (user.locked_until && new Date(user.locked_until) > new Date()) || !(await bcrypt.compare(password, user.password_hash))) {
    if (user) await pool.query('UPDATE auth_users SET failed_attempts = failed_attempts + 1, locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL \'15 minutes\' ELSE locked_until END WHERE id = $1', [user.id]);
    throw new Error('Tài khoản hoặc mật khẩu không chính xác');
  }
  await pool.query('UPDATE auth_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [user.id]);
  const authUser: AuthUser = { id: user.id, email: user.email, staffCode: user.staff_code, name: user.name, role: user.role, roleTitle: user.role_title, department: user.department, branchId: user.branch_id };
  return { ...authUser, token: jwt.sign(authUser, jwtSecret, { expiresIn: '8h' }) };
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
