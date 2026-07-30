import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.'
  );
}

/**
 * Cliente Supabase dedicado al módulo Commercial Activity / Forecast,
 * apuntando al schema 'activity_report' (no 'public') — ported 1:1 desde
 * el repo original (homesi-reporte-actividad), solo renombrado de archivo.
 *
 * Reutiliza el MISMO proyecto de Supabase que el resto de simoOS (misma
 * URL/anon key), solo cambia el schema de PostgREST.
 *
 * Nota: el schema 'activity_report' debe estar en "Exposed schemas"
 * (Supabase Dashboard -> Settings -> API) o todas las llamadas fallan con
 * error de "schema no encontrado". Ver supabase/migrations/00016_commercial_activity_module.sql.
 *
 * Acceso abierto sin login por ahora (heredado del repo original) --
 * pendiente de conectar a auth/RLS real cuando se active el hardening
 * general de RLS del proyecto (ver docs/AGENT_CONTEXT_ANTIGRAVITY.md).
 */
export const supabaseActivityReport = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'activity_report' },
});
