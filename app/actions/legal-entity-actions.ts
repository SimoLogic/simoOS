"use server";

import { createClient } from "@supabase/supabase-js";
import { LocalLegalEntity } from "@/lib/hr-types";
import { sanitizeStr, sanitizeOptStr } from "@/lib/utils/sanitizers";

// ─── Supabase Client ──────────────────────────────────────────────────────────

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || url.includes("placeholder")) throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_URL missing.");
    if (!key || key.includes("placeholder")) throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
    return createClient(url, key);
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Returns all active Local Legal Entities, ordered by name.
 * Used to populate the dropdown in Employee Intake and HC Master.
 */
export async function getLocalLegalEntitiesAction(): Promise<LocalLegalEntity[]> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_local_legal_entity")
            .select("*")
            .eq("is_active", true)
            .order("entity_name", { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error("[LegalEntity] getLocalLegalEntities error:", err.message);
        return []; // Fail silently — caller will use static fallback
    }
}

/**
 * Creates or updates a Local Legal Entity record.
 */
export async function saveLocalLegalEntityAction(
    entity: Partial<LocalLegalEntity> & { entity_name: string }
): Promise<{ success: boolean; data?: LocalLegalEntity }> {
    if (!entity.entity_name?.trim()) {
        throw new Error("entity_name is required.");
    }

    const supabase = getSupabase();
    const row = {
        ...(entity.id ? { id: entity.id } : {}),
        entity_name: sanitizeStr(entity.entity_name, 255),
        local_tax_id: sanitizeOptStr(entity.local_tax_id, 50),
        local_ein: sanitizeOptStr(entity.local_ein, 50),
        entity_country: sanitizeStr(entity.entity_country || "Colombia", 100),
        is_active: entity.is_active ?? true,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("dim_local_legal_entity")
        .upsert(row, { onConflict: "entity_name" })
        .select()
        .single();

    if (error) throw new Error(`[LegalEntity] save error: ${error.message}`);
    return { success: true, data: data as LocalLegalEntity };
}

/**
 * Soft-deletes a Local Legal Entity (sets is_active = false).
 * Hard delete is intentionally avoided to preserve employee history.
 */
export async function deleteLocalLegalEntityAction(id: string): Promise<{ success: boolean }> {
    if (!id?.trim()) throw new Error("id is required.");
    const supabase = getSupabase();
    const { error } = await supabase
        .from("dim_local_legal_entity")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw new Error(`[LegalEntity] delete error: ${error.message}`);
    return { success: true };
}
