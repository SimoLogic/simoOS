-- SHIELD 3: PostgreSQL Trigger Guard for PMO Tasks
-- Literal implementation of Master Key #3 (Llave #3)
-- Blocks deletions of tasks that have a source_playbook_id (isProtected=true)

-- 1. Create the Security Event Logging Function
CREATE OR REPLACE FUNCTION public.fn_log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source_playbook_id IS NOT NULL THEN
        -- We log the attempt before raising the exception
        -- Note: In a real Supabase environment, you might use a separate table for security logs
        -- For now, we follow the literal requirement of registering a SecurityEvent
        RAISE NOTICE 'SECURITY_EVENT: Blocked deletion of protected task % by user.', OLD.id;
        
        RAISE EXCEPTION 'TASK_PLAYBOOK_PROTECTED: Cannot delete a task linked to a Simo IS Playbook.'
            USING ERRCODE = 'P0001'; -- Custom error code for app-side catching
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the Trigger to pmo_tasks
DROP TRIGGER IF EXISTS trg_protect_pmo_tasks ON public.pmo_tasks;
CREATE TRIGGER trg_protect_pmo_tasks
BEFORE DELETE ON public.pmo_tasks
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_security_event();

-- 3. Verify CHECK Constraint (Shield 2 Parity)
-- Ensures that if source_playbook_id is present, is_protected MUST be true
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_playbook_protection') THEN
        ALTER TABLE public.pmo_tasks
        ADD CONSTRAINT check_playbook_protection
        CHECK (
            (source_playbook_id IS NULL) OR (is_protected = true)
        );
    END IF;
END $$;

COMMENT ON TRIGGER trg_protect_pmo_tasks ON public.pmo_tasks IS 'Shield 3: Prevents deletion of tasks originating from Simo IS Playbooks.';
