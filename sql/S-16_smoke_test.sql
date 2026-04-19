-- ═══════════════════════════════════════════════════════════════
-- S-16 PLAYBOOK ASSIGNMENT INTEGRATION — DATABASE SMOKE TEST
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Verify S-16 columns exist on pmo_tasks
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'pmo_tasks'
  AND column_name IN ('task_type', 'blocking_task_id', 'requested_by_eid', 'assignee_id', 'is_protected', 'source_playbook_id')
ORDER BY column_name;

-- 2. Count tasks by type
SELECT 
  COALESCE(task_type, 'NULL') AS task_type,
  COUNT(*) AS count,
  SUM(CASE WHEN is_protected THEN 1 ELSE 0 END) AS protected_count
FROM pmo_tasks
GROUP BY task_type
ORDER BY count DESC;

-- 3. Weekend violation check — MUST return 0 rows
SELECT id, title, due_date, EXTRACT(DOW FROM due_date::date) AS day_of_week
FROM pmo_tasks
WHERE due_date IS NOT NULL
  AND EXTRACT(DOW FROM due_date::date) IN (0, 6);

-- 4. Blocked tasks integrity — every blocked task must have blocking_task_id
SELECT id, title, status, blocking_task_id
FROM pmo_tasks
WHERE status = 'blocked'
  AND blocking_task_id IS NULL;

-- 5. Auto-unblock trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_unblock_dependent_task';

-- 6. pmo_panels table exists
SELECT COUNT(*) AS panel_count FROM pmo_panels;

-- 7. pmo_security_events table exists
SELECT COUNT(*) AS event_count FROM pmo_security_events;

-- 8. Notifications summary
SELECT type, COUNT(*) AS count
FROM simo_notifications
GROUP BY type
ORDER BY count DESC;
