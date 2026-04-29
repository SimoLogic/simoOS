-- ============================================================================
-- MIGRATION: Playbook Lifecycle Management
-- Adds version tracking and duplicate lineage to bp_playbooks
-- Date: 2026-04-14
-- Run in: Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- FIX: parent_id is TEXT to match the actual type of bp_playbooks.id
-- (the live schema uses TEXT for the PK, not UUID)
-- ============================================================================

-- Add version column (auto-incremented on re-publish)
ALTER TABLE bp_playbooks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add parent_id as TEXT (no FK constraint — matches id TEXT type in live schema)
ALTER TABLE bp_playbooks
  ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- Soft comments for documentation
COMMENT ON COLUMN bp_playbooks.status    IS 'DRAFT | PUBLISHED | INACTIVE';
COMMENT ON COLUMN bp_playbooks.version   IS 'Auto-incremented on each re-publish. Starts at 1.';
COMMENT ON COLUMN bp_playbooks.parent_id IS 'Source playbook ID (TEXT) when created via Duplicate. NULL for originals.';

-- Backfill: existing SUBMITTED rows (legacy status) → PUBLISHED
UPDATE bp_playbooks SET status = 'PUBLISHED' WHERE status = 'SUBMITTED';

-- ============================================================================
-- VERIFICATION — Run after migration:
-- SELECT id, name, status, version, parent_id FROM bp_playbooks LIMIT 10;
-- ============================================================================
