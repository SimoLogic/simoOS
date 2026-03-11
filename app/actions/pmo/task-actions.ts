// ⚠️ LEER ARCHITECTURE.md REGLAS DE ORO #1 y #2 antes de modificar
// task-actions.ts — Server Actions para pmo_tasks
//
// REGLA DE ORO #1: deleteTaskAction SIEMPRE llama guardDelete() antes de DB
// REGLA DE ORO #2: updateTaskAction NUNCA toca: subtasks, comments, attachments

"use server";

import { z } from "zod";
import {
  getTasksService,
  getTaskByIdService,
  createTaskService,
  updateTaskService,
  moveTaskService,
  deleteTaskService,
  batchDeleteTasksService,
  searchTasksService,
} from "@/lib/services/pmo/task.service";
import type { PmoTask, TaskStatus, TaskPriority } from "@/types/pmo.types";
import { validateFieldValue } from "@/lib/pmo/field-engine";

// ─── ZOD SCHEMAS ──────────────────────────────────────────────────────────────

const OrgIdSchema = z.string().min(1, "orgId is required");

const TaskStatusEnum = z.enum([
  "not_started", "in_progress", "done", "stuck", "pending_review"
]);

const TaskPriorityEnum = z.enum(["low", "medium", "high", "critical"]);

const CreateTaskSchema = z.object({
  orgId:       OrgIdSchema,
  boardId:     z.string().min(1, "boardId is required"),
  groupId:     z.string().min(1, "groupId is required"),
  title:       z.string().min(1, "Task title is required").max(255).trim(),
  description: z.string().max(50000).optional(),
  status:      TaskStatusEnum.optional().default("not_started"),
  priority:    TaskPriorityEnum.optional(),
  dueDate:     z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  assigneeId:  z.string().optional(),
});

const UpdateTaskSchema = z.object({
  taskId:      z.string().min(1),
  orgId:       OrgIdSchema,
  title:       z.string().min(1).max(255).trim().optional(),
  description: z.string().max(50000).optional(),
  status:      TaskStatusEnum.optional(),
  priority:    TaskPriorityEnum.optional(),
  dueDate:     z.string().optional(),
  assigneeId:  z.string().optional(),
  itemHeight:  z.enum(["simple","double","triple"]).optional(),
});

const UpdateFieldSchema = z.object({
  taskId:    z.string().min(1),
  orgId:     OrgIdSchema,
  fieldType: z.string().min(1),
  value:     z.unknown(),
});

const MoveTaskSchema = z.object({
  taskId:      z.string().min(1),
  orgId:       OrgIdSchema,
  newGroupId:  z.string().min(1),
  newPosition: z.number().int().min(0),
});

const DeleteTaskSchema = z.object({
  taskId: z.string().min(1),
  orgId:  OrgIdSchema,
  userId: z.string().min(1, "userId is required for audit trail"),
});

// ─── RESULT TYPE ──────────────────────────────────────────────────────────────

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: number };

// ─── TASK ACTIONS ─────────────────────────────────────────────────────────────

export async function getTasksAction(
  boardId: string,
  orgId:   string,
  groupId?: string
): Promise<PmoTask[]> {
  if (!boardId?.trim() || !orgId?.trim()) return [];
  try {
    return await getTasksService(boardId, orgId, groupId);
  } catch (err: unknown) {
    console.error("[PMO Action] getTasks:", err);
    return [];
  }
}

