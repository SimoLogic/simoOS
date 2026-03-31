-- ═══════════════════════════════════════════════════════════════════════════════
-- SIMO Intellisense · UUID Re-Engineering Migration
-- Version: 1.0
-- Date:     2026-03-31
-- Target:   dim_role_title.id  TEXT → UUID
--           dim_employee.role_title_id  TEXT → UUID
--
-- INSTRUCTIONS:
--   1. Run this script in the Supabase SQL Editor (Production or Staging)
--   2. Verify step-by-step — each transaction is atomic
--   3. DO NOT run twice (type conversions are idempotent via DO blocks)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── STEP 1: Audit — see what we have before touching anything ─────────────────
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('dim_role_title', 'dim_employee')
  AND column_name IN ('id', 'role_title_id', 'job_title_id')
ORDER BY table_name, column_name;

-- ─── STEP 2: Fix non-UUID slug values in dim_role_title.id ────────────────────
-- If the emergency TEXT slug bypass created IDs like "RT-ANALYST_SALES-..."
-- this replaces them with proper UUIDs and updates the FK references.
-- SAFE: only affects rows whose IDs are not already valid UUIDs.

DO $$
DECLARE
    r RECORD;
    new_id UUID;
BEGIN
    FOR r IN
        SELECT id FROM dim_role_title
        WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        new_id := gen_random_uuid();

        -- Update FK references in dim_employee FIRST
        UPDATE dim_employee
        SET role_title_id = new_id::text
        WHERE role_title_id = r.id;

        -- Then update the PK itself
        UPDATE dim_role_title
        SET id = new_id::text
        WHERE id = r.id;

        RAISE NOTICE 'Migrated role_title_id: % → %', r.id, new_id;
    END LOOP;
END $$;

-- ─── STEP 3: Nullify orphaned role_title_id values in dim_employee ─────────────
-- Remove any role_title_id that points to a non-existent dim_role_title.id
-- (data integrity cleanup before applying FK constraint)

UPDATE dim_employee
SET role_title_id = NULL
WHERE role_title_id IS NOT NULL
  AND role_title_id NOT IN (SELECT id FROM dim_role_title);

-- ─── STEP 4: Also nullify any remaining non-UUID values ───────────────────────
UPDATE dim_employee
SET role_title_id = NULL
WHERE role_title_id IS NOT NULL
  AND role_title_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ─── STEP 5: Convert dim_role_title.id from TEXT → UUID ───────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dim_role_title'
          AND column_name = 'id'
          AND data_type = 'text'
    ) THEN
        ALTER TABLE dim_role_title
            ALTER COLUMN id TYPE uuid USING id::uuid;
        RAISE NOTICE 'dim_role_title.id converted to UUID';
    ELSE
        RAISE NOTICE 'dim_role_title.id is already UUID — skipping';
    END IF;
END $$;

-- ─── STEP 6: Convert dim_employee.role_title_id from TEXT → UUID ──────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dim_employee'
          AND column_name = 'role_title_id'
          AND data_type = 'text'
    ) THEN
        ALTER TABLE dim_employee
            ALTER COLUMN role_title_id TYPE uuid USING role_title_id::uuid;
        RAISE NOTICE 'dim_employee.role_title_id converted to UUID';
    ELSE
        RAISE NOTICE 'dim_employee.role_title_id is already UUID — skipping';
    END IF;
END $$;

-- ─── STEP 7: Convert dim_employee.job_title_id if still TEXT ──────────────────
-- (Should already be UUID per Prisma schema — this is a safety net)

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dim_employee'
          AND column_name = 'job_title_id'
          AND data_type = 'text'
    ) THEN
        -- Nullify orphaned references first
        UPDATE dim_employee
        SET job_title_id = NULL
        WHERE job_title_id IS NOT NULL
          AND job_title_id NOT IN (SELECT id::text FROM dim_job_title);

        ALTER TABLE dim_employee
            ALTER COLUMN job_title_id TYPE uuid USING job_title_id::uuid;
        RAISE NOTICE 'dim_employee.job_title_id converted to UUID';
    ELSE
        RAISE NOTICE 'dim_employee.job_title_id is already UUID — skipping';
    END IF;
END $$;

-- ─── STEP 8: Add FK constraint dim_employee.role_title_id → dim_role_title.id ─

ALTER TABLE dim_employee
    DROP CONSTRAINT IF EXISTS fk_employee_role_title;

ALTER TABLE dim_employee
    ADD CONSTRAINT fk_employee_role_title
    FOREIGN KEY (role_title_id)
    REFERENCES dim_role_title(id)
    ON DELETE SET NULL;

-- ─── STEP 9: Final verification ────────────────────────────────────────────────

SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('dim_role_title', 'dim_employee')
  AND column_name IN ('id', 'role_title_id', 'job_title_id')
ORDER BY table_name, column_name;

-- Expected results:
-- dim_employee  | job_title_id  | uuid
-- dim_employee  | role_title_id | uuid
-- dim_role_title| id            | uuid

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
