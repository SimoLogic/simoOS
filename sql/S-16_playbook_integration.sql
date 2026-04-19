-- ============================================================================
-- S-16: Playbook Assignment Integration — pmo_tasks extension
-- ============================================================================
-- Adds task_type, blocking_task_id, requested_by_eid to pmo_tasks
-- These columns support the My Plan view's differentiation between
-- PLAYBOOK_TASK, SUPPORT_REQUEST, and PERSONAL_TASK items.
-- ============================================================================

-- 1. task_type — classifies the origin/nature of the task
ALTER TABLE public.pmo_tasks
    ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'PERSONAL_TASK'
    CHECK (task_type IN ('PLAYBOOK_TASK', 'SUPPORT_REQUEST', 'PERSONAL_TASK'));

-- 2. blocking_task_id — FK to another pmo_task that blocks this one
ALTER TABLE public.pmo_tasks
    ADD COLUMN IF NOT EXISTS blocking_task_id TEXT REFERENCES public.pmo_tasks(id) ON DELETE SET NULL;

-- 3. requested_by_eid — EID of the employee who requested this support task
ALTER TABLE public.pmo_tasks
    ADD COLUMN IF NOT EXISTS requested_by_eid TEXT;

-- 4. Index for My Plan queries (fetch all tasks for an assignee across boards)
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_assignee_org
    ON public.pmo_tasks(org_id, assignee_id)
    WHERE assignee_id IS NOT NULL;

-- 5. Index for blocking dependency lookups
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_blocking
    ON public.pmo_tasks(blocking_task_id)
    WHERE blocking_task_id IS NOT NULL;

-- 6. Trigger: Auto-unblock dependent tasks when a SUPPORT_REQUEST is completed
CREATE OR REPLACE FUNCTION public.fn_unblock_dependent_task()
RETURNS TRIGGER AS $$
BEGIN
    -- When a task is marked as 'done', unblock any tasks that depend on it
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

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
