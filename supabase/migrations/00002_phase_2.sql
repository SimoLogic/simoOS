-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · DATABASE MIGRATION PHASE 2
-- Module: Growthify (Business Plan & Approvals)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. GROWTHIFY STRATEGIES
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

-- 2. GROWTHIFY REWARDS SCHEMES
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

-- 3. GROWTHIFY REQUISITIONS (Approvals)
CREATE TABLE IF NOT EXISTS public.growthify_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    target_id VARCHAR(255) NOT NULL, -- ID of the Reward, Assignment, etc.
    module VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,      -- e.g., 'Reward Approval', 'HC Assignment'
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GROWTHIFY HC ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.growthify_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    strategies JSONB DEFAULT '[]'::jsonb, -- Array of strategy IDs
    "isApproved" BOOLEAN DEFAULT false,
    approver1_status VARCHAR(50) DEFAULT 'Pending',
    approver2_status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GROWTHIFY PLAYBOOKS
CREATE TABLE IF NOT EXISTS public.growthify_playbooks (
    id VARCHAR(50) PRIMARY KEY, -- PB-UUID format based on Front-End
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.growthify_strategies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'commercial', 'supporting', 'special'
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GROWTHIFY SELLER ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.growthify_seller_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE CASCADE,
    playbook_id VARCHAR(50) REFERENCES public.growthify_playbooks(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    value NUMERIC(18,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SECURITY (Row Level Security)
ALTER TABLE public.growthify_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_seller_activity ENABLE ROW LEVEL SECURITY;

-- Phase 1 Temporary Unblock: Disable RLS for rapid development
ALTER TABLE public.growthify_strategies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_requisitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_playbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_seller_activity DISABLE ROW LEVEL SECURITY;



-- 8. TRIGGERS for updated_at
CREATE TRIGGER tr_update_g_strategies_at BEFORE UPDATE ON public.growthify_strategies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_update_g_rewards_at BEFORE UPDATE ON public.growthify_rewards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_update_g_requisitions_at BEFORE UPDATE ON public.growthify_requisitions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_update_g_assignments_at BEFORE UPDATE ON public.growthify_assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER tr_update_g_playbooks_at BEFORE UPDATE ON public.growthify_playbooks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (HOPSI H-OS PHASE 2)
-- ─────────────────────────────────────────────────────────────────────────────
