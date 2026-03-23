CREATE TABLE IF NOT EXISTS public.dim_external_role (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT        NOT NULL,
    name            VARCHAR(50) NOT NULL,
    business_type   TEXT,
    size            TEXT        CHECK (size IN ('Small','Mid','Large')),
    annual_volume   TEXT,
    num_agents      TEXT,
    notes           TEXT,
    status          TEXT        NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dim_external_role_org
    ON public.dim_external_role(org_id, status);
