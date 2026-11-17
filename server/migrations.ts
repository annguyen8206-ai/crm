import { pool } from './database';

/**
 * Tiny numbered-migration runner. SQL is inlined (bundler-safe — no fs reads),
 * each migration runs once inside a transaction and is recorded in
 * `_schema_migrations`. A failing migration rolls back and aborts startup.
 *
 * IMPORTANT: migration 001 DROPS the unused legacy relational tables. Take a
 * `pg_dump` backup before the first deploy that includes it.
 */

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '001_crm_relational_schema',
    sql: `
      -- Remove the earlier, unused relational schema (never read/written by code;
      -- VitCRM has always run on the vitcrm_store JSONB snapshot + auth_users).
      -- Both historical naming conventions are covered. NEVER lists auth_users,
      -- vitcrm_store(_history), audit_log, app_settings, _schema_migrations.
      DROP TABLE IF EXISTS
        invoice_items, payments, patient_vitals, patient_lis_results,
        patient_pacs_results, follow_up_tasks, follow_ups, recalls, zns_logs,
        voip_calls, csat_feedbacks, audit_logs, support_tickets, tickets,
        appointments, invoices, leads, patients, users, role_permissions,
        permissions, roles, patient_medical_records, schema_migrations,
        vitcrm_migrations
      CASCADE;

      -- Derived read-model of the high-churn collections. The JSONB snapshot in
      -- vitcrm_store stays the source of truth; server/relational-sync.ts keeps
      -- these in step on every persist. Scalar columns are for querying/reporting;
      -- "raw" holds the full record so nothing is lost.
      DROP TABLE IF EXISTS patients CASCADE;
      CREATE TABLE patients (
        id TEXT PRIMARY KEY,
        pid TEXT, name TEXT, phone TEXT, email TEXT, gender TEXT, dob TEXT,
        id_card TEXT, branch_id TEXT, risk_level TEXT, loyalty_tier TEXT,
        loyalty_points INTEGER, total_visits INTEGER, total_spent BIGINT,
        first_visit_date TEXT, last_visit_date TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX patients_phone_idx  ON patients (phone);
      CREATE INDEX patients_branch_idx ON patients (branch_id);
      CREATE INDEX patients_name_idx   ON patients (lower(name));

      DROP TABLE IF EXISTS appointments CASCADE;
      CREATE TABLE appointments (
        id TEXT PRIMARY KEY,
        queue_number TEXT, patient_id TEXT, patient_name TEXT, patient_phone TEXT,
        doctor_id TEXT, doctor_name TEXT, department TEXT, branch_id TEXT,
        date TEXT, time_slot TEXT, status TEXT, type TEXT, channel TEXT,
        estimated_cost BIGINT, is_paid BOOLEAN,
        checked_in_at TEXT, seen_at TEXT, created_at TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX appointments_date_idx    ON appointments (date);
      CREATE INDEX appointments_branch_idx  ON appointments (branch_id);
      CREATE INDEX appointments_patient_idx ON appointments (patient_id);
      CREATE INDEX appointments_status_idx  ON appointments (status);

      DROP TABLE IF EXISTS invoices CASCADE;
      CREATE TABLE invoices (
        id TEXT PRIMARY KEY,
        invoice_code TEXT, patient_id TEXT, patient_name TEXT, patient_phone TEXT,
        branch_id TEXT, department TEXT,
        subtotal BIGINT, discount BIGINT, insurance_deduction BIGINT, patient_payable BIGINT,
        status TEXT, payment_method TEXT, transaction_ref TEXT, paid_at TEXT, created_at TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX invoices_status_idx  ON invoices (status);
      CREATE INDEX invoices_patient_idx ON invoices (patient_id);
      CREATE INDEX invoices_branch_idx  ON invoices (branch_id);

      DROP TABLE IF EXISTS tickets CASCADE;
      CREATE TABLE tickets (
        id TEXT PRIMARY KEY,
        ticket_code TEXT, patient_id TEXT, patient_name TEXT, patient_phone TEXT,
        category TEXT, priority TEXT, status TEXT, department TEXT, branch_id TEXT,
        assigned_staff TEXT, sla_deadline TEXT, is_overdue BOOLEAN,
        created_at TEXT, resolved_at TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX tickets_status_idx   ON tickets (status);
      CREATE INDEX tickets_priority_idx ON tickets (priority);
      CREATE INDEX tickets_patient_idx  ON tickets (patient_id);
    `,
  },
  {
    id: '002_file_attachments',
    sql: `
      CREATE TABLE IF NOT EXISTS file_attachments (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime TEXT NOT NULL,
        size BIGINT NOT NULL,
        storage_path TEXT NOT NULL,
        uploaded_by TEXT,
        uploaded_by_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS file_attachments_entity_idx ON file_attachments (entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS file_attachments_created_idx ON file_attachments (created_at DESC);
    `,
  },
  {
    id: '003_fmcg_read_model',
    sql: `
      -- Consumer-goods edition: the healthcare read-model tables are derived
      -- copies only (the JSONB snapshot keeps any legacy data), so they can go.
      DROP TABLE IF EXISTS patients, appointments, invoices CASCADE;

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        code TEXT, type TEXT, name TEXT, phone TEXT, email TEXT, province TEXT,
        channel TEXT, price_tier TEXT, branch_id TEXT, assigned_rep TEXT, status TEXT,
        loyalty_tier TEXT, loyalty_points INTEGER, credit_limit BIGINT,
        total_orders INTEGER, total_revenue BIGINT, outstanding_debt BIGINT,
        last_order_date TEXT, created_at TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS customers_phone_idx  ON customers (phone);
      CREATE INDEX IF NOT EXISTS customers_type_idx   ON customers (type);
      CREATE INDEX IF NOT EXISTS customers_branch_idx ON customers (branch_id);

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT, name TEXT, brand TEXT, category TEXT, unit TEXT, status TEXT,
        stock INTEGER, retail_price BIGINT, created_at TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS products_sku_idx ON products (sku);

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        code TEXT, customer_id TEXT, customer_name TEXT, customer_type TEXT,
        branch_id TEXT, channel TEXT, sales_rep TEXT, status TEXT, payment_status TEXT,
        subtotal BIGINT, discount_amount BIGINT, total BIGINT, paid_amount BIGINT,
        due_date TEXT, created_at TEXT, delivered_at TEXT,
        raw JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders (status);
      CREATE INDEX IF NOT EXISTS orders_created_idx  ON orders (created_at);
      CREATE INDEX IF NOT EXISTS orders_rep_idx      ON orders (sales_rep);

      -- One row per order line, for product-level sales reporting in SQL.
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL, product_id TEXT, sku TEXT, name TEXT,
        quantity INTEGER, unit_price BIGINT, discount_percent NUMERIC, line_total BIGINT,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS order_items_order_idx   ON order_items (order_id);
      CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS _schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const done = new Set<string>(
    (await pool.query<{ id: string }>('SELECT id FROM _schema_migrations')).rows.map(r => r.id)
  );

  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    console.log(`[migrate] applying ${m.id} ...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(m.sql);
      await client.query('INSERT INTO _schema_migrations (id) VALUES ($1)', [m.id]);
      await client.query('COMMIT');
      console.log(`[migrate] ${m.id} OK`);
    } catch (e: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`[migrate] ${m.id} FAILED — rolled back:`, e.message);
      throw e;
    } finally {
      client.release();
    }
  }
}
