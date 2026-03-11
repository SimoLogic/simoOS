// ⚠️ LEER ARCHITECTURE.md REGLAS DE ORO #1 Y #2 antes de modificar
// task.service.ts — CRUD para pmo_tasks
//
// REGLA DE ORO #1: TODA operación destructiva pasa por TaskGuard PRIMERO
// REGLA DE ORO #2: Mirror Sync nunca sobreescribe: subtasks, comments, attachments
//
// Patrón de deleteo seguro:
//   1. llamar guardDelete() → si blocked, retornar 403
//   2. SOLO si allowed=true → ejecutar DELETE en DB
//   3. DB Shield (Trigger) como respaldo final

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { guardDelete, guardBatchDelete, type DeleteVector } from "@/lib/pmo/task-guard";
import { triggerOutgoingWebhook } from "@/lib/pmo/outgoing-webhook";
import type { PmoTask, TaskStatus, TaskPriority } from "@/types/pmo.types";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  orgId:       string;
  boardId:     string;
  groupId:     string;
  title:       string;
  description?: string;
  status?:     TaskStatus;
  priority?:   TaskPriority;
  dueDate?:    string;         // ISO string
  assigneeId?: string;
  // Simo IS (solo para PlaybookProcessor en Sprint 3)
  isProtected?:            boolean;
  sourcePlaybookId?:       string;
  sourcePlaybookTaskId?:   string;
  occurrenceIndex?:        number;
}

export interface UpdateTaskInput {
  title?:       string;
  description?: string;
  status?:      TaskStatus;
  priority?:    TaskPriority;
  dueDate?:     string;
  assigneeId?:  string;
  itemHeight?:  "simple" | "double" | "triple";
  customFieldValues?: Record<string, unknown>;
}

export interface MoveTaskInput {
  taskId:      string;
  orgId:       string;
  newGroupId:  string;
  newPosition: number;
}

export interface DeleteTaskInput {
  taskId:  string;
  orgId:   string;
  userId:  string;
  vector?: DeleteVector;
}

