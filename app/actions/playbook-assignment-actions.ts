"use server";

/**
 * Assignment-specific server actions for the PlaybookAssignmentPanel.
 * Kept in a separate file to avoid encoding issues with the main actions file.
 */

import { supabase } from "@/lib/database";

/**
 * Fetch employees eligible for a specific playbook.
 * Uses `bp_playbooks.global_owner_ids` (UUID array → dim_role_title)
 * to find active employees whose `role_title_id` matches.
 *
 * This is the correct source of truth for "Responsibles" since the
 * Designer stores global owner UUIDs on the playbook header, not on steps.
 */
export async function getEligibleEmployeesForPlaybookAction(
  playbookId: string,
  orgId: string
) {
  if (!playbookId || !orgId) return [];

  // Step 1: Get the global_owner_ids UUID array from the playbook header
  const { data: pb, error: pbErr } = await supabase
    .from("bp_playbooks")
    .select("global_owner_ids")
    .eq("id", playbookId)
    .eq("org_id", orgId)
    .single();

  if (pbErr || !pb) {
    console.error("[BP Action] getEligibleEmployees — playbook not found:", pbErr?.message);
    return [];
  }

  const globalOwnerIds: string[] = pb.global_owner_ids ?? [];
  if (globalOwnerIds.length === 0) return [];

  // Step 2: Fetch active employees whose role_title_id is in the global owner list
  const { data: employees, error: empErr } = await supabase
    .from("dim_employee")
    .select("eid, primer_nombre, primer_apellido, role_title, role_title_id, assigned_branch_code")
    .eq("tenant_id", orgId)
    .eq("status", "Active")
    .in("role_title_id", globalOwnerIds)
    .order("primer_apellido", { ascending: true });

  if (empErr) {
    console.error("[BP Action] getEligibleEmployees:", empErr.message);
    return [];
  }
  return employees ?? [];
}


/**
 * Fetch all PUBLISHED playbooks for the current tenant.
 * Used by the Playbook Marketplace.
 */
export async function getPublishedPlaybooksAction(orgId: string) {
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("bp_playbooks")
    .select("*, bp_playbook_steps(id, name, type_of_activity, purpose, activity_description, deliverable, deliverable_description, stakeholder, requested_to, scheduler_value, frequency, repetitions, sla, sla_description)")
    .eq("org_id", orgId)
    .eq("status", "PUBLISHED")
    .order("updated_at", { ascending: false });

  if (error) { 
    console.error("[BP Action] getPublishedPlaybooks:", error.message); 
    return []; 
  }

  return data ?? [];
}
