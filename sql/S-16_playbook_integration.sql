-- ============================================================================
-- S-16: Playbook Assignment Integration — pmo_tasks extension
-- ============================================================================
-- EXECUTED SUCCESSFULLY: 2026-04-19
-- Adds task_type, blocking_task_id, requested_by_eid, assignee_id to pmo_tasks
-- ============================================================================

-- 1. Add ALL missing columns
ALTER TABLE public.pmo_tasks ADD COLUMN IF NOT EXISTS assignee_id TEXT;
ALTER TABLE public.pmo_tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'PERSONAL_TASK';
ALTER TABLE public.pmo_tasks ADD COLUMN IF NOT EXISTS blocking_task_id TEXT;
ALTER TABLE public.pmo_tasks ADD COLUMN IF NOT EXISTS requested_by_eid TEXT;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_assignee_org
    ON public.pmo_tasks(org_id, assignee_id)
    WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pmo_tasks_blocking
    ON public.pmo_tasks(blocking_task_id)
    WHERE blocking_task_id IS NOT NULL;

-- 3. Auto-unblock trigger
CREATE OR REPLACE FUNCTION public.fn_unblock_dependent_task()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
        UPDATE public.pmo_tasks
        SET status = 'not_started',
            blocking_task_id = NULL,
            updated_at = NOW()
        WHERE blocking_task_id = NEW.id
          AND org_id = NEW.org_id
          AND status = 'not_started';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unblock_dependent_task ON public.pmo_tasks;
CREATE TRIGGER trg_unblock_dependent_task
    AFTER UPDATE OF status ON public.pmo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_unblock_dependent_task();

NOTIFY pgrst, 'reload schema';
