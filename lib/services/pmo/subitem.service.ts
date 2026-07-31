// ⚠️ LEER ARCHITECTURE.md antes de modificar
// subitem.service.ts — CRUD para pmo_subtasks (Hijos de un PmoTask)
// REGLA DE ORO: Subtasks NUNCA son protegidas (is_protected=false siempre)

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PmoSubitem {
  id:             string;
  taskId:         string;
  tenantId:          string;
  title:          string;
  isCompleted:    boolean;
  assigneeId:     string | null;
  dueDate:        string | null;
  customFieldValues: Record<string, unknown>;
  position:       number;
  createdAt:      string;
}

export interface CreateSubitemInput {
  taskId:            string;
  tenantId:             string;
  title:             string;
  assigneeId?:       string;
  dueDate?:          string;
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateSubitemInput {
  title?:            string;
  isCompleted?:      boolean;
  assigneeId?:       string | null;
  dueDate?:          string | null;
  customFieldValues?: Record<string, unknown>;
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapSubitemFromDb(row: Record<string, unknown>): PmoSubitem {
  return {
    id:                String(row.id),
    taskId:            String(row.task_id),
    tenantId:             String(row.tenant_id),
    title:             String(row.title),
    isCompleted:       Boolean(row.is_completed),
    assigneeId:        row.assignee_id ? String(row.assignee_id) : null,
    dueDate:           row.due_date ? String(row.due_date) : null,
    customFieldValues: (row.custom_field_values as Record<string, unknown>) ?? {},
    position:          Number(row.position ?? 0),
    createdAt:         String(row.created_at),
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getSubitemsService(taskId: string, tenantId: string): Promise<PmoSubitem[]> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_subtasks")
    .select("*")
    .eq("task_id", taskId)
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true });

  throwIfDbError(error, "getSubitems");
  return (data ?? []).map(mapSubitemFromDb);
}

export async function getSubitemsByTaskIdsService(taskIds: string[], tenantId: string): Promise<PmoSubitem[]> {
  if (!taskIds.length || !tenantId?.trim()) return [];
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_subtasks")
    .select("*")
    .in("task_id", taskIds)
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true });

  throwIfDbError(error, "getSubitemsByTaskIds");
  return (data ?? []).map(mapSubitemFromDb);
}

export async function createSubitemService(input: CreateSubitemInput): Promise<PmoSubitem> {
  const db = getPmoDB();

  // Determine next position
  const { data: existing } = await db
    .from("pmo_subtasks")
    .select("position")
    .eq("task_id", input.taskId)
    .eq("tenant_id", input.tenantId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await db
    .from("pmo_subtasks")
    .insert({
      task_id:              input.taskId,
      tenant_id:               input.tenantId,
      title:                input.title.trim(),
      assignee_id:          input.assigneeId ?? null,
      due_date:             input.dueDate ?? null,
      custom_field_values:  input.customFieldValues ?? {},
      position:             nextPosition,
      is_completed:         false,
    })
    .select()
    .single();

  throwIfDbError(error, "createSubitem");
  return mapSubitemFromDb(data);
}

export async function updateSubitemService(
  subitemId: string,
  tenantId:     string,
  input:     UpdateSubitemInput
): Promise<PmoSubitem> {
  const db = getPmoDB();
  const patch: Record<string, unknown> = {};

  if (input.title           !== undefined) patch.title           = input.title.trim();
  if (input.isCompleted     !== undefined) patch.is_completed    = input.isCompleted;
  if (input.assigneeId      !== undefined) patch.assignee_id     = input.assigneeId;
  if (input.dueDate         !== undefined) patch.due_date        = input.dueDate;
  if (input.customFieldValues !== undefined) {
    // Merge with existing custom fields
    const { data: existingRow } = await db
      .from("pmo_subtasks")
      .select("custom_field_values")
      .eq("id", subitemId)
      .eq("tenant_id", tenantId)
      .single();

    const existingCfv = (existingRow as { custom_field_values?: Record<string, unknown> } | null)
      ?.custom_field_values ?? {};
    patch.custom_field_values = { ...existingCfv, ...input.customFieldValues };
  }

  const { data, error } = await db
    .from("pmo_subtasks")
    .update(patch)
    .eq("id", subitemId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  throwIfDbError(error, "updateSubitem");
  return mapSubitemFromDb(data);
}

export async function deleteSubitemService(subitemId: string, tenantId: string): Promise<void> {
  const db = getPmoDB();
  const { error } = await db
    .from("pmo_subtasks")
    .delete()
    .eq("id", subitemId)
    .eq("tenant_id", tenantId);

  throwIfDbError(error, "deleteSubitem");
}
