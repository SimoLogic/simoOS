/**
 * Tenant fijo del módulo Commercial Activity / Forecast.
 *
 * Decisión de producto (2026-07-30): este módulo es de uso interno
 * exclusivo de HOMESI hoy. La columna tenant_id ya existe en
 * activity_report.upload_batches / loan_records (ver migración
 * 00016_commercial_activity_module.sql) con este mismo valor como default,
 * de forma que si en el futuro se necesita multi-tenant real para este
 * módulo, no hace falta migrar datos ni tocar el schema — solo:
 *   1. Reemplazar este valor fijo por el tenant_id de la sesión activa
 *      (useSessionStore / TenantContext, igual que el resto de simoOS).
 *   2. Activar la política RLS ya comentada en la migración.
 */
export const HOMESI_TENANT_ID = 'TNT-001';
