-- ============================================================================
-- OPTIONAL cleanup — VitCRM runs entirely on `vitcrm_store` (JSONB snapshot) +
-- `auth_users`. The relational tables below were created by an earlier, unused
-- schema and are never read or written by the app.
--
-- Run ONLY if you are sure you don't need that relational data:
--   pg_dump "$DATABASE_URL" > backup_before_cleanup.sql   # backup first
--   psql "$DATABASE_URL" -f scripts/drop-legacy-tables.sql
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS
  invoice_items,
  payments,
  patient_vitals,
  patient_lis_results,
  patient_pacs_results,
  follow_up_tasks,
  recalls,
  zns_logs,
  voip_calls,
  csat_feedbacks,
  audit_logs,
  support_tickets,
  appointments,
  invoices,
  leads,
  patients,
  users,
  role_permissions,
  permissions,
  roles,
  patient_medical_records,
  schema_migrations,
  vitcrm_migrations
CASCADE;

COMMIT;

-- Keep: vitcrm_store, auth_users
-- Verify afterwards:  \dt
