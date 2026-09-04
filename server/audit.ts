import { pool } from './database';

/**
 * Append-only audit trail in a dedicated `audit_log` table (NOT the JSONB
 * snapshot, so it isn't capped at 200 rows or rewritten on every request).
 * Writes are fire-and-forget; a logging failure never blocks a request.
 */

export interface AuditEntry {
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: string;
  details: string;
  ip?: string;
}

export async function ensureAuditSchema(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id TEXT,
      user_name TEXT,
      role TEXT,
      action TEXT NOT NULL,
      module TEXT,
      details TEXT,
      ip TEXT
    );
    CREATE INDEX IF NOT EXISTS audit_log_ts_idx ON audit_log (ts DESC);
    CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action);
  `);
}

export function recordAudit(e: AuditEntry): void {
  if (!pool) return;
  pool.query(
    `INSERT INTO audit_log (user_id, user_name, role, action, module, details, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [e.userId || 'system', e.userName || '', e.role || '', e.action, e.module || '', (e.details || '').slice(0, 2000), e.ip || '']
  ).catch(err => console.warn('[audit] insert failed:', err.message));
}

export async function queryAudit(opts: { limit?: number; offset?: number; action?: string; userId?: string } = {}) {
  if (!pool) return { logs: [], total: 0 };
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const offset = Math.max(0, opts.offset ?? 0);
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.action) { params.push(opts.action); where.push(`action = $${params.length}`); }
  if (opts.userId) { params.push(opts.userId); where.push(`user_id = $${params.length}`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRes = await pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM audit_log ${clause}`, params);
  params.push(limit, offset);
  const rows = await pool.query(
    `SELECT id, ts, user_id AS "userId", user_name AS "userName", role, action, module, details, ip
     FROM audit_log ${clause} ORDER BY ts DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { logs: rows.rows, total: Number(totalRes.rows[0]?.c || 0), limit, offset };
}
