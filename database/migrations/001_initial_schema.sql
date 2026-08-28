BEGIN;

-- =========================================================
-- VitCRM - Initial PostgreSQL Schema
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------
-- Migration tracking
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Users
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ---------------------------------------------------------
-- Patients
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(100) PRIMARY KEY,
    pid VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    gender VARCHAR(20) NOT NULL,
    dob DATE,
    age INTEGER,
    id_card VARCHAR(50),
    address TEXT,
    blood_type VARCHAR(20),
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
    chronic_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    medical_history_notes TEXT,
    insurance_card_number VARCHAR(100),
    insurance_provider VARCHAR(255),
    insurance_expiry DATE,
    branch_id VARCHAR(100),
    first_visit_date DATE,
    last_visit_date DATE,
    total_visits INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(18,2) NOT NULL DEFAULT 0,
    risk_level VARCHAR(50),
    loyalty_tier VARCHAR(50),
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_branch ON patients(branch_id);

-- ---------------------------------------------------------
-- Patient vitals
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_vitals (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(100) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ NOT NULL,
    blood_pressure VARCHAR(50),
    heart_rate INTEGER,
    spo2 NUMERIC(5,2),
    weight NUMERIC(8,2),
    height NUMERIC(8,2),
    bmi NUMERIC(8,2),
    temperature NUMERIC(5,2),
    blood_glucose NUMERIC(8,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient
    ON patient_vitals(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_vitals_date
    ON patient_vitals(measured_at);

-- ---------------------------------------------------------
-- LIS results
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_lis_results (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    result_date DATE,
    status VARCHAR(100),
    result_summary TEXT,
    abnormal_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lis_patient
    ON patient_lis_results(patient_id);

-- ---------------------------------------------------------
-- PACS results
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_pacs_results (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    modality VARCHAR(100),
    body_part VARCHAR(255),
    result_date DATE,
    conclusion TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pacs_patient
    ON patient_pacs_results(patient_id);

-- ---------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(100) PRIMARY KEY,
    queue_number VARCHAR(100),
    patient_id VARCHAR(100) NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(50),
    doctor_id VARCHAR(100),
    doctor_name VARCHAR(255),
    department VARCHAR(255),
    branch_id VARCHAR(100),
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(100),
    status VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    channel VARCHAR(100) NOT NULL,
    symptoms TEXT,
    notes TEXT,
    estimated_cost NUMERIC(18,2),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date
    ON appointments(appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_branch
    ON appointments(branch_id);

-- ---------------------------------------------------------
-- Support tickets
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_code VARCHAR(100) NOT NULL UNIQUE,
    patient_id VARCHAR(100) REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    category VARCHAR(255) NOT NULL,
    priority VARCHAR(100) NOT NULL,
    status VARCHAR(100) NOT NULL,
    department VARCHAR(255),
    branch_id VARCHAR(100),
    assigned_staff VARCHAR(255),
    description TEXT NOT NULL,
    resolution TEXT,
    sla_deadline TIMESTAMPTZ,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    compensation_voucher VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_patient
    ON support_tickets(patient_id);

CREATE INDEX IF NOT EXISTS idx_tickets_status
    ON support_tickets(status);

-- ---------------------------------------------------------
-- Leads
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    service_category VARCHAR(255),
    expected_value NUMERIC(18,2) NOT NULL DEFAULT 0,
    stage VARCHAR(100) NOT NULL,
    probability INTEGER NOT NULL DEFAULT 0,
    assigned_staff VARCHAR(255),
    source VARCHAR(100),
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage
    ON leads(stage);

CREATE INDEX IF NOT EXISTS idx_leads_phone
    ON leads(phone);

-- ---------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY,
    invoice_code VARCHAR(100) NOT NULL UNIQUE,
    patient_id VARCHAR(100) REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    branch_id VARCHAR(100),
    department VARCHAR(255),
    subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
    discount NUMERIC(18,2) NOT NULL DEFAULT 0,
    insurance_deduction NUMERIC(18,2) NOT NULL DEFAULT 0,
    patient_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100),
    viet_qr_url TEXT,
    transaction_ref VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient
    ON invoices(patient_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
    ON invoices(status);

-- ---------------------------------------------------------
-- Invoice items
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    quantity NUMERIC(18,3) NOT NULL DEFAULT 1,
    unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
    insurance_coverage NUMERIC(18,2) NOT NULL DEFAULT 0,
    total NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
    ON invoice_items(invoice_id);

-- ---------------------------------------------------------
-- Payments
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(100) PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL,
    payment_method VARCHAR(100),
    provider VARCHAR(100),
    transaction_ref VARCHAR(255),
    status VARCHAR(100) NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
    ON payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_transaction
    ON payments(transaction_ref);

-- ---------------------------------------------------------
-- Follow-up tasks
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    visit_date DATE,
    scheduled_time VARCHAR(100),
    primary_diagnosis TEXT,
    doctor_care_notes TEXT,
    call_status VARCHAR(100),
    symptom_progression TEXT,
    adverse_effects_reported TEXT,
    call_notes TEXT,
    assigned_staff VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_followups_patient
    ON follow_up_tasks(patient_id);

-- ---------------------------------------------------------
-- Recalls
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS recalls (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    last_visit_date DATE,
    due_date DATE,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    condition_category VARCHAR(255),
    primary_diagnosis TEXT,
    recall_reason TEXT,
    recall_interval_days INTEGER,
    doctor_recommendation TEXT,
    assigned_doctor VARCHAR(255),
    assigned_staff VARCHAR(255),
    status VARCHAR(255),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_recalls_patient
    ON recalls(patient_id);

CREATE INDEX IF NOT EXISTS idx_recalls_due_date
    ON recalls(due_date);

-- ---------------------------------------------------------
-- ZNS logs
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS zns_logs (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    template_type VARCHAR(100),
    template_name VARCHAR(255),
    diagnosis TEXT,
    doctor_care_notes TEXT,
    channel VARCHAR(100),
    status VARCHAR(100),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    tracking_code VARCHAR(255),
    cost NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zns_patient
    ON zns_logs(patient_id);

-- ---------------------------------------------------------
-- VoIP calls
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS voip_calls (
    id VARCHAR(100) PRIMARY KEY,
    call_type VARCHAR(100) NOT NULL,
    patient_id VARCHAR(100) REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    agent_staff_name VARCHAR(255),
    agent_extension VARCHAR(100),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(100),
    audio_recording_url TEXT,
    call_notes TEXT,
    call_outcome TEXT
);

CREATE INDEX IF NOT EXISTS idx_voip_patient
    ON voip_calls(patient_id);

-- ---------------------------------------------------------
-- CSAT feedback
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS csat_feedbacks (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    visit_date DATE,
    doctor_name VARCHAR(255),
    department VARCHAR(255),
    rating INTEGER,
    nps_score INTEGER,
    sentiment VARCHAR(50),
    comment TEXT,
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_status VARCHAR(100),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csat_patient
    ON csat_feedbacks(patient_id);

-- ---------------------------------------------------------
-- Audit logs
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    role VARCHAR(100),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255),
    details TEXT,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp
    ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user
    ON audit_logs(user_id);

-- ---------------------------------------------------------
-- Record migration
-- ---------------------------------------------------------
INSERT INTO schema_migrations(version)
VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
