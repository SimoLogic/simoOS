// ⚠️ LEER ARCHITECTURE.md antes de modificar
// automation.service.ts — Motor de Automatizaciones Reactivo del PMO
//
// PATRÓN: Observer — Evalúa reglas activas tras cada mutación de tarea.
// SEGURIDAD:
//   - Circuit Breaker: MAX_DEPTH=3 previene bucles infinitos.
//   - Shield: Tareas protegidas (isProtected=true) NO son modificables por automations.
//   - Multi-tenant: orgId obligatorio en toda consulta.
// BACKEND: Usa getPmoDB() (Supabase), NO Prisma.

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { PmoTask } from "@/types/pmo.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PmoAutomation {
  id:            string;
  orgId:         string;
  boardId:       string;
  name:          string;
  triggerType:   "on_status_change" | "on_column_change";
  triggerConfig: { field: string; value: string };
  actionType:    "set_column" | "notify";
  actionConfig:  { field: string; value: string };
  isActive:      boolean;
  createdAt:     string;
}

interface CreateAutomationInput {
  orgId:         string;
  boardId:       string;
  name:          string;
  triggerType:   "on_status_change" | "on_column_change";
  triggerConfig: { field: string; value: string };
  actionType:    "set_column" | "notify";
  actionConfig:  { field: string; value: string };
}

