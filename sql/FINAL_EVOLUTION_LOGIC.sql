-- =====================================================================================
-- SIMO INTELLISENSE — FINAL EVOLUTION LOGIC (RESTORATION MASTER SCRIPT)
-- Generated: 2026-03-28 by Antigravity (Forensic Reconstruction V2)
-- 
-- EXECUTION ORDER (CRITICAL — DO NOT REORDER):
--   1. Extensions
--   2. Enums (custom types)
--   3. Core Foundation Tables (dim_tenant — no FKs)
--   4. Library Tables (dim_employee, dim_job_title, etc. — FK to dim_tenant)
--   5. Child Tables (dim_role_title — FK to dim_job_title)
--   6. Cross-Module Tables (growthify, bp, pmo legacy — FK to dim_tenant/dim_employee)
--   7. Patches / ADD COLUMN (idempotent)
--   8. Functions (must exist before triggers)
--   9. Triggers (DROP IF EXISTS + CREATE)
--  10. Views
--  11. CHECK Constraints
--  12. Indexes
--  13. RLS Enable + Disable (dev mode)
--  14. Storage Buckets (Supabase-only)
-- =====================================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: ENUMS (create only if not exists)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE branch_hierarchy_level AS ENUM ('Division', 'Region', 'Branch');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE field_office_type AS ENUM ('Physical', 'Virtual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE playbook_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE playbook_category AS ENUM ('Commercial', 'Operations', 'Special');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE playbook_owner_type AS ENUM ('Internal', 'External');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE playbook_frequency AS ENUM ('Hourly', 'Daily', 'Weekly', 'Biweekly', 'Monthly', 'Bimonthly', 'Quarterly', 'Per Semester', 'Yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE playbook_threshold_op AS ENUM ('>', '<', '=', '>=', '<=');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: CORE FOUNDATION — dim_tenant
-- (Dropped by Prisma push — must be recreated before all FK children)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_tenant (
    tcode              VARCHAR(15) PRIMARY KEY,
    legal_name         VARCHAR(255) NOT NULL,
    dba_name           VARCHAR(255) NOT NULL,
    reporting_currency VARCHAR(3) NOT NULL,
    status             BOOLEAN DEFAULT TRUE,
    hq_address         JSONB,
    pocs               JSONB,
    account_managers   JSONB,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: CORE EMPLOYEE MASTER — dim_employee
-- (Final version: includes all patches from job roles migration + batch changes)
-- Referenced by: branch-actions, business-plan-actions, playbook-assignment-actions, hr-actions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_employee (
    eid                     VARCHAR(15) PRIMARY KEY,
    tenant_id               VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    numero_identificacion   VARCHAR(20) NOT NULL,
    tipo_documento_id       VARCHAR(10) NOT NULL,
    primer_nombre           VARCHAR(100) NOT NULL,
    otros_nombres           VARCHAR(100),
    primer_apellido         VARCHAR(100) NOT NULL,
    segundo_apellido        VARCHAR(100) NOT NULL,
    fecha_nacimiento        DATE NOT NULL,
    genero                  VARCHAR(1) NOT NULL,
    email_personal          VARCHAR(255) NOT NULL,
    municipio_dane          VARCHAR(10) NOT NULL,
    direccion_residencia    TEXT NOT NULL,
    foto_url                TEXT,
    status                  VARCHAR(20) DEFAULT 'Active',
    email_corporativo       VARCHAR(255),
    fecha_inicio            DATE NOT NULL,
    fecha_fin               DATE,
    tipo_contrato           VARCHAR(50) NOT NULL,
    tipo_salario            VARCHAR(50) NOT NULL,
    salario_base            NUMERIC(18,2) NOT NULL,
    procedimiento_renta     INTEGER DEFAULT 1,
    area                    VARCHAR(100) NOT NULL,
    sub_area                VARCHAR(100) NOT NULL,
    centro_costo            VARCHAR(20) NOT NULL,
    nombre_centro_costo     VARCHAR(255),
    sub_centro_costo        VARCHAR(20),
    nombre_sub_centro_costo VARCHAR(255),
    branch                  VARCHAR(100),
    cliente                 VARCHAR(100),
    project                 VARCHAR(255),
    digito_dedicacion       INTEGER DEFAULT 100,
    direct_leader           VARCHAR(255),
    entidad_legal           VARCHAR(100),
    job_title               VARCHAR(255),
    role_title              VARCHAR(60),
    job_title_id            UUID,
    role_title_id           UUID,
    assigned_branch_code    VARCHAR(20),
    afiliaciones            JSONB DEFAULT '{}'::jsonb,
    sst                     JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: HR LIBRARY — dim_job_title
-- Referenced by: job-title-actions.ts (getAllJobTitlesAction, saveJobTitleAction, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_job_title (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    area                VARCHAR(100),
    sub_area            VARCHAR(100),
    cost_center         VARCHAR(20),
    sub_cost_center     VARCHAR(20),
    direct_supervisor   VARCHAR(255),
    status              VARCHAR(20) NOT NULL DEFAULT 'Draft',
    requester_id        VARCHAR(15),
    approver1_id        VARCHAR(15),
    approver1_status    VARCHAR(20) NOT NULL DEFAULT 'Pending',
    approver2_id        VARCHAR(15),
    approver2_status    VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_by          VARCHAR(15),
    jdf_data            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, title),
    CONSTRAINT chk_job_title_status CHECK (status IN ('Draft', 'Active', 'Inactive')),
    CONSTRAINT chk_approver1_status CHECK (approver1_status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT chk_approver2_status CHECK (approver2_status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT chk_no_self_approval1 CHECK (requester_id IS NULL OR approver1_id IS NULL OR requester_id <> approver1_id),
    CONSTRAINT chk_no_self_approval2 CHECK (requester_id IS NULL OR approver2_id IS NULL OR requester_id <> approver2_id),
    CONSTRAINT chk_no_circular_approval CHECK (approver1_id IS NULL OR approver2_id IS NULL OR approver1_id <> approver2_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: HR LIBRARY — dim_role_title  
-- Referenced by: job-title-actions, business-plan-actions, playbook-assignment-actions
-- RESOLUTION: Uses TEXT primary key (final version from migrate_prod_leveling.sql, Mar 24)
-- vs UUID from original ddl_hr_role_titles.sql (Feb 22). Text PK wins (newer).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_role_title (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id       VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    job_title_id    UUID REFERENCES public.dim_job_title(id) ON DELETE CASCADE,
    role_title      VARCHAR(60) NOT NULL,
    describe_role   VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_role_title_status CHECK (status IN ('Active', 'Inactive')),
    CONSTRAINT uq_role_title_per_job UNIQUE (job_title_id, role_title)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: EXTERNAL ROLES — dim_external_role
-- Referenced by: business-plan-actions (getActiveExternalRolesAction, createExternalRoleAction)
-- and ddl_enforce_playbook_role_congruence.sql trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_external_role (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    name            VARCHAR(50) NOT NULL,
    business_type   TEXT,
    size            TEXT CHECK (size IN ('Small','Mid','Large')),
    annual_volume   TEXT,
    num_agents      TEXT,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: GEOGRAPHY — Local Legal Entity & Branch Master & FX Rates
-- Referenced by: legal-entity-actions ($dim_local_legal_entity), branch-actions ($dim_branch, $dim_fx_rates)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_local_legal_entity (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name    VARCHAR(255) NOT NULL UNIQUE,
    local_tax_id   VARCHAR(50),
    local_ein      VARCHAR(50),
    entity_country VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.dim_local_legal_entity (entity_name, entity_country)
VALUES ('HOMESI SAS', 'Colombia'), ('HOMESI BPO SAS', 'Colombia')
ON CONFLICT (entity_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dim_branch (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            VARCHAR(20) NOT NULL,
    branch_code          VARCHAR(20) NOT NULL,
    branch_name          VARCHAR(255),
    branch_manager_eid   VARCHAR(20),
    states_licensed      TEXT[] NOT NULL DEFAULT '{}',
    field_office_type    field_office_type NOT NULL DEFAULT 'Physical',
    office_address       TEXT,
    has_lease            BOOLEAN NOT NULL DEFAULT FALSE,
    lease_data           JSONB,
    hierarchy_level      branch_hierarchy_level NOT NULL DEFAULT 'Branch',
    parent_branch_id     UUID REFERENCES public.dim_branch(id) ON DELETE SET NULL,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, branch_code),
    CONSTRAINT no_self_parent CHECK (id IS DISTINCT FROM parent_branch_id)
);

CREATE TABLE IF NOT EXISTS public.dim_fx_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(20) NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    effective_date  DATE NOT NULL,
    exchange_rate   NUMERIC(18,4) NOT NULL,
    currency_from   VARCHAR(3) NOT NULL DEFAULT 'COP',
    currency_to     VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, effective_date, currency_from, currency_to)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: GROWTHIFY MODULE (Business Development)
-- These tables were in ddl_phase_2.sql — still referenced by the HR module
-- and Growthify stores in /lib/growthify-store.ts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.growthify_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.growthify_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.growthify_strategies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    override_closed_loan_pct NUMERIC(5,2) DEFAULT 0,
    fixed_bonus NUMERIC(18,2) DEFAULT 0,
    units_won_tier INTEGER DEFAULT 0,
    recruitment_override_pct NUMERIC(5,2) DEFAULT 0,
    approver1_name VARCHAR(255),
    approver1_role VARCHAR(100),
    approver1_status VARCHAR(50) DEFAULT 'Pending',
    approver2_name VARCHAR(255),
    approver2_role VARCHAR(100),
    approver2_status VARCHAR(50) DEFAULT 'Pending',
    "isActive" BOOLEAN DEFAULT false,
    drivers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.growthify_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    target_id VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.growthify_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    strategies JSONB DEFAULT '[]'::jsonb,
    "isApproved" BOOLEAN DEFAULT false,
    approver1_status VARCHAR(50) DEFAULT 'Pending',
    approver2_status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: growthify_playbooks and growthify_seller_activity were explicitly DROPPED
-- in ddl_playbook_designer.sql (Mar 22) and replaced by dim_playbook + fact_playbook_step.
-- The app does NOT reference these legacy tables. They are OBSOLETE — not restored.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 10: BUSINESS PLAN — dim_playbooks (Global Catalog), bp_workflow, process_designs
-- Referenced by older BP Assigner action pattern (getPlaybooks from dim_playbooks)
-- Note: bp_playbooks (the newer Prisma-linked table) is separate and survived.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_playbooks (
    id              VARCHAR(50) PRIMARY KEY,
    tenant_id       VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(20) NOT NULL DEFAULT 'commercial',
    tasks           JSONB NOT NULL DEFAULT '[]'::jsonb,
    kpis            JSONB NOT NULL DEFAULT '[]'::jsonb,
    escalation_matrix TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_playbook_category CHECK (category IN ('commercial', 'supporting', 'special'))
);

CREATE TABLE IF NOT EXISTS public.bp_workflow (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           VARCHAR(15) NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    eid                 VARCHAR(15) NOT NULL REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    "fullName"          VARCHAR(255),
    area                VARCHAR(100),
    "directManager"     VARCHAR(255),
    "commercialPlaybooks"  JSONB NOT NULL DEFAULT '[]'::jsonb,
    "supportingPlaybooks"  JSONB NOT NULL DEFAULT '[]'::jsonb,
    "specialPlaybooks"     JSONB NOT NULL DEFAULT '[]'::jsonb,
    supervisors1        JSONB NOT NULL DEFAULT '[]'::jsonb,
    supervisors2        JSONB NOT NULL DEFAULT '[]'::jsonb,
    supervisors3        JSONB NOT NULL DEFAULT '[]'::jsonb,
    "lastModified"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "modifiedBy"        VARCHAR(15),
    UNIQUE(tenant_id, eid),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_designs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   VARCHAR(15) NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    area        VARCHAR(100) NOT NULL,
    status      VARCHAR(10) NOT NULL DEFAULT 'Draft',
    rows        JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_process_status CHECK (status IN ('Draft', 'Approved'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 11: HR APPROVALS — employee_approvers
-- From Phase 3, referenced by HR approval workflow
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_approvers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       VARCHAR(15) NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    eid             VARCHAR(15) NOT NULL REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    "approver1Id"   VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    "approver2Id"   VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    "approver3Id"   VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    CONSTRAINT chk_no_self_approve1 CHECK ("approver1Id" IS NULL OR eid <> "approver1Id"),
    CONSTRAINT chk_no_self_approve2 CHECK ("approver2Id" IS NULL OR eid <> "approver2Id"),
    CONSTRAINT chk_no_self_approve3 CHECK ("approver3Id" IS NULL OR eid <> "approver3Id"),
    UNIQUE(tenant_id, eid),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 12: OPERATIONS — dim_proforma
-- Referenced by: Operations > Proformas module
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_proforma (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       VARCHAR(15) NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    proforma_code   VARCHAR(30) NOT NULL,
    client_name     VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Draft',
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_amount    NUMERIC(18,2) DEFAULT 0,
    line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_from      DATE,
    valid_until     DATE,
    created_by      VARCHAR(15),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, proforma_code),
    CONSTRAINT chk_proforma_status CHECK (status IN ('Draft', 'Sent', 'Approved', 'Rejected', 'Expired'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 13: PLAYBOOK DESIGNER V3 (Legacy Growthify Designer — dim_playbook tables)
-- These are the FULL relational V3 tables. Currently referenced by Playbook Designer
-- components. They coexist with bp_playbooks (the newer flat model for the Marketplace).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dim_playbook_setup_designer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_external_role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, role_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_activity_category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, category_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_activity_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    category_id UUID REFERENCES public.dim_playbook_activity_category(id) ON DELETE RESTRICT,
    activity_name VARCHAR(100) NOT NULL,
    mnemonic_id VARCHAR(20) NOT NULL,
    purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, activity_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_data_source (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    source_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    author_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    parent_playbook_id UUID REFERENCES public.dim_playbook(id) ON DELETE SET NULL,
    strategy_id UUID REFERENCES public.growthify_strategies(id) ON DELETE SET NULL,
    playbook_type playbook_category NOT NULL DEFAULT 'Commercial',
    purpose TEXT,
    approver_1_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    approver_2_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    status playbook_status NOT NULL DEFAULT 'Draft',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fact_playbook_step (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    playbook_id UUID REFERENCES public.dim_playbook(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    dictionary_activity_id UUID REFERENCES public.dim_playbook_activity_dictionary(id) ON DELETE RESTRICT,
    day_offset INTEGER NOT NULL DEFAULT 0,
    owner_type playbook_owner_type NOT NULL,
    owner_job_title_id UUID REFERENCES public.dim_job_title(id) ON DELETE SET NULL,
    owner_external_role_id UUID REFERENCES public.dim_playbook_external_role(id) ON DELETE SET NULL,
    deliverable_name VARCHAR(100),
    deliverable_description TEXT,
    stakeholder_type playbook_owner_type NOT NULL,
    stakeholder_job_title_id UUID REFERENCES public.dim_job_title(id) ON DELETE SET NULL,
    stakeholder_external_role_id UUID REFERENCES public.dim_playbook_external_role(id) ON DELETE SET NULL,
    iterations INTEGER NOT NULL DEFAULT 1,
    frequency playbook_frequency NOT NULL DEFAULT 'Daily',
    source_of_truth_id UUID REFERENCES public.dim_playbook_data_source(id) ON DELETE SET NULL,
    contra_playbook_owner_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fact_playbook_sla (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    playbook_id UUID REFERENCES public.dim_playbook(id) ON DELETE CASCADE,
    kpi_name VARCHAR(100) NOT NULL,
    kpi_mnemonic_id VARCHAR(50) NOT NULL,
    description TEXT,
    data_source_id UUID REFERENCES public.dim_playbook_data_source(id) ON DELETE SET NULL,
    frequency playbook_frequency NOT NULL DEFAULT 'Monthly',
    formula_definition TEXT NOT NULL,
    threshold_operator playbook_threshold_op NOT NULL,
    threshold_value VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 14: PMO LEGACY — pmo_boards, pmo_workspaces
-- Referenced by: pmo-actions.ts (.from("pmo_boards"))
-- These were dropped by Prisma. Recreating with minimal structure to unblock the app.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_boards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'personal',
    owner_id    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pmo_workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 15: PMO SYNC EVENTS (from sprint13 integration tables)
-- Referenced by Mirror Sync Protocol, may reference pmo_tasks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_sync_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    task_id         TEXT REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','queued','in_progress','conflict_detected','completed','failed')),
    idempotency_key TEXT,
    synced_fields   TEXT[],
    conflicts_found JSONB,
    payload         JSONB,
    resolved_by     TEXT,
    resolved_at     TIMESTAMPTZ,
    timestamp_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 16: PATCHES — Add missing columns to SURVIVING tables (all idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- hr_contracts: add role_title column (from ddl_hr_role_titles.sql Mar 22 + migrate_prod_leveling.sql Mar 24)
ALTER TABLE public.hr_contracts ADD COLUMN IF NOT EXISTS role_title VARCHAR(60);

-- bp_playbooks: add mission and expected_outcomes (referenced in getPublishedPlaybooksAction select)
ALTER TABLE public.bp_playbooks ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE public.bp_playbooks ADD COLUMN IF NOT EXISTS expected_outcomes TEXT;
ALTER TABLE public.bp_playbooks ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- dim_employee: add job_title_id and role_title_id FK columns (from ddl_hr_job_roles_migration.sql)
ALTER TABLE public.dim_employee ADD COLUMN IF NOT EXISTS job_title_id UUID;
ALTER TABLE public.dim_employee ADD COLUMN IF NOT EXISTS role_title_id UUID;
ALTER TABLE public.dim_employee ADD COLUMN IF NOT EXISTS assigned_branch_code VARCHAR(20);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 17: FUNCTIONS (must exist BEFORE triggers that depend on them)
-- RESOLUTION: Latest version of each function wins. Using DROP + CREATE OR REPLACE.
-- ─────────────────────────────────────────────────────────────────────────────

-- 17.1 Generic updated_at maintenance (shared by most triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 17.2 Generic set_updated_at (alias used by HR module)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 17.3 Generic fn_set_updated_at (alias used by Sprint 13 integration tables)
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 17.4 update_bp_updated_at (for bp_playbooks and bp_playbook_steps)
CREATE OR REPLACE FUNCTION public.update_bp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 17.5 Shield Protocol: prevent_locked_hr_update (HR contracts, payroll, reviews)
CREATE OR REPLACE FUNCTION public.prevent_locked_hr_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.is_locked = true THEN
        RAISE EXCEPTION '[Shield Protocol] Cannot modify locked record in %. Record ID: %',
            TG_TABLE_NAME, OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

-- 17.6 Shield Protocol: fn_protect_playbook_task (FINAL version from ddl_sprint13 Mar 22, supersedes reconstruction_lote_1)
-- Using SECURITY DEFINER + proper error code P0001
CREATE OR REPLACE FUNCTION public.fn_protect_playbook_task()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source_playbook_id IS NOT NULL THEN
        RAISE EXCEPTION 'TASK_PLAYBOOK_PROTECTED: Cannot delete task [%] — it is linked to Simo IS Playbook [%].',
            OLD.id, OLD.source_playbook_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.7 Job Title Lifecycle — activation gate
-- Source: ddl_hr_job_roles_migration.sql (Mar 22 — latest)
CREATE OR REPLACE FUNCTION public.check_job_title_activation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Active' AND OLD.status != 'Active' THEN
        IF NEW.approver1_status != 'Approved' OR NEW.approver2_status != 'Approved' THEN
            RAISE EXCEPTION 'Cannot activate Job Title without both approvals being Approved.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 17.8 Employee → Job/Role Title congruence enforcement
-- Source: ddl_enforce_employee_job_role.sql (Mar 28 — NEWEST)
-- Validates that role_title_id belongs to job_title_id and both are Active
CREATE OR REPLACE FUNCTION public.check_employee_job_role_match()
RETURNS TRIGGER AS $$
DECLARE
    role_job_id UUID;
    job_status VARCHAR;
    role_status VARCHAR;
BEGIN
    IF NEW.job_title_id IS NOT NULL THEN
        SELECT status INTO job_status FROM public.dim_job_title WHERE id = NEW.job_title_id;
        IF job_status != 'Active' THEN
            RAISE EXCEPTION 'The selected job_title_id is not Active.';
        END IF;
    END IF;
    IF NEW.role_title_id IS NOT NULL THEN
        IF NEW.job_title_id IS NULL THEN
            RAISE EXCEPTION 'Cannot assign a role_title_id without a job_title_id.';
        END IF;
        SELECT job_title_id::uuid, status INTO role_job_id, role_status
        FROM public.dim_role_title WHERE id = NEW.role_title_id::text;
        IF role_job_id != NEW.job_title_id THEN
            RAISE EXCEPTION 'The selected role_title_id does not belong to the selected job_title_id.';
        END IF;
        IF role_status != 'Active' THEN
            RAISE EXCEPTION 'The selected role_title_id is not Active.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 17.9 Playbook Role Congruence enforcement across bp_playbook_steps
-- Source: ddl_enforce_playbook_role_congruence.sql (Mar 28 — NEWEST)
-- Validates stakeholder and requested_to are active roles in HR or External libraries
CREATE OR REPLACE FUNCTION public.check_playbook_roles_match()
RETURNS TRIGGER AS $$
DECLARE
    internal_exists BOOLEAN;
    external_exists BOOLEAN;
BEGIN
    IF NEW.stakeholder IS NOT NULL AND NEW.stakeholder != 'DROP' AND NEW.stakeholder != '' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title
            WHERE role_title = NEW.stakeholder AND status = 'Active'
            AND tenant_id = NEW.org_id
        ) INTO internal_exists;
        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role
            WHERE name = NEW.stakeholder AND status = 'Active'
            AND org_id = NEW.org_id
        ) INTO external_exists;
        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'Stakeholder "%" is not a valid Active Role Title in the HR Library or External Roles.', NEW.stakeholder;
        END IF;
    END IF;
    IF NEW.requested_to IS NOT NULL AND NEW.requested_to != '' AND NEW.requested_to != 'DROP' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title
            WHERE role_title = NEW.requested_to AND status = 'Active'
            AND tenant_id = NEW.org_id
        ) INTO internal_exists;
        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role
            WHERE name = NEW.requested_to AND status = 'Active'
            AND org_id = NEW.org_id
        ) INTO external_exists;
        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'Requested_to role "%" is not a valid Active Role Title in the HR Library or External Roles.', NEW.requested_to;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 18: TRIGGERS (DROP IF EXISTS first, then CREATE)
-- ─────────────────────────────────────────────────────────────────────────────

-- Core updated_at triggers
DROP TRIGGER IF EXISTS tr_update_tenant_at ON public.dim_tenant;
CREATE TRIGGER tr_update_tenant_at BEFORE UPDATE ON public.dim_tenant FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_employee_at ON public.dim_employee;
CREATE TRIGGER tr_update_employee_at BEFORE UPDATE ON public.dim_employee FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_job_title_at ON public.dim_job_title;
CREATE TRIGGER tr_update_job_title_at BEFORE UPDATE ON public.dim_job_title FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_role_title_at ON public.dim_role_title;
CREATE TRIGGER tr_update_role_title_at BEFORE UPDATE ON public.dim_role_title FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_fx_at ON public.dim_fx_rates;
CREATE TRIGGER tr_update_fx_at BEFORE UPDATE ON public.dim_fx_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_g_strategies_at ON public.growthify_strategies;
CREATE TRIGGER tr_update_g_strategies_at BEFORE UPDATE ON public.growthify_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_g_rewards_at ON public.growthify_rewards;
CREATE TRIGGER tr_update_g_rewards_at BEFORE UPDATE ON public.growthify_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_g_requisitions_at ON public.growthify_requisitions;
CREATE TRIGGER tr_update_g_requisitions_at BEFORE UPDATE ON public.growthify_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_g_assignments_at ON public.growthify_assignments;
CREATE TRIGGER tr_update_g_assignments_at BEFORE UPDATE ON public.growthify_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_dim_playbooks_at ON public.dim_playbooks;
CREATE TRIGGER tr_update_dim_playbooks_at BEFORE UPDATE ON public.dim_playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_bp_workflow_at ON public.bp_workflow;
CREATE TRIGGER tr_update_bp_workflow_at BEFORE UPDATE ON public.bp_workflow FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_process_designs_at ON public.process_designs;
CREATE TRIGGER tr_update_process_designs_at BEFORE UPDATE ON public.process_designs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_proforma_at ON public.dim_proforma;
CREATE TRIGGER tr_update_proforma_at BEFORE UPDATE ON public.dim_proforma FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_dim_playbook_at ON public.dim_playbook;
CREATE TRIGGER tr_update_dim_playbook_at BEFORE UPDATE ON public.dim_playbook FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_fact_pb_step_at ON public.fact_playbook_step;
CREATE TRIGGER tr_update_fact_pb_step_at BEFORE UPDATE ON public.fact_playbook_step FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_fact_pb_sla_at ON public.fact_playbook_sla;
CREATE TRIGGER tr_update_fact_pb_sla_at BEFORE UPDATE ON public.fact_playbook_sla FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_approvers_at ON public.employee_approvers;
CREATE TRIGGER tr_update_approvers_at BEFORE UPDATE ON public.employee_approvers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HR Module updated_at (uses set_updated_at alias)
DROP TRIGGER IF EXISTS trg_hr_employees_updated_at ON public.hr_employees;
CREATE TRIGGER trg_hr_employees_updated_at BEFORE UPDATE ON public.hr_employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_contracts_updated_at ON public.hr_contracts;
CREATE TRIGGER trg_hr_contracts_updated_at BEFORE UPDATE ON public.hr_contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_payroll_updated_at ON public.hr_payroll_periods;
CREATE TRIGGER trg_hr_payroll_updated_at BEFORE UPDATE ON public.hr_payroll_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_vacation_updated_at ON public.hr_vacation_requests;
CREATE TRIGGER trg_hr_vacation_updated_at BEFORE UPDATE ON public.hr_vacation_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_perf_updated_at ON public.hr_performance_reviews;
CREATE TRIGGER trg_hr_perf_updated_at BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- BP Playbook Designer updated_at
DROP TRIGGER IF EXISTS trg_bp_playbooks_updated_at ON public.bp_playbooks;
CREATE TRIGGER trg_bp_playbooks_updated_at BEFORE UPDATE ON public.bp_playbooks FOR EACH ROW EXECUTE FUNCTION update_bp_updated_at();

DROP TRIGGER IF EXISTS trg_bp_playbook_steps_updated_at ON public.bp_playbook_steps;
CREATE TRIGGER trg_bp_playbook_steps_updated_at BEFORE UPDATE ON public.bp_playbook_steps FOR EACH ROW EXECUTE FUNCTION update_bp_updated_at();

-- Shield Protocol Triggers
DROP TRIGGER IF EXISTS trg_hr_contracts_shield ON public.hr_contracts;
CREATE TRIGGER trg_hr_contracts_shield BEFORE UPDATE ON public.hr_contracts FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();

DROP TRIGGER IF EXISTS trg_hr_payroll_shield ON public.hr_payroll_periods;
CREATE TRIGGER trg_hr_payroll_shield BEFORE UPDATE ON public.hr_payroll_periods FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();

DROP TRIGGER IF EXISTS trg_hr_perf_shield ON public.hr_performance_reviews;
CREATE TRIGGER trg_hr_perf_shield BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();

-- Llave #3: PMO Task Shield (FINAL version — fn_protect_playbook_task with SECURITY DEFINER)
DROP TRIGGER IF EXISTS trg_protect_pmo_tasks ON public.pmo_tasks;
CREATE TRIGGER trg_protect_pmo_tasks
    BEFORE DELETE ON public.pmo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_playbook_task();

-- Job Title Lifecycle Trigger
DROP TRIGGER IF EXISTS tr_check_job_title_activation ON public.dim_job_title;
CREATE TRIGGER tr_check_job_title_activation
    BEFORE UPDATE ON public.dim_job_title
    FOR EACH ROW EXECUTE FUNCTION check_job_title_activation();

-- Employee Job/Role Congruence Trigger (Mar 28 — NEWEST enforcement)
DROP TRIGGER IF EXISTS tr_check_employee_job_role_match ON public.dim_employee;
CREATE TRIGGER tr_check_employee_job_role_match
    BEFORE INSERT OR UPDATE ON public.dim_employee
    FOR EACH ROW EXECUTE FUNCTION check_employee_job_role_match();

-- Playbook Step Role Congruence Trigger (Mar 28 — NEWEST enforcement)
DROP TRIGGER IF EXISTS tr_check_playbook_roles_match ON public.bp_playbook_steps;
CREATE TRIGGER tr_check_playbook_roles_match
    BEFORE INSERT OR UPDATE ON public.bp_playbook_steps
    FOR EACH ROW EXECUTE PROCEDURE check_playbook_roles_match();

-- Integration Tables updated_at
DROP TRIGGER IF EXISTS trg_pmo_integration_tokens_updated_at ON public.pmo_integration_tokens;
CREATE TRIGGER trg_pmo_integration_tokens_updated_at BEFORE UPDATE ON public.pmo_integration_tokens FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_pmo_user_integrations_updated_at ON public.pmo_user_integrations;
CREATE TRIGGER trg_pmo_user_integrations_updated_at BEFORE UPDATE ON public.pmo_user_integrations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 19: VIEWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.hr_payroll_summary AS
SELECT
    pp.org_id,
    pp.period_label,
    COUNT(*) AS employee_count,
    SUM(pp.worked_days_count) AS total_worked_days,
    MAX(pp.processed_at) AS last_processed_at,
    BOOL_AND(pp.is_locked) AS all_locked
FROM public.hr_payroll_periods pp
GROUP BY pp.org_id, pp.period_label;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 20: CHECK CONSTRAINTS (Idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_playbook_protection') THEN
        ALTER TABLE public.pmo_tasks
            ADD CONSTRAINT check_playbook_protection
            CHECK ((source_playbook_id IS NULL) OR (is_protected = true));
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 21: RLS POLICIES — HR module (enabled with org isolation)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_employees_org_isolation ON public.hr_employees;
CREATE POLICY hr_employees_org_isolation ON public.hr_employees
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_contracts_org_isolation ON public.hr_contracts;
CREATE POLICY hr_contracts_org_isolation ON public.hr_contracts
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

ALTER TABLE public.hr_payroll_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_payroll_org_isolation ON public.hr_payroll_periods;
CREATE POLICY hr_payroll_org_isolation ON public.hr_payroll_periods
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

ALTER TABLE public.hr_vacation_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_vacation_org_isolation ON public.hr_vacation_requests;
CREATE POLICY hr_vacation_org_isolation ON public.hr_vacation_requests
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_perf_org_isolation ON public.hr_performance_reviews;
CREATE POLICY hr_perf_org_isolation ON public.hr_performance_reviews
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 22: DISABLE RLS on all legacy/dev tables (fastest path to restore)
-- Production RLS should be JWT-based. To be enabled in a future migration.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.dim_tenant DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_employee DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_job_title DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_role_title DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_branch DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_local_legal_entity DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_proforma DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_workflow DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_designs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_approvers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_strategies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_requisitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_playbook_step DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_playbook_sla DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_setup_designer DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_external_role DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_activity_category DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_activity_dictionary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_data_source DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_external_role DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_workspaces DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 23: PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employee_tenant ON public.dim_employee(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_status ON public.dim_employee(status);
CREATE INDEX IF NOT EXISTS idx_employee_area ON public.dim_employee(area);
CREATE INDEX IF NOT EXISTS idx_employee_job_title_id ON public.dim_employee(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employee_role_title ON public.dim_employee(role_title);
CREATE INDEX IF NOT EXISTS idx_employee_direct_leader ON public.dim_employee(direct_leader);
CREATE INDEX IF NOT EXISTS idx_emp_afiliaciones_gin ON public.dim_employee USING gin(afiliaciones jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_job_title_tenant ON public.dim_job_title(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_title_status ON public.dim_job_title(status);
CREATE INDEX IF NOT EXISTS idx_role_title_job_title ON public.dim_role_title(job_title_id);
CREATE INDEX IF NOT EXISTS idx_role_title_tenant ON public.dim_role_title(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_title_status ON public.dim_role_title(status);
CREATE INDEX IF NOT EXISTS idx_dim_branch_tenant ON public.dim_branch(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_branch_parent ON public.dim_branch(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_dim_fx_tenant ON public.dim_fx_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_fx_date ON public.dim_fx_rates(effective_date);
CREATE INDEX IF NOT EXISTS idx_dim_external_role_org ON public.dim_external_role(org_id, status);
CREATE INDEX IF NOT EXISTS idx_approvers_tenant ON public.employee_approvers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvers_eid ON public.employee_approvers(eid);
CREATE INDEX IF NOT EXISTS idx_bp_playbooks_org_id ON public.bp_playbooks(org_id);
CREATE INDEX IF NOT EXISTS idx_bp_playbook_steps_org_id ON public.bp_playbook_steps(org_id);
CREATE INDEX IF NOT EXISTS idx_bp_playbook_steps_playbook_id ON public.bp_playbook_steps(playbook_id);
CREATE INDEX IF NOT EXISTS idx_pmo_sync_events_org_status ON public.pmo_sync_events(org_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 24: SEED DIM_TENANT (minimal tenant required to unblock HR + BP)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.dim_tenant (tcode, legal_name, dba_name, reporting_currency, status)
VALUES 
    ('TNT-SEED26', 'HOMESI Enterprise LLC', 'HOMESI', 'USD', true),
    ('HOMESI', 'HOMESI SAS', 'HOMESI Colombia', 'COP', true)
ON CONFLICT (tcode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 25: SEED DIM_JOB_TITLE (13 Active HOMESI titles — needed for enforcements)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_tenant VARCHAR(15) := 'TNT-SEED26';
BEGIN
    IF EXISTS (SELECT 1 FROM public.dim_tenant WHERE tcode = v_tenant) THEN
        INSERT INTO public.dim_job_title (tenant_id, title, area, sub_area, status, approver1_status, approver2_status)
        VALUES
            (v_tenant,'Loan Officer','Sales','Mortgage Originations','Active','Approved','Approved'),
            (v_tenant,'Loan Officer Assistant','Sales','Mortgage Originations','Active','Approved','Approved'),
            (v_tenant,'Branch Manager','Operations','Branch Management','Active','Approved','Approved'),
            (v_tenant,'Non Producing Branch Manager','Operations','Branch Management','Active','Approved','Approved'),
            (v_tenant,'Market Leader','Sales','Leadership','Active','Approved','Approved'),
            (v_tenant,'Business Developer Dual Comp','Sales','Business Development','Active','Approved','Approved'),
            (v_tenant,'Business Developer','Sales','Business Development','Active','Approved','Approved'),
            (v_tenant,'Sales Agent','Sales','Inside Sales','Active','Approved','Approved'),
            (v_tenant,'Finance Director','Finance','Executive','Active','Approved','Approved'),
            (v_tenant,'HR Director','HR','Executive','Active','Approved','Approved'),
            (v_tenant,'Operations Director','Operations','Executive','Active','Approved','Approved'),
            (v_tenant,'Production Director','Operations','Production','Active','Approved','Approved'),
            (v_tenant,'Marketing Manager','Marketing','Digital','Active','Approved','Approved')
        ON CONFLICT (tenant_id, title) DO NOTHING;
    END IF;
END; $$;

-- =====================================================================================
-- END OF FINAL_EVOLUTION_LOGIC.sql
-- Tables Restored: 26 | Functions: 9 | Triggers: 30+ | RLS Policies: 5 | Views: 1
-- =====================================================================================
