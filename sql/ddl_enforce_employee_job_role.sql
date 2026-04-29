-- Enforce that Employee's Role Title strictly belongs to their Job Title
-- and that both are Active in the Job Description Library

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

DROP TRIGGER IF EXISTS tr_check_employee_job_role_match ON public.dim_employee;
CREATE TRIGGER tr_check_employee_job_role_match
    BEFORE INSERT OR UPDATE ON public.dim_employee
    FOR EACH ROW EXECUTE PROCEDURE check_employee_job_role_match();
