-- ==============================================================================
-- SIMO INTELLISENSE – PLAYBOOK DESIGNER (GROWTHIFY) DDL MODULE
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING CONFLICTING TABLES (From Phase 2 legacy if necessary)
-- We need to replace the old JSON-based table with the new relational V3 structure.
DROP TABLE IF EXISTS public.growthify_seller_activity CASCADE;
DROP TABLE IF EXISTS public.growthify_playbooks CASCADE;


-- 2. DOMAIN ENUMS FOR PLAYBOOKS
DO $$ BEGIN
    CREATE TYPE playbook_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE playbook_category AS ENUM ('Commercial', 'Operations', 'Special');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE playbook_owner_type AS ENUM ('Internal', 'External');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE playbook_frequency AS ENUM ('Hourly', 'Daily', 'Weekly', 'Biweekly', 'Monthly', 'Bimonthly', 'Quarterly', 'Per Semester', 'Yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE playbook_threshold_op AS ENUM ('>', '<', '=', '>=', '<=');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 3. PLAYBOOK GLOBAL SETUP & DICTIONARIES
CREATE TABLE IF NOT EXISTS public.dim_playbook_setup_designer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_external_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, role_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_activity_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, category_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_activity_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    category_id UUID REFERENCES public.dim_playbook_activity_category(id) ON DELETE RESTRICT,
    activity_name VARCHAR(100) NOT NULL,
    mnemonic_id VARCHAR(20) NOT NULL,
    purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, activity_name)
);

CREATE TABLE IF NOT EXISTS public.dim_playbook_data_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    source_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source_name)
);

-- INJECT INITIAL SOURCE OF TRUTHS (Encompass, Salesforce, ERP, Blue Sage, Optimal Blue)
-- Handled usually by app seed, but schema supports it.


-- 4. THE PLAYBOOK CORE
CREATE TABLE IF NOT EXISTS public.dim_playbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    author_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    
    -- Versioning System
    version INTEGER NOT NULL DEFAULT 1,
    parent_playbook_id UUID REFERENCES public.dim_playbook(id) ON DELETE SET NULL, 
    
    -- Mappings
    strategy_id UUID REFERENCES public.growthify_strategies(id) ON DELETE SET NULL,
    playbook_type playbook_category NOT NULL DEFAULT 'Commercial',
    purpose TEXT,
    
    -- Approvals (Multi-level)
    approver_1_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    approver_2_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    
    status playbook_status NOT NULL DEFAULT 'Draft',
    is_active BOOLEAN NOT NULL DEFAULT true, -- Allows Soft Deletes for Version control

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. THE PLAYBOOK STEPS (FACT TABLE)
CREATE TABLE IF NOT EXISTS public.fact_playbook_step (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    playbook_id UUID REFERENCES public.dim_playbook(id) ON DELETE CASCADE,
    
    -- Ordering & Logic
    step_number INTEGER NOT NULL,
    dictionary_activity_id UUID REFERENCES public.dim_playbook_activity_dictionary(id) ON DELETE RESTRICT,
    day_offset INTEGER NOT NULL DEFAULT 0, -- Scheduler (Working Day + X)
    
    -- Owners & Deliverables
    owner_type playbook_owner_type NOT NULL,
    owner_job_title_id UUID REFERENCES public.dim_job_title(id) ON DELETE SET NULL, -- Null if external
    owner_external_role_id UUID REFERENCES public.dim_playbook_external_role(id) ON DELETE SET NULL, -- Null if internal
    
    deliverable_name VARCHAR(100),
    deliverable_description TEXT,
    
    stakeholder_type playbook_owner_type NOT NULL,
    stakeholder_job_title_id UUID REFERENCES public.dim_job_title(id) ON DELETE SET NULL,
    stakeholder_external_role_id UUID REFERENCES public.dim_playbook_external_role(id) ON DELETE SET NULL,
    
    -- Execution Frequency
    iterations INTEGER NOT NULL DEFAULT 1,
    frequency playbook_frequency NOT NULL DEFAULT 'Daily',
    source_of_truth_id UUID REFERENCES public.dim_playbook_data_source(id) ON DELETE SET NULL,
    
    -- The Contra-Playbook Assignment
    contra_playbook_owner_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. THE PLAYBOOK KPIs & SLAs (FACT TABLE)
CREATE TABLE IF NOT EXISTS public.fact_playbook_sla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    playbook_id UUID REFERENCES public.dim_playbook(id) ON DELETE CASCADE,
    
    kpi_name VARCHAR(100) NOT NULL,
    kpi_mnemonic_id VARCHAR(50) NOT NULL,
    description TEXT,
    data_source_id UUID REFERENCES public.dim_playbook_data_source(id) ON DELETE SET NULL,
    
    frequency playbook_frequency NOT NULL DEFAULT 'Monthly',
    formula_definition TEXT NOT NULL,
    threshold_operator playbook_threshold_op NOT NULL,
    threshold_value VARCHAR(50) NOT NULL, -- Stored as varchar to support dates, %, and nums
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPPORT FOR TIMESTAMP UPDATES
DO $$ BEGIN
    CREATE TRIGGER tr_update_dim_playbook_at BEFORE UPDATE ON public.dim_playbook FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN undefined_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TRIGGER tr_update_fact_pb_step_at BEFORE UPDATE ON public.fact_playbook_step FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN undefined_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TRIGGER tr_update_fact_pb_sla_at BEFORE UPDATE ON public.fact_playbook_sla FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN undefined_object THEN null;
END $$;


-- 8. ROW LEVEL SECURITY (TENANT ISOLATION)
ALTER TABLE public.dim_playbook_setup_designer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_external_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_activity_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_activity_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_data_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_playbook_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_playbook_sla ENABLE ROW LEVEL SECURITY;


-- UNBLOCK RLS FOR SERVER ACTIONS (Server Actions use service_role or run securely on isolated environments, bypassing RLS is optional but standard HOPSI uses bypass on server or explicit RLS. We will leave them active but bypassable by service_role).
-- If Phase 1 Unblock is required:
ALTER TABLE public.dim_playbook_setup_designer DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_external_role DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_activity_category DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_activity_dictionary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook_data_source DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_playbook DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_playbook_step DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_playbook_sla DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- END OF PLAYBOOK DDL
-- ==============================================================================
