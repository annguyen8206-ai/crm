BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
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
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS role_permissions (role_id TEXT REFERENCES roles(id) ON DELETE CASCADE, permission_id TEXT REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY (role_id, permission_id));

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, pid TEXT NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT NOT NULL,
  email TEXT, gender TEXT, dob DATE, id_card TEXT, address TEXT, blood_type TEXT,
  allergies JSONB NOT NULL DEFAULT '[]', chronic_conditions JSONB NOT NULL DEFAULT '[]',
  medical_history_notes TEXT, insurance_card_number TEXT, insurance_provider TEXT,
  insurance_expiry DATE, branch_id TEXT, first_visit_date DATE, last_visit_date DATE,
  total_visits INTEGER NOT NULL DEFAULT 0, total_spent NUMERIC(15,2) NOT NULL DEFAULT 0,
  risk_level TEXT, loyalty_tier TEXT, loyalty_points INTEGER NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]', emergency_contact JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients(phone);
CREATE INDEX IF NOT EXISTS patients_branch_idx ON patients(branch_id);
CREATE TABLE IF NOT EXISTS patient_vitals (id BIGSERIAL PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE, measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS patient_medical_records (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE, record_type TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, patient_name TEXT NOT NULL,
  patient_phone TEXT, doctor_id TEXT, doctor_name TEXT, department TEXT, branch_id TEXT,
  appointment_date DATE NOT NULL, time_slot TEXT, status TEXT NOT NULL, type TEXT, booking_channel TEXT,
  symptoms TEXT, notes TEXT, estimated_cost NUMERIC(15,2), is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date, branch_id);
CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, ticket_code TEXT NOT NULL UNIQUE, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS follow_ups (id TEXT PRIMARY KEY, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS recalls (id TEXT PRIMARY KEY, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, invoice_code TEXT NOT NULL UNIQUE, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, patient_name TEXT NOT NULL, patient_phone TEXT, branch_id TEXT, department TEXT, items JSONB NOT NULL DEFAULT '[]', subtotal NUMERIC(15,2) NOT NULL DEFAULT 0, discount NUMERIC(15,2) NOT NULL DEFAULT 0, insurance_deduction NUMERIC(15,2) NOT NULL DEFAULT 0, patient_payable NUMERIC(15,2) NOT NULL DEFAULT 0, status TEXT NOT NULL, payment_method TEXT, transaction_ref TEXT, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT, provider TEXT NOT NULL, provider_transaction_id TEXT UNIQUE, amount NUMERIC(15,2) NOT NULL, status TEXT NOT NULL, raw_payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS zns_logs (id TEXT PRIMARY KEY, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS voip_calls (id TEXT PRIMARY KEY, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS csat_feedbacks (id TEXT PRIMARY KEY, patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS audit_logs (id BIGSERIAL PRIMARY KEY, user_id TEXT, user_name TEXT, role TEXT, action TEXT NOT NULL, module TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', ip_address INET, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

INSERT INTO roles (id, name) VALUES ('admin', 'Quản trị viên hệ thống'), ('doctor', 'Bác sĩ'), ('receptionist', 'Tiếp đón'), ('cskh', 'CSKH'), ('sales', 'Kinh doanh'), ('marketing', 'Marketing') ON CONFLICT DO NOTHING;
INSERT INTO vitcrm_migrations (version) VALUES (1) ON CONFLICT DO NOTHING;
COMMIT;
