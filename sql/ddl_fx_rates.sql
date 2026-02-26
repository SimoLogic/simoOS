-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI H-OS · FX Rates Master DDL
-- Run this in Supabase SQL Editor BEFORE deploying the code changes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dim_fx_rates (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(20)   NOT NULL REFERENCES public.dim_tenant(tcode) ON DELETE CASCADE,
    effective_date  DATE          NOT NULL,
    exchange_rate   NUMERIC(18,4) NOT NULL,
    currency_from   VARCHAR(3)    NOT NULL DEFAULT 'COP',
    currency_to     VARCHAR(3)    NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- There should only be one rate per day, per currency pair, per tenant
    UNIQUE(tenant_id, effective_date, currency_from, currency_to)
);

CREATE INDEX IF NOT EXISTS idx_dim_fx_tenant ON public.dim_fx_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dim_fx_date   ON public.dim_fx_rates(effective_date);

-- Security
ALTER TABLE public.dim_fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_fx_rates DISABLE ROW LEVEL SECURITY;

-- Auto update timestamp
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
