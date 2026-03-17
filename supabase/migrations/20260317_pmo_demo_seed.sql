-- ─────────────────────────────────────────────────────────────────────────────
-- SIMO Intellisense — PMO MODULE DEMO SEED
-- 20260317_pmo_demo_seed.sql
--
-- Inserts demo data for the PMO module so the Grid View renders real rows.
-- Respects FK order: workspace → board → groups → tasks
--
-- ⚠️ org_id = 'TNT-001' (same tenant as HR seed 00012)
-- ⚠️ assignee_id = 'EID-0001' (Michael Anderson — first employee in HR seed)
-- ⚠️ All due_dates land on Colombian workdays (no weekends, no festivos)
--    Ref: Today = 2026-03-17 (Tue). Holidays skipped:
--      • 2026-03-23 (Mon) — San José (Ley Emiliani)
--      • 2026-04-02 (Thu) — Jueves Santo
--      • 2026-04-03 (Fri) — Viernes Santo
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. WORKSPACE
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.pmo_workspaces (id, org_id, name, description)
VALUES (
    'ws-demo-001',
    'TNT-001',
    'HOMESI Operations',
    'Default workspace for HOMESI PMO operations and Playbook execution'
)
ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. BOARD (Playbook Board — linked to Simo IS)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.pmo_boards (
    id, org_id, workspace_id, title, description,
    simo_playbook_id, is_playbook_board, last_synced_at,
    active_view, is_view_locked
)
VALUES (
    'board-demo-001',
    'TNT-001',
    'ws-demo-001',
    'Playbook Ventas Q4 — Demo',
    'Playbook de ventas Q4 2025 asignado desde Simo IS. Contiene tareas protegidas de prospección, calificación y cierre.',
    'playbook-demo-q4-2025',
    TRUE,
    NOW(),
    'grid',
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    title              = EXCLUDED.title,
    description        = EXCLUDED.description,
    simo_playbook_id   = EXCLUDED.simo_playbook_id,
    is_playbook_board  = EXCLUDED.is_playbook_board,
    last_synced_at     = EXCLUDED.last_synced_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. GROUPS (3 grupos — colores Vibe Design System)
-- ═══════════════════════════════════════════════════════════════════════════

-- Grupo 1: Prospección (Purple)
INSERT INTO public.pmo_groups (id, org_id, board_id, title, color, position, is_collapsed)
VALUES (
    'grp-demo-s1',
    'TNT-001',
    'board-demo-001',
    'Semana 1 — Prospección',
    '#6161FF',   -- vibe-purple
    0,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, color = EXCLUDED.color, position = EXCLUDED.position;

-- Grupo 2: Calificación (Blue)
INSERT INTO public.pmo_groups (id, org_id, board_id, title, color, position, is_collapsed)
VALUES (
    'grp-demo-s2',
    'TNT-001',
    'board-demo-001',
    'Semana 2 — Calificación',
    '#0086C0',   -- vibe-blue
    1,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, color = EXCLUDED.color, position = EXCLUDED.position;

-- Grupo 3: Cierre (Green)
INSERT INTO public.pmo_groups (id, org_id, board_id, title, color, position, is_collapsed)
VALUES (
    'grp-demo-s3',
    'TNT-001',
    'board-demo-001',
    'Semana 3 — Cierre',
    '#00CA72',   -- vibe-green
    2,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, color = EXCLUDED.color, position = EXCLUDED.position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TASKS (10 tareas protegidas — distribuidas en los 3 grupos)
--
--    REGLA DE ORO #1: source_playbook_id IS NOT NULL → is_protected = TRUE
--    CONSTRAINT pmo_tasks_protection_check enforces this at DB level.
--
--    Fechas (workdays Colombia, sin fines de semana ni festivos):
--    Semana 1: Mar 18 (Wed), Mar 19 (Thu), Mar 20 (Fri), Mar 24 (Tue)
--    Semana 2: Mar 25 (Wed), Mar 26 (Thu), Mar 27 (Fri)
--    Semana 3: Mar 30 (Mon), Mar 31 (Tue), Apr 1 (Wed)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── SEMANA 1: Prospección (4 tareas) ─────────────────────────────────────

-- T1: Investigar leads ICP
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-001',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s1',
    'Investigar leads ICP en LinkedIn Sales Navigator',
    'Identificar 50 leads que cumplan el Ideal Customer Profile definido en el playbook. Filtrar por industria, tamaño de empresa y cargo.',
    'not_started',
    'high',
    '2026-03-18T17:00:00Z',   -- Wed — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-001',
    0,
    0,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T2: Personalizar secuencia de outreach
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-002',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s1',
    'Personalizar secuencia de outreach (email + call)',
    'Adaptar las plantillas del playbook al mercado objetivo. Incluir 3 touchpoints: email frío, follow-up, llamada directa.',
    'not_started',
    'medium',
    '2026-03-19T17:00:00Z',   -- Thu — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-002',
    1,
    1,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T3: Ejecutar 25 llamadas de prospección
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-003',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s1',
    'Ejecutar 25 llamadas de prospección (SLA: <2h respuesta)',
    'Completar el bloque diario de llamadas según el estándar del playbook. Registrar resultado en CRM dentro del SLA de 2 horas.',
    'in_progress',
    'high',
    '2026-03-20T17:00:00Z',   -- Fri — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-003',
    2,
    2,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T4: Actualizar CRM pipeline con resultados
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-004',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s1',
    'Actualizar CRM pipeline con resultados de prospección',
    'Registrar todos los contactos, notas de llamada y próximos pasos en el CRM. Mover leads calificados a la etapa siguiente.',
    'in_progress',
    'low',
    '2026-03-24T17:00:00Z',   -- Tue — workday ✅ (skips Mar 23 San José)
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-004',
    3,
    3,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- ─── SEMANA 2: Calificación (3 tareas) ───────────────────────────────────

-- T5: Calificar leads con BANT framework
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-005',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s2',
    'Calificar leads con BANT framework',
    'Evaluar cada lead prospectado usando Budget, Authority, Need, Timeline. Documentar score en el CRM.',
    'not_started',
    'high',
    '2026-03-25T17:00:00Z',   -- Wed — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-005',
    4,
    0,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T6: Agendar demos con leads calificados
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-006',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s2',
    'Agendar demos con leads calificados (mín. 5)',
    'Coordinar con el equipo de producto para agendar al menos 5 demos con los leads que pasaron el filtro BANT.',
    'in_progress',
    'medium',
    '2026-03-26T17:00:00Z',   -- Thu — workday ✅
    'EID-0002',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-006',
    5,
    1,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T7: Enviar propuesta de valor personalizada
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-007',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s2',
    'Enviar propuesta de valor personalizada post-demo',
    'Preparar y enviar documentación de valor personalizada a cada lead que completó la demo. Incluir pricing y caso de éxito relevante.',
    'stuck',
    'high',
    '2026-03-27T17:00:00Z',   -- Fri — workday ✅
    'EID-0003',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-007',
    6,
    2,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- ─── SEMANA 3: Cierre (3 tareas) ─────────────────────────────────────────

-- T8: Negociar términos contractuales
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-008',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s3',
    'Negociar términos contractuales con decision makers',
    'Trabajar con el equipo legal para preparar el contrato. Negociar SLAs, pricing y condiciones de pago.',
    'in_progress',
    'critical',
    '2026-03-30T17:00:00Z',   -- Mon — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-008',
    7,
    0,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T9: Obtener firma del contrato
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values
)
VALUES (
    'task-demo-009',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s3',
    'Obtener firma del contrato (DocuSign)',
    'Enviar el contrato final vía DocuSign. Hacer seguimiento para obtener la firma dentro del plazo del playbook.',
    'in_progress',
    'high',
    '2026-03-31T17:00:00Z',   -- Tue — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-009',
    8,
    1,
    'simple',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id;

-- T10: Celebrar onboarding del nuevo cliente ✅ (DONE — para mostrar estado celebrado)
INSERT INTO public.pmo_tasks (
    id, org_id, board_id, group_id, title, description,
    status, priority, due_date, assignee_id,
    is_protected, source_playbook_id, source_playbook_task_id, occurrence_index,
    position, item_height, custom_field_values,
    completed_at
)
VALUES (
    'task-demo-010',
    'TNT-001',
    'board-demo-001',
    'grp-demo-s3',
    'Celebrar onboarding del nuevo cliente 🎉',
    'Confirmar onboarding exitoso. Notificar al equipo de Customer Success para iniciar el proceso de implementación.',
    'done',
    'medium',
    '2026-04-01T17:00:00Z',   -- Wed — workday ✅
    'EID-0001',
    TRUE,
    'playbook-demo-q4-2025',
    'pb-task-010',
    9,
    2,
    'simple',
    '{}'::jsonb,
    '2026-03-17T14:30:00Z'    -- Completed today
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority,
    due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id,
    completed_at = EXCLUDED.completed_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. DEFAULT COLUMNS (so GridView renders proper headers)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.pmo_columns (id, org_id, board_id, title, type, position, width_px)
VALUES
    ('col-demo-001', 'TNT-001', 'board-demo-001', 'Task',       'text',   0, 320),
    ('col-demo-002', 'TNT-001', 'board-demo-001', 'Status',     'status', 1, 140),
    ('col-demo-003', 'TNT-001', 'board-demo-001', 'Assignee',   'person', 2, 160),
    ('col-demo-004', 'TNT-001', 'board-demo-001', 'Due Date',   'date',   3, 140),
    ('col-demo-005', 'TNT-001', 'board-demo-001', 'Priority',   'dropdown', 4, 120)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (uncomment to validate after execution)
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT COUNT(*) AS total_tasks FROM public.pmo_tasks WHERE org_id = 'TNT-001';
-- Expected: 10
--
-- SELECT COUNT(*) AS protected_tasks FROM public.pmo_tasks WHERE is_protected = TRUE AND org_id = 'TNT-001';
-- Expected: 10
--
-- SELECT g.title AS group_name, COUNT(t.id) AS task_count
-- FROM public.pmo_groups g
-- LEFT JOIN public.pmo_tasks t ON t.group_id = g.id
-- WHERE g.org_id = 'TNT-001'
-- GROUP BY g.title ORDER BY g.position;
-- Expected:
--   Semana 1 — Prospección  | 4
--   Semana 2 — Calificación | 3
--   Semana 3 — Cierre       | 3
--
-- SELECT title, status, priority, due_date, is_protected
-- FROM public.pmo_tasks WHERE org_id = 'TNT-001' ORDER BY position;
