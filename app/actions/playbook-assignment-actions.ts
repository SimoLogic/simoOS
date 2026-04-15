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
 * Used by the Playbook Marketplace and employee-first Assignment Panel.
 */
export async function getPublishedPlaybooksAction(orgId: string) {
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("bp_playbooks")
    .select("id, name, type, family, strategy, purpose, status, version, global_owner_ids, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("status", "PUBLISHED")
    .order("updated_at", { ascending: false });

  if (error) { 
    console.error("[BP Action] getPublishedPlaybooks:", error.message); 
    return []; 
  }

  if (!data || data.length === 0) return [];

  // Fetch steps separately to avoid column mismatch errors
  const ids = data.map(p => p.id);
  const { data: steps } = await supabase
    .from("bp_playbook_steps")
    .select("*")
    .in("playbook_id", ids)
    .order("position", { ascending: true });

  const stepsByPlaybook = (steps ?? []).reduce((acc: Record<string, unknown[]>, s: Record<string, unknown>) => {
    const pid = s.playbook_id as string;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(s);
    return acc;
  }, {});

  return data.map(p => ({ ...p, bp_playbook_steps: stepsByPlaybook[p.id] ?? [] }));
}
