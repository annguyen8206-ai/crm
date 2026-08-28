import dotenv from 'dotenv';
import { Pool } from 'pg';
import { dbStore } from './store';

dotenv.config();

export type DbSnapshot = {
  patients: unknown[];
  appointments: unknown[];
  tickets: unknown[];
  leads: unknown[];
  invoices: unknown[];
  followUps: unknown[];
  recalls: unknown[];
  znsLogs: unknown[];
  voipCalls: unknown[];
  csatFeedbacks: unknown[];
  auditLogs: unknown[];
};

const connectionString = process.env.DATABASE_URL;
export const databaseConfigured = Boolean(connectionString);
export const pool = connectionString ? new Pool({ connectionString, max: 10, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined }) : null;

export async function initializeDatabase(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vitcrm_store (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      snapshot JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vitcrm_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vitcrm_store_updated_at_idx ON vitcrm_store (updated_at);
  `);
  const result = await pool.query<{ snapshot: Record<string, unknown> }>('SELECT snapshot FROM vitcrm_store WHERE id = 1');
  if (result.rowCount) {
    restoreStore(result.rows[0].snapshot);
  } else {
    await persistStore();
  }
}

export async function persistStore(): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO vitcrm_store (id, snapshot, updated_at) VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`,
    [JSON.stringify(createSnapshot())]
  );
}

export async function checkDatabase(): Promise<{ configured: boolean; connected: boolean; error?: string }> {
  if (!pool) return { configured: false, connected: false, error: 'DATABASE_URL chưa được cấu hình' };
  try {
    await pool.query('SELECT 1');
    return { configured: true, connected: true };
  } catch (error: any) {
    return { configured: true, connected: false, error: error.message };
  }
}

function createSnapshot(): DbSnapshot {
  return {
    patients: dbStore.patients,
    appointments: dbStore.appointments,
    tickets: dbStore.tickets,
    leads: dbStore.leads,
    invoices: dbStore.invoices,
    followUps: dbStore.followUps,
    recalls: dbStore.recalls,
    znsLogs: dbStore.znsLogs,
    voipCalls: dbStore.voipCalls,
    csatFeedbacks: dbStore.csatFeedbacks,
    auditLogs: dbStore.auditLogs
  };
}

function restoreStore(snapshot: Partial<DbSnapshot>): void {
  const store = dbStore as unknown as Record<string, unknown>;
  const source = snapshot as Record<keyof DbSnapshot, unknown>;
  for (const key of Object.keys(createSnapshot()) as Array<keyof DbSnapshot>) {
    const value = source[key];
    if (Array.isArray(value)) store[key] = value;
  }
}
