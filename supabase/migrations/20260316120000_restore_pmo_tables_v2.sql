-- SIMO Intellisense — Restore PMO Tables Dropped by Prisma
-- Prisma db push drops tables that are not in schema.prisma.
-- This migration restores the ones that were dropped.

-- 1. Restore dropped columns on existing tables
ALTER TABLE public.pmo_workspaces
    ALTER COLUMN id TYPE TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Drop dependent constraints temporarily
ALTER TABLE IF EXISTS public.pmo_board_shares DROP CONSTRAINT IF EXISTS pmo_board_shares_board_id_fkey;
ALTER TABLE IF EXISTS public.pmo_board_shares ALTER COLUMN board_id TYPE TEXT;

ALTER TABLE public.pmo_boards
    ALTER COLUMN id TYPE TEXT,
    ADD COLUMN IF NOT EXISTS workspace_id TEXT, -- Note: originally it was TEXT referencing TEXT id, but now it's referencing UUID workspace? Let's use TEXT for now, wait we'll cast if needed. 
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS simo_playbook_id TEXT,
    ADD COLUMN IF NOT EXISTS is_playbook_board BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS active_view TEXT NOT NULL DEFAULT 'grid',
    ADD COLUMN IF NOT EXISTS is_view_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Re-add constraint
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pmo_board_shares') THEN
        ALTER TABLE public.pmo_board_shares 
          ADD CONSTRAINT pmo_board_shares_board_id_fkey 
          FOREIGN KEY (board_id) REFERENCES public.pmo_boards(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pmo_columns (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id      TEXT        NOT NULL,
    board_id    TEXT        NOT NULL REFERENCES public.pmo_boards(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'text'
                CHECK (type IN ('text','status','person','date','date_range','number','formula',
                                'checkbox','dropdown','file','mirror','link','email','phone',
                                'rating','progress')),
    position    INTEGER     NOT NULL DEFAULT 0,
    width_px    INTEGER     NOT NULL DEFAULT 200,
    settings    JSONB,

    CONSTRAINT pmo_columns_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_columns_board_id ON public.pmo_columns(board_id);
ALTER TABLE public.pmo_columns DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pmo_groups (
    id           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id       TEXT        NOT NULL,
    board_id     TEXT        NOT NULL REFERENCES public.pmo_boards(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL,
    color        TEXT        NOT NULL DEFAULT '#6161FF',  -- Vibe token hex
    position     INTEGER     NOT NULL DEFAULT 0,
    is_collapsed BOOLEAN     NOT NULL DEFAULT FALSE,

    CONSTRAINT pmo_groups_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_groups_board_id ON public.pmo_groups(board_id);
ALTER TABLE public.pmo_groups DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pmo_subtasks (
    id           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    task_id      TEXT        NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    org_id       TEXT        NOT NULL,
    title        TEXT        NOT NULL,
    is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_subtasks_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_subtasks_task_id ON public.pmo_subtasks(task_id);
ALTER TABLE public.pmo_subtasks DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pmo_comments (
    id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    task_id    TEXT        NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    org_id     TEXT        NOT NULL,
    author_id  TEXT        NOT NULL,
    content    TEXT        NOT NULL,              -- Rich text (Tiptap JSON)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_comments_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_comments_task_id ON public.pmo_comments(task_id);
ALTER TABLE public.pmo_comments DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pmo_sync_events (
    id               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    task_id          TEXT        NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    org_id           TEXT        NOT NULL,
    synced_fields    TEXT[]      NOT NULL DEFAULT '{}',
    conflicts_found  TEXT[]      NOT NULL DEFAULT '{}',
    resolved_by      TEXT        CHECK (resolved_by IN ('employee','simo_is','pending')),
    idempotency_key  TEXT        NOT NULL UNIQUE,         -- Previene duplicados por retry
    timestamp_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_sync_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_sync_events_task_id ON public.pmo_sync_events(task_id);
CREATE INDEX IF NOT EXISTS idx_pmo_sync_events_org_id  ON public.pmo_sync_events(org_id);
ALTER TABLE public.pmo_sync_events DISABLE ROW LEVEL SECURITY;

-- PostgREST cache reload explicitly just in case (optional, but good practice if available)
NOTIFY pgrst, 'reload schema';
