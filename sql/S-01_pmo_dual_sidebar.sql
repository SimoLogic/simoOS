-- ===============================================================================
-- SIMO INTELLISENSE PMO MASTER PLAN
-- SPRINT S-01: DUAL SIDEBAR ARCHITECTURE
-- ===============================================================================

CREATE TABLE IF NOT EXISTS public.pmo_user_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pmo_user_prefs ON public.pmo_user_preferences(org_id, user_id);
