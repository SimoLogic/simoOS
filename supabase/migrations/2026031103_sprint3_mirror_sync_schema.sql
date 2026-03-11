-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 3 — Mirror Sync Schema Extensions
-- Añade columnas a pmo_sync_events para soportar Mirror Sync Protocol (Llave #4)
-- y tracking de webhooks salientes
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Añadir columnas a pmo_sync_events
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pmo_sync_events
  -- Campos base que faltaban en el Sprint 1
  ADD COLUMN IF NOT EXISTS event_type       TEXT        NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS status           TEXT        NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS payload          JSONB       NULL,

  -- Campos añadidos por Mirror Sync Protocol (Llave #4)
  ADD COLUMN IF NOT EXISTS synced_fields    TEXT[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conflicts_found  JSONB       DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved_by      TEXT        NULL,
  ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ NULL,

  -- Campos añadidos para tracking de Webhook Outgoing
  ADD COLUMN IF NOT EXISTS webhook_sent_at  TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS webhook_status   TEXT        NULL      -- 'sent' | 'failed' | null (no aplica)
    CHECK (webhook_status IN ('sent', 'failed', 'pending') OR webhook_status IS NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ampliar constraint de event_type para aceptar nuevos tipos del Sprint 3
-- ─────────────────────────────────────────────────────────────────────────────

-- Paso 1: eliminar constraint existente (si existe)
ALTER TABLE public.pmo_sync_events
  DROP CONSTRAINT IF EXISTS pmo_sync_events_event_type_check;

-- Paso 2: recrear con valores de Sprint 1 + Sprint 3
ALTER TABLE public.pmo_sync_events
  ADD CONSTRAINT pmo_sync_events_event_type_check
  CHECK (event_type IN (
    'playbook_sync',          -- Sprint 1: nombre original
    'playbook_assignment',    -- Sprint 3: receptor HMAC
    'mirror_sync',            -- Sprint 3: Mirror Sync Protocol
    'webhook_outgoing',       -- Sprint 3: Simo IS completion notification
    'conflict_detected'       -- Sprint 3: status conflict registrado
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- Ampliar constraint de status en pmo_sync_events
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pmo_sync_events
  DROP CONSTRAINT IF EXISTS pmo_sync_events_status_check;

ALTER TABLE public.pmo_sync_events
  ADD CONSTRAINT pmo_sync_events_status_check
  CHECK (status IN (
    'queued',
    'processing',
    'completed',
    'failed',
    'conflict_detected'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- Añadir columna idempotency_key si no existe (para requests deduplicados)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pmo_sync_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;

-- Índice único para idempotency (previene duplicados de reintentos Simo IS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pmo_sync_events_idempotency
  ON public.pmo_sync_events (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Añadir columna source_playbook_task_id a pmo_tasks (para lookup alternativo en Mirror Sync)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pmo_tasks
  ADD COLUMN IF NOT EXISTS source_playbook_task_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS occurrence_index        INTEGER NULL;

-- Índice compuesto para lookup eficiente en Mirror Sync
CREATE INDEX IF NOT EXISTS idx_pmo_tasks_source_playbook_task
  ON public.pmo_tasks (org_id, source_playbook_task_id, occurrence_index)
  WHERE source_playbook_task_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Mantener desactivado en tablas Sprint 3 (consistente con Sprint 1/2)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.pmo_sync_events DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación: Columnas añadidas
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'pmo_sync_events' AND column_name IN (
--   'synced_fields','conflicts_found','resolved_by','resolved_at',
--   'webhook_sent_at','webhook_status','idempotency_key'
-- ) ORDER BY column_name;
-- ─────────────────────────────────────────────────────────────────────────────
