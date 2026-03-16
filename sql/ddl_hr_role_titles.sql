-- ─────────────────────────────────────────────────────────────────────────────
-- SIMO Intellisense H-OS · DATABASE MIGRATION — HR ROLE TITLES
-- Module: HR › Job Description Library
-- Purpose:
--   1. Create dim_role_title  (Role Titles library, many per Job Title)
--   2. Patch dim_job_title    (add created_by column for panel display)
--   3. Patch dim_employee     (add role_title_id FK + role_title denorm)
--   4. Seed dim_job_title     (13 active HOMESI mortgage titles)
--   5. Seed dim_role_title    (3 role titles per job title → 39 rows)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. ROLE TITLE CATALOG ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dim_role_title (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    job_title_id    UUID        REFERENCES public.dim_job_title(id)  ON DELETE CASCADE,

    -- Role Title fields
    role_title      VARCHAR(60)  NOT NULL,
    describe_role   VARCHAR(500),

    -- Status (never deleted, only deactivated — Shield Protocol)
    status          VARCHAR(20)  NOT NULL DEFAULT 'Active', -- Active | Inactive

    -- Metadata
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_role_title_status CHECK (status IN ('Active', 'Inactive')),
    CONSTRAINT uq_role_title_per_job  UNIQUE (job_title_id, role_title)
);

-- ── 2. PATCH dim_job_title ────────────────────────────────────────────────────

ALTER TABLE public.dim_job_title
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(15); -- EID of creator (for panel)

-- ── 3. PATCH dim_employee ─────────────────────────────────────────────────────

ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS role_title_id UUID
        REFERENCES public.dim_role_title(id) ON DELETE SET NULL;

ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS role_title VARCHAR(60); -- Denormalized for fast reads

-- ── 4. PATCH hr_contracts (Prisma model) ─────────────────────────────────────
-- In case the HR module uses hr_contracts instead of dim_employee for job flow:
ALTER TABLE public.hr_contracts
    ADD COLUMN IF NOT EXISTS role_title VARCHAR(60);

