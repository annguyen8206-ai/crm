/**
 * Wipe all business data from the vitcrm_store JSONB snapshot.
 *
 *   npm run reset:data              # asks for confirmation
 *   npm run reset:data -- --yes     # no prompt (CI / scripts)
 *
 * Keeps: auth_users (accounts), the vitcrm_store row itself.
 * Clears: patients, appointments, tickets, leads, invoices, follow-ups, recalls,
 *         zns logs, voip calls, csat, audit logs, conversations, messages, and
 *         every module collection (branches, campaigns, partners, ...).
 *
 * Run this once on an environment that still has the demo/seed rows.
 */
import 'dotenv/config';
import pg from 'pg';
import readline from 'node:readline';

const EMPTY_SNAPSHOT = {
  patients: [], appointments: [], tickets: [], leads: [], invoices: [],
  followUps: [], recalls: [], znsLogs: [], voipCalls: [], csatFeedbacks: [],
  auditLogs: [], conversations: [], messages: [], collections: {}
};

async function confirm() {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question('Xoá toàn bộ dữ liệu nghiệp vụ trong vitcrm_store? (gõ "yes"): ', r));
  rl.close();
  return String(answer).trim().toLowerCase() === 'yes';
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('✗ DATABASE_URL không được đặt.');
    process.exit(1);
  }
  if (!(await confirm())) {
    console.log('Đã huỷ.');
    process.exit(0);
  }

  const client = new pg.Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();
  await client.query(
    `INSERT INTO vitcrm_store (id, snapshot, updated_at) VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`,
    [JSON.stringify(EMPTY_SNAPSHOT)]
  );
  const { rows } = await client.query('SELECT jsonb_object_keys(snapshot) AS k FROM vitcrm_store WHERE id = 1');
  await client.end();
  console.log('✓ vitcrm_store đã được reset. Keys:', rows.map((r) => r.k).join(', '));
  console.log('  auth_users KHÔNG bị đụng tới. Khởi động lại app (pm2 restart) để nạp trạng thái rỗng.');
}

main().catch((e) => {
  console.error('✗ reset:data lỗi:', e?.message || e);
  process.exit(1);
});
