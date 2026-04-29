-- ============================================================================
-- SIMO INTELLISENSE: MASTER CONGRUENCE TRIGGER AUDIT
-- ============================================================================
-- ACTION REQUIRED: EXECUTAR ESTO EN EL SQL EDITOR DE SUPABASE
-- Purpose: 
-- 1. Clears cached PL/pgSQL query plans after the UUID migration
-- 2. Enforces explicit ::uuid casts preventing "uuid = text" operator mismatches
-- 3. Redefines Business Plan and PMO bridges to ensure total database congruency
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. HR: EMPLOYEE JOB & ROLE CONGRUENCE (UUID CACHE FIX)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_employee_job_role_match()
RETURNS TRIGGER AS $$
DECLARE
    role_is_valid BOOLEAN;
BEGIN
    -- Validates: An employee can only be assigned to a Role Title that actually
    -- belongs to their Job Title (Parent-Child relationship), and BOTH must be Active.
    IF NEW.job_title_id IS NOT NULL AND NEW.role_title_id IS NOT NULL THEN
    
        -- CACHE BUG FIX: Strict `::uuid` cast on both variables ensures the Postgres 
        -- Execution Planner doesn't fallback to the old `text` definition of role_title_id
        SELECT EXISTS (
            SELECT 1 
            FROM dim_role_title 
            WHERE id = NEW.role_title_id::uuid 
              AND job_title_id = NEW.job_title_id::uuid
              AND status = 'Active'
              AND tenant_id = NEW.tenant_id
        ) INTO role_is_valid;
        
        IF NOT role_is_valid THEN
            -- Check if job_title is inactive specifically to give a clearer error
            IF NOT EXISTS(SELECT 1 FROM dim_job_title WHERE id = NEW.job_title_id::uuid AND status = 'Active' AND tenant_id = NEW.tenant_id) THEN
                RAISE EXCEPTION 'Job Title (ID: %) is inactive or invalid.', NEW.job_title_id;
            END IF;
            
            RAISE EXCEPTION 'Role Title (ID: %) does not belong to the selected Job Title (ID: %), or it is inactive.', NEW.role_title_id, NEW.job_title_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_employee_job_role_match ON public.dim_employee;
CREATE TRIGGER tr_check_employee_job_role_match
    BEFORE INSERT OR UPDATE ON public.dim_employee
    FOR EACH ROW EXECUTE PROCEDURE check_employee_job_role_match();


-- ────────────────────────────────────────────────────────────────────────────
-- 2. BUSINESS PLAN: PLAYBOOK DESIGNER ROLE CONGRUENCE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_playbook_roles_match()
RETURNS TRIGGER AS $$
DECLARE
    internal_exists BOOLEAN;
    external_exists BOOLEAN;
BEGIN
    -- 1. Check 'stakeholder' field (soft string mapping to dim_role_title / dim_external_role)
    IF NEW.stakeholder IS NOT NULL AND NEW.stakeholder != 'DROP' AND NEW.stakeholder != '' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title 
            WHERE role_title = NEW.stakeholder AND status = 'Active' 
            AND tenant_id = NEW.org_id
        ) INTO internal_exists;

        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role 
            WHERE name = NEW.stakeholder AND status = 'Active' 
            AND org_id = NEW.org_id
        ) INTO external_exists;

        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'Stakeholder "%" is not a valid Active Role Title in the HR Library or External Roles.', NEW.stakeholder;
        END IF;
    END IF;

    -- 2. Check 'requested_to' field
    IF NEW.requested_to IS NOT NULL AND NEW.requested_to != '' AND NEW.requested_to != 'DROP' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title 
            WHERE role_title = NEW.requested_to AND status = 'Active' 
            AND tenant_id = NEW.org_id
        ) INTO internal_exists;

        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role 
            WHERE name = NEW.requested_to AND status = 'Active' 
            AND org_id = NEW.org_id
        ) INTO external_exists;

        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'Requested_to role "%" is not a valid Active Role Title in the HR Library or External Roles.', NEW.requested_to;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_playbook_roles_match ON public.bp_playbook_steps;
CREATE TRIGGER tr_check_playbook_roles_match
    BEFORE INSERT OR UPDATE ON public.bp_playbook_steps
    FOR EACH ROW EXECUTE PROCEDURE check_playbook_roles_match();


-- ────────────────────────────────────────────────────────────────────────────
-- 3. SYSTEM WIDE: STANDARD UPDATED_AT REFRESH
-- Forces cache clean across generic triggers that might touch affected tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notificando a PostgREST de todos estos cambios estructurales
NOTIFY pgrst, 'reload schema';
