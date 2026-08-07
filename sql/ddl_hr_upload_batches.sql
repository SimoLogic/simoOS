-- ═══════════════════════════════════════════════════════════════════════════
-- SIMO INTELLISENSE — HR CENTRALIZED UPLOAD: BATCH HISTORY
-- File: sql/ddl_hr_upload_batches.sql
-- Target: Supabase (PostgreSQL 15+)
--
-- Mirrors the HrUploadBatch model in prisma/schema.prisma.
-- Run this in the Supabase SQL Editor BEFORE deploying the branch
-- feat/hr-active-roster-hc-master-rework -- sin esta tabla, la carga sigue
-- funcionando (el registro del historial va en try/catch a propósito, ver
-- uploadActiveRosterAction) pero la UI no puede mostrar cargas anteriores.
--
-- Una fila por archivo procesado. Existe para que la Carga Centralizada
-- pueda mostrar la última carga al montar el componente, sin depender del
-- useState (que se pierde en cualquier remount).
--
-- Llave #1: aislamiento multi-tenant vía tenant_id en cada fila.
-- Nota: aquí NO se guarda nada sensible -- solo conteos y el nombre del
-- archivo. Lo sensible sigue cifrado en hr_active_roster.sensitive_data_enc.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_upload_batches (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT            NOT NULL,

    -- Mismo valor que hr_active_roster.upload_batch_id de esa carga.
    upload_batch_id     TEXT            NOT NULL UNIQUE,

    file_name           TEXT,

    -- Filas leídas de la hoja "Active" del Excel.
    source_row_count    INTEGER         NOT NULL DEFAULT 0,
    -- Empleados efectivamente guardados en Supabase.
    saved_count         INTEGER         NOT NULL DEFAULT 0,
    -- Empleados que pasaron a Inactive por no venir en el archivo.
    deactivated_count   INTEGER         NOT NULL DEFAULT 0,

    uploaded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_upload_batches_tenant_uploaded
    ON public.hr_upload_batches(tenant_id, uploaded_at DESC);

-- RLS (mismo patrón que el resto del módulo HR -- ver sql/ddl_hr_system.sql).
-- Prisma se conecta como owner de la tabla, así que la app no queda bloqueada;
-- el filtro por tenant lo hace explícito la Server Action.
ALTER TABLE public.hr_upload_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_upload_batches_org_isolation ON public.hr_upload_batches;
CREATE POLICY hr_upload_batches_org_isolation ON public.hr_upload_batches
    USING (tenant_id = current_setting('app.current_org_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_org_id', true));

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (uncomment to validate after execution)
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'hr_upload_batches' ORDER BY ordinal_position;
-- Expected: 8 columns (id, tenant_id, upload_batch_id, file_name,
--           source_row_count, saved_count, deactivated_count, uploaded_at)
--
-- SELECT upload_batch_id, file_name, saved_count, deactivated_count, uploaded_at
-- FROM public.hr_upload_batches ORDER BY uploaded_at DESC LIMIT 5;
-- Expected: una fila por cada carga hecha desde la UI.
