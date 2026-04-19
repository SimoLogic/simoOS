// ⚠️ LEER ARCHITECTURE.md antes de modificar
// activity.service.ts — Auditoría transaccional para pmo_item_activity
// Cada mutación de campo se registra aquí: quién cambió qué, de qué a qué, cuándo.

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PmoActivityEntry {
  id:        string;
  orgId:     string;
  taskId:    string;
  userId:    string;
  action:    string;  // e.g. "field_change", "status_change", "assignee_change", "created", "deleted"
  fieldName: string | null;
  oldValue:  string | null;
  newValue:  string | null;
  createdAt: string;
}

export interface LogActivityInput {
  orgId:      string;
  taskId:     string;
  userId:     string;
  action:     string;
  fieldName?: string;
  oldValue?:  string | null;
  newValue?:  string | null;
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapActivityFromDb(row: Record<string, unknown>): PmoActivityEntry {
  return {
    id:        String(row.id),
    orgId:     String(row.org_id),
    taskId:    String(row.task_id),
    userId:    String(row.user_id),
    action:    String(row.action),
    fieldName: row.field_name ? String(row.field_name) : null,
    oldValue:  row.old_value  ? String(row.old_value)  : null,
    newValue:  row.new_value  ? String(row.new_value)  : null,
    createdAt: String(row.created_at),
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getActivityService(
  taskId: string,
  orgId:  string,
  limit = 50
): Promise<PmoActivityEntry[]> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_item_activity")
    .select("*")
    .eq("task_id", taskId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  throwIfDbError(error, "getActivity");
  return (data ?? []).map(mapActivityFromDb);
}

export async function logActivityService(input: LogActivityInput): Promise<PmoActivityEntry> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_item_activity")
    .insert({
      org_id:     input.orgId,
      task_id:    input.taskId,
      user_id:    input.userId,
      action:     input.action,
      field_name: input.fieldName ?? null,
      old_value:  input.oldValue  ?? null,
      new_value:  input.newValue  ?? null,
    })
    .select()
    .single();

  throwIfDbError(error, "logActivity");
  return mapActivityFromDb(data);
}

/**
 * Convenience: log a field change with before/after values.
 * Called by update actions to provide audit trail.
 */
export async function logFieldChangeService(
  orgId:     string,
  taskId:    string,
  userId:    string,
  fieldName: string,
  oldValue:  unknown,
  newValue:  unknown
): Promise<PmoActivityEntry> {
  return logActivityService({
    orgId,
    taskId,
    userId,
    action:    "field_change",
    fieldName,
    oldValue:  oldValue != null ? String(oldValue) : null,
    newValue:  newValue != null ? String(newValue) : null,
  });
}
