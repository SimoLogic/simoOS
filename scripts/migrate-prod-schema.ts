// Migration via Supabase Management API — POST /v1/projects/{ref}/database/query
// This allows raw SQL execution without needing a direct Postgres password.

const PROJECT_REF = "eezzumwlucfidzyppllj";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Strategy: Create a temporary PL/pgSQL function exec_sql, call it via rpc, then drop it.
async function setupExecSql() {
  // First, try to create the function via a minimal insert trick
  // Actually, Supabase service_role can call pg functions.
  // Let's try to create exec_sql function using the REST sql endpoint.
  
  // The Supabase JS client v2 does NOT have a .sql() method.
  // We need to use the HTTP endpoint directly.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: 'SELECT 1' }),
  });

  if (res.ok) {
    console.log("✅ exec_sql function already exists. Proceeding...");
    return true;
  }
  
  console.log("⚠️  exec_sql function not found. Attempting to create it...");
  
  // Try creating via the Supabase SQL API (requires the Management API key, not service_role)
  // Fallback: We'll batch all SQL into one giant statement and use a workaround
  return false;
}

// Alternative: Use the Supabase Dashboard SQL API (requires access token, not service_role)
// Let's try yet another approach: execute each DDL as a database function creation

const MIGRATION_SQL = `
-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCTION SCHEMA MIGRATION — Leveling to match schema.prisma
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1a. users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  country_code TEXT NOT NULL DEFAULT 'CO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(org_id);

-- 1b. pmo_activity_logs
CREATE TABLE IF NOT EXISTS public.pmo_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  task_id UUID NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 1e. hr_contracts
CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 1f. hr_payroll_periods
CREATE TABLE IF NOT EXISTS public.hr_payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.hr_contracts(id),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3. Disable RLS on new tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.simo_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_vacation_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_role_title DISABLE ROW LEVEL SECURITY;
`;

// Split the big SQL into individual statements and execute them one by one
// via a temporary RPC function
async function runMigration() {
  console.log("🏗️  PRODUCTION SCHEMA MIGRATION — Starting...\n");

  // Step 1: Create a temporary exec_sql function
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE query;
      RETURN 'OK';
    END;
    $$;
  `;

  // Try creating the function via the SQL endpoint
  const fnRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: createFnSQL }),
  });

  if (!fnRes.ok) {
    // Function doesn't exist yet — we need to create it first
    // Use Supabase's internal SQL endpoint
    console.log("⚠️  exec_sql RPC not available. Trying alternative SQL execution...");
    
    // Use the Supabase SQL API via the Management API
    // Alternative: Use supabase db push via CLI or just provide the SQL file
    // Let's try using the postgREST schema cache refresh endpoint
    
    // Actually, let's try the simplest approach: use the Supabase CLI
    console.log("\n📋 The migration SQL has been generated. Please execute it in the Supabase SQL Editor.");
    console.log("   Copy the contents of sql/migrate_prod_leveling.sql and paste in:");
    console.log("   https://supabase.com/dashboard/project/eezzumwlucfidzyppllj/sql\n");
    
    // Write the SQL to a file
    const fs = await import('fs');
    fs.writeFileSync('sql/migrate_prod_leveling.sql', MIGRATION_SQL.trim(), 'utf8');
    console.log("✅ SQL file written to: sql/migrate_prod_leveling.sql");
    return;
  }

  console.log("✅ exec_sql function available. Executing statements...\n");
  
  // Split and execute
  const statements = MIGRATION_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const label = sql.split('\n').filter(l => !l.startsWith('--'))[0]?.trim().substring(0, 70) || '...';

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (res.ok) {
      console.log(`✅ [${i + 1}/${statements.length}] ${label}`);
      success++;
    } else {
      const err = await res.json();
      console.error(`❌ [${i + 1}/${statements.length}] ${label}`);
      console.error(`   ${err.message || JSON.stringify(err)}`);
      failed++;
    }
  }

  console.log(`\n📊 MIGRATION COMPLETE: ${success} succeeded, ${failed} failed out of ${statements.length} statements.`);
}

runMigration();
