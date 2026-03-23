-- Migration Script: Convert Job Title string to UUID FKs for Job & Role Titles

-- 1. DROP the text column 'job_title' from dim_employee
-- Warning: This will erase existing plain-text job titles for employees.
ALTER TABLE public.dim_employee DROP COLUMN IF EXISTS job_title;

-- 2. Add relational ID columns
ALTER TABLE public.dim_employee ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES public.dim_job_title(id) ON DELETE SET NULL;
ALTER TABLE public.dim_employee ADD COLUMN IF NOT EXISTS role_title_id UUID REFERENCES public.dim_role_title(id) ON DELETE SET NULL;

-- 3. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_job_title_id ON public.dim_employee(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employee_role_title_id ON public.dim_employee(role_title_id);

-- 4. Rules for Draft -> Active Lifecycle

-- For dim_job_title: Prevent moving to Active if approvers haven't approved.
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

DROP TRIGGER IF EXISTS tr_check_job_title_activation ON public.dim_job_title;
CREATE TRIGGER tr_check_job_title_activation
    BEFORE UPDATE ON public.dim_job_title
    FOR EACH ROW EXECUTE PROCEDURE check_job_title_activation();

-- Note: dim_role_title doesn't have an explicit multi-step approval flow in its schema.
-- So we simply enforce it stays Draft or Active natively.