interface UpdateAutomationInput {
  name?:          string;
  triggerType?:   "on_status_change" | "on_column_change";
  triggerConfig?: { field: string; value: string };
  actionType?:    "set_column" | "notify";
  actionConfig?:  { field: string; value: string };
  isActive?:      boolean;
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapAutomationFromDb(row: Record<string, unknown>): PmoAutomation {
  return {
    id:            String(row.id),
    orgId:         String(row.org_id),
    boardId:       String(row.board_id),
    name:          String(row.name),
    triggerType:   row.trigger_type as PmoAutomation["triggerType"],
    triggerConfig: row.trigger_config as PmoAutomation["triggerConfig"],
    actionType:    row.action_type as PmoAutomation["actionType"],
    actionConfig:  row.action_config as PmoAutomation["actionConfig"],
    isActive:      Boolean(row.is_active),
    createdAt:     String(row.created_at),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getAutomationsService(
  boardId: string,
  orgId: string
): Promise<PmoAutomation[]> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_automations")
    .select("*")
    .eq("board_id", boardId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  throwIfDbError(error, "getAutomations");
  return (data ?? []).map(mapAutomationFromDb);
}

export async function createAutomationService(
  input: CreateAutomationInput
): Promise<PmoAutomation> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_automations")
    .insert({
      org_id:         input.orgId,
      board_id:       input.boardId,
      name:           input.name.trim(),
      trigger_type:   input.triggerType,
      trigger_config: input.triggerConfig,
      action_type:    input.actionType,
      action_config:  input.actionConfig,
      is_active:      true,
    })
    .select()
    .single();

  throwIfDbError(error, "createAutomation");
  return mapAutomationFromDb(data);
}

export async function updateAutomationService(
  automationId: string,
  orgId: string,
  input: UpdateAutomationInput
): Promise<PmoAutomation> {
  const db = getPmoDB();
  const patch: Record<string, unknown> = {};

  if (input.name         !== undefined) patch.name          = input.name.trim();
  if (input.triggerType  !== undefined) patch.trigger_type   = input.triggerType;
  if (input.triggerConfig!== undefined) patch.trigger_config = input.triggerConfig;
  if (input.actionType   !== undefined) patch.action_type    = input.actionType;
  if (input.actionConfig !== undefined) patch.action_config  = input.actionConfig;
  if (input.isActive     !== undefined) patch.is_active      = input.isActive;

  const { data, error } = await db
    .from("pmo_automations")
    .update(patch)
    .eq("id", automationId)
    .eq("org_id", orgId)
    .select()
    .single();

  throwIfDbError(error, "updateAutomation");
  return mapAutomationFromDb(data);
}

export async function deleteAutomationService(
  automationId: string,
  orgId: string
): Promise<void> {
  const db = getPmoDB();
  const { error } = await db
    .from("pmo_automations")
    .delete()
    .eq("id", automationId)
    .eq("org_id", orgId);

  throwIfDbError(error, "deleteAutomation");
}

// ─── AUTOMATION ENGINE (Observer Pattern) ─────────────────────────────────────

const MAX_DEPTH = 3;

/**
 * processAutomations — Core reactor del motor S-14.
 *
 * Called fire-and-forget after every task mutation (updateTaskAction, updateTaskFieldAction).
 * Evaluates all active rules for the board and executes matching actions.
 *
 * CIRCUIT BREAKER: depth >= MAX_DEPTH → halt to prevent infinite loops.
 * SHIELD: Protected tasks are NEVER modified by set_column actions.
 */
export async function processAutomations(
  taskId:  string,
  orgId:   string,
  boardId: string,
  delta:   Record<string, unknown>,
  depth:   number = 0
): Promise<void> {
  if (depth >= MAX_DEPTH) {
    console.warn(
      `[Automation] ⚠️ Max recursion depth (${MAX_DEPTH}) reached for task ${taskId}. Circuit breaker active.`
    );
    return;
  }

  try {
    const db = getPmoDB();

    // 1. Fetch active rules for this board
    const { data: rules, error } = await db
      .from("pmo_automations")
      .select("*")
      .eq("board_id", boardId)
      .eq("org_id", orgId)
      .eq("is_active", true);

    if (error) {
      console.error("[Automation] Failed to fetch rules:", error);
      return;
    }
    if (!rules?.length) return;

    // 2. Evaluate each rule against the delta
    for (const rawRule of rules) {
      const rule = mapAutomationFromDb(rawRule);
      const triggered = evaluateTrigger(rule, delta);

      if (triggered) {
        console.log(`[Automation] ⚡ Rule "${rule.name}" triggered for task ${taskId} (depth=${depth})`);
        await executeAction(rule, taskId, orgId, boardId, depth + 1);
      }
    }
  } catch (err) {
    console.error("[Automation] Error processing rules:", err);
  }
}

// ─── TRIGGER EVALUATION ───────────────────────────────────────────────────────

function evaluateTrigger(
  rule: PmoAutomation,
  delta: Record<string, unknown>
): boolean {
  const { field, value } = rule.triggerConfig;

  // Direct field match (status, priority, assigneeId, etc.)
  if (delta[field] !== undefined) {
    return String(delta[field]) === value;
  }

  // JSONB customFieldValues match
  if (
    delta.customFieldValues &&
    typeof delta.customFieldValues === "object" &&
    (delta.customFieldValues as Record<string, unknown>)[field] !== undefined
  ) {
    return String((delta.customFieldValues as Record<string, unknown>)[field]) === value;
  }

  return false;
}

// ─── ACTION EXECUTION ─────────────────────────────────────────────────────────

async function executeAction(
  rule: PmoAutomation,
  taskId: string,
  orgId: string,
  boardId: string,
  depth: number
): Promise<void> {
  const db = getPmoDB();

  // ── SHIELD: Check task protection before mutating ──
  if (rule.actionType === "set_column") {
    const { data: taskRow } = await db
      .from("pmo_tasks")
      .select("is_protected, custom_field_values")
      .eq("id", taskId)
      .eq("org_id", orgId)
      .single();

    if (taskRow?.is_protected) {
      console.warn(
        `[Automation] 🛡️ Shield: Blocked action "${rule.name}" on protected task ${taskId}.`
      );
      return;
    }

    const { field, value } = rule.actionConfig;
    const nativeFields = ["status", "priority", "assignee_id", "due_date"];
    // Map camelCase → snake_case for DB
    const fieldMap: Record<string, string> = {
      status:     "status",
      priority:   "priority",
      assigneeId: "assignee_id",
      dueDate:    "due_date",
    };

    const dbField = fieldMap[field] ?? null;

    if (dbField && nativeFields.includes(dbField)) {
      // Native field update
      const { error } = await db
        .from("pmo_tasks")
        .update({ [dbField]: value, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("org_id", orgId);

      if (error) {
        console.error(`[Automation] DB error on set_column (native):`, error);
        return;
      }

      // RECURSIVE: Trigger downstream automations for this change
      await processAutomations(taskId, orgId, boardId, { [field]: value }, depth);

    } else {
      // Custom field update (JSONB merge)
      const existingCfv = (taskRow?.custom_field_values as Record<string, unknown>) ?? {};
      const updatedCfv = { ...existingCfv, [field]: value };

      const { error } = await db
        .from("pmo_tasks")
        .update({ custom_field_values: updatedCfv, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("org_id", orgId);

      if (error) {
        console.error(`[Automation] DB error on set_column (custom):`, error);
        return;
      }

      await processAutomations(
        taskId, orgId, boardId,
        { customFieldValues: { [field]: value } },
        depth
      );
    }

  } else if (rule.actionType === "notify") {
    // Insert notification into simo_notifications
    const { error } = await db
      .from("simo_notifications")
      .insert({
        org_id:     orgId,
        user_id:    "system",
        type:       "AUTOMATION",
        module:     "PMO",
        title:      `Automation: ${rule.name}`,
        summary:    `Rule "${rule.name}" executed for task ${taskId}.`,
        action_url: `/pmo?board=${boardId}&task=${taskId}`,
        status:     "PENDING",
        priority:   "NORMAL",
      });

    if (error) {
      // Non-blocking — log but don't crash the chain
      console.error("[Automation] Notification insert error:", error);
    }
  }
}

// ─── RE-EXPORT AS CLASS FOR BACKWARD COMPAT (task-actions.ts imports) ─────────

export class AutomationService {
  static processAutomations = processAutomations;
}
