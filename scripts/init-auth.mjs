/**
 * Standalone Authentication bootstrap — no build step, no tsx required.
 *
 *   npm run init:auth
 *   npm run init:auth -- --email you@example.com --password 'S3cret!'
 *
 * Creates the `auth_users` table + indexes and the bootstrap admin using the
 * same DATABASE_URL / DATABASE_SSL / AUTH_BOOTSTRAP_* environment the server uses
 * (loaded from .env). Run this on the VPS if `auth_users` is missing — it does
 * NOT require restarting PM2. Idempotent: safe to run repeatedly.
 *
 * Keep the DDL below in sync with server/auth.ts (ensureAuthSchema).
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const AUTH_DDL = [
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
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_lower_idx ON auth_users (LOWER(email))`,
  `CREATE INDEX IF NOT EXISTS auth_users_staff_code_idx ON auth_users (LOWER(staff_code))`
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('✗ DATABASE_URL is not set (checked after loading .env). Aborting.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();
  console.log('✓ Connected to PostgreSQL.');

  console.log('→ Ensuring auth_users schema…');
  for (const statement of AUTH_DDL) {
    try {
      await client.query(statement);
    } catch (error) {
      console.error(`✗ Failed on: ${statement.trim().split('\n')[0]}…`);
      throw error;
    }
  }
  const reg = await client.query(`SELECT to_regclass('public.auth_users') AS tbl`);
  if (!reg.rows[0]?.tbl) throw new Error('auth_users still missing after DDL — check DB role privileges / search_path.');
  console.log('✓ auth_users table + indexes present.');

  const email = (argValue('--email') || process.env.AUTH_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = argValue('--password') || process.env.AUTH_BOOTSTRAP_PASSWORD || '';
  if (email && password) {
    const hash = await bcrypt.hash(password, 12);
    const result = await client.query(
      `INSERT INTO auth_users (id, email, staff_code, name, password_hash, role, role_title)
       VALUES ('bootstrap-admin', $1, 'ADMIN-001', 'Quản trị viên hệ thống', $2, 'admin', 'Quản trị viên hệ thống')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, hash]
    );
    console.log(result.rowCount ? `✓ Bootstrap admin CREATED: ${email}` : `✓ Bootstrap admin already exists: ${email}`);
  } else {
    console.warn('⚠ No AUTH_BOOTSTRAP_EMAIL / AUTH_BOOTSTRAP_PASSWORD (and no --email/--password) → admin NOT created.');
  }

  const cols = await client.query(
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'auth_users'
      ORDER BY ordinal_position`
  );
  console.log('\nauth_users schema:');
  console.table(cols.rows);

  const users = await client.query(
    `SELECT id, email, staff_code, role, role_title, status, created_at, last_login_at
       FROM auth_users ORDER BY created_at ASC`
  );
  console.log(`\nAccounts (${users.rowCount}):`);
  console.table(users.rows);

  await client.end();
  console.log('\nDone.');
}

main().catch((error) => {
  console.error('✗ init:auth failed:', error?.message || error);
  process.exit(1);
});