export async function getTaskAction(
  taskId: string,
  orgId:  string
): Promise<ActionResult<PmoTask>> {
  try {
    const task = await getTaskByIdService(taskId, orgId);
    if (!task) return { success: false, error: "Task not found" };
    return { success: true, data: task };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function searchTasksAction(
  query: string,
  orgId: string
): Promise<PmoTask[]> {
  if (!query?.trim() || !orgId?.trim()) return [];
  try {
    return await searchTasksService(query, orgId, 10);
  } catch (err: unknown) {
    console.error("[PMO Action] searchTasks:", err);
    return [];
  }
}

export async function createTaskAction(
  input: z.infer<typeof CreateTaskSchema>
): Promise<ActionResult<PmoTask>> {
  try {
    const validated = CreateTaskSchema.parse(input);
    const task = await createTaskService({
      ...validated,
      status:   validated.status as TaskStatus,
      priority: validated.priority as TaskPriority | undefined,
    });
    return { success: true, data: task };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function updateTaskAction(
  input: z.infer<typeof UpdateTaskSchema>
): Promise<ActionResult<PmoTask>> {
  try {
    const validated = UpdateTaskSchema.parse(input);
    const { taskId, orgId, ...fields } = validated;
    const task = await updateTaskService(taskId, orgId, {
      ...fields,
      status:   fields.status as TaskStatus | undefined,
      priority: fields.priority as TaskPriority | undefined,
    });
    return { success: true, data: task };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

/**
 * updateTaskFieldAction — Actualiza un único campo con validación por tipo.
 * Usa el Field Engine para validar antes de guardar (Shield 2 para campos custom).
 */
export async function updateTaskFieldAction(
  input: z.infer<typeof UpdateFieldSchema>
): Promise<ActionResult<PmoTask>> {
  try {
    const validated = UpdateFieldSchema.parse(input);

    // Validar el valor con el Field Engine
    const validation = validateFieldValue(
      validated.fieldType as import("@/types/pmo.types").PmoFieldType,
      validated.value
    );
    if (!validation.valid) {
      return { success: false, error: validation.error ?? "Invalid field value" };
    }

    // Mapear tipos conocidos a campos de la task
    const updateMap: Record<string, string> = {
      status:   "status",
      person:   "assigneeId",
      text:     "title",   // Solo si el campo es 'Name' column
      date:     "dueDate",
    };

    const fieldKey = updateMap[validated.fieldType];
    if (!fieldKey) {
      // Campo custom → guardar en customFieldValues
      const task = await getTaskByIdService(validated.taskId, validated.orgId);
      if (!task) return { success: false, error: "Task not found" };

      const updatedTask = await updateTaskService(validated.taskId, validated.orgId, {
        customFieldValues: {
          ...task.customFieldValues,
          [validated.fieldType]: validated.value,
        },
      });
      return { success: true, data: updatedTask };
    }

    const updatedTask = await updateTaskService(validated.taskId, validated.orgId, {
      [fieldKey]: validated.value,
    } as Parameters<typeof updateTaskService>[2]);

    return { success: true, data: updatedTask };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function moveTaskAction(
  input: z.infer<typeof MoveTaskSchema>
): Promise<ActionResult<PmoTask>> {
  try {
    const validated = MoveTaskSchema.parse(input);
    const task = await moveTaskService(validated);
    return { success: true, data: task };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

/**
 * deleteTaskAction — REGLA DE ORO #1
 * SIEMPRE retorna 403 + "TASK_PLAYBOOK_PROTECTED" si la tarea es protegida.
 * NUNCA ejecuta el DELETE sin pasar por guardDelete() primero.
 */
export async function deleteTaskAction(
  input: z.infer<typeof DeleteTaskSchema>
): Promise<ActionResult<{ taskId: string }>> {
  try {
    const validated = DeleteTaskSchema.parse(input);
    const result = await deleteTaskService({
      taskId: validated.taskId,
      orgId:  validated.orgId,
      userId: validated.userId,
      vector: "server_action",
    });

    if (!result.success) {
      return {
        success: false,
        error:   result.error ?? "Delete blocked",
        code:    result.code,
      };
    }

    return { success: true, data: { taskId: result.taskId } };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function batchDeleteTasksAction(
  taskIds: string[],
  orgId:   string,
  userId:  string
): Promise<ActionResult<{ deleted: string[]; blocked: string[] }>> {
  if (!taskIds.length || !orgId?.trim() || !userId?.trim()) {
    return { success: false, error: "taskIds, orgId, and userId are required" };
  }
  try {
    const result = await batchDeleteTasksService(taskIds, orgId, userId);
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
