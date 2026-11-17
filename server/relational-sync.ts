import { pool } from './database';
import { dbStore } from './store';
import type { SupportTicketRecord, CustomerRecord, ProductRecord, OrderRecord } from './store';

/**
 * Keeps the relational read-model tables (customers / products / orders /
 * order_items / tickets) in step with the JSONB snapshot. The snapshot in vitcrm_store is
 * still the source of truth — this is a derived copy for querying, reporting and
 * per-table backups. Route handlers are unchanged.
 *
 * Strategy: full DELETE + bulk re-INSERT per table, in one transaction, throttled
 * so a burst of writes triggers at most one sync every SYNC_MIN_INTERVAL_MS.
 * Set RELATIONAL_SYNC=false to disable.
 */

const SYNC_MIN_INTERVAL_MS = Number(process.env.RELATIONAL_SYNC_INTERVAL_MS || 10_000);
const CHUNK = 500;

let lastSyncAt = 0;
let pending: Promise<void> | null = null;
let queued = false;

function enabled(): boolean {
  return Boolean(pool) && process.env.RELATIONAL_SYNC !== 'false';
}

const s = (v: unknown) => (v == null ? null : String(v));
const n = (v: unknown) => (v == null || v === '' ? null : Number(v));
const b = (v: unknown) => (v == null ? null : Boolean(v));

type TableSpec = { table: string; columns: string[]; row: (r: any) => unknown[]; rows: () => any[] };

const SPECS: TableSpec[] = [
  {
    table: 'customers',
    columns: ['id', 'code', 'type', 'name', 'phone', 'email', 'province', 'channel', 'price_tier',
      'branch_id', 'assigned_rep', 'status', 'loyalty_tier', 'loyalty_points', 'credit_limit',
      'total_orders', 'total_revenue', 'outstanding_debt', 'last_order_date', 'created_at', 'raw'],
    rows: () => dbStore.customers,
    row: (r: CustomerRecord) => [s(r.id), s(r.code), s(r.type), s(r.name), s(r.phone), s(r.email),
      s(r.province), s(r.channel), s(r.priceTier), s(r.branchId), s(r.assignedRep), s(r.status),
      s(r.loyaltyTier), n(r.loyaltyPoints), n(r.creditLimit), n(r.totalOrders), n(r.totalRevenue),
      n(r.outstandingDebt), s(r.lastOrderDate), s(r.createdAt), JSON.stringify(r)],
  },
  {
    table: 'products',
    columns: ['id', 'sku', 'name', 'brand', 'category', 'unit', 'status', 'stock', 'retail_price', 'created_at', 'raw'],
    rows: () => dbStore.products,
    row: (r: ProductRecord) => [s(r.id), s(r.sku), s(r.name), s(r.brand), s(r.category), s(r.unit),
      s(r.status), n(r.stock), n(r.prices?.LE), s(r.createdAt), JSON.stringify(r)],
  },
  {
    table: 'orders',
    columns: ['id', 'code', 'customer_id', 'customer_name', 'customer_type', 'branch_id', 'channel',
      'sales_rep', 'status', 'payment_status', 'subtotal', 'discount_amount', 'total', 'paid_amount',
      'due_date', 'created_at', 'delivered_at', 'raw'],
    rows: () => dbStore.orders,
    row: (r: OrderRecord) => [s(r.id), s(r.code), s(r.customerId), s(r.customerName), s(r.customerType),
      s(r.branchId), s(r.channel), s(r.salesRep), s(r.status), s(r.paymentStatus), n(r.subtotal),
      n(r.discountAmount), n(r.total), n(r.paidAmount), s(r.dueDate), s(r.createdAt), s(r.deliveredAt),
      JSON.stringify(r)],
  },
  {
    table: 'order_items',
    columns: ['id', 'order_id', 'product_id', 'sku', 'name', 'quantity', 'unit_price', 'discount_percent', 'line_total'],
    rows: () => (dbStore.orders || []).flatMap(o => (o.items || []).map((it, i) => ({ ...it, id: `${o.id}#${i}`, orderId: o.id }))),
    row: (r: any) => [s(r.id), s(r.orderId), s(r.productId), s(r.sku), s(r.name), n(r.quantity),
      n(r.unitPrice), n(r.discountPercent), n(r.lineTotal)],
  },
  {
    table: 'tickets',
    columns: ['id', 'ticket_code', 'patient_id', 'patient_name', 'patient_phone', 'category',
      'priority', 'status', 'department', 'branch_id', 'assigned_staff', 'sla_deadline',
      'is_overdue', 'created_at', 'resolved_at', 'raw'],
    rows: () => dbStore.tickets,
    row: (r: SupportTicketRecord) => [s(r.id), s(r.ticketCode), s(r.patientId), s(r.patientName),
      s(r.patientPhone), s(r.category), s(r.priority), s(r.status), s(r.department), s(r.branchId),
      s(r.assignedStaff), s(r.slaDeadline), b(r.isOverdue), s(r.createdAt), s(r.resolvedAt), JSON.stringify(r)],
  },
];

/** Exposed for tests: assert each row() produces exactly one value per column. */
export const __specs = SPECS.map(sp => ({ table: sp.table, columns: sp.columns.length, sampleLen: sp.row({}).length }));

async function replaceTable(client: any, spec: TableSpec): Promise<void> {
  await client.query(`DELETE FROM ${spec.table}`);
  const all = spec.rows() || [];
  const seen = new Set<string>();
  for (let i = 0; i < all.length; i += CHUNK) {
    const chunk = all.slice(i, i + CHUNK).filter((r: any) => {
      const id = String(r?.id ?? '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (!chunk.length) continue;
    const cols = spec.columns.length;
    const values: unknown[] = [];
    const tuples = chunk.map((r: any, j: number) => {
      const vals = spec.row(r);
      values.push(...vals);
      const ph = vals.map((_, k) => `$${j * cols + k + 1}`);
      return `(${ph.join(',')})`;
    });
    await client.query(
      `INSERT INTO ${spec.table} (${spec.columns.join(',')}) VALUES ${tuples.join(',')}`,
      values
    );
  }
}

async function doSync(): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const spec of SPECS) await replaceTable(client, spec);
    await client.query('COMMIT');
    lastSyncAt = Date.now();
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.warn('[relational-sync] failed (JSONB snapshot unaffected):', e.message);
  } finally {
    client.release();
  }
}

/**
 * Request a sync. Throttled: if the last sync was < SYNC_MIN_INTERVAL_MS ago the
 * call is coalesced into a single deferred run. `force` bypasses the throttle
 * (used once on boot). Never throws.
 */
export function syncRelational(opts: { force?: boolean } = {}): Promise<void> {
  if (!enabled()) return Promise.resolve();
  if (pending) { queued = true; return pending; }

  const since = Date.now() - lastSyncAt;
  const wait = opts.force ? 0 : Math.max(0, SYNC_MIN_INTERVAL_MS - since);

  pending = new Promise<void>((resolve) => {
    setTimeout(async () => {
      await doSync();
      pending = null;
      if (queued) { queued = false; void syncRelational(); }
      resolve();
    }, wait).unref?.();
  });
  return pending;
}
