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

export async function getContraPlaybookTasks(tenantId: string, employeeId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("fact_playbook_step")
        .select(`
      id,
      step_number,
      day_offset,
      deliverable_name,
      deliverable_description,
      frequency,
      owner_type,
      playbook_id,
      dim_playbook_activity_dictionary ( activity_name, purpose ),
      dim_playbook ( name, status, is_active )
    `)
        .eq("tenant_id", tenantId)
        .eq("contra_playbook_owner_id", employeeId); // Filter by this specific employee acting as support

    if (error) {
        console.error("Error fetching contra playbook tasks:", error);
        return { success: false, data: [] };
    }

    // Filter out steps belonging to Inactive or Draft playbooks if needed for an Inbox
    const activeTasks = data.filter((task: any) =>
        task.dim_playbook?.is_active && task.dim_playbook?.status === 'Approved'
    );

    return { success: true, data: activeTasks };
}

// In a real implementation this would tie into a "Task Execution Engine" logging completions in another table
export async function markContraTaskComplete(taskId: string, notes: string) {
    // Requires a log table `fact_playbook_execution_log` to store instances of the task done.
    return { success: true, simulated: true };
}
