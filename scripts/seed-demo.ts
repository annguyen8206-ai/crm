/**
 * Replace all business data in vitcrm_store with a FRESH demo dataset dated
 * around today (orders, debts, today's visit plan, tickets, deals, inbox...).
 *
 *   npm run seed:demo              # asks for confirmation
 *   npm run seed:demo -- --yes     # no prompt
 *
 * Refuses to run when NODE_ENV=production unless --force is also passed.
 * Keeps: auth_users (accounts), audit_log, app_settings, and any legacy
 * (healthcare) snapshot keys. Restart the app afterwards (or it reloads on its
 * next write — the version is bumped so a running server can't overwrite this).
 */
import 'dotenv/config';
import readline from 'node:readline';
import pg from 'pg';
import { dbStore, loadDemoData } from '../server/store';
import { createSnapshot, restoreStore } from '../server/database';

async function confirm(): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>(r => rl.question('Thay TOÀN BỘ dữ liệu nghiệp vụ bằng dữ liệu demo? (gõ "yes"): ', r));
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('✗ NODE_ENV=production — từ chối nạp dữ liệu demo. Thêm --force nếu thật sự muốn.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL không được đặt.');
    process.exit(1);
  }
  if (!(await confirm())) { console.log('Đã huỷ.'); process.exit(0); }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const cur = await client.query<{ snapshot: Record<string, unknown> }>('SELECT snapshot FROM vitcrm_store WHERE id = 1');
    if (cur.rowCount) restoreStore(cur.rows[0].snapshot);
    const legacy = dbStore.legacy;
    loadDemoData();
    dbStore.legacy = legacy;

    await client.query(
      `INSERT INTO vitcrm_store (id, snapshot, version, updated_at) VALUES (1, $1::jsonb, 0, NOW())
       ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, version = vitcrm_store.version + 1, updated_at = NOW()`,
      [JSON.stringify(createSnapshot())],
    );
    console.log(`✓ Đã nạp dữ liệu demo: ${dbStore.customers.length} khách, ${dbStore.products.length} SP, ${dbStore.orders.length} đơn, ` +
      `${dbStore.visits.length} viếng thăm, ${dbStore.tickets.length} phiếu CSKH, ${dbStore.leads.length} cơ hội, ${dbStore.conversations.length} hội thoại.`);
    if (Object.keys(legacy).length) console.log(`  Giữ nguyên dữ liệu cũ: ${Object.keys(legacy).join(', ')}`);
    console.log('  Khởi động lại app để thấy dữ liệu mới.');
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('✗ seed:demo lỗi:', e?.message || e); process.exit(1); });
