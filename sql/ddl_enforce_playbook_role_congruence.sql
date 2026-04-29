-- ============================================================================
-- DB ENFORCEMENT SCRIPT: Cross-Module HR Congruence (Playbook Roles)
-- ============================================================================
-- The trigger ensures that Playbook Node responsibles ('stakeholder' and 'requested_to')
-- strictly mirror the underlying HR / PMO infrastructure libraries (`dim_role_title`
-- and `dim_external_role`) enforcing Radical Responsibility.

CREATE OR REPLACE FUNCTION check_playbook_roles_match()
RETURNS TRIGGER AS $$
DECLARE
    internal_exists BOOLEAN;
    external_exists BOOLEAN;
BEGIN
    -- 1. Check 'stakeholder' field if present and not 'DROP'
    IF NEW.stakeholder IS NOT NULL AND NEW.stakeholder != 'DROP' AND NEW.stakeholder != '' THEN
        -- Check if it is an active internal role
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title 
            WHERE role_title = NEW.stakeholder AND status = 'Active' 
            AND tenant_id = NEW.org_id
        ) INTO internal_exists;

        -- Check if it is an active external role
        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role 
            WHERE name = NEW.stakeholder AND status = 'Active' 
            AND org_id = NEW.org_id
        ) INTO external_exists;

        -- If neither is true, raise Structural Architecture Exception
        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'Stakeholder "%" is not a valid Active Role Title in the HR Library or External Roles.', NEW.stakeholder;
        END IF;
    END IF;

    -- 2. Check 'requested_to' field (support proxy / counteraction)
    IF NEW.requested_to IS NOT NULL AND NEW.requested_to != '' AND NEW.requested_to != 'DROP' THEN
        -- Check if it is an active internal role
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title 
            WHERE role_title = NEW.requested_to AND status = 'Active' 
            AND tenant_id = NEW.org_id
        ) INTO internal_exists;

        -- Check if it is an active external role
        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role 
            WHERE name = NEW.requested_to AND status = 'Active' 
            AND org_id = NEW.org_id
        ) INTO external_exists;

        -- If neither is true, raise Structural Architecture Exception
        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'Requested_to role "%" is not a valid Active Role Title in the HR Library or External Roles.', NEW.requested_to;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erase predecessor if exists and link to Table
DROP TRIGGER IF EXISTS tr_check_playbook_roles_match ON public.bp_playbook_steps;
CREATE TRIGGER tr_check_playbook_roles_match
    BEFORE INSERT OR UPDATE ON public.bp_playbook_steps
    FOR EACH ROW EXECUTE PROCEDURE check_playbook_roles_match();
