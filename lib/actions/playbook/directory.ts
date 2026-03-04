"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
    }
    if (!supabaseKey || supabaseKey.includes("placeholder")) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
    }
    return createClient(supabaseUrl, supabaseKey);
}

export async function getPlaybooks(tenantId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("dim_playbook")
        .select(`
      id,
      name,
      version,
      playbook_type,
      status,
      is_active,
      updated_at,
      author_id,
      dim_employee!dim_playbook_author_id_fkey (
        first_name,
        last_name
      )
    `)
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching playbooks:", error);
        return { success: false, data: [] };
    }
    return { success: true, data };
}

export async function togglePlaybookActiveStatus(id: string, newStatus: boolean) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from("dim_playbook")
        .update({ is_active: newStatus })
        .eq("id", id);

    if (error) {
        console.error("Error toggling playbook status:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}
