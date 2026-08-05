import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

/**
 * Cliente Supabase dedicado al schema `finance_pl` -- SOLO servidor (Server
 * Actions), nunca importar desde un componente "use client".
 *
 * Este proyecto usa @supabase/supabase-js sin el método .schema() encadenable
 * (versión sin esa API) -- por eso el schema se fija en la construcción del
 * cliente (db.schema), igual que en lib/commercial-activity/supabase/client.ts.
 */
export const supabaseFinancePl = createClient(supabaseUrl, (supabaseServiceKey || supabaseAnonKey)!, {
  db: { schema: 'finance_pl' },
});
