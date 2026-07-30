-- ─────────────────────────────────────────────────────────────────────────────
-- SIMO Intellisense · Commercial Activity & Forecast Module
-- Date: 2026-07-30
-- Purpose: Integrates the standalone "homesi-reporte-actividad" tool
--          (Commercial Activity tab + Forecast/Pipeline tab) as a native
--          module of simoOS, reusing its original Postgres schema
--          ('activity_report') 1:1 — no columns renamed, no logic changed.
--
-- Origin repo: https://github.com/HeatherYelettni/homesi-reporte-actividad
-- Original schema lived in its own Supabase project under the
-- 'activity_report' schema (not 'public'). We keep the same schema name and
-- table/column names here so the ported code in
-- /lib/commercial-activity/supabase/* works unchanged.
--
-- TENANT_ID — DEFENSIVE ADDITION (per product decision 2026-07-30):
--   The original tool has NO multi-tenant concept (single global
--   is_current batch, internal HOMESI use only). Per this project's
--   GLOBAL_RULES.md (every query must filter by tenant_id), we add a
--   `tenant_id` column now with a fixed default ('TNT-001' = HOMESI),
--   so that IF this module is ever needed for other simoOS tenants, no
--   data migration or schema rewrite is required — only enabling the
--   dynamic filter + RLS policy on this already-existing column.
--   Today the app code does NOT filter by it; it is a placeholder.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS activity_report;

-- Required so PostgREST/Supabase can serve this schema over the API.
-- ⚠️ MANUAL STEP after running this migration: in Supabase Dashboard →
--    Settings → API → "Exposed schemas", add `activity_report` to the list.
--    Without this, all queries from the app will fail with "schema not found".

-- ── upload_batches ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_report.upload_batches (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           VARCHAR(15) NOT NULL DEFAULT 'TNT-001'
                            REFERENCES public.dim_tenant(tcode),
    source_file_name    TEXT NOT NULL,
    row_count           INTEGER NOT NULL DEFAULT 0,
    is_current          BOOLEAN NOT NULL DEFAULT false,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce at most one is_current=true batch PER tenant (defensive; app also
-- clears the previous current batch before inserting a new one).
CREATE UNIQUE INDEX IF NOT EXISTS idx_upload_batches_one_current_per_tenant
    ON activity_report.upload_batches (tenant_id)
    WHERE is_current = true;

-- ── loan_records ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_report.loan_records (
    id                          BIGSERIAL PRIMARY KEY,
    upload_batch_id             BIGINT NOT NULL
                                    REFERENCES activity_report.upload_batches(id) ON DELETE CASCADE,
    tenant_id                   VARCHAR(15) NOT NULL DEFAULT 'TNT-001'
                                    REFERENCES public.dim_tenant(tcode),

    -- Raw columns (as parsed from the source Excel, pre-business-rules)
    true_org_id_raw             TEXT,
    loan_officer_raw            TEXT,
    bd_raw                      TEXT,
    b2b_loans_raw               TEXT,
    loan_info_channel_raw       TEXT,
    file_creation_raw           TEXT,   -- YYYY-MM or null
    credit_report_raw           TEXT,   -- YYYY-MM or null
    app_date_raw                TEXT,   -- YYYY-MM or null
    milestone_funding_raw       TEXT,   -- YYYY-MM or null
    milestone_completion_raw    TEXT,   -- YYYY-MM or null
    total_loan_amount           NUMERIC(14, 2) DEFAULT 0,

    -- Processed columns (after classifyLoan() business rules)
    branch                      TEXT NOT NULL,
    loan_officer                TEXT NOT NULL,
    bd                          TEXT NOT NULL,
    is_b2b                      BOOLEAN NOT NULL DEFAULT false,
    file_creation_month         TEXT,   -- YYYY-MM or null
    credit_report_month         TEXT,   -- YYYY-MM or null
    app_date_month              TEXT,   -- YYYY-MM or null
    closing_month               TEXT,   -- YYYY-MM or null

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_records_batch ON activity_report.loan_records(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_loan_records_tenant ON activity_report.loan_records(tenant_id);

-- ── RLS — matches current project-wide phase (disabled during dev, see
--    00009_patch_rls.sql and docs/AGENT_CONTEXT_ANTIGRAVITY.md §2 for the
--    hardening plan). Re-enable together with the rest of the app tables.
ALTER TABLE activity_report.upload_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_report.loan_records   DISABLE ROW LEVEL SECURITY;

-- Future policy (apply during RLS hardening phase, see docs/AGENT_CONTEXT_ANTIGRAVITY.md):
-- CREATE POLICY tenant_isolation_policy ON activity_report.upload_batches
--     FOR ALL USING (tenant_id = auth.jwt()->>'tenant_id');
-- CREATE POLICY tenant_isolation_policy ON activity_report.loan_records
--     FOR ALL USING (tenant_id = auth.jwt()->>'tenant_id');

-- ─────────────────────────────────────────────────────────────────────────────
-- pipeline_forecast schema — discovered while porting ForecastPipelineView.tsx
-- (original repo built its own client on-the-fly pointing to this schema,
-- separate from 'activity_report'). Only one table found in use: branch ->
-- manager name lookup, read-only from the UI's perspective.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS pipeline_forecast;

-- ⚠️ MANUAL STEP after running this migration: also add `pipeline_forecast`
--    to Supabase Dashboard -> Settings -> API -> "Exposed schemas".

CREATE TABLE IF NOT EXISTS pipeline_forecast.branch_managers (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(15) NOT NULL DEFAULT 'TNT-001'
                        REFERENCES public.dim_tenant(tcode),
    branch          TEXT NOT NULL,
    manager_name    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, branch)
);

ALTER TABLE pipeline_forecast.branch_managers DISABLE ROW LEVEL SECURITY;

-- Future policy (same hardening phase as above):
-- CREATE POLICY tenant_isolation_policy ON pipeline_forecast.branch_managers
--     FOR ALL USING (tenant_id = auth.jwt()->>'tenant_id');
