-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI H-OS · MASTER RLS DISABLE PATCH
-- Date: 2026-02-24
-- Purpose: Disables Row Level Security on ALL application tables for rapid
--          development (Phase 1 / Phase 2 dev mode).
--
-- ROOT CAUSE of Branch Master "row violates row-level security" error:
--   dim_branch was created with ENABLE ROW LEVEL SECURITY in ddl_branch_master.sql
--   but had NO corresponding DISABLE and NO permissive policies, so every write
--   (INSERT / UPDATE / DELETE) from the anon key was blocked by Postgres.
--
-- AFFECTED TABLES MISSING THEIR DISABLE (identified via full SQL audit):
--   - dim_branch         (ddl_branch_master.sql had no DISABLE)
--   - dim_local_legal_entity (ddl_local_legal_entity.sql had no RLS statements at all —
--                             Supabase auto-enables RLS for new tables by default)
--
-- ALL OTHER TABLES (already had ENABLE+DISABLE pairs):
--   dim_tenant, dim_employee, dim_job_title, employee_approvers,
--   dim_playbooks, bp_workflow, process_designs, dim_proforma,
--   growthify_strategies, growthify_rewards, growthify_requisitions,
--   growthify_assignments, growthify_playbooks, growthify_seller_activity
--   (repeated here for completeness and idempotency)
--
-- RE-ENABLE STRATEGY FOR PRODUCTION:
--   Replace DISABLE with proper JWT-based policies using:
--   CREATE POLICY ... USING (tenant_id = auth.jwt()->>'tenant_id');
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Phase 1 Core Tables ───────────────────────────────────────────────────────
ALTER TABLE public.dim_tenant           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_employee         DISABLE ROW LEVEL SECURITY;

-- ── HR Module ─────────────────────────────────────────────────────────────────
ALTER TABLE public.dim_job_title        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_approvers   DISABLE ROW LEVEL SECURITY;

-- ── Operations Module ─────────────────────────────────────────────────────────
-- FIX: dim_branch was missing DISABLE — root cause of the Branch Master save error
ALTER TABLE public.dim_branch           DISABLE ROW LEVEL SECURITY;

-- FIX: dim_local_legal_entity — Supabase default may have enabled RLS on creation
ALTER TABLE public.dim_local_legal_entity DISABLE ROW LEVEL SECURITY;

-- Operations sub-module tables (Phase 3)
ALTER TABLE public.dim_proforma         DISABLE ROW LEVEL SECURITY;

-- ── Business Plan Module ──────────────────────────────────────────────────────
ALTER TABLE public.dim_playbooks        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_workflow          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_designs      DISABLE ROW LEVEL SECURITY;

-- ── Growthify Module ──────────────────────────────────────────────────────────
ALTER TABLE public.growthify_strategies     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_rewards        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_requisitions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_assignments    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_playbooks      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.growthify_seller_activity DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERY — run this after applying the script to confirm:
-- Expected: all rows should show rowsecurity = false
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT (HOPSI H-OS — Master RLS Disable Patch)
-- ─────────────────────────────────────────────────────────────────────────────
