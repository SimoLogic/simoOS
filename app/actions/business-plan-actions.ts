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
  stakeholder?: string;
  frequency: string;
  repetitions: number;
  freqNotes?: string;
  schedulerValue: number;
  supportingTask?: string;
  counteractionDescription?: string;
  requestedTo?: string;
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
    .select("id, name, type, family, strategy, status, purpose, global_owners, created_at, updated_at")
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
    purpose: row.purpose,
    globalOwners: row.global_owners ?? [],
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

  return { ...pb, globalOwners: pb.global_owners ?? [], steps: steps ?? [] };
}

// ─── UPSERT ───────────────────────────────────────────────────────────────────

/**
 * Saves (create or update) the playbook header metadata.
 */
export async function upsertPlaybookAction(orgId: string, data: PlaybookUpsertInput) {
  if (!orgId) throw new Error("orgId is required");

  const payload = {
    org_id: orgId,
    name: data.name,
    type: data.type,
    family: data.family,
    strategy: data.strategy,
    purpose: data.purpose ?? null,
    status: data.status,
    global_owners: data.globalOwners,
    updated_at: new Date().toISOString(),
  };

  let row: { id: string };

  if (data.id) {
    const { data: updated, error } = await supabase
      .from("bp_playbooks")
      .update(payload)
      .eq("id", data.id)
      .eq("org_id", orgId)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    row = updated;
  } else {
    const { data: created, error } = await supabase
      .from("bp_playbooks")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    row = created;
  }

  revalidatePath("/business-plan/playbook-designer");
  return row;
}

/**
 * Bulk upsert all steps. Removes stale steps not in the incoming array.
 */
export async function upsertPlaybookStepsAction(
  orgId: string,
  playbookId: string,
  steps: PlaybookStepUpsertInput[]
) {
  if (!orgId || !playbookId) throw new Error("orgId and playbookId are required");

  // Remove deleted steps
  const incomingUids = steps.map(s => s.uid);
  await supabase
    .from("bp_playbook_steps")
    .delete()
    .eq("playbook_id", playbookId)
    .eq("org_id", orgId)
    .not("uid", "in", `(${incomingUids.map(u => `"${u}"`).join(",")})`);

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
    stakeholder: s.stakeholder ?? null,
    frequency: s.frequency,
    repetitions: s.repetitions,
    freq_notes: s.freqNotes ?? null,
    scheduler_value: s.schedulerValue,
    supporting_task: s.supportingTask ?? null,
    counteraction_description: s.counteractionDescription ?? null,
    requested_to: s.requestedTo ?? null,
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

  if (error) throw new Error(error.message);

  revalidatePath("/business-plan/playbook-designer");
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
