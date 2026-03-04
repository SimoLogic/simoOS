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

// ----------------------------------------------------------------------
// Playbook Designers Setup
// ----------------------------------------------------------------------

export async function getPlaybookDesigners(tenantId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("dim_playbook_setup_designer")
        .select(`
      id,
      employee_id,
      dim_employee!inner (
        first_name,
        last_name,
        work_email,
        job_title
      )
    `)
        .eq("tenant_id", tenantId);

    if (error) {
        console.error("Error fetching playbook designers:", error);
        return { success: false, data: [] };
    }
    return { success: true, data };
}

export async function addPlaybookDesigner(tenantId: string, employeeId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("dim_playbook_setup_designer")
        .upsert({
            tenant_id: tenantId,
            employee_id: employeeId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding playbook designer:", error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function removePlaybookDesigner(id: string) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from("dim_playbook_setup_designer")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error removing playbook designer:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

// ----------------------------------------------------------------------
// External Roles Configuration
// ----------------------------------------------------------------------

export async function getExternalRoles(tenantId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("dim_playbook_external_role")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching external roles:", error);
        return { success: false, data: [] };
    }
    return { success: true, data };
}

export async function addExternalRole(tenantId: string, roleName: string, description: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("dim_playbook_external_role")
        .insert({
            tenant_id: tenantId,
            role_name: roleName,
            description: description,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding external role:", error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function removeExternalRole(id: string) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from("dim_playbook_external_role")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error removing external role:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}
