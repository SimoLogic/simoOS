-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI H-OS · Batch Changes Feature Patch
-- Date: 2026-02-24
-- Purpose: Idempotent safety patches for Batch Changes overhaul.
--   1. Ensures foto_url and job_title columns exist on dim_employee.
--   2. Ensures employee_approvers table exists (from Phase 3, but re-included
--      here as a safety measure so this script is self-contained).
--   3. Adds performance indexes for the new filter fields.
-- Run: After ddl_phase_1.sql and ddl_phase_3.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. SAFETY PATCHES ON dim_employee ────────────────────────────────────────
-- These are idempotent (IF NOT EXISTS) so safe to run multiple times.

-- foto_url: stores employee photo as a URL or base64 data URI
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- job_title: free-text role label, optionally linked to dim_job_title
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

-- entidad_legal: Local Entity field (HOMESI SAS, HOMESI BPO SAS, etc.)
-- NOTE: Phase 1 stores this inside the afiliaciones JSONB blob.
-- This column is a denormalized copy for direct SQL queries and indexes.
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS entidad_legal VARCHAR(100);

-- ── 2. PERFORMANCE INDEXES FOR BATCH FILTERS ─────────────────────────────────
-- These index the fields used by the new multi-select filter bar.

CREATE INDEX IF NOT EXISTS idx_emp_status       ON public.dim_employee(status);
CREATE INDEX IF NOT EXISTS idx_emp_area         ON public.dim_employee(area);
CREATE INDEX IF NOT EXISTS idx_emp_sub_area     ON public.dim_employee(sub_area);
CREATE INDEX IF NOT EXISTS idx_emp_cost_center  ON public.dim_employee(centro_costo);
CREATE INDEX IF NOT EXISTS idx_emp_direct_leader ON public.dim_employee(direct_leader);
CREATE INDEX IF NOT EXISTS idx_emp_job_title    ON public.dim_employee(job_title);
CREATE INDEX IF NOT EXISTS idx_emp_entidad      ON public.dim_employee(entidad_legal);

-- Composite index for tenant + status (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_emp_tenant_status ON public.dim_employee(tenant_id, status);

-- ── 3. ARL/EPS/CCF — these live in the afiliaciones JSONB column ─────────────
-- For filter performance, add GIN index on the afiliaciones JSONB blob.
-- This allows Postgres to efficiently search inside the JSON payload.
CREATE INDEX IF NOT EXISTS idx_emp_afiliaciones_gin
    ON public.dim_employee USING gin(afiliaciones jsonb_path_ops);

-- ── 4. EMPLOYEE APPROVERS TABLE (safety re-inclusion from Phase 3) ────────────
CREATE TABLE IF NOT EXISTS public.employee_approvers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(15) NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    eid             VARCHAR(15) NOT NULL REFERENCES public.dim_employee(eid)  ON DELETE CASCADE,
    "approver1Id"   VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    "approver2Id"   VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    "approver3Id"   VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    CONSTRAINT chk_no_self_approve1 CHECK ("approver1Id" IS NULL OR eid <> "approver1Id"),
    CONSTRAINT chk_no_self_approve2 CHECK ("approver2Id" IS NULL OR eid <> "approver2Id"),
    CONSTRAINT chk_no_self_approve3 CHECK ("approver3Id" IS NULL OR eid <> "approver3Id"),
    UNIQUE(tenant_id, eid),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvers_tenant ON public.employee_approvers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvers_eid    ON public.employee_approvers(eid);
ALTER TABLE public.employee_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_approvers DISABLE ROW LEVEL SECURITY;

-- ── 5. COMMENT ON AFILIACIONES JSON SHAPE ────────────────────────────────────
-- For reference, the afiliaciones JSONB column stores:
-- {
--   "eps_id": "...", "eps_nombre": "...",
--   "afp_id": "...", "afp_nombre": "...",
--   "arl_id": "...", "arl_nombre": "...",
--   "ccf_id": "...", "ccf_nombre": "...",
--   "nivel_riesgo_arl": 1,
--   "subtipo_cotizante": "01",
--   "entidad_legal": "HOMESI SAS",
--   "updated_at": "..."
-- }
-- Filter queries for EPS/ARL/CCF from application layer use:
--   WHERE afiliaciones->>'eps_nombre' = 'X'
-- The GIN index above supports these efficiently.

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (HOPSI H-OS — Batch Changes Patch)
-- ─────────────────────────────────────────────────────────────────────────────