-- ── 5. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_role_title_job_title    ON public.dim_role_title(job_title_id);
CREATE INDEX IF NOT EXISTS idx_role_title_tenant       ON public.dim_role_title(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_title_status       ON public.dim_role_title(status);
CREATE INDEX IF NOT EXISTS idx_employee_role_title     ON public.dim_employee(role_title);

-- ── 6. UPDATED_AT TRIGGERS ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS tr_update_role_title_at ON public.dim_role_title;
CREATE TRIGGER tr_update_role_title_at
    BEFORE UPDATE ON public.dim_role_title
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 7. ROW LEVEL SECURITY (disabled for rapid dev, enable in production) ──────

ALTER TABLE public.dim_role_title ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_role_title DISABLE ROW LEVEL SECURITY;

-- ── 8. SEED dim_job_title — 13 Active HOMESI Mortgage Titles ─────────────────
-- Uses default tenant_id 'HOMESI' — adjust tcode to match your dim_tenant row.
-- ON CONFLICT (tenant_id, title) DO NOTHING preserves existing custom data.

DO $$
DECLARE
  v_tenant VARCHAR(15) := 'HOMESI';
BEGIN
  -- Only seed if dim_tenant has this tcode
  IF EXISTS (SELECT 1 FROM public.dim_tenant WHERE tcode = v_tenant) THEN

    INSERT INTO public.dim_job_title (tenant_id, title, area, sub_area, status, approver1_status, approver2_status)
    VALUES
      (v_tenant, 'Loan Officer',                    'Sales',      'Mortgage Originations', 'Active', 'Approved', 'Approved'),
      (v_tenant, 'Loan Officer Assistant',           'Sales',      'Mortgage Originations', 'Active', 'Approved', 'Approved'),
      (v_tenant, 'Branch Manager',                   'Operations', 'Branch Management',     'Active', 'Approved', 'Approved'),
      (v_tenant, 'Non Producing Branch Manager',     'Operations', 'Branch Management',     'Active', 'Approved', 'Approved'),
      (v_tenant, 'Market Leader',                    'Sales',      'Leadership',            'Active', 'Approved', 'Approved'),
      (v_tenant, 'Business Developer Dual Comp',     'Sales',      'Business Development',  'Active', 'Approved', 'Approved'),
      (v_tenant, 'Business Developer',               'Sales',      'Business Development',  'Active', 'Approved', 'Approved'),
      (v_tenant, 'Sales Agent',                      'Sales',      'Inside Sales',          'Active', 'Approved', 'Approved'),
      (v_tenant, 'Finance Director',                 'Finance',    'Executive',             'Active', 'Approved', 'Approved'),
      (v_tenant, 'HR Director',                      'HR',         'Executive',             'Active', 'Approved', 'Approved'),
      (v_tenant, 'Operations Director',              'Operations', 'Executive',             'Active', 'Approved', 'Approved'),
      (v_tenant, 'Production Director',              'Operations', 'Production',            'Active', 'Approved', 'Approved'),
      (v_tenant, 'Marketing Manager',                'Marketing',  'Digital',               'Active', 'Approved', 'Approved')
    ON CONFLICT (tenant_id, title) DO NOTHING;

  END IF;
END;
$$;

-- ── 9. SEED dim_role_title — 3 Role Titles per Job Title ─────────────────────

DO $$
DECLARE
  v_tenant VARCHAR(15) := 'HOMESI';
  v_jt_id  UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.dim_tenant WHERE tcode = v_tenant) THEN

    -- Loan Officer
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Loan Officer' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Senior Loan Officer',           'Handles complex mortgage files with 5+ years experience. Manages high-volume accounts and mentors junior staff.'),
        (v_tenant, v_jt_id, 'Junior Loan Officer',           'Entry-level originator. Works on standard residential files under supervision of senior LOs.'),
        (v_tenant, v_jt_id, 'Loan Officer – Commercial',     'Specializes in commercial real estate loans. Works with business clients on investment property portfolios.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Loan Officer Assistant
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Loan Officer Assistant' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'LOA for Documents',             'Manages the document collection phase: requests, tracks, and validates all borrower documentation for loan submission.'),
        (v_tenant, v_jt_id, 'LOA for Closing',               'Coordinates all closing activities. Liaises with title companies, escrow, and borrowers to ensure on-time closing.'),
        (v_tenant, v_jt_id, 'LOA for Processing',            'Supports the processing stage: orders appraisals, verifications, and ensures conditions are cleared with the processor.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Branch Manager
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Branch Manager' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'BM – Producing',                'Active producer / player-coach. Originates own book while managing the branch team and P&L performance.'),
        (v_tenant, v_jt_id, 'BM – Training Lead',            'Branch Manager with designated responsibility for new LO onboarding and continuous training programs.'),
        (v_tenant, v_jt_id, 'BM – Operations Focus',         'Branch Manager primarily focused on pipeline management, compliance, and operational efficiency over origination.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Non Producing Branch Manager
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Non Producing Branch Manager' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'NPBM – Multi-Branch',           'Oversees 2+ branches. Does not personally originate; focuses on team metrics, compliance, and talent development.'),
        (v_tenant, v_jt_id, 'NPBM – Compliance Lead',        'Non-producing manager with specialized focus on regulatory compliance, audit readiness, and quality control.'),
        (v_tenant, v_jt_id, 'NPBM – Growth Lead',            'Strategic non-producing manager focused on market expansion, recruiter alignment, and revenue growth targets.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Market Leader
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Market Leader' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Regional Market Leader',        'Leads growth strategy across an entire region. Partners with Branch Managers to set and achieve market share goals.'),
        (v_tenant, v_jt_id, 'Market Leader – Builder',       'Specializes in new construction and builder relationships within a defined market geography.'),
        (v_tenant, v_jt_id, 'Market Leader – Realtor',       'Focuses on cultivating and managing referral relationships with real estate agent networks.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Business Developer Dual Comp
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Business Developer Dual Comp' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'BD Dual – Realtor Focus',       'Dual comp BD dedicated to realtor outreach. Receives originator and business development compensation.'),
        (v_tenant, v_jt_id, 'BD Dual – Corporate Accounts',  'Dual comp BD managing corporate and employer-assisted housing programs with split compensation structure.'),
        (v_tenant, v_jt_id, 'BD Dual – Spanish Market',      'Dual comp BD specialist targeting the Spanish-speaking borrower segment with bilingual communication and outreach.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Business Developer
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Business Developer' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'BD – Realtor Relations',        'Builds and maintains a network of real estate agent referral partners through outreach, events, and co-marketing.'),
        (v_tenant, v_jt_id, 'BD – Digital Channels',         'Focuses on online lead generation, social media outreach, and digital partnership programs to drive pipeline.'),
        (v_tenant, v_jt_id, 'BD – Financial Advisors',       'Cultivates referral partnerships with financial advisors, CPAs, and wealth management professionals.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Sales Agent
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Sales Agent' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Inside Sales Agent',            'Handles inbound leads and warm transfers. Qualifies borrowers and sets appointments for Loan Officers.'),
        (v_tenant, v_jt_id, 'Outbound Sales Agent',          'Proactively contacts leads from marketing campaigns, re-engages past pipeline, and generates new borrower interest.'),
        (v_tenant, v_jt_id, 'Bilingual Sales Agent',         'Spanish/English bilingual agent serving diverse borrower demographics across inbound and outbound channels.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Finance Director
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Finance Director' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Finance Director – Planning',   'Leads strategic financial planning, budgeting, and long-range forecasting. Owners the financial model for the organization.'),
        (v_tenant, v_jt_id, 'Finance Director – Reporting',  'Manages financial reporting, month-end close, and investor/stakeholder deliverables.'),
        (v_tenant, v_jt_id, 'Finance Director – Compliance', 'Oversees financial compliance, tax strategy, and regulatory reporting. Partners with legal and audit functions.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- HR Director
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'HR Director' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'HR Director – Talent',          'Leads talent acquisition, employer branding, and workforce planning strategy across all business units.'),
        (v_tenant, v_jt_id, 'HR Director – Operations',      'Owns HR operations: payroll management, HRIS, benefits administration, and compliance for Colombian labor laws.'),
        (v_tenant, v_jt_id, 'HR Director – Culture',         'Drives employee experience, engagement programs, DEI initiatives, and organizational culture strategy.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Operations Director
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Operations Director' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Ops Director – Fulfillment',    'Leads the mortgage fulfillment pipeline from processing to closing. Owns SLAs, capacity planning, and quality metrics.'),
        (v_tenant, v_jt_id, 'Ops Director – Technology',     'Oversees LOS platforms, integrations, and operational technology stack for the offshore delivery team.'),
        (v_tenant, v_jt_id, 'Ops Director – Training',       'Develops and maintains operational training programs, SOPs, and continuous improvement initiatives for all teams.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Production Director
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Production Director' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Production Director – North',   'Leads production delivery for the Northern US client portfolio. Manages team capacity, throughput, and client SLAs.'),
        (v_tenant, v_jt_id, 'Production Director – South',   'Leads production delivery for Southern US clients. Responsible for pipeline velocity, pull-through rates, and staffing.'),
        (v_tenant, v_jt_id, 'Production Director – QC',      'Owns quality control across all production teams. Reviews files pre-submission, runs QA audits, and manages error rates.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

    -- Marketing Manager
    SELECT id INTO v_jt_id FROM public.dim_job_title WHERE tenant_id = v_tenant AND title = 'Marketing Manager' LIMIT 1;
    IF v_jt_id IS NOT NULL THEN
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, describe_role)
      VALUES
        (v_tenant, v_jt_id, 'Marketing Manager – Digital',   'Manages paid and organic digital channels including SEO, SEM, social media, email automation, and content strategy.'),
        (v_tenant, v_jt_id, 'Marketing Manager – Brand',     'Leads brand identity, visual standards, and co-marketing partnerships with referral partners and builder networks.'),
        (v_tenant, v_jt_id, 'Marketing Manager – Events',    'Plans and executes in-person and virtual events, webinars, and community outreach programs to generate awareness.')
      ON CONFLICT (job_title_id, role_title) DO NOTHING;
    END IF;

  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (SIMO Intellisense H-OS — HR ROLE TITLES)
-- ─────────────────────────────────────────────────────────────────────────────
