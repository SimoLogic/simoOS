-- ===============================================================================
-- SIMO INTELLISENSE PMO MASTER PLAN
-- SPRINT S-02: DYNAMIC SCHEMA ENGINE
-- ===============================================================================

-- Workspaces
CREATE TABLE IF NOT EXISTS public.pmo_workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    owner_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT DEFAULT '🗂️',
    color       TEXT DEFAULT '#6161FF',
    position    INT NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_workspaces_org ON public.pmo_workspaces(org_id, owner_id);

-- Extender pmo_boards
ALTER TABLE public.pmo_boards
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.pmo_workspaces(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS description  TEXT,
    ADD COLUMN IF NOT EXISTS icon         TEXT DEFAULT '📋',
    ADD COLUMN IF NOT EXISTS color        TEXT DEFAULT '#6161FF',
    ADD COLUMN IF NOT EXISTS is_favorite  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS position     INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS view_type    TEXT NOT NULL DEFAULT 'grid',
    ADD COLUMN IF NOT EXISTS settings     JSONB NOT NULL DEFAULT '{}';

-- Extender pmo_columns con todos los tipos
-- NOTA: La columna 'type' ya existe en producción con CHECK constraint.
-- Sólo añadimos las columnas NUEVAS que aún no existen.
ALTER TABLE public.pmo_columns
    ADD COLUMN IF NOT EXISTS field_key   TEXT,
    ADD COLUMN IF NOT EXISTS config      JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS width       INT NOT NULL DEFAULT 150;
-- NOTA: field_type es un alias de 'type'. No se añade para evitar conflicto.
-- El trigger y el código usarán la columna 'type' existente.


CREATE UNIQUE INDEX IF NOT EXISTS idx_pmo_columns_field_key
    ON public.pmo_columns(board_id, field_key)
    WHERE field_key IS NOT NULL;

-- Trigger: genera field_key desde name
CREATE OR REPLACE FUNCTION public.fn_generate_field_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.field_key IS NULL THEN
        NEW.field_key := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]', '_', 'g'))
                         || '_' || substr(gen_random_uuid()::text, 1, 6);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_field_key ON public.pmo_columns;
CREATE TRIGGER trg_generate_field_key
    BEFORE INSERT ON public.pmo_columns
    FOR EACH ROW EXECUTE FUNCTION public.fn_generate_field_key();

-- Extender pmo_groups
ALTER TABLE public.pmo_groups
    ADD COLUMN IF NOT EXISTS color        TEXT NOT NULL DEFAULT '#0085FF',
    ADD COLUMN IF NOT EXISTS position     INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN NOT NULL DEFAULT FALSE;

-- Activity log por item
CREATE TABLE IF NOT EXISTS public.pmo_item_activity (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    task_id    TEXT NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    action     TEXT NOT NULL,
    field_name TEXT,
    old_value  TEXT,
    new_value  TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_item_activity_task ON public.pmo_item_activity(task_id);

-- Comentarios y updates por item
CREATE TABLE IF NOT EXISTS public.pmo_item_updates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    task_id    TEXT NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    body       TEXT NOT NULL,
    mentions   TEXT[] DEFAULT '{}',
    reactions  JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_item_updates_task ON public.pmo_item_updates(task_id);

-- Vistas guardadas por tablero
CREATE TABLE IF NOT EXISTS public.pmo_views (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    board_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    view_type  TEXT NOT NULL CHECK (view_type IN ('grid','kanban','gantt','calendar','dashboard','cards','form')),
    config     JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    position   INT NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_views_board ON public.pmo_views(board_id);

-- Automatizaciones por tablero
CREATE TABLE IF NOT EXISTS public.pmo_automations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    board_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    trigger_def JSONB NOT NULL,
    conditions  JSONB NOT NULL DEFAULT '[]',
    actions     JSONB NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    run_count   INT NOT NULL DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_by  TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_automations_board ON public.pmo_automations(board_id, is_active);

-- Paneles cross-board
CREATE TABLE IF NOT EXISTS public.pmo_panels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    owner_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    icon       TEXT DEFAULT '📊',
    config     JSONB NOT NULL DEFAULT '{"widgets": []}',
    position   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_panels_org ON public.pmo_panels(org_id, owner_id);
