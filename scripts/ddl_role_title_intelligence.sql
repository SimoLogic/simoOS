-- ============================================================================
-- DB INTELLIGENCE SCRIPT: Enforce TEXT Role Title Allocation
-- ============================================================================
-- The core objective is to shift dim_employee matching from arbitrary strings
-- into concrete, TEXT-based Foreign Keys mapping to dim_role_title(id).

BEGIN;

-- 1. Ensure datatype is strictly TEXT, avoiding Vercel 500 UUID cast errors.
--    This strips strict UUID constraints while preserving the physical identity strings
ALTER TABLE public.dim_employee 
  ALTER COLUMN role_title_id TYPE text USING role_title_id::text;

-- 2. Organic Seed Engine (Backwards Matching)
--    If an employee has role_title completely isolated (Seed logic), connect it 
--    via name and tenant matching mathematically against dim_role_title actively.
UPDATE public.dim_employee e
SET role_title_id = r.id
FROM public.dim_role_title r
WHERE e.tenant_id = r.tenant_id
  AND e.role_title = r.role_title
  AND e.role_title_id IS NULL;

-- 3. The Shield Protocol: Radical Responsibility Key
--    Enforce the relation natively in Postgres preventing data drift.
ALTER TABLE public.dim_employee 
  DROP CONSTRAINT IF EXISTS fk_dim_employee_role_title;

ALTER TABLE public.dim_employee 
  ADD CONSTRAINT fk_dim_employee_role_title 
  FOREIGN KEY (role_title_id) 
  REFERENCES public.dim_role_title(id) 
  ON DELETE SET NULL;

COMMIT;
