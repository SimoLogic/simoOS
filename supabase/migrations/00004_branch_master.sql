-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI H-OS · Branch Master DDL
-- Run this in Supabase SQL Editor BEFORE deploying the code changes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums
DO $$ BEGIN
  CREATE TYPE branch_hierarchy_level AS ENUM ('Division', 'Region', 'Branch');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE field_office_type AS ENUM ('Physical', 'Virtual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Main table
CREATE TABLE IF NOT EXISTS public.dim_branch (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            VARCHAR(20)   NOT NULL,
    branch_code          VARCHAR(20)   NOT NULL,
    branch_name          VARCHAR(255),
    branch_manager_eid   VARCHAR(20),                          -- FK dim_employee.eid (manager roles)
    states_licensed      TEXT[]        NOT NULL DEFAULT '{}',  -- e.g. ['CA','TX','FL']
    field_office_type    field_office_type NOT NULL DEFAULT 'Physical',
    office_address       TEXT,
    -- Lease
    has_lease            BOOLEAN       NOT NULL DEFAULT FALSE,
    lease_data           JSONB,
    -- Hierarchy (self-referential)
    hierarchy_level      branch_hierarchy_level NOT NULL DEFAULT 'Branch',
    parent_branch_id     UUID          REFERENCES public.dim_branch(id) ON DELETE SET NULL,
    -- System
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, branch_code),
    -- Prevent self-reference
    CONSTRAINT no_self_parent CHECK (id IS DISTINCT FROM parent_branch_id)
);

-- Index for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_dim_branch_tenant ON public.dim_branch(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_branch_parent ON public.dim_branch(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_dim_branch_code   ON public.dim_branch(tenant_id, branch_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- lease_data JSONB expected shape:
-- {
--   "landlord_name": "ABC Properties LLC",
--   "sub_lease": false,
--   "monthly_rent": 4500.00,
--   "currency": "USD",
--   "renewal": "Yearly",
--   "utilities_included": true
-- }
-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT
-- ─────────────────────────────────────────────────────────────────────────────
