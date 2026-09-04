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
  conversations: unknown[];
  messages: unknown[];
  collections: Record<string, unknown[]>;
};

const connectionString = process.env.DATABASE_URL;
export const databaseConfigured = Boolean(connectionString);
export const pool = connectionString ? new Pool({ connectionString, max: 10, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined }) : null;

// How many previous snapshots to keep for recovery.
const HISTORY_LIMIT = 50;

// Optimistic-concurrency version of the row we last read/wrote. Every persist
// does a compare-and-swap on this; a mismatch means another process (or a
// second app instance) wrote in between — we reload and retry instead of
// blindly clobbering their write.
let currentVersion = 0;

// Write serialisation: the whole in-memory store is flushed as one JSONB row,
// so overlapping writes are pointless work and can interleave on the DB. We run
// at most one persist at a time and coalesce any requests that arrive while one
// is in flight into a single follow-up flush.
let inFlight: Promise<void> | null = null;
let rerunQueued = false;

export async function initializeDatabase(): Promise<void> {
  if (!pool) return;
  // The whole application state is one JSONB row in vitcrm_store; auth lives in
  // auth_users (see server/auth.ts). vitcrm_store_history keeps the last
  // HISTORY_LIMIT snapshots so a bad write can be rolled back by hand.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vitcrm_store (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      snapshot JSONB NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE vitcrm_store ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS vitcrm_store_updated_at_idx ON vitcrm_store (updated_at);
    CREATE TABLE IF NOT EXISTS vitcrm_store_history (
      id BIGSERIAL PRIMARY KEY,
      snapshot JSONB NOT NULL,
      version BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vitcrm_store_history_created_at_idx ON vitcrm_store_history (created_at DESC);
  `);

  // Cluster/multi-instance mode silently loses writes with this storage model
  // (each instance holds its own copy of dbStore). Warn loudly if we can tell.
  const instanceHint = process.env.NODE_APP_INSTANCE || process.env.WEB_CONCURRENCY;
  if (instanceHint && instanceHint !== '0' && instanceHint !== '1') {
    console.warn(
      `[persist] WARNING: detected multi-instance hint (${instanceHint}). The JSONB-snapshot ` +
      `store is single-writer — run VitCRM as ONE instance (PM2 "fork" mode, not "cluster").`
    );
  }

  const result = await pool.query<{ snapshot: Record<string, unknown>; version: string }>(
    'SELECT snapshot, version FROM vitcrm_store WHERE id = 1'
  );
  if (result.rowCount) {
    restoreStore(result.rows[0].snapshot);
    currentVersion = Number(result.rows[0].version) || 0;
  } else {
    await pool.query(
      `INSERT INTO vitcrm_store (id, snapshot, version, updated_at) VALUES (1, $1::jsonb, 0, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(createSnapshot())]
    );
    currentVersion = 0;
  }
}

/**
 * Flush the in-memory store to Postgres. Safe to call on every write: calls are
 * serialised and coalesced, so a burst of N writes results in at most 2 DB
 * round-trips. Never rejects — persistence errors are logged, not thrown.
 */
export async function persistStore(): Promise<void> {
  if (!pool) return;
  if (inFlight) {
    // A flush is already running; make sure one more runs afterwards to capture
    // whatever changed since it started.
    rerunQueued = true;
    return inFlight;
  }
  inFlight = doPersist().finally(() => {
    inFlight = null;
    if (rerunQueued) {
      rerunQueued = false;
      void persistStore();
    }
  });
  return inFlight;
}

/** Await any pending flush — for graceful shutdown / tests. */
export async function flushStore(): Promise<void> {
  while (inFlight) await inFlight;
}

async function doPersist(): Promise<void> {
  if (!pool) return;
  const payload = JSON.stringify(createSnapshot());
  try {
    let res = await pool.query<{ version: string }>(
      `UPDATE vitcrm_store SET snapshot = $1::jsonb, version = version + 1, updated_at = NOW()
       WHERE id = 1 AND version = $2 RETURNING version`,
      [payload, currentVersion]
    );

    if (res.rowCount === 0) {
      // Someone else advanced the row. Pull their state in, then retry once.
      console.warn(`[persist] version conflict (had v${currentVersion}); reloading and retrying once.`);
      const fresh = await pool.query<{ snapshot: Record<string, unknown>; version: string }>(
        'SELECT snapshot, version FROM vitcrm_store WHERE id = 1'
      );
      if (fresh.rowCount) {
        restoreStore(fresh.rows[0].snapshot);
        currentVersion = Number(fresh.rows[0].version) || 0;
      }
      const merged = JSON.stringify(createSnapshot());
      res = await pool.query<{ version: string }>(
        `UPDATE vitcrm_store SET snapshot = $1::jsonb, version = version + 1, updated_at = NOW()
         WHERE id = 1 AND version = $2 RETURNING version`,
        [merged, currentVersion]
      );
      if (res.rowCount === 0) {
        console.error('[persist] repeated version conflict — forcing write (concurrent writer will be overwritten).');
        res = await pool.query<{ version: string }>(
          `UPDATE vitcrm_store SET snapshot = $1::jsonb, version = version + 1, updated_at = NOW()
           WHERE id = 1 RETURNING version`,
          [merged]
        );
      }
    }

    if (res.rowCount) currentVersion = Number(res.rows[0].version) || currentVersion + 1;

    // Best-effort history append; never let it break a persist.
    try {
      await pool.query(
        `INSERT INTO vitcrm_store_history (snapshot, version) VALUES ($1::jsonb, $2)`,
        [payload, currentVersion]
      );
      await pool.query(
        `DELETE FROM vitcrm_store_history
         WHERE id NOT IN (SELECT id FROM vitcrm_store_history ORDER BY created_at DESC LIMIT $1)`,
        [HISTORY_LIMIT]
      );
    } catch (historyErr: any) {
      console.warn('[persist] history append failed:', historyErr.message);
    }
  } catch (err: any) {
    console.error('[persist] failed to write snapshot:', err.message);
  }
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
    // auditLogs is NOT snapshotted — it lives in the append-only audit_log table.
    conversations: dbStore.conversations,
    messages: dbStore.messages,
    collections: dbStore.collections
  };
}

function restoreStore(snapshot: Partial<DbSnapshot>): void {
  const store = dbStore as unknown as Record<string, unknown>;
  const source = snapshot as Record<keyof DbSnapshot, unknown>;
  for (const key of Object.keys(createSnapshot()) as Array<keyof DbSnapshot>) {
    const value = source[key];
    if (key === 'collections') {
      if (value && typeof value === 'object' && !Array.isArray(value)) store[key] = value;
    } else if (Array.isArray(value)) {
      store[key] = value;
    }
  }
}
