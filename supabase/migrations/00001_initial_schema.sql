-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · RESCUE DATABASE STATE
-- Emergency Roll-up of all missing table architectures from recent Sprints
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. FX MANAGER (dim_fx_rates)
CREATE TABLE IF NOT EXISTS public.dim_fx_rates (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(20)   NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    effective_date  DATE          NOT NULL,
    exchange_rate   NUMERIC(18,4) NOT NULL,
    currency_from   VARCHAR(3)    NOT NULL DEFAULT 'COP',
    currency_to     VARCHAR(3)    NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, effective_date, currency_from, currency_to)
);

CREATE INDEX IF NOT EXISTS idx_dim_fx_tenant ON public.dim_fx_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_fx_date   ON public.dim_fx_rates(effective_date);

ALTER TABLE public.dim_fx_rates DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_update_fx_at ON public.dim_fx_rates;
CREATE TRIGGER tr_update_fx_at 
    BEFORE UPDATE ON public.dim_fx_rates 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. BRANCH MASTER (dim_branch)
DO $$ BEGIN
  CREATE TYPE branch_hierarchy_level AS ENUM ('Division', 'Region', 'Branch');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE field_office_type AS ENUM ('Physical', 'Virtual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.dim_branch (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            VARCHAR(20)   NOT NULL,
    branch_code          VARCHAR(20)   NOT NULL,
    branch_name          VARCHAR(255),
    branch_manager_eid   VARCHAR(20),
    states_licensed      TEXT[]        NOT NULL DEFAULT '{}',
    field_office_type    field_office_type NOT NULL DEFAULT 'Physical',
    office_address       TEXT,
    has_lease            BOOLEAN       NOT NULL DEFAULT FALSE,
    lease_data           JSONB,
    hierarchy_level      branch_hierarchy_level NOT NULL DEFAULT 'Branch',
    parent_branch_id     UUID          REFERENCES public.dim_branch(id) ON DELETE SET NULL,
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, branch_code),
    CONSTRAINT no_self_parent CHECK (id IS DISTINCT FROM parent_branch_id)
);

CREATE INDEX IF NOT EXISTS idx_dim_branch_tenant ON public.dim_branch(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_branch_parent ON public.dim_branch(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_dim_branch_code   ON public.dim_branch(tenant_id, branch_code);


-- 3. LOCAL LEGAL ENTITIES (dim_local_legal_entity)
CREATE TABLE IF NOT EXISTS public.dim_local_legal_entity (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name    VARCHAR(255) NOT NULL UNIQUE,
    local_tax_id   VARCHAR(50),
    local_ein      VARCHAR(50), 
    entity_country VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO public.dim_local_legal_entity (entity_name, entity_country)
VALUES
    ('HOMESI SAS',     'Colombia'),
    ('HOMESI BPO SAS', 'Colombia')
ON CONFLICT (entity_name) DO NOTHING;


-- 4. JOB TITLES (dim_job_title)
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

-- Patch dim_employee for job titles
ALTER TABLE public.dim_employee ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_job_title_tenant   ON public.dim_job_title(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_title_status   ON public.dim_job_title(status);
CREATE INDEX IF NOT EXISTS idx_employee_job_title ON public.dim_employee(job_title);

ALTER TABLE public.dim_job_title DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS tr_update_job_title_at ON public.dim_job_title;
CREATE TRIGGER tr_update_job_title_at
    BEFORE UPDATE ON public.dim_job_title
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF EMERGENCY RESCUE SCRIPT
-- ─────────────────────────────────────────────────────────────────────────────
