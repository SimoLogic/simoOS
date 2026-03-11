-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · DATABASE MIGRATION PHASE 3
-- Date: 2026-02-24
-- Description: Creates all tables required by Business Plan (BP Assigner),
--              HR Approval Flow, Performance (Process Designer), and Operations
--              (Proformas) modules that are missing from Phases 1 & 2.
-- Run Order: Phase 1 → Phase 2 → ddl_local_legal_entity → ddl_branch_master
--            → ddl_job_titles → THIS FILE (Phase 3)
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — HR MODULE: Approval Flow Chain
-- Source: lib/approval-store.ts → table 'employee_approvers'
-- Purpose: Stores the 3-level transitive approval chain per employee per tenant.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.employee_approvers (
    -- PK
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Scope
    tenant_id       VARCHAR(15)  NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    eid             VARCHAR(15)  NOT NULL REFERENCES public.dim_employee(eid)  ON DELETE CASCADE,
    -- 3-level chain (each stores EID of the approver)
    -- Level 1: Mandatory for every employee
    "approver1Id"   VARCHAR(15)  REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    -- Level 2: Required only when this employee IS an approver for someone else
    "approver2Id"   VARCHAR(15)  REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    -- Level 3: Required only when this employee IS an Approver 2 for someone
    "approver3Id"   VARCHAR(15)  REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    -- Business rules at DB level: no self-approval
    CONSTRAINT chk_no_self_approve1 CHECK ("approver1Id" IS NULL OR eid <> "approver1Id"),
    CONSTRAINT chk_no_self_approve2 CHECK ("approver2Id" IS NULL OR eid <> "approver2Id"),
    CONSTRAINT chk_no_self_approve3 CHECK ("approver3Id" IS NULL OR eid <> "approver3Id"),
    -- One approval chain per employee per tenant (upsert target)
    UNIQUE(tenant_id, eid),
    -- System
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approvers_tenant ON public.employee_approvers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvers_eid    ON public.employee_approvers(eid);

-- RLS (disabled for rapid development — enable in production)
ALTER TABLE public.employee_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_approvers DISABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER tr_update_approvers_at
    BEFORE UPDATE ON public.employee_approvers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — BUSINESS PLAN: Global Playbook Catalog
-- Source: lib/bp-store.ts → getPlaybooks() → table 'dim_playbooks'
-- Source: lib/bp-types.ts → interface Playbook + PlaybookTask
-- Purpose: Global library of operational playbooks (commercial/supporting/special)
--          used by BP Assigner. Different from growthify_playbooks (strategy-linked).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dim_playbooks (
    -- PK: matches the 'PB-UUID' format used in the front-end
    id              VARCHAR(50)   PRIMARY KEY,          -- e.g. 'PB-xxxxxxxx'
    -- Scope (NULL = global, shared across all tenants)
    tenant_id       VARCHAR(15)   REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    -- Identity
    name            VARCHAR(255)  NOT NULL,
    description     TEXT,
    category        VARCHAR(20)   NOT NULL DEFAULT 'commercial',
    -- Payload as JSONB for forward-compatibility
    -- Schema of 'tasks': [{ id, label, description, sla, medium, delivery }]
    tasks           JSONB         NOT NULL DEFAULT '[]'::jsonb,
    -- Schema of 'kpis': ["string", ...]
    kpis            JSONB         NOT NULL DEFAULT '[]'::jsonb,
    -- Optional escalation matrix text
    escalation_matrix TEXT,
    -- Metadata
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    -- Constraints
    CONSTRAINT chk_playbook_category CHECK (category IN ('commercial', 'supporting', 'special'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dim_playbooks_tenant   ON public.dim_playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_playbooks_category ON public.dim_playbooks(category);

-- RLS
ALTER TABLE public.dim_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbooks DISABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER tr_update_dim_playbooks_at
    BEFORE UPDATE ON public.dim_playbooks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — BUSINESS PLAN: BP Assigner Workflow
-- Source: lib/bp-store.ts → getBPWorkflowEntries() → table 'bp_workflow'
-- Source: lib/bp-types.ts → interface BPWorkflowEntry
-- Purpose: Maps employees to their assigned playbooks (commercial, supporting,
--          special) and the supervisors responsible for each track.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bp_workflow (
    -- PK (matches front-end BPWorkflowEntry.id)
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Multi-tenant scope
    tenant_id           VARCHAR(15)   NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    eid                 VARCHAR(15)   NOT NULL REFERENCES public.dim_employee(eid)  ON DELETE CASCADE,
    -- Denormalized display fields (kept in sync via trigger or application logic)
    "fullName"          VARCHAR(255),
    area                VARCHAR(100),
    "directManager"     VARCHAR(255),
    -- Playbook assignments stored as JSON arrays of Playbook IDs
    -- e.g. ["PB-abc123", "PB-def456"]
    "commercialPlaybooks"  JSONB   NOT NULL DEFAULT '[]'::jsonb,
    "supportingPlaybooks"  JSONB   NOT NULL DEFAULT '[]'::jsonb,
    "specialPlaybooks"     JSONB   NOT NULL DEFAULT '[]'::jsonb,
    -- Supervisor EID arrays (up to 3 per track, following the spec: 1-3, 4-6, 7-9)
    supervisors1        JSONB   NOT NULL DEFAULT '[]'::jsonb,
    supervisors2        JSONB   NOT NULL DEFAULT '[]'::jsonb,
    supervisors3        JSONB   NOT NULL DEFAULT '[]'::jsonb,
    -- Audit
    "lastModified"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "modifiedBy"        VARCHAR(15),                -- EID of the person who last saved
    -- One workflow entry per employee per tenant
    UNIQUE(tenant_id, eid),
    -- System
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bp_workflow_tenant ON public.bp_workflow(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bp_workflow_eid    ON public.bp_workflow(eid);

-- RLS
ALTER TABLE public.bp_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_workflow DISABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER tr_update_bp_workflow_at
    BEFORE UPDATE ON public.bp_workflow
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — BUSINESS PLAN: Process Designer
-- Source: lib/process-designer-types.ts → interfaces SavedProcess + ProcessRow
-- Source: lib/process-designer-store.ts → reads/writes process designs
-- Purpose: Stores VSM-style process designs for each organizational area.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.process_designs (
    -- PK
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   VARCHAR(15)  NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    -- Identity
    name        VARCHAR(255) NOT NULL,
    area        VARCHAR(100) NOT NULL,        -- From AREAS_EMPRESA list
    status      VARCHAR(10)  NOT NULL DEFAULT 'Draft',
    -- Payload: full array of ProcessRow objects stored as JSONB
    -- Each row: { id, process, subProcess, stepNumber, task, owner, ownerEid,
    --             deliverable, stakeholder, stakeholderEid, pt, lt,
    --             frequency, value, comments }
    rows        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    -- Metadata
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Constraints
    CONSTRAINT chk_process_status CHECK (status IN ('Draft', 'Approved'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_process_designs_tenant ON public.process_designs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_process_designs_area   ON public.process_designs(area);

-- RLS
ALTER TABLE public.process_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_designs DISABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER tr_update_process_designs_at
    BEFORE UPDATE ON public.process_designs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — OPERATIONS: Proformas
-- Source: components/operations/proformas/ProformasApp.tsx
-- Purpose: Stores client cost proformas used by Operations module.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dim_proforma (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(15)  NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    -- Identity
    proforma_code   VARCHAR(30)  NOT NULL,
    client_name     VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'Draft',
    -- Financial
    currency        VARCHAR(3)   NOT NULL DEFAULT 'USD',
    total_amount    NUMERIC(18,2) DEFAULT 0,
    -- Line items stored as JSONB for flexibility
    -- [{ concept, quantity, unit_price, subtotal, currency }]
    line_items      JSONB         NOT NULL DEFAULT '[]'::jsonb,
    -- Validity
    valid_from      DATE,
    valid_until     DATE,
    -- Metadata
    created_by      VARCHAR(15),              -- EID of creator
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, proforma_code),
    CONSTRAINT chk_proforma_status CHECK (status IN ('Draft', 'Sent', 'Approved', 'Rejected', 'Expired'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proforma_tenant ON public.dim_proforma(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proforma_status ON public.dim_proforma(status);

-- RLS
ALTER TABLE public.dim_proforma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_proforma DISABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER tr_update_proforma_at
    BEFORE UPDATE ON public.dim_proforma
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — PATCHES on existing tables
-- Backfill columns that were added to TypeScript types after Phase 1 was deployed.
-- These are all safe ALTER TABLE ... ADD COLUMN IF NOT EXISTS (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════════

-- 6.1 dim_employee: job_title (already in ddl_job_titles.sql but repeated here
--     as a safety patch — IF NOT EXISTS makes it idempotent)
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

-- 6.2 dim_employee: entidad_legal column (LocalEntity field)
--     Mirrors historialLaboral.entidad_legal used across HR module
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS entidad_legal VARCHAR(100);

-- 6.3 dim_employee: performance indexes added retroactively
CREATE INDEX IF NOT EXISTS idx_employee_area         ON public.dim_employee(area);
CREATE INDEX IF NOT EXISTS idx_employee_job_title    ON public.dim_employee(job_title);
CREATE INDEX IF NOT EXISTS idx_employee_entidad      ON public.dim_employee(entidad_legal);
CREATE INDEX IF NOT EXISTS idx_employee_direct_leader ON public.dim_employee(direct_leader);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7 — FULL DATABASE TABLE INVENTORY (as of Phase 3)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1 (ddl_phase_1.sql)
--   public.dim_tenant                   ← Tenant master
--   public.dim_employee                 ← Employee master (flat Maestro+Laboral)
--
-- Phase 2 (ddl_phase_2.sql)
--   public.growthify_strategies         ← Sales strategies per tenant
--   public.growthify_rewards            ← Reward schemes per strategy
--   public.growthify_requisitions       ← Approval requisitions
--   public.growthify_assignments        ← HC assignments to strategies
--   public.growthify_playbooks          ← Strategy-linked playbooks (Growthify)
--   public.growthify_seller_activity    ← Seller execution telemetry
--
-- Standalone DDLs
--   public.dim_local_legal_entity       ← (ddl_local_legal_entity.sql)
--   public.dim_branch                   ← (ddl_branch_master.sql)
--   public.dim_job_title                ← (ddl_job_titles.sql)
--
-- Phase 3 (THIS FILE - ddl_phase_3.sql)
--   public.employee_approvers           ← 3-level approval chain (HR / Payroll Changes)
--   public.dim_playbooks                ← Global BP playbook catalog (BP Assigner)
--   public.bp_workflow                  ← Employee ↔ Playbook assignment matrix
--   public.process_designs              ← VSM Process Designer (Business Plan / Performance)
--   public.dim_proforma                 ← Client cost proformas (Operations)
-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (HOPSI H-OS PHASE 3)
-- ─────────────────────────────────────────────────────────────────────────────
