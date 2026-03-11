-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · DATABASE MIGRATION
-- 00011_geography_ddl.sql
-- Description: Creates geography tables and patches dim_employee for the Demo.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create Geography Reference Tables
CREATE TABLE IF NOT EXISTS public.dim_continent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.dim_country (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    continent_id UUID REFERENCES public.dim_continent(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL UNIQUE,
    currency_code VARCHAR(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.dim_city (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES public.dim_country(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    UNIQUE(country_id, name)
);

-- 2. Add Geography and Hierarchy Fields to Employee Table
ALTER TABLE public.dim_employee
    ADD COLUMN IF NOT EXISTS continent_id UUID REFERENCES public.dim_continent(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.dim_country(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.dim_city(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS direct_leader_id VARCHAR(15) REFERENCES public.dim_employee(eid) ON DELETE SET NULL;

-- 3. Add RLS Policies for New Tables
ALTER TABLE public.dim_continent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_country ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_city ENABLE ROW LEVEL SECURITY;

-- Note: Disabled for rapid development as requested previously
ALTER TABLE public.dim_continent DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_country DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_city DISABLE ROW LEVEL SECURITY;
