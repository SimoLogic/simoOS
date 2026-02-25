import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · Supabase Infrastructure
// Inject placeholders for now. User must provide real credentials via .env
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validates that the Supabase client is properly configured.
 * Throws an explicit error if placeholders are detected.
 */
export const ensureDbConnection = () => {
    if (supabaseUrl.includes('placeholder')) {
        throw new Error("Database Connection Error: Supabase credentials (URL/Key) are missing or set to placeholders in .env");
    }
};

/**
 * Helper to inject the current tenant ID into the Postgres session.
 * This is required for Row-Level Security (RLS) policies 
 * using current_setting('app.current_tenant_id', true).
 */
export const setTenantSession = async (tenantId: string | null) => {
    // Phase 1 (No Auth): We rely on explicit 'tenant_id' filters in our Supabase queries.
    // Calling set_config via Supabase REST RPC is stateless and won't persist
    // to subsequent queries, so it's a no-op here.
    return Promise.resolve();
};
