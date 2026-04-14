-- ============================================================================
-- MIGRATION: Playbook Lifecycle Management
-- Adds version tracking and duplicate lineage to bp_playbooks
-- Date: 2026-04-14
-- Run in: Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- Add version column (auto-incremented on re-publish)
ALTER TABLE bp_playbooks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add parent_id column (tracks source playbook when duplicated)
ALTER TABLE bp_playbooks
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES bp_playbooks(id) ON DELETE SET NULL;

-- Update status comment to reflect new lifecycle values
COMMENT ON COLUMN bp_playbooks.status   IS 'DRAFT | PUBLISHED | INACTIVE';
COMMENT ON COLUMN bp_playbooks.version  IS 'Auto-incremented on each re-publish. Starts at 1.';
COMMENT ON COLUMN bp_playbooks.parent_id IS 'Source playbook UUID when created via Duplicate. NULL for originals.';

-- Backfill: existing PUBLISHED playbooks start at version 1 (already the default)
-- Backfill: existing SUBMITTED rows (legacy status) should be treated as PUBLISHED
UPDATE bp_playbooks SET status = 'PUBLISHED' WHERE status = 'SUBMITTED';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running, confirm with:
-- SELECT id, name, status, version, parent_id FROM bp_playbooks LIMIT 10;
