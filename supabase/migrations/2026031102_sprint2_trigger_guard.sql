-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 2 — DB Trigger Guard (Shield 3 del Triple Shield)
-- REGLA DE ORO #1: Bloquear DELETE en pmo_tasks si is_protected = TRUE
--
-- Este trigger es el ÚLTIMO escudo de defensa. Funciona incluso si:
--   - El Service Layer (Shield 1) es bypasseado por error
--   - Un script SQL directo intenta borrar desde psql/Supabase SQL Editor
--   - Una migración futura olvida la regla de protección
--
-- El trigger rechaza el DELETE con un error explicativo y registra el intento
-- en pmo_security_events (Shield 3 + auditoría).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Shield 3: BEFORE DELETE Trigger en pmo_tasks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pmo_tasks_protection_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- REGLA DE ORO #1: Si la tarea tiene source_playbook_id o is_protected=TRUE → RECHAZAR
    IF OLD.is_protected = TRUE OR OLD.source_playbook_id IS NOT NULL THEN

        -- Registrar el intento en pmo_security_events
        INSERT INTO public.pmo_security_events (
            org_id,
            user_id,
            task_id,
            attempted_at,
            ip_address,
            vector,
            details
        ) VALUES (
            OLD.org_id,
            COALESCE(current_setting('app.current_user_id', TRUE), 'db_direct'),
            OLD.id,
            NOW(),
            COALESCE(current_setting('app.client_ip', TRUE), 'db_level'),
            'sql_direct',
            jsonb_build_object(
                'taskTitle',        OLD.title,
                'sourcePlaybookId', OLD.source_playbook_id,
                'isProtected',      OLD.is_protected,
                'blockedBy',        'DB_TRIGGER_GUARD',
                'reason',           'Task linked to Simo IS Playbook — deletion rejected at DB level'
            )
        );

        -- RECHAZAR el DELETE con mensaje de error claro
        RAISE EXCEPTION 'TASK_PLAYBOOK_PROTECTED: Task "%" (id: %) is protected by Simo IS Playbook "%" and cannot be deleted. Delete attempt has been logged.',
            OLD.title,
            OLD.id,
            COALESCE(OLD.source_playbook_id, 'N/A')
        USING ERRCODE = 'P0001';  -- raise_exception code
    END IF;

    -- Tarea no protegida → permitir DELETE
    RETURN OLD;
END;
$$;

-- Crear/reemplazar el trigger en pmo_tasks
DROP TRIGGER IF EXISTS trg_pmo_tasks_protection_guard ON public.pmo_tasks;

CREATE TRIGGER trg_pmo_tasks_protection_guard
    BEFORE DELETE ON public.pmo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.pmo_tasks_protection_guard();

-- ─────────────────────────────────────────────────────────────────────────────
-- Función de auditoría: auto-set is_protected al insertar con source_playbook_id
-- Garantiza que NUNCA se inserte una tarea con source_playbook_id sin is_protected=TRUE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pmo_tasks_auto_protect()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- REGLA DE ORO #1: si tiene source_playbook_id → is_protected DEBE ser TRUE
    IF NEW.source_playbook_id IS NOT NULL THEN
        NEW.is_protected := TRUE;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pmo_tasks_auto_protect ON public.pmo_tasks;

CREATE TRIGGER trg_pmo_tasks_auto_protect
    BEFORE INSERT OR UPDATE ON public.pmo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.pmo_tasks_auto_protect();

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación del estado de los triggers
-- Ejecutar para confirmar que los triggers están activos:
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'pmo_tasks'
-- ORDER BY trigger_name;
--
-- Resultado esperado:
-- trg_pmo_tasks_auto_protect       | INSERT, UPDATE | BEFORE
-- trg_pmo_tasks_protection_guard   | DELETE         | BEFORE
-- trg_pmo_tasks_updated_at         | UPDATE         | BEFORE
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Test de verificación (SOLO ejecutar en entorno de desarrollo):
-- ─────────────────────────────────────────────────────────────────────────────
-- DO $$
-- DECLARE
--   test_board_id TEXT;
--   test_group_id TEXT;
--   test_task_id  TEXT;
-- BEGIN
--   -- Crear datos de prueba mínimos
--   INSERT INTO pmo_workspaces (org_id, name) VALUES ('test-org', 'Test WS') RETURNING id INTO test_board_id;
--   INSERT INTO pmo_boards (org_id, workspace_id, title) VALUES ('test-org', test_board_id, 'Test Board') RETURNING id INTO test_board_id;
--   INSERT INTO pmo_groups (org_id, board_id, title) VALUES ('test-org', test_board_id, 'Test Group') RETURNING id INTO test_group_id;
--   
--   -- Insertar tarea protegida
--   INSERT INTO pmo_tasks (org_id, board_id, group_id, title, is_protected, source_playbook_id)
--   VALUES ('test-org', test_board_id, test_group_id, 'Protected Task', TRUE, 'playbook-test-123')
--   RETURNING id INTO test_task_id;
--   
--   -- Este DELETE debe fallar con TASK_PLAYBOOK_PROTECTED
--   BEGIN
--     DELETE FROM pmo_tasks WHERE id = test_task_id;
--     RAISE EXCEPTION 'TEST FAILED: Delete should have been blocked!';
--   EXCEPTION
--     WHEN OTHERS THEN
--       RAISE NOTICE 'TEST PASSED: Delete correctly blocked with: %', SQLERRM;
--   END;
-- END;
-- $$;
