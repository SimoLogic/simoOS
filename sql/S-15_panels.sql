-- S-15: Ensure pmo_panels table exists (from S-02 DDL, may not have been executed)
CREATE TABLE IF NOT EXISTS public.pmo_panels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    owner_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    icon       TEXT DEFAULT '📊',
    config     JSONB NOT NULL DEFAULT '{"widgets": []}',
    position   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_panels_org ON public.pmo_panels(org_id, owner_id);

NOTIFY pgrst, 'reload schema';
