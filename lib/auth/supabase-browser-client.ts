import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.'
    );
}

/**
 * Cliente Supabase EXCLUSIVO para el navegador (login, sesión de usuario).
 *
 * A propósito NO reutiliza el cliente de lib/database.ts: ese archivo prioriza
 * SUPABASE_SERVICE_ROLE_KEY cuando existe, lo cual es correcto para Server
 * Actions pero peligroso de reusar en un componente "use client" -- este
 * cliente aquí usa siempre y únicamente la anon key, con persistSession
 * activado para que la sesión sobreviva recargas de página.
 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});
