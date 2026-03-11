-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · DATABASE MIGRATION — JOB TITLES
-- Module: HR › Recruitment
-- Purpose: Creates dim_job_title (Job Description Repository) and patches
--          dim_employee to add the job_title relational field.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. JOB TITLE CATALOG
CREATE TABLE IF NOT EXISTS public.dim_job_title (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,

    -- Core Identity
    title               VARCHAR(255) NOT NULL,             -- e.g. "Branch Manager"
    area                VARCHAR(100),
    sub_area            VARCHAR(100),
    cost_center         VARCHAR(20),
    sub_cost_center     VARCHAR(20),
    direct_supervisor   VARCHAR(255),                      -- Denormalized for display

    -- Workflow Status
    status              VARCHAR(20) NOT NULL DEFAULT 'Draft', -- Draft | Active | Inactive
    requester_id        VARCHAR(15),                       -- EID of person opening req
    approver1_id        VARCHAR(15),
    approver1_status    VARCHAR(20) NOT NULL DEFAULT 'Pending',  -- Pending | Approved | Rejected
    approver2_id        VARCHAR(15),
    approver2_status    VARCHAR(20) NOT NULL DEFAULT 'Pending',

    -- Rich Job Description (JSONB for flexibility / future-proofing)
    -- Schema of jdf_data:
    -- {
    --   education_level: string,
    --   specific_profession: string,
    --   years_experience: number,
    --   exp_national_companies: number,
    --   exp_multinationals: number,
    --   exp_specific_sector: string,
    --   specific_sector_name: string,
    --   soft_skills: string[],
    --   specific_knowledge: string[],
    --   languages: [{language: string, level: string}],
    --   certifications: string[],
    --   psychometric_tests: string[],
    --   skills_tests: string[],
    --   job_description: string
    -- }
    jdf_data            JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    -- Integrity constraints
    UNIQUE(tenant_id, title),
    CONSTRAINT chk_job_title_status CHECK (status IN ('Draft', 'Active', 'Inactive')),
    CONSTRAINT chk_approver1_status CHECK (approver1_status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT chk_approver2_status CHECK (approver2_status IN ('Pending', 'Approved', 'Rejected')),
    -- Anti self-approval at DB level
    CONSTRAINT chk_no_self_approval1 CHECK (requester_id IS NULL OR approver1_id IS NULL OR requester_id <> approver1_id),
    CONSTRAINT chk_no_self_approval2 CHECK (requester_id IS NULL OR approver2_id IS NULL OR requester_id <> approver2_id),
    CONSTRAINT chk_no_circular_approval CHECK (approver1_id IS NULL OR approver2_id IS NULL OR approver1_id <> approver2_id)
);

-- 2. PATCH dim_employee — add job_title column
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_job_title_tenant   ON public.dim_job_title(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_title_status   ON public.dim_job_title(status);
CREATE INDEX IF NOT EXISTS idx_employee_job_title ON public.dim_employee(job_title);

-- 4. ROW LEVEL SECURITY (disabled for rapid development — enable in production)
ALTER TABLE public.dim_job_title ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_job_title DISABLE ROW LEVEL SECURITY;

-- 5. UPDATED_AT TRIGGER
CREATE TRIGGER tr_update_job_title_at
    BEFORE UPDATE ON public.dim_job_title
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (HOPSI H-OS — JOB TITLES)
-- ─────────────────────────────────────────────────────────────────────────────
