"use server";

/**
 * Assignment-specific server actions for the PlaybookAssignmentPanel.
 * Kept in a separate file to avoid encoding issues with the main actions file.
 */

import { supabase } from "@/lib/database";

/**
 * Fetch employees eligible for a specific playbook.
 * Extracts responsible role_titles from bp_playbook_steps
 * (stakeholder + requested_to), then returns matching active employees.
 */
export async function getEligibleEmployeesForPlaybookAction(
  playbookId: string,
  orgId: string
) {
  if (!playbookId || !orgId) return [];

  const { data: steps, error: stepsErr } = await supabase
    .from("bp_playbook_steps")
    .select("stakeholder, requested_to")
    .eq("playbook_id", playbookId)
    .eq("org_id", orgId);

  if (stepsErr || !steps?.length) return [];

  const roleTitlesSet = new Set<string>();
  steps.forEach((s) => {
    if (s.stakeholder) roleTitlesSet.add(s.stakeholder as string);
    if (s.requested_to) roleTitlesSet.add(s.requested_to as string);
  });
  const roleTitles = Array.from(roleTitlesSet);
  if (!roleTitles.length) return [];

  const { data: employees, error: empErr } = await supabase
    .from("dim_employee")
    .select("eid, primer_nombre, primer_apellido, role_title, assigned_branch_code")
    .eq("tenant_id", orgId)
    .eq("status", "Active")
    .in("role_title", roleTitles)
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
