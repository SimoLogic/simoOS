-- SIMO Intellisense — Force Re-add Dropped PMO Columns
-- Sometimes Supabase migration history causes previous file modifications to be skipped.
-- This file guarantees the columns are definitively added to the database.

ALTER TABLE public.pmo_boards
    ADD COLUMN IF NOT EXISTS workspace_id TEXT, 
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS simo_playbook_id TEXT,
    ADD COLUMN IF NOT EXISTS is_playbook_board BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS active_view TEXT NOT NULL DEFAULT 'grid',
    ADD COLUMN IF NOT EXISTS is_view_locked BOOLEAN NOT NULL DEFAULT FALSE;
