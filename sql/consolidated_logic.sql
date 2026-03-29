-- ============================================================================
-- CONSOLIDATED SIMO INTELLISENSE LOGIC (FUNCTIONS & TRIGGERS)
-- ============================================================================

-- 1. PL/PGSQL FUNCTIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_bp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_employee_job_role_match()
RETURNS TRIGGER AS $$
DECLARE
    role_job_id UUID;
    job_status VARCHAR;
    role_status VARCHAR;
BEGIN
    -- 1. If Job Title is provided, it must be 'Active'
    IF NEW.job_title_id IS NOT NULL THEN
        SELECT status INTO job_status FROM public.dim_job_title WHERE id = NEW.job_title_id;
        IF job_status != 'Active' THEN
            RAISE EXCEPTION 'The selected job_title_id is not Active.';
        END IF;
    END IF;

    -- 2. If Role Title is provided
    IF NEW.role_title_id IS NOT NULL THEN
        -- A. It must have a Job Title
        IF NEW.job_title_id IS NULL THEN
            RAISE EXCEPTION 'Cannot assign a role_title_id without a job_title_id.';
        END IF;

        -- B. Check that the Role Title belongs to the selected Job Title
        SELECT job_title_id, status INTO role_job_id, role_status 
        FROM public.dim_role_title WHERE id = NEW.role_title_id;
        
        IF role_job_id != NEW.job_title_id THEN
            RAISE EXCEPTION 'The selected role_title_id does not belong to the selected job_title_id.';
        END IF;

        -- C. Check that the Role Title is 'Active'
        IF role_status != 'Active' THEN
            RAISE EXCEPTION 'The selected role_title_id is not Active.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION check_job_title_activation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Active' AND OLD.status != 'Active' THEN
        -- Check if approver 1 and 2 exist and are 'Approved'
        -- Or rely on the app logic, but enforce it here.
        IF NEW.approver1_status != 'Approved' OR NEW.approver2_status != 'Approved' THEN
            RAISE EXCEPTION 'Cannot activate Job Title without both approvals being Approved.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_protect_playbook_task()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source_playbook_id IS NOT NULL THEN
        RAISE EXCEPTION 'TASK_PLAYBOOK_PROTECTED: Cannot delete task [%] — it is linked to Simo IS Playbook [%].',
            OLD.id, OLD.source_playbook_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_pmo_tasks ON public.pmo_tasks;
CREATE TRIGGER trg_protect_pmo_tasks
    BEFORE DELETE ON public.pmo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_playbook_task();

COMMENT ON TRIGGER trg_protect_pmo_tasks ON public.pmo_tasks IS
    'Shield 3 (Llave #3): Blocks DB-level deletion of tasks linked to a Playbook.';

-- ─── CHECK CONSTRAINT: Playbook Protection Parity ────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_playbook_protection'
    ) THEN
        ALTER TABLE public.pmo_tasks
            ADD CONSTRAINT check_playbook_protection
            CHECK ((source_playbook_id IS NULL) OR (is_protected = true));
    END IF;
END $$;

-- ─── UPDATED_AT triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGERS
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_bp_playbooks_updated_at
  BEFORE UPDATE ON bp_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_bp_updated_at();

CREATE TRIGGER trg_bp_playbook_steps_updated_at
  BEFORE UPDATE ON bp_playbook_steps
  FOR EACH ROW EXECUTE FUNCTION update_bp_updated_at();

DROP TRIGGER IF EXISTS tr_check_employee_job_role_match ON public.dim_employee;
CREATE TRIGGER tr_check_employee_job_role_match
    BEFORE INSERT OR UPDATE ON public.dim_employee
    FOR EACH ROW EXECUTE PROCEDURE check_employee_job_role_match();

DROP TRIGGER IF EXISTS tr_check_playbook_roles_match ON public.bp_playbook_steps;
CREATE TRIGGER tr_check_playbook_roles_match
    BEFORE INSERT OR UPDATE ON public.bp_playbook_steps
    FOR EACH ROW EXECUTE PROCEDURE check_playbook_roles_match();

DROP TRIGGER IF EXISTS tr_update_fx_at ON public.dim_fx_rates;
CREATE TRIGGER tr_update_fx_at 
    BEFORE UPDATE ON public.dim_fx_rates 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS tr_check_job_title_activation ON public.dim_job_title;
CREATE TRIGGER tr_check_job_title_activation
    BEFORE UPDATE ON public.dim_job_title
    FOR EACH ROW EXECUTE PROCEDURE check_job_title_activation();

DROP TRIGGER IF EXISTS tr_update_role_title_at ON public.dim_role_title;
CREATE TRIGGER tr_update_role_title_at
    BEFORE UPDATE ON public.dim_role_title
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_hr_employees_updated_at ON hr_employees;
CREATE TRIGGER trg_hr_employees_updated_at
    BEFORE UPDATE ON hr_employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_contracts_updated_at ON hr_contracts;
CREATE TRIGGER trg_hr_contracts_updated_at
    BEFORE UPDATE ON hr_contracts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_contracts_shield ON hr_contracts;
CREATE TRIGGER trg_hr_contracts_shield
    BEFORE UPDATE ON hr_contracts
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();

DROP TRIGGER IF EXISTS trg_hr_payroll_updated_at ON hr_payroll_periods;
CREATE TRIGGER trg_hr_payroll_updated_at
    BEFORE UPDATE ON hr_payroll_periods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_payroll_shield ON hr_payroll_periods;
CREATE TRIGGER trg_hr_payroll_shield
    BEFORE UPDATE ON hr_payroll_periods
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();

DROP TRIGGER IF EXISTS trg_hr_vacation_updated_at ON hr_vacation_requests;
CREATE TRIGGER trg_hr_vacation_updated_at
    BEFORE UPDATE ON hr_vacation_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_perf_updated_at ON hr_performance_reviews;
CREATE TRIGGER trg_hr_perf_updated_at
    BEFORE UPDATE ON hr_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_perf_shield ON hr_performance_reviews;
CREATE TRIGGER trg_hr_perf_shield
    BEFORE UPDATE ON hr_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_hr_update();

CREATE TRIGGER tr_update_job_title_at
    BEFORE UPDATE ON public.dim_job_title
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_tenant_at BEFORE UPDATE ON public.dim_tenant FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_employee_at BEFORE UPDATE ON public.dim_employee FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_g_strategies_at BEFORE UPDATE ON public.growthify_strategies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_g_rewards_at BEFORE UPDATE ON public.growthify_rewards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_g_requisitions_at BEFORE UPDATE ON public.growthify_requisitions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_g_assignments_at BEFORE UPDATE ON public.growthify_assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_g_playbooks_at BEFORE UPDATE ON public.growthify_playbooks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_approvers_at
    BEFORE UPDATE ON public.employee_approvers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_dim_playbooks_at
    BEFORE UPDATE ON public.dim_playbooks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_bp_workflow_at
    BEFORE UPDATE ON public.bp_workflow
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_process_designs_at
    BEFORE UPDATE ON public.process_designs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_proforma_at
    BEFORE UPDATE ON public.dim_proforma
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_dim_playbook_at BEFORE UPDATE ON public.dim_playbook FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_fact_pb_step_at BEFORE UPDATE ON public.fact_playbook_step FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER tr_update_fact_pb_sla_at BEFORE UPDATE ON public.fact_playbook_sla FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_protect_pmo_tasks ON public.pmo_tasks;

