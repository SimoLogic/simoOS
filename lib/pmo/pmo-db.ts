// ⚠️ LEER ARCHITECTURE.md ANTES DE MODIFICAR
// pmo-db.ts — Cliente Supabase para Server Actions del módulo PMO
//
// IMPORTANTE: Usa SUPABASE_SERVICE_ROLE_KEY (no la anon key) para:
// 1. Bypasear RLS (desactivada durante desarrollo — ARCHITECTURE.md §7)
// 2. Garantizar permisos completos en Server Actions del backend
//
// NUNCA importar este cliente en componentes de cliente ("use client")
// Solo para uso en: app/actions/pmo/*.ts y lib/services/pmo/*.ts

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _pmoDB: SupabaseClient | null = null;

/**
 * getPmoDB — Singleton del cliente Supabase para operaciones PMO server-side.
 * 
 * Prefers SUPABASE_SERVICE_ROLE_KEY (full DB access, bypasses RLS).
 * Falls back to anon key for local dev without service role configured.
 */
export function getPmoDB(): SupabaseClient {
  if (_pmoDB) return _pmoDB;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key       = serviceKey || anonKey;

  if (!url || url.includes("placeholder")) {
    throw new Error(
      "[PMO DB] Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
    );
  }
  if (!key || key.includes("placeholder")) {
    throw new Error(
      "[PMO DB] Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local"
    );
  }

  _pmoDB = createClient(url, key, {
    auth: {
      // Server-side: never persist session in browser
      persistSession:    false,
      autoRefreshToken:  false,
    },
  });

  return _pmoDB;
}

/**
 * Helper: throw a formatted error from Supabase PostgREST error
 */
export function throwIfDbError(error: unknown, context: string): never | void {
  if (!error) return;
  const msg = (error as { message?: string }).message ?? JSON.stringify(error);
  console.error(`[PMO DB] ${context}:`, msg);
  throw new Error(`[PMO DB] ${context}: ${msg}`);
}
