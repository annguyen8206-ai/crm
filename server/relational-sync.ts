import { pool } from './database';
import { dbStore } from './store';
import type { PatientRecord, AppointmentRecord, InvoiceRecord, SupportTicketRecord } from './store';

/**
 * Keeps the relational read-model tables (patients / appointments / invoices /
 * tickets) in step with the JSONB snapshot. The snapshot in vitcrm_store is
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
    table: 'patients',
    columns: ['id', 'pid', 'name', 'phone', 'email', 'gender', 'dob', 'id_card', 'branch_id',
      'risk_level', 'loyalty_tier', 'loyalty_points', 'total_visits', 'total_spent',
      'first_visit_date', 'last_visit_date', 'raw'],
    rows: () => dbStore.patients,
    row: (r: PatientRecord) => [s(r.id), s(r.pid), s(r.name), s(r.phone), s(r.email), s(r.gender), s(r.dob),
      s(r.idCard), s(r.branchId), s(r.riskLevel), s(r.loyaltyTier), n(r.loyaltyPoints), n(r.totalVisits),
      n(r.totalSpent), s(r.firstVisitDate), s(r.lastVisitDate), JSON.stringify(r)],
  },
  {
    table: 'appointments',
    columns: ['id', 'queue_number', 'patient_id', 'patient_name', 'patient_phone', 'doctor_id',
      'doctor_name', 'department', 'branch_id', 'date', 'time_slot', 'status', 'type', 'channel',
      'estimated_cost', 'is_paid', 'checked_in_at', 'seen_at', 'created_at', 'raw'],
    rows: () => dbStore.appointments,
    row: (r: AppointmentRecord) => [s(r.id), s(r.queueNumber), s(r.patientId), s(r.patientName),
      s(r.patientPhone), s(r.doctorId), s(r.doctorName), s(r.department), s(r.branchId), s(r.date),
      s(r.timeSlot), s(r.status), s(r.type), s(r.channel), n(r.estimatedCost), b(r.isPaid),
      s(r.checkedInAt), s(r.seenAt), s(r.createdAt), JSON.stringify(r)],
  },
  {
    table: 'invoices',
    columns: ['id', 'invoice_code', 'patient_id', 'patient_name', 'patient_phone', 'branch_id',
      'department', 'subtotal', 'discount', 'insurance_deduction', 'patient_payable', 'status',
      'payment_method', 'transaction_ref', 'paid_at', 'created_at', 'raw'],
    rows: () => dbStore.invoices,
    row: (r: InvoiceRecord) => [s(r.id), s(r.invoiceCode), s(r.patientId), s(r.patientName),
      s(r.patientPhone), s(r.branchId), s(r.department), n(r.subtotal), n(r.discount),
      n(r.insuranceDeduction), n(r.patientPayable), s(r.status), s(r.paymentMethod), s(r.transactionRef),
      s(r.paidAt), s(r.createdAt), JSON.stringify(r)],
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
