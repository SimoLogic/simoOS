-- ═══════════════════════════════════════════════════════════════════════════
-- SIMO INTELLISENSE — HR MODULE DDL
-- File: sql/ddl_hr_system.sql
-- Target: Supabase (PostgreSQL 15+)
--
-- Mirrors the 5 Prisma models in schema.prisma for the HR Module.
-- Run this in Supabase SQL Editor to create the physical tables.
--
-- Security: Row-Level Security (RLS) enabled on all tables.
--           Trigger guard blocks updates on locked records.
--           Salary / ID data is stored AES-256-GCM encrypted by the app.
--
-- Llave #1: Multi-tenant isolation via org_id on every table.
-- Llave #3: isLocked = true → immutable record (DB trigger enforces this).
-- Llave #4: Salary fields stored as encrypted ciphertext (VARCHAR).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: HR Employees (Dossier Master)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_employees (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  TEXT            NOT NULL,
    eid                     TEXT            NOT NULL UNIQUE,

    -- Status
    status                  TEXT            NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Inactive', 'On Leave', 'Terminated')),

    -- Contact
    email_corporate         TEXT,
    photo_url               TEXT,

    -- Encrypted Identity (AES-256-GCM via hr-vault.ts)
    -- Values are ciphertext: "<iv_hex>:<auth_tag_hex>:<data_hex>"
    identificacion_enc      TEXT            NOT NULL,
    tipo_documento          TEXT            NOT NULL,

    -- Cleartext (non-sensitive) identity
    primer_nombre           TEXT            NOT NULL,
    otros_nombres           TEXT,
    primer_apellido         TEXT            NOT NULL,
    segundo_apellido        TEXT            NOT NULL,
    fecha_nacimiento        TEXT            NOT NULL, -- ISO date: YYYY-MM-DD
    genero                  CHAR(1)         NOT NULL CHECK (genero IN ('M', 'F', 'X')),
    email_personal          TEXT            NOT NULL,
    municipio_dane          TEXT            NOT NULL,
    direccion_residencia    TEXT            NOT NULL,

    -- Geography
    continent_id            TEXT,
    country_id              TEXT,
    city_id                 TEXT,
    salary_currency_code    TEXT            NOT NULL DEFAULT 'COP',

    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_employees_org_id ON hr_employees(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_employees_eid ON hr_employees(eid);

-- RLS
ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_employees_org_isolation ON hr_employees;
CREATE POLICY hr_employees_org_isolation ON hr_employees
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- Updated_at auto-maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_employees_updated_at ON hr_employees;
CREATE TRIGGER trg_hr_employees_updated_at
    BEFORE UPDATE ON hr_employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: HR Contracts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_contracts (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  TEXT            NOT NULL,
    employee_id             UUID            NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,

    -- Contract period
    fecha_inicio            TEXT            NOT NULL, -- ISO date
    fecha_fin               TEXT,                     -- null = currently active

    -- Contract type
    tipo_contrato           TEXT            NOT NULL,
    tipo_salario            TEXT            NOT NULL,

    -- Encrypted salary (AES-256-GCM)
    salario_base_enc        TEXT            NOT NULL,
    salary_currency_code    TEXT            NOT NULL DEFAULT 'COP',

    -- Colombian payroll metadata
    procedimiento_renta     SMALLINT        NOT NULL DEFAULT 1 CHECK (procedimiento_renta IN (0, 1, 2)),
    entidad_legal           TEXT,
    area                    TEXT            NOT NULL,
    sub_area                TEXT            NOT NULL,
    centro_costo            TEXT            NOT NULL,
    nombre_centro_costo     TEXT,
    branch                  TEXT,
    cliente                 TEXT,
    project                 TEXT,
    digito_dedicacion       SMALLINT        NOT NULL DEFAULT 100 CHECK (digito_dedicacion BETWEEN 0 AND 100),
    direct_leader_id        TEXT,
    job_title               TEXT,

    -- Shield Protocol: signed contracts cannot be modified
    is_locked               BOOLEAN         NOT NULL DEFAULT false,

    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_contracts_org_id ON hr_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee_id ON hr_contracts(employee_id);

ALTER TABLE hr_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_contracts_org_isolation ON hr_contracts;
CREATE POLICY hr_contracts_org_isolation ON hr_contracts
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

DROP TRIGGER IF EXISTS trg_hr_contracts_updated_at ON hr_contracts;
CREATE TRIGGER trg_hr_contracts_updated_at
    BEFORE UPDATE ON hr_contracts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Shield Trigger: Block updates on locked contracts
CREATE OR REPLACE FUNCTION prevent_locked_hr_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.is_locked = true THEN
        RAISE EXCEPTION '[Shield Protocol] Cannot modify locked record in %. Record ID: %',
            TG_TABLE_NAME, OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_contracts_shield ON hr_contracts;
CREATE TRIGGER trg_hr_contracts_shield
    BEFORE UPDATE ON hr_contracts
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: HR Payroll Periods
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_payroll_periods (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  TEXT            NOT NULL,
    employee_id             UUID            NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    contract_id             UUID            NOT NULL REFERENCES hr_contracts(id),

    -- Period identification
    period_label            TEXT            NOT NULL, -- "2026-03" = March 2026
    period_start            TIMESTAMPTZ     NOT NULL,
    period_end              TIMESTAMPTZ     NOT NULL,

    -- WorkdayHelper computed values (Llave #2)
    worked_days_count       SMALLINT        NOT NULL DEFAULT 0,
    vacation_days_deducted  SMALLINT        NOT NULL DEFAULT 0,

    -- Encrypted monetary amounts (AES-256-GCM)
    base_amount_enc         TEXT            NOT NULL,
    total_gross_enc         TEXT            NOT NULL,
    deductions_enc          TEXT            NOT NULL, -- JSON: {health, pension}
    net_pay_enc             TEXT            NOT NULL,
    currency_code           TEXT            NOT NULL DEFAULT 'COP',

    -- Shield Protocol: processed payrolls cannot be modified
    is_locked               BOOLEAN         NOT NULL DEFAULT false,
    processed_at            TIMESTAMPTZ,
    processed_by            TEXT,

    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    -- Unique constraint: one payroll per employee per period
    UNIQUE (org_id, employee_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_org_id ON hr_payroll_periods(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_employee_id ON hr_payroll_periods(employee_id);

ALTER TABLE hr_payroll_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_payroll_org_isolation ON hr_payroll_periods;
CREATE POLICY hr_payroll_org_isolation ON hr_payroll_periods
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

DROP TRIGGER IF EXISTS trg_hr_payroll_updated_at ON hr_payroll_periods;
CREATE TRIGGER trg_hr_payroll_updated_at
    BEFORE UPDATE ON hr_payroll_periods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_payroll_shield ON hr_payroll_periods;
CREATE TRIGGER trg_hr_payroll_shield
    BEFORE UPDATE ON hr_payroll_periods
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: HR Vacation Requests
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_vacation_requests (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  TEXT            NOT NULL,
    employee_id             UUID            NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,

    request_date            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    start_date              TIMESTAMPTZ     NOT NULL,
    end_date                TIMESTAMPTZ     NOT NULL,

    -- WorkdayHelper computed (Llave #2)
    calendar_days           SMALLINT        NOT NULL DEFAULT 0,
    workday_days            SMALLINT        NOT NULL DEFAULT 0,
    holidays_skipped        SMALLINT        NOT NULL DEFAULT 0,

    -- Approval workflow
    status                  TEXT            NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    approved_by_id          TEXT,
    approved_at             TIMESTAMPTZ,
    notes                   TEXT,

    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    -- Validate date range
    CONSTRAINT chk_vacation_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_vacation_org_id ON hr_vacation_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_vacation_employee_id ON hr_vacation_requests(employee_id);

ALTER TABLE hr_vacation_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_vacation_org_isolation ON hr_vacation_requests;
CREATE POLICY hr_vacation_org_isolation ON hr_vacation_requests
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

DROP TRIGGER IF EXISTS trg_hr_vacation_updated_at ON hr_vacation_requests;
CREATE TRIGGER trg_hr_vacation_updated_at
    BEFORE UPDATE ON hr_vacation_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: HR Performance Reviews
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_performance_reviews (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  TEXT            NOT NULL,
    employee_id             UUID            NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    reviewer_id             TEXT            NOT NULL,

    review_period           TEXT            NOT NULL, -- "Q1-2026"
    review_date             TIMESTAMPTZ     NOT NULL,

    -- Scoring dimensions (0.0 – 5.0)
    score_delivery          NUMERIC(3,1)    NOT NULL DEFAULT 0 CHECK (score_delivery BETWEEN 0 AND 5),
    score_attitude          NUMERIC(3,1)    NOT NULL DEFAULT 0 CHECK (score_attitude BETWEEN 0 AND 5),
    score_collaboration     NUMERIC(3,1)    NOT NULL DEFAULT 0 CHECK (score_collaboration BETWEEN 0 AND 5),
    score_innovation        NUMERIC(3,1)    NOT NULL DEFAULT 0 CHECK (score_innovation BETWEEN 0 AND 5),
    score_overall           NUMERIC(4,2)    NOT NULL DEFAULT 0, -- Weighted average

    -- Qualitative notes
    strengths_notes         TEXT,
    improvement_notes       TEXT,
    next_goals              TEXT,

    -- Workflow
    status                  TEXT            NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED')),

    -- Shield Protocol: acknowledged reviews are immutable
    is_locked               BOOLEAN         NOT NULL DEFAULT false,

    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_perf_org_id ON hr_performance_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_perf_employee_id ON hr_performance_reviews(employee_id);

ALTER TABLE hr_performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_perf_org_isolation ON hr_performance_reviews;
CREATE POLICY hr_perf_org_isolation ON hr_performance_reviews
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

DROP TRIGGER IF EXISTS trg_hr_perf_updated_at ON hr_performance_reviews;
CREATE TRIGGER trg_hr_perf_updated_at
    BEFORE UPDATE ON hr_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Shield Trigger for performance reviews
DROP TRIGGER IF EXISTS trg_hr_perf_shield ON hr_performance_reviews;
CREATE TRIGGER trg_hr_perf_shield
    BEFORE UPDATE ON hr_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Computed column helper (for org-level payroll reporting)
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Salary decryption happens in the application layer (hr-vault.ts).
-- The view below surfaces non-sensitive metadata only — no encrypted columns.

CREATE OR REPLACE VIEW hr_payroll_summary AS
SELECT
    pp.org_id,
    pp.period_label,
    COUNT(*)                AS employee_count,
    SUM(pp.worked_days_count) AS total_worked_days,
    MAX(pp.processed_at)    AS last_processed_at,
    BOOL_AND(pp.is_locked)  AS all_locked
FROM hr_payroll_periods pp
GROUP BY pp.org_id, pp.period_label;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Seed check (run to confirm tables exist)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'hr_%';

-- Expected output:
-- hr_employees
-- hr_contracts
-- hr_payroll_periods
-- hr_vacation_requests
-- hr_performance_reviews
