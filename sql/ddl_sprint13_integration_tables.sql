-- ============================================================
-- Sprint 13 Migration: Integration Tables + PostgreSQL Shield
-- Apply this in Supabase SQL Editor after ddl_phase_3.sql
-- ============================================================

-- ─── EXTENSION: pgcrypto (needed for gen_random_uuid) ───────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── TABLE: pmo_user_integrations ────────────────────────────
-- Tracks which external providers (Salesforce, Zoom, Outlook)
-- a user has connected. One row per user+provider link.
CREATE TABLE IF NOT EXISTS public.pmo_user_integrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              TEXT NOT NULL,
    user_id             TEXT NOT NULL,
    provider            TEXT NOT NULL CHECK (provider IN ('salesforce', 'zoom', 'outlook')),
    provider_user_id    TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id, provider)
);

COMMENT ON TABLE public.pmo_user_integrations IS
    'Identity bridge between SIMO users and external OAuth providers (Llave #4).';

-- ─── TABLE: pmo_integration_tokens ───────────────────────────
-- Stores AES-256-GCM encrypted access & refresh tokens.
-- Raw token values are NEVER stored here — only vault ciphertext.
CREATE TABLE IF NOT EXISTS public.pmo_integration_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    provider        TEXT NOT NULL CHECK (provider IN ('salesforce', 'zoom', 'outlook')),
    -- ENCRYPTED fields — format: iv:authTag:ciphertext (hex-encoded)
    access_token    TEXT NOT NULL,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id, provider)
);

COMMENT ON TABLE public.pmo_integration_tokens IS
    'AES-256-GCM encrypted OAuth tokens. Shield Protocol: Never store plain-text tokens.';

COMMENT ON COLUMN public.pmo_integration_tokens.access_token IS
    'Vault-encrypted access token. Format: iv:authTag:ciphertext.';

COMMENT ON COLUMN public.pmo_integration_tokens.refresh_token IS
    'Vault-encrypted refresh token. Format: iv:authTag:ciphertext.';

-- ─── TABLE: pmo_sync_events ──────────────────────────────────
-- Event log for Mirror Sync Protocol (Llave #4).
-- Conflict events require user resolution via the comparison modal.
CREATE TABLE IF NOT EXISTS public.pmo_sync_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    task_id         UUID REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,      -- e.g. 'salesforce_pull', 'playbook_assignment'
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','queued','in_progress','conflict_detected','completed','failed')),
    idempotency_key TEXT,
    synced_fields   TEXT[],
    conflicts_found JSONB,              -- Array of {field, simoValue, externalValue}
    payload         JSONB,
    resolved_by     TEXT,
    resolved_at     TIMESTAMPTZ,
    timestamp_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmo_sync_events_org_status
    ON public.pmo_sync_events (org_id, status);

COMMENT ON TABLE public.pmo_sync_events IS
    'Mirror Sync Protocol audit log. Conflict rows surface the comparison modal in the UI.';

-- ─── TRIGGER GUARD: Protect Playbook Tasks (Llave #3) ────────
-- Prevents deletion of tasks with source_playbook_id at DB level.
-- This is the last line of defence — even if app code has a bug.
CREATE OR REPLACE FUNCTION public.fn_protect_playbook_task()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source_playbook_id IS NOT NULL THEN
        RAISE EXCEPTION 'TASK_PLAYBOOK_PROTECTED: Cannot delete task [%] — it is linked to Simo IS Playbook [%].',
            OLD.id, OLD.source_playbook_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_pmo_tasks ON public.pmo_tasks;
CREATE TRIGGER trg_protect_pmo_tasks
    BEFORE DELETE ON public.pmo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_playbook_task();

COMMENT ON TRIGGER trg_protect_pmo_tasks ON public.pmo_tasks IS
    'Shield 3 (Llave #3): Blocks DB-level deletion of tasks linked to a Playbook.';

-- ─── CHECK CONSTRAINT: Playbook Protection Parity ────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_playbook_protection'
    ) THEN
        ALTER TABLE public.pmo_tasks
            ADD CONSTRAINT check_playbook_protection
            CHECK ((source_playbook_id IS NULL) OR (is_protected = true));
    END IF;
END $$;

-- ─── UPDATED_AT triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['pmo_integration_tokens','pmo_user_integrations'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || tbl || '_updated_at'
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at()',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;
