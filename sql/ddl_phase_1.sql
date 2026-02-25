-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · DATABASE MIGRATION PHASE 1
-- Lead Backend Data Architect: Antigravity
-- Architecture: Star Schema (Optimized for PostgreSQL/Supabase)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DIM_TENANT (The Client Master)
-- Stores organizational high-level data and isolation boundaries.
CREATE TABLE IF NOT EXISTS public.dim_tenant (
    tcode              VARCHAR(15) PRIMARY KEY,      -- e.g., 'TNT-001'
    legal_name         VARCHAR(255) NOT NULL,
    dba_name           VARCHAR(255) NOT NULL,        -- Mandatory "Doing Business As"
    reporting_currency VARCHAR(3) NOT NULL,           -- USD, EUR, COP
    status             BOOLEAN DEFAULT TRUE,         -- Active/Inactive toggle
    hq_address         JSONB,                        -- Country, City, State, Address
    pocs               JSONB,                        -- Contacts (Max 10 per UX)
    account_managers   JSONB,                        -- Internal HOPSI owners
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DIM_EMPLOYEE (Core Identity & Labor Snapshot)
-- Merges the 'Maestro' and 'Laboral' snapshots for high-performance reporting.
-- Complementary data (Afiliaciones, SST) kept as JSONB for agility (Phase 1).
CREATE TABLE IF NOT EXISTS public.dim_employee (
    -- PK & FK
    eid                     VARCHAR(15) PRIMARY KEY, -- e.g., 'EID-0042'
    tenant_id               VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    
    -- Identity (Maestro)
    numero_identificacion   VARCHAR(20) NOT NULL,
    tipo_documento_id       VARCHAR(10) NOT NULL,    -- DIAN Codes
    primer_nombre           VARCHAR(100) NOT NULL,
    otros_nombres           VARCHAR(100),
    primer_apellido         VARCHAR(100) NOT NULL,
    segundo_apellido        VARCHAR(100) NOT NULL,
    fecha_nacimiento        DATE NOT NULL,
    genero                  VARCHAR(1) NOT NULL,     -- M, F, X
    email_personal          VARCHAR(255) NOT NULL,
    municipio_dane          VARCHAR(10) NOT NULL,    -- 5-digit code
    direccion_residencia    TEXT NOT NULL,
    foto_url                TEXT,
    
    -- Status & Corporate
    status                  VARCHAR(20) DEFAULT 'Active', -- Active, Inactive, Terminated, On Leave
    email_corporativo       VARCHAR(255),
    
    -- Laboral Snapshot (Star Schema Integration)
    fecha_inicio            DATE NOT NULL,
    fecha_fin               DATE,                    -- NULL means current
    tipo_contrato           VARCHAR(50) NOT NULL,
    tipo_salario            VARCHAR(50) NOT NULL,
    salario_base            NUMERIC(18,2) NOT NULL,
    procedimiento_renta     INTEGER DEFAULT 1,
    area                    VARCHAR(100) NOT NULL,
    sub_area                VARCHAR(100) NOT NULL,
    centro_costo            VARCHAR(20) NOT NULL,
    nombre_centro_costo     VARCHAR(255),
    sub_centro_costo        VARCHAR(20),
    nombre_sub_centro_costo  VARCHAR(255),
    branch                  VARCHAR(100),            -- Sede
    cliente                 VARCHAR(100),            -- Client assignment
    project                 VARCHAR(255),
    digito_dedicacion       INTEGER DEFAULT 100,
    direct_leader           VARCHAR(255),
    
    -- Complementary Data (JSONB)
    afiliaciones            JSONB DEFAULT '{}'::jsonb, -- EPS, AFP, ARL, CCF details
    sst                     JSONB DEFAULT '{}'::jsonb, -- Dotación, Emergencia, Medical
    
    -- Metadata
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BANK-LEVEL SECURITY (ROW LEVEL SECURITY)
-- Enforce tenant isolation at the database level.

-- Enable RLS
ALTER TABLE public.dim_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_employee ENABLE ROW LEVEL SECURITY;

-- 5. ACCESS POLICIES
-- We assume the application sets a session variable 'app.current_tenant_id'
-- during the connection setup (e.g., in a Supabase hook or middleware).

-- Dim_Tenant Policy: Only allow access to the tenant the user belongs to.
CREATE POLICY tenant_isolation_policy ON public.dim_tenant
    FOR ALL
    USING (tcode = current_setting('app.current_tenant_id', true));

-- Dim_Employee Policy: Only allow access to employees belonging to the tenant.
CREATE POLICY employee_isolation_policy ON public.dim_employee
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX idx_employee_tenant ON public.dim_employee(tenant_id);
CREATE INDEX idx_employee_id_number ON public.dim_employee(numero_identificacion);
CREATE INDEX idx_employee_status ON public.dim_employee(status);

-- 7. UPDATED_AT TRIGGER (Standard practice)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_update_tenant_at BEFORE UPDATE ON public.dim_tenant FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_update_employee_at BEFORE UPDATE ON public.dim_employee FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (HOPSI H-OS PHASE 1)
-- ─────────────────────────────────────────────────────────────────────────────
