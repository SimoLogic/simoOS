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

export async function getPlaybookDraft(playbookId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("dim_playbook")
        .select(`
      *,
      fact_playbook_step (*),
      fact_playbook_sla (*)
    `)
        .eq("id", playbookId)
        .single();

    if (error) {
        console.error("Error fetching playbook:", error);
        return { success: false, data: null };
    }
    return { success: true, data };
}

export async function savePlaybookDraft(payload: any) {
    const supabase = getSupabase();

    // In a real implementation this will start a transaction or UPSERT with RPC to insert all steps safely.
    // For now we simulate an UPSERT on dim_playbook

    const { data: playbook, error: pbError } = await supabase
        .from("dim_playbook")
        .upsert({
            id: payload.playbookId || undefined,
            tenant_id: payload.tenantId,
            name: payload.name,
            version: payload.version,
            strategy_id: payload.strategyId || null,
            playbook_type: payload.playbookType,
            purpose: payload.purpose,
            approver_1_id: payload.approver1Id || null,
            approver_2_id: payload.approver2Id || null,
            status: 'Draft',
            author_id: payload.authorId
        })
        .select()
        .single();

    if (pbError) return { success: false, error: pbError.message };

    // Then map and insert steps
    if (payload.steps && payload.steps.length > 0) {
        // Delete old steps first (Replace strategy)
        await supabase.from("fact_playbook_step").delete().eq("playbook_id", playbook.id);

        const stepsToInsert = payload.steps.map((s: any) => ({
            ...s,
            id: undefined, // Let db generate if new, or override
            playbook_id: playbook.id,
            tenant_id: payload.tenantId
        }));

        await supabase.from("fact_playbook_step").insert(stepsToInsert);
    }

    // Sla Inserts
    if (payload.slas) {
        await supabase.from("fact_playbook_sla").delete().eq("playbook_id", playbook.id);
        const slasToInsert = payload.slas.map((s: any) => ({
            ...s,
            id: undefined,
            playbook_id: playbook.id,
            tenant_id: payload.tenantId
        }));
        if (slasToInsert.length > 0) {
            await supabase.from("fact_playbook_sla").insert(slasToInsert);
        }
    }

    return { success: true, data: playbook };
}

export async function submitPlaybookApproval(playbookId: string) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('dim_playbook')
        .update({ status: 'Submitted' })
        .eq('id', playbookId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getSetupDictionaries(tenantId: string) {
    const supabase = getSupabase();

    const [categories, activities, extRoles, intRoles, dataSources, employees, strategies] = await Promise.all([
        supabase.from('dim_playbook_activity_category').select('*').eq('tenant_id', tenantId),
        supabase.from('dim_playbook_activity_dictionary').select('*').eq('tenant_id', tenantId),
        supabase.from('dim_playbook_external_role').select('*').eq('tenant_id', tenantId),
        supabase.from('dim_job_title').select('id, title').eq('tenant_id', tenantId), // From HR Module Map
        supabase.from('dim_playbook_data_source').select('*').eq('tenant_id', tenantId),
        supabase.from('dim_employee').select('eid, first_name, last_name, official_job_title').eq('tenant_id', tenantId),
        supabase.from('growthify_strategies').select('*').eq('tenant_id', tenantId),
    ]);

    return {
        categories: categories.data || [],
        activities: activities.data || [],
        extRoles: extRoles.data || [],
        intRoles: intRoles.data || [],
        dataSources: dataSources.data || [],
        employees: employees.data || [],
        strategies: strategies.data || []
    }
}
