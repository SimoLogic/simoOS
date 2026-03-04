-- ==============================================================================
-- SIMO INTELLISENSE – PLAYBOOK DESIGNER V3 PATCH (PROMPT ALIGNMENT)
-- ==============================================================================

-- 1. STRATEGY TABLE (Missing from original implementation)
CREATE TABLE IF NOT EXISTS public.growthify_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    purpose TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.growthify_strategies ENABLE ROW LEVEL SECURITY;
-- (Optionally) Bypass RLS for Phase 1 where requested
ALTER TABLE public.growthify_strategies DISABLE ROW LEVEL SECURITY;


-- 2. ADD MISSING COLUMNS TO FACT_PLAYBOOK_STEP
ALTER TABLE public.fact_playbook_step
ADD COLUMN IF NOT EXISTS owner_employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stakeholder_employee_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contra_activity_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS contra_activity_purpose TEXT;

-- Note: The playbook_frequency enum already includes 'Per Semester' from migration 00013.
