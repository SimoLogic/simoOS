-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI H-OS · Local Legal Entity Catalogue
-- Run this in Supabase SQL Editor BEFORE deploying the code changes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dim_local_legal_entity (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name    VARCHAR(255) NOT NULL UNIQUE,       -- "Local Entity" name (matches entidad_legal in dim_employee)
    local_tax_id   VARCHAR(50),                         -- e.g. NIT number
    local_ein      VARCHAR(50),                         -- e.g. US EIN or equivalent
    entity_country VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Seed existing hard-coded entities so no employee data is orphaned
INSERT INTO public.dim_local_legal_entity (entity_name, entity_country)
VALUES
    ('HOMESI SAS',     'Colombia'),
    ('HOMESI BPO SAS', 'Colombia')
ON CONFLICT (entity_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT
-- ─────────────────────────────────────────────────────────────────────────────