export interface DeleteTaskResult {
  success: boolean;
  code?:   403;
  error?:  string;
  taskId:  string;
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapTaskFromDb(row: Record<string, unknown>): PmoTask {
  return {
    id:                   String(row.id),
    orgId:                String(row.org_id),
    boardId:              String(row.board_id),
    groupId:              String(row.group_id),
    title:                String(row.title),
    description:          row.description ? String(row.description) : undefined,
    status:               (row.status as TaskStatus) ?? "not_started",
    priority:             (row.priority as TaskPriority | undefined) ?? undefined,
    dueDate:              row.due_date ? String(row.due_date) : undefined,
    assigneeId:           row.assignee_id ? String(row.assignee_id) : undefined,
    isProtected:          Boolean(row.is_protected),
    sourcePlaybookId:     row.source_playbook_id ? String(row.source_playbook_id) : null,
    sourcePlaybookTaskId: row.source_playbook_task_id ? String(row.source_playbook_task_id) : null,
    occurrenceIndex:      row.occurrence_index != null ? Number(row.occurrence_index) : undefined,
    subtasks:             [],
    comments:             [],
    attachments:          [],
    customFieldValues:    (row.custom_field_values as Record<string, unknown>) ?? {},
    itemHeight:           (row.item_height as "simple" | "double" | "triple") ?? "simple",
    createdAt:            String(row.created_at),
    updatedAt:            String(row.updated_at),
    completedAt:          row.completed_at ? String(row.completed_at) : undefined,
    timeSpentMinutes:     row.time_spent_minutes ? Number(row.time_spent_minutes) : undefined,
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getTasksService(
  boardId: string,
  orgId:   string,
  groupId?: string
): Promise<PmoTask[]> {
  if (!boardId?.trim() || !orgId?.trim()) return [];
  const db = getPmoDB();

  let query = db
    .from("pmo_tasks")
    .select("*")
    .eq("board_id", boardId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });

  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query;
  throwIfDbError(error, "getTasks");
  return (data ?? []).map(mapTaskFromDb);
}

export async function getTaskByIdService(
  taskId: string,
  orgId:  string
): Promise<PmoTask | null> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("org_id", orgId)
    .single();

  if ((error as { code?: string } | null)?.code === "PGRST116") return null;
  throwIfDbError(error, "getTaskById");
  return data ? mapTaskFromDb(data) : null;
}

export async function searchTasksService(
  queryParam: string,
  orgId: string,
  limit: number = 10
): Promise<PmoTask[]> {
  if (!queryParam?.trim() || !orgId?.trim()) return [];
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_tasks")
    .select("*")
    .eq("org_id", orgId)
    .ilike("title", `%${queryParam}%`)
    .limit(limit);

  throwIfDbError(error, "searchTasksService");
  return (data ?? []).map(mapTaskFromDb);
}

export async function createTaskService(input: CreateTaskInput): Promise<PmoTask> {
  const db = getPmoDB();

  // Calcular posición en el grupo
  const { data: existing } = await db
    .from("pmo_tasks")
    .select("position")
    .eq("group_id", input.groupId)
    .eq("org_id", input.orgId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  // Si tiene sourcePlaybookId, is_protected DEBE ser true (REGLA DE ORO #1)
  const isProtected = input.isProtected === true || (input.sourcePlaybookId != null);

  const { data, error } = await db
    .from("pmo_tasks")
    .insert({
      org_id:                 input.orgId,
      board_id:               input.boardId,
      group_id:               input.groupId,
      title:                  input.title.trim(),
      description:            input.description ?? null,
      status:                 input.status ?? "not_started",
      priority:               input.priority ?? null,
      due_date:               input.dueDate ?? null,
      assignee_id:            input.assigneeId ?? null,
      is_protected:           isProtected,
      source_playbook_id:     input.sourcePlaybookId ?? null,
      source_playbook_task_id: input.sourcePlaybookTaskId ?? null,
      occurrence_index:       input.occurrenceIndex ?? null,
      position:               nextPosition,
      custom_field_values:    {},
    })
    .select()
    .single();

  throwIfDbError(error, "createTask");
  return mapTaskFromDb(data);
}

export async function updateTaskService(
  taskId:  string,
  orgId:   string,
  input:   UpdateTaskInput,
  userId?: string  // Requerido para webhook outgoing audit trail
): Promise<PmoTask> {
  const db = getPmoDB();

  // Capturar estado actual ANTES del update (para detectar cambio a 'done')
  const { data: current } = await db
    .from("pmo_tasks")
    .select("status, is_protected, source_playbook_id, source_playbook_task_id, occurrence_index, title")
    .eq("id", taskId)
    .eq("org_id", orgId)
    .single();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Campos actualizables (REGLA #2: NO tocar via Mirror Sync: subtasks, comments, attachments)
  if (input.title       !== undefined) patch.title        = input.title.trim();
  if (input.description !== undefined) patch.description  = input.description;
  if (input.status      !== undefined) {
    patch.status       = input.status;
    // Auto-set completedAt cuando status === 'done'
    patch.completed_at = input.status === "done" ? new Date().toISOString() : null;
  }
  if (input.priority    !== undefined) patch.priority     = input.priority;
  if (input.dueDate     !== undefined) patch.due_date     = input.dueDate;
  if (input.assigneeId  !== undefined) patch.assignee_id  = input.assigneeId;
  if (input.itemHeight  !== undefined) patch.item_height  = input.itemHeight;
  if (input.customFieldValues !== undefined) patch.custom_field_values = input.customFieldValues;

  const { data, error } = await db
    .from("pmo_tasks")
    .update(patch)
    .eq("id", taskId)
    .eq("org_id", orgId)
    .select()
    .single();

  throwIfDbError(error, "updateTask");
  const updated = mapTaskFromDb(data);

  // ── Audit Trail (Activity Logs) ──
  if (userId) {
     const logs = [];
     if (input.status !== undefined && input.status !== current?.status) {
         logs.push({
             org_id: orgId, task_id: taskId, user_id: userId,
             action_type: "STATUS_CHANGE", old_value: current?.status, new_value: input.status
         });
     }
     if (input.title !== undefined && input.title.trim() !== current?.title) {
         logs.push({
             org_id: orgId, task_id: taskId, user_id: userId,
             action_type: "TITLE_CHANGE", old_value: current?.title, new_value: input.title.trim()
         });
     }
     if (logs.length > 0) {
         // Fire and forget insert
         db.from("pmo_activity_logs").insert(logs).then();
     }
  }

  // ── Outgoing Webhook: notificar a Simo IS si tarea protegida se completó ──
  // Fire-and-forget — NO bloquea la respuesta al usuario
  const wasNotDone   = current?.status !== "done";
  const isNowDone    = input.status === "done";
  const isProtected  = Boolean(current?.is_protected);
  const hasPlaybookId = current?.source_playbook_id != null;

  if (wasNotDone && isNowDone && isProtected && hasPlaybookId) {
    triggerOutgoingWebhook({
      taskId,
      orgId,
      sourcePlaybookId:     String(current.source_playbook_id),
      sourcePlaybookTaskId: String(current.source_playbook_task_id ?? taskId),
      occurrenceIndex:      current.occurrence_index != null ? Number(current.occurrence_index) : null,
      completedAt:          new Date().toISOString(),
      completedBy:          userId ?? "unknown",
      title:                updated.title,
    });
  }

  return updated;
}

/**
 * moveTaskService — Mueve una tarea a otro grupo y/o posición.
 * También funciona para reordenar dentro del mismo grupo.
 * NOTA: No verifica protección para MOVER (solo para borrar). Una tarea protegida
 * puede moverse entre grupos (el empleado es dueño de la organización del tablero).
 */
export async function moveTaskService(input: MoveTaskInput): Promise<PmoTask> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_tasks")
    .update({
      group_id:    input.newGroupId,
      position:    input.newPosition,
      updated_at:  new Date().toISOString(),
    })
    .eq("id", input.taskId)
    .eq("org_id", input.orgId)
    .select()
    .single();

  throwIfDbError(error, "moveTask");
  return mapTaskFromDb(data);
}

/**
 * deleteTaskService — REGLA DE ORO #1 APLICADA AQUÍ.
 * 
 * SIEMPRE pasa por guardDelete() antes de ejecutar DELETE.
 * Retorna { success: false, code: 403, error: "TASK_PLAYBOOK_PROTECTED" } si bloqueado.
 */
export async function deleteTaskService(input: DeleteTaskInput): Promise<DeleteTaskResult> {
  // ── SHIELD 1: TaskGuard (Service Layer) ───────────────────────────────────
  const guard = await guardDelete({
    taskId:   input.taskId,
    orgId:    input.orgId,
    userId:   input.userId,
    vector:   input.vector ?? "server_action",
  });

  if (!guard.allowed) {
    // Bloqueo confirmado — retornar 403 con detalles
    return {
      success: false,
      code:    guard.blocked!.code,
      error:   guard.blocked!.error,
      taskId:  input.taskId,
    };
  }

  // ── Tarea no protegida → ejecutar DELETE ──────────────────────────────────
  // Shield 2 (DB CHECK constraint) y Shield 3 (DB Trigger) operan aquí como respaldo
  const db = getPmoDB();
  const { error } = await db
    .from("pmo_tasks")
    .delete()
    .eq("id", input.taskId)
    .eq("org_id", input.orgId);

  throwIfDbError(error, "deleteTask");
  return { success: true, taskId: input.taskId };
}

/**
 * batchDeleteTasksService — Borrado masivo con filtrado automático de protegidas.
 * Las tareas protegidas se omiten (con log de SecurityEvent).
 */
export async function batchDeleteTasksService(
  taskIds: string[],
  orgId:   string,
  userId:  string
): Promise<{ deleted: string[]; blocked: string[] }> {
  const { deletableIds, blockedIds } = await guardBatchDelete(
    taskIds, orgId, userId, "server_action"
  );

  if (deletableIds.length > 0) {
    const db = getPmoDB();
    const { error } = await db
      .from("pmo_tasks")
      .delete()
      .in("id", deletableIds)
      .eq("org_id", orgId);

    throwIfDbError(error, "batchDeleteTasks");
  }

  return { deleted: deletableIds, blocked: blockedIds };
}
