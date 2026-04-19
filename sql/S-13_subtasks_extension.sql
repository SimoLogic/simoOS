-- ===============================================================================
-- SIMO INTELLISENSE PMO — S-13 SUBTASKS EXTENSION
-- Adds columns required by subitem.service.ts that are missing from the
-- original Sprint 1 DDL.
-- ===============================================================================

ALTER TABLE public.pmo_subtasks
    ADD COLUMN IF NOT EXISTS assignee_id        TEXT,
    ADD COLUMN IF NOT EXISTS due_date           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS custom_field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS position           INTEGER NOT NULL DEFAULT 0;

-- Index for position-based ordering
CREATE INDEX IF NOT EXISTS idx_pmo_subtasks_position
    ON public.pmo_subtasks(task_id, position);
