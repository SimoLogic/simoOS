-- ─────────────────────────────────────────────────────────────────────────────
-- SIMO Intellisense — Sprint 1 PMO Migration
-- Tablas base del módulo PMO
--
-- ⚠️ REGLA: RLS OFF durante desarrollo (por orden del Director)
-- ⚠️ ACTIVAR RLS al finalizar TODO el módulo PMO (ver ARCHITECTURE.md §7)
-- 
-- Ejecutar en Supabase SQL Editor o con: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Extensiones requeridas ───────────────────────────────────────────────────
-- gen_random_uuid() está disponible por defecto en PostgreSQL 14+ y Supabase
-- NO usar uuid_generate_v4() (requiere extensión uuid-ossp ya deprecada)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PMO WORKSPACES
-- Contenedor principal de boards. Cada org tiene uno o más workspaces.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_workspaces (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id      TEXT        NOT NULL,                     -- Multi-tenant key
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_workspaces_pkey PRIMARY KEY (id)
);

-- Índice multi-tenant (TODA query filtra por org_id — ARCHITECTURE.md §7)
CREATE INDEX IF NOT EXISTS idx_pmo_workspaces_org_id ON public.pmo_workspaces(org_id);

-- RLS: OFF durante desarrollo
ALTER TABLE public.pmo_workspaces DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PMO BOARDS
-- Un board = un tablero de trabajo tipo Monday.com
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_boards (
    id                  TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id              TEXT        NOT NULL,             -- Multi-tenant key
    workspace_id        TEXT        NOT NULL REFERENCES public.pmo_workspaces(id) ON DELETE CASCADE,
    title               TEXT        NOT NULL,
    description         TEXT,

    -- Simo IS integration (Llave #4)
    simo_playbook_id    TEXT,                            -- NULL si no viene de Simo IS
    is_playbook_board   BOOLEAN     NOT NULL DEFAULT FALSE,
    last_synced_at      TIMESTAMPTZ,

    -- UI state hints (persisted)
    active_view         TEXT        NOT NULL DEFAULT 'grid'
                        CHECK (active_view IN ('grid','kanban','gantt','calendar','dashboard')),
    is_view_locked      BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_boards_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_boards_org_id        ON public.pmo_boards(org_id);
CREATE INDEX IF NOT EXISTS idx_pmo_boards_workspace_id  ON public.pmo_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pmo_boards_playbook_id   ON public.pmo_boards(simo_playbook_id) WHERE simo_playbook_id IS NOT NULL;

ALTER TABLE public.pmo_boards DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PMO COLUMNS (definición de columnas del board)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_columns (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id      TEXT        NOT NULL,
    board_id    TEXT        NOT NULL REFERENCES public.pmo_boards(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'text'
                CHECK (type IN ('text','status','person','date','date_range','number','formula',
                                'checkbox','dropdown','file','mirror','link','email','phone',
                                'rating','progress')),
    position    INTEGER     NOT NULL DEFAULT 0,
    width_px    INTEGER     NOT NULL DEFAULT 200,
    settings    JSONB,

    CONSTRAINT pmo_columns_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_columns_board_id ON public.pmo_columns(board_id);
ALTER TABLE public.pmo_columns DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PMO GROUPS (filas de agrupación dentro de un board)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_groups (
    id           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id       TEXT        NOT NULL,
    board_id     TEXT        NOT NULL REFERENCES public.pmo_boards(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL,
    color        TEXT        NOT NULL DEFAULT '#6161FF',  -- Vibe token hex
    position     INTEGER     NOT NULL DEFAULT 0,
    is_collapsed BOOLEAN     NOT NULL DEFAULT FALSE,

    CONSTRAINT pmo_groups_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_groups_board_id ON public.pmo_groups(board_id);
ALTER TABLE public.pmo_groups DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PMO TASKS (el corazón del sistema)
-- REGLA DE ORO #1: si source_playbook_id IS NOT NULL → is_protected DEBE ser TRUE
-- DB Trigger Guard en Sprint 2 bloquea DELETE si is_protected = TRUE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_tasks (
    id                      TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id                  TEXT        NOT NULL,         -- Multi-tenant — SIEMPRE
    board_id                TEXT        NOT NULL REFERENCES public.pmo_boards(id) ON DELETE CASCADE,
    group_id                TEXT        NOT NULL REFERENCES public.pmo_groups(id) ON DELETE CASCADE,
    title                   TEXT        NOT NULL,
    description             TEXT,
    status                  TEXT        NOT NULL DEFAULT 'not_started'
                            CHECK (status IN ('not_started','in_progress','done','stuck','pending_review')),
    priority                TEXT        CHECK (priority IN ('low','medium','high','critical')),
    due_date                TIMESTAMPTZ,
    assignee_id             TEXT,                        -- FK a auth.users o empleados

    -- ── Simo IS Protection (Llave #3 — NUNCA borrar si is_protected=TRUE) ───
    is_protected            BOOLEAN     NOT NULL DEFAULT FALSE,
    source_playbook_id      TEXT,                        -- Si != NULL → is_protected DEBE ser TRUE
    source_playbook_task_id TEXT,
    occurrence_index        INTEGER,                     -- Para tareas repetidas (DAILY×N)

    -- ── Campos del empleado (NUNCA sobreescribir con Mirror Sync — Llave #4) ─
    -- subtasks, comments, attachments se guardan en tablas relacionadas

    -- ── mondayDB ─────────────────────────────────────────────────────────────
    item_height             TEXT        NOT NULL DEFAULT 'simple'
                            CHECK (item_height IN ('simple','double','triple')),
    custom_field_values     JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- ── Tracking ─────────────────────────────────────────────────────────────
    position                INTEGER     NOT NULL DEFAULT 0,
    time_spent_minutes      INTEGER     NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,

    CONSTRAINT pmo_tasks_pkey PRIMARY KEY (id),
    -- Garantizar consistencia: si source_playbook_id no es null, is_protected debe ser true
    CONSTRAINT pmo_tasks_protection_check
        CHECK (source_playbook_id IS NULL OR is_protected = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_pmo_tasks_org_id         ON public.pmo_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_board_id       ON public.pmo_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_group_id       ON public.pmo_tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_assignee_id    ON public.pmo_tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_source_playbook ON public.pmo_tasks(source_playbook_id) WHERE source_playbook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_status         ON public.pmo_tasks(board_id, status);
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_due_date       ON public.pmo_tasks(due_date) WHERE due_date IS NOT NULL;

ALTER TABLE public.pmo_tasks DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PMO SUBTASKS (propiedad del empleado — Regla #2)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_subtasks (
    id           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    task_id      TEXT        NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    org_id       TEXT        NOT NULL,
    title        TEXT        NOT NULL,
    is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Subtasks NUNCA son protegidas (Regla #2)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_subtasks_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_subtasks_task_id ON public.pmo_subtasks(task_id);
ALTER TABLE public.pmo_subtasks DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PMO COMMENTS (propiedad del empleado — Regla #2)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_comments (
    id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    task_id    TEXT        NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    org_id     TEXT        NOT NULL,
    author_id  TEXT        NOT NULL,
    content    TEXT        NOT NULL,              -- Rich text (Tiptap JSON)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_comments_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_comments_task_id ON public.pmo_comments(task_id);
ALTER TABLE public.pmo_comments DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PMO SYNC EVENTS (Mirror Sync Protocol — Llave #4)
-- Log de cada sincronización recibida de Simo IS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_sync_events (
    id               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    task_id          TEXT        NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    org_id           TEXT        NOT NULL,
    synced_fields    TEXT[]      NOT NULL DEFAULT '{}',
    conflicts_found  TEXT[]      NOT NULL DEFAULT '{}',
    resolved_by      TEXT        CHECK (resolved_by IN ('employee','simo_is','pending')),
    idempotency_key  TEXT        NOT NULL UNIQUE,         -- Previene duplicados por retry
    timestamp_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pmo_sync_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_sync_events_task_id ON public.pmo_sync_events(task_id);
CREATE INDEX IF NOT EXISTS idx_pmo_sync_events_org_id  ON public.pmo_sync_events(org_id);
ALTER TABLE public.pmo_sync_events DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. PMO SECURITY EVENTS (Intentos de borrado de tareas protegidas — Llave #3)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_security_events (
    id           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    org_id       TEXT        NOT NULL,
    user_id      TEXT        NOT NULL,
    task_id      TEXT        NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address   TEXT,
    vector       TEXT        NOT NULL
                 CHECK (vector IN ('http_api','prisma_direct','sql_direct','ui')),
    details      JSONB,

    CONSTRAINT pmo_security_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pmo_security_events_org_id  ON public.pmo_security_events(org_id);
CREATE INDEX IF NOT EXISTS idx_pmo_security_events_task_id ON public.pmo_security_events(task_id);
ALTER TABLE public.pmo_security_events DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. UPDATED_AT TRIGGER (automático para todas las tablas PMO)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pmo_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['pmo_workspaces','pmo_boards','pmo_columns','pmo_groups','pmo_tasks','pmo_comments']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;
             CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON public.%s
             FOR EACH ROW EXECUTE FUNCTION public.pmo_update_timestamp();',
            t, t, t, t
        );
    END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (comentar en producción)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename LIKE 'pmo_%'
-- ORDER BY tablename;
-- Resultado esperado: rowsecurity = false para todas las tablas PMO
