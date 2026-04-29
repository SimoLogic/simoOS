-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCTION SCHEMA MIGRATION V2 — Leveling to match schema.prisma (Type-Safe)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1a. users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  country_code TEXT NOT NULL DEFAULT 'CO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(org_id);

-- 1b. pmo_activity_logs (task_id corregido a TEXT)
CREATE TABLE IF NOT EXISTS public.pmo_activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_activity_logs_org ON public.pmo_activity_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_pmo_activity_logs_task ON public.pmo_activity_logs(task_id);

-- 1c. pmo_events
CREATE TABLE IF NOT EXISTS public.pmo_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  external_id TEXT,
  external_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_events_org ON public.pmo_events(org_id);

-- 1d. simo_notifications
CREATE TABLE IF NOT EXISTS public.simo_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  action_url TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_simo_notif_org_user ON public.simo_notifications(org_id, user_id, status);

-- 1e. hr_contracts (employee_id sigue siendo UUID porque hr_employees usa UUID)
CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  tipo_contrato TEXT NOT NULL,
  tipo_salario TEXT NOT NULL,
  salario_base_enc TEXT NOT NULL DEFAULT '0',
  salary_currency_code TEXT NOT NULL DEFAULT 'COP',
  procedimiento_renta INT NOT NULL DEFAULT 1,
  entidad_legal TEXT,
  area TEXT NOT NULL DEFAULT 'General',
  sub_area TEXT NOT NULL DEFAULT 'General',
  centro_costo TEXT NOT NULL DEFAULT 'CC01',
  nombre_centro_costo TEXT,
  branch TEXT,
  cliente TEXT,
  project TEXT,
  digito_dedicacion INT NOT NULL DEFAULT 100,
  direct_leader_id TEXT,
  job_title TEXT,
  role_title TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_org ON public.hr_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_emp ON public.hr_contracts(employee_id);

-- 1f. hr_payroll_periods (contract_id is TEXT, employee_id is UUID)
CREATE TABLE IF NOT EXISTS public.hr_payroll_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL REFERENCES public.hr_contracts(id),
  period_label TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  worked_days_count INT NOT NULL DEFAULT 0,
  vacation_days_deducted INT NOT NULL DEFAULT 0,
  base_amount_enc TEXT NOT NULL DEFAULT '0',
  total_gross_enc TEXT NOT NULL DEFAULT '0',
  deductions_enc TEXT NOT NULL DEFAULT '{}',
  net_pay_enc TEXT NOT NULL DEFAULT '0',
  currency_code TEXT NOT NULL DEFAULT 'COP',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, employee_id, period_label)
);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_org ON public.hr_payroll_periods(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_emp ON public.hr_payroll_periods(employee_id);

-- 1g. hr_vacation_requests
CREATE TABLE IF NOT EXISTS public.hr_vacation_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  request_date TIMESTAMPTZ DEFAULT NOW(),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  calendar_days INT NOT NULL DEFAULT 0,
  workday_days INT NOT NULL DEFAULT 0,
  holidays_skipped INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by_id TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_vacation_org ON public.hr_vacation_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_vacation_emp ON public.hr_vacation_requests(employee_id);

-- 1h. hr_performance_reviews
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  review_period TEXT NOT NULL,
  review_date TIMESTAMPTZ NOT NULL,
  score_delivery FLOAT NOT NULL DEFAULT 0,
  score_attitude FLOAT NOT NULL DEFAULT 0,
  score_collaboration FLOAT NOT NULL DEFAULT 0,
  score_innovation FLOAT NOT NULL DEFAULT 0,
  score_overall FLOAT NOT NULL DEFAULT 0,
  strengths_notes TEXT,
  improvement_notes TEXT,
  next_goals TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_perf_org ON public.hr_performance_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_hr_perf_emp ON public.hr_performance_reviews(employee_id);

-- 1i. dim_role_title
CREATE TABLE IF NOT EXISTS public.dim_role_title (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(15) REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
  job_title_id UUID REFERENCES public.dim_job_title(id) ON DELETE CASCADE,
  role_title VARCHAR(60) NOT NULL,
  describe_role VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_role_title_status CHECK (status IN ('Active', 'Inactive')),
  CONSTRAINT uq_role_title_per_job UNIQUE (job_title_id, role_title)
);
CREATE INDEX IF NOT EXISTS idx_role_title_tenant ON public.dim_role_title(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_title_job ON public.dim_role_title(job_title_id);

-- ─── 2. ALTER EXISTING TABLES ──────────────────────────────────────────────

-- 2a. hr_employees
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS eid TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS email_corporate TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS identificacion_enc TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS primer_nombre TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS otros_nombres TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS primer_apellido TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS segundo_apellido TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS fecha_nacimiento TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS genero CHAR(1);
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS email_personal TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS municipio_dane TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS direccion_residencia TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS continent_id TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS country_id TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS city_id TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS salary_currency_code TEXT DEFAULT 'COP';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.hr_employees SET primer_nombre = first_name WHERE primer_nombre IS NULL AND first_name IS NOT NULL;
UPDATE public.hr_employees SET primer_apellido = last_name WHERE primer_apellido IS NULL AND last_name IS NOT NULL;
UPDATE public.hr_employees SET email_personal = email WHERE email_personal IS NULL AND email IS NOT NULL;

-- 2b. bp_playbooks
ALTER TABLE public.bp_playbooks ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.bp_playbooks ADD COLUMN IF NOT EXISTS global_owners TEXT[] DEFAULT '{}';

-- 2c. bp_playbook_steps
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS type_of_activity TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS activity_description TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS deliverable TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS deliverable_description TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS stakeholder TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS repetitions INT DEFAULT 1;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS freq_notes TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS supporting_task TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS counteraction_description TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS requested_to TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS sla TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS sla_description TEXT;
ALTER TABLE public.bp_playbook_steps ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN DEFAULT false;

-- 3. Disable RLS on new tables (Critical for Seed processing to override constraints temporarily)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.simo_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_vacation_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_role_title DISABLE ROW LEVEL SECURITY;
