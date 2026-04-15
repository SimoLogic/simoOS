"use server";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — SERVER ACTIONS (Business Plan Module)
 * ============================================================================
 * Follows State vs. Database Protocol (SIMO IS Rules):
 * - Frontend reads orgId from useTenant() (Zustand session state)
 * - These server actions are the ONLY interface to the DB for playbooks
 * - All queries filtered by org_id (multi-tenant isolation)
 * - Uses Supabase JS client (matching PMO pattern in this project)
 * ============================================================================
 */

import { supabase } from "@/lib/database";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaybookUpsertInput {
  id?: string;
  name: string;
  type: string;
  family: string;
  strategy: string;
  purpose?: string;
  status: string;
  globalOwners: string[];
  version?: number;
  parentId?: string | null;
}

export interface PlaybookStepUpsertInput {
  id?: string;
  uid: string;
  stepNum: string;
  name: string;
  typeOfActivity?: string;
  purpose?: string;
  activityDescription?: string;
  deliverable?: string;
  deliverableDescription?: string;
  stakeholderId?: string | null;
  frequency: string;
  repetitions: number;
  freqNotes?: string;
  schedulerValue: number;
  supportingTask?: string;
  counteractionDescription?: string;
  requestedToId?: string | null;
  sla?: string;
  slaDescription?: string;
  isLocked: boolean;
  isRepeatable: boolean;
  position: number;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all playbooks for the current tenant (lightweight, no steps).
 */
export async function getPlaybooksAction(orgId: string) {
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("bp_playbooks")
    .select("id, name, type, family, strategy, status, purpose, version, global_owner_ids, created_at, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) { console.error("[BP Action] getPlaybooks:", error.message); return []; }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    family: row.family,
    strategy: row.strategy,
    status: row.status,
    version: row.version ?? 1,
    purpose: row.purpose,
    globalOwners: row.global_owner_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Fetch a single playbook with all its steps (ordered by position).
 */
export async function getPlaybookDetailAction(playbookId: string, orgId: string) {
  if (!playbookId || !orgId) return null;

  const { data: pb, error: pbErr } = await supabase
    .from("bp_playbooks")
    .select("*")
    .eq("id", playbookId)
    .eq("org_id", orgId)
    .single();

  if (pbErr || !pb) return null;

  const { data: steps } = await supabase
    .from("bp_playbook_steps")
    .select("*")
    .eq("playbook_id", playbookId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });

  return { ...pb, globalOwners: pb.global_owner_ids ?? [], steps: steps ?? [] };
}

/**
 * Saves (create or update) the playbook header metadata.
 * Supports version tracking and duplicate lineage (parent_id).
 */
export async function upsertPlaybookAction(orgId: string, data: PlaybookUpsertInput): Promise<{ id: string; error?: string } | { id?: undefined; error: string }> {
  if (!orgId) return { error: "orgId is required" };

  const payload: Record<string, unknown> = {
    org_id: orgId,
    name: data.name,
    type: data.type,
    family: data.family,
    strategy: data.strategy,
    purpose: data.purpose ?? null,
    status: data.status,
    global_owner_ids: data.globalOwners,
    version: data.version ?? 1,
    updated_at: new Date().toISOString(),
  };

  if (data.parentId !== undefined) payload.parent_id = data.parentId;

  if (data.id) {
    const { data: updated, error } = await supabase
      .from("bp_playbooks")
      .update(payload)
      .eq("id", data.id)
      .eq("org_id", orgId)
      .select("id")
      .single();
    if (error) return { error: `[header update] ${error.message}` };
    revalidatePath("/business-plan");
    return updated;
  } else {
    const { data: created, error } = await supabase
      .from("bp_playbooks")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) return { error: `[header insert] ${error.message}` };
    revalidatePath("/business-plan");
    return created;
  }
}

// ─── LIFECYCLE ACTIONS ────────────────────────────────────────────────────────

/**
 * Check if a playbook name already exists for this org.
 * Returns { exists, conflictId, currentVersion } for collision handling.
 */
export async function checkPlaybookNameAction(
  name: string,
  orgId: string,
  excludeId?: string
): Promise<{ exists: boolean; conflictId?: string; currentVersion?: number }> {
  if (!name || !orgId) return { exists: false };

  let query = supabase
    .from("bp_playbooks")
    .select("id, version")
    .eq("org_id", orgId)
    .ilike("name", name.trim())
    .neq("status", "INACTIVE");

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return { exists: false };
  return { exists: true, conflictId: data.id, currentVersion: data.version };
}

/**
 * Deactivate a playbook (soft delete — sets status to INACTIVE).
 */
export async function deactivatePlaybookAction(orgId: string, playbookId: string) {
  if (!orgId || !playbookId) throw new Error("orgId and playbookId are required");
  const { error } = await supabase
    .from("bp_playbooks")
    .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
    .eq("id", playbookId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);
  revalidatePath("/business-plan/playbooks");
}

/**
 * Fetch playbooks for the Marketplace with optional status filter.
 * statusFilter: ['DRAFT', 'PUBLISHED', 'INACTIVE'] — pass empty array for ALL
 */
export async function getPlaybooksForMarketplaceAction(
  orgId: string,
  statusFilter: string[] = ['DRAFT', 'PUBLISHED']
) {
  if (!orgId) return [];

  // Step 1: Fetch playbook headers
  let headerQuery = supabase
    .from("bp_playbooks")
    .select("id, name, type, family, strategy, purpose, status, version, parent_id, created_at, updated_at, global_owner_ids")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (statusFilter.length > 0) {
    headerQuery = headerQuery.in("status", statusFilter);
  }

  const { data: headers, error: headerError } = await headerQuery;
  if (headerError) {
    console.error("[BP Action] getPlaybooksForMarketplace headers:", headerError.message);
    return [];
  }
  if (!headers || headers.length === 0) return [];

  // Step 2: Fetch steps for all returned playbooks (use * to avoid column mismatch)
  const playbookIds = headers.map(h => h.id);
  const { data: steps, error: stepsError } = await supabase
    .from("bp_playbook_steps")
    .select("*")
    .in("playbook_id", playbookIds)
    .eq("org_id", orgId)
    .order("position", { ascending: true });

  if (stepsError) {
    console.error("[BP Action] getPlaybooksForMarketplace steps:", stepsError.message);
    // Return headers without steps rather than crashing
    return headers.map(h => ({ ...h, bp_playbook_steps: [] }));
  }

  // Step 3: Attach steps to their playbook
  const stepsByPlaybook = (steps ?? []).reduce((acc: Record<string, unknown[]>, step: Record<string, unknown>) => {
    const pid = step.playbook_id as string;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(step);
    return acc;
  }, {});

  return headers.map(h => ({
    ...h,
    bp_playbook_steps: stepsByPlaybook[h.id] ?? [],
  }));
}

/**
 * Bulk upsert all steps. Removes stale steps not in the incoming array.
 */
export async function upsertPlaybookStepsAction(
  orgId: string,
  playbookId: string,
  steps: PlaybookStepUpsertInput[]
): Promise<{ success: boolean; error?: string }> {
  if (!orgId || !playbookId) return { success: false, error: "orgId and playbookId are required" };

  // Remove deleted steps
  const incomingUids = steps.map(s => s.uid);
  const { error: delError } = await supabase
    .from("bp_playbook_steps")
    .delete()
    .eq("playbook_id", playbookId)
    .eq("org_id", orgId)
    .not("uid", "in", `(${incomingUids.map(u => `"${u}"`).join(",")})`);

  if (delError) {
    console.error("[BP] Step delete error:", delError.message);
    // Non-fatal: continue with upsert
  }

  // Upsert each step
  const rows = steps.map((s) => ({
    ...(s.id ? { id: s.id } : {}),
    org_id: orgId,
    playbook_id: playbookId,
    uid: s.uid,
    step_num: s.stepNum,
    name: s.name,
    type_of_activity: s.typeOfActivity ?? null,
    purpose: s.purpose ?? null,
    activity_description: s.activityDescription ?? null,
    deliverable: s.deliverable ?? null,
    deliverable_description: s.deliverableDescription ?? null,
    stakeholder_id: s.stakeholderId ?? null,
    frequency: s.frequency,
    repetitions: s.repetitions,
    freq_notes: s.freqNotes ?? null,
    scheduler_value: s.schedulerValue,
    supporting_task: s.supportingTask ?? null,
    counteraction_description: s.counteractionDescription ?? null,
    requested_to_id: s.requestedToId ?? null,
    sla: s.sla ?? null,
    sla_description: s.slaDescription ?? null,
    is_locked: s.isLocked,
    is_repeatable: s.isRepeatable,
    position: s.position,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("bp_playbook_steps")
    .upsert(rows, { onConflict: "id" });

  if (error) return { success: false, error: `[steps upsert] ${error.message}` };

  revalidatePath("/business-plan");
  return { success: true };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Deletes a DRAFT playbook. Published (SUBMITTED) playbooks are protected.
 */
export async function deletePlaybookAction(orgId: string, playbookId: string) {
  if (!orgId || !playbookId) throw new Error("orgId and playbookId are required");

  const { data: pb } = await supabase
    .from("bp_playbooks")
    .select("status")
    .eq("id", playbookId)
    .eq("org_id", orgId)
    .single();

  if (!pb) throw new Error("Playbook not found");
  if (pb.status === "SUBMITTED") throw new Error("Cannot delete a published playbook.");

  await supabase.from("bp_playbooks").delete().eq("id", playbookId);
  revalidatePath("/business-plan/playbook-designer");
}

// ─── ROLES & PLAYBOOK METADATA ────────────────────────────────────────────────

/**
 * Fetch active Internal Roles from dim_role_title
 */
export async function getActiveRoleTitlesForPlaybookAction(orgId: string) {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("dim_role_title")
    .select("id, role_title")
    .eq("tenant_id", orgId)
    .eq("status", "Active")
    .order("role_title", { ascending: true });

  if (error) { console.error("[BP Action] getActiveRoleTitles:", error.message); return []; }
  return data ?? [];
}

/**
 * Fetch active Employees for Counteraction Assignment in Playbook Designer
 */
export async function getActiveEmployeesForPlaybookAction(orgId: string) {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("dim_employee")
    .select("eid, primer_nombre, primer_apellido, role_title")
    .eq("tenant_id", orgId)
    .eq("status", "Active")
    .order("primer_apellido", { ascending: true });

  if (error) { console.error("[BP Action] getActiveEmployees:", error.message); return []; }
  return data ?? [];
}

/**
 * Fetch all External Roles (Active/Inactive) for the settings panel.
 * The sidebar component will filter by Active.
 */
export async function getActiveExternalRolesAction(orgId: string) {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("dim_external_role")
    .select("id, name, status, business_type, size, annual_volume, num_agents, notes")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) { console.error("[BP Action] getActiveExternalRoles:", error.message); return []; }
  return data ?? [];
}

export interface ExternalRoleInput {
  name: string;
  businessType?: string;
  size?: 'Small' | 'Mid' | 'Large';
  annualVolume?: string;
  numAgents?: string;
  notes?: string;
}

/**
 * Create a new External Role
 */
export async function createExternalRoleAction(orgId: string, payload: ExternalRoleInput) {
  if (!orgId || !payload.name) return { success: false, error: "Missing required fields" };
  const { error } = await supabase
    .from("dim_external_role")
    .insert({
      org_id: orgId,
      name: payload.name,
      business_type: payload.businessType || null,
      size: payload.size || null,
      annual_volume: payload.annualVolume || null,
      num_agents: payload.numAgents || null,
      notes: payload.notes || null,
      status: "Active"
    });
  
  if (error) {
    if (error.code === '23505') return { success: false, error: "External role already exists" };
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Toggle External Role Status
 */
export async function toggleExternalRoleStatusAction(orgId: string, id: string, currentStatus: string) {
  if (!orgId || !id) return { success: false, error: "Missing required fields" };
  const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
  const { error } = await supabase
    .from("dim_external_role")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("org_id", orgId);
  
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Fetch all PUBLISHED Playbooks with their Steps (for the Marketplace)
 */
export async function getPublishedPlaybooksAction(orgId: string) {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("bp_playbooks")
    .select(`
      id, name, type, family, strategy, mission, expected_outcomes, status, created_at, global_owners,
      bp_playbook_steps (
        id, uid, step_num, name, type_of_activity, purpose, activity_description,
        deliverable, deliverable_description, stakeholder, frequency, repetitions, freq_notes,
        scheduler_value, supporting_task, counteraction_description, requested_to, sla, sla_description,
        is_locked, is_repeatable
      )
    `)
    .eq("tenant_id", orgId)
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[BP Action] getPublishedPlaybooks:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Alias: Fetch a single playbook with all its steps by ID (Marketplace Preview).
 * Delegates to getPlaybookDetailAction � no logic duplication.
 */
export async function getPlaybookByIdAction(playbookId: string, orgId: string) {
  return getPlaybookDetailAction(playbookId, orgId);
}
