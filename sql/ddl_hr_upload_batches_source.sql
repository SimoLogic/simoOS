-- ═══════════════════════════════════════════════════════════════════════════
-- SIMO INTELLISENSE — HR UPLOAD BATCHES: columna `source`
-- File: sql/ddl_hr_upload_batches_source.sql
-- Target: Supabase (PostgreSQL 15+)
--
-- Complementa sql/ddl_hr_upload_batches.sql (esa tabla ya existe).
-- Correr en el SQL Editor ANTES de desplegar la rama
-- feat/us-roster-employee-draws-upload.
--
-- POR QUÉ: hr_upload_batches no distinguía qué pipeline genero cada lote.
-- Con la carga de EE.UU. (CSV EmployeeDraws de CompensaFe) escribiendo en la
-- misma tabla que la de Colombia (Excel SLTEAM), la pestaña de EE.UU. mostraria
-- la ultima carga de Colombia como si fuera suya. Esta columna las separa.
--
-- Es idempotente y no destructiva: las filas que ya existen quedan marcadas
-- como 'CO_ACTIVE_ROSTER' por el DEFAULT, que es exactamente lo que son
-- (hasta hoy la unica carga que escribia aqui era la de Colombia).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.hr_upload_batches
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'CO_ACTIVE_ROSTER';

-- El historial se consulta siempre por (tenant, pipeline, fecha).
CREATE INDEX IF NOT EXISTS idx_hr_upload_batches_tenant_source_uploaded
    ON public.hr_upload_batches(tenant_id, source, uploaded_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (uncomment to validate after execution)
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'hr_upload_batches' AND column_name = 'source';
-- Expected: 1 fila -> text, 'CO_ACTIVE_ROSTER'::text, NO
--
-- SELECT source, COUNT(*) FROM public.hr_upload_batches GROUP BY source;
-- Expected: todas las cargas previas en 'CO_ACTIVE_ROSTER'; despues de la
--           primera carga de EE.UU. aparece 'US_EMPLOYEE_DRAWS'.
