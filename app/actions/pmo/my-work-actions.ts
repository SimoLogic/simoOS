"use server";

import { z } from "zod";
import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { PmoTask } from "@/types/pmo.types";

const GetMyTasksSchema = z.object({
  tenantId: z.string().uuid("tenantId must be a valid UUID"),
  userId: z.string().uuid("userId must be a valid UUID"),
});

export interface MyTasksActionResult {
  success: boolean;
  data?: PmoTask[];
  error?: string;
}

/**
 * getMyTasksAction
 * Retrieves all tasks assigned to a specific user across all boards in the org.
 */
export async function getMyTasksAction(
  tenantId: string,
  userId: string
): Promise<MyTasksActionResult> {
  try {
    const validated = GetMyTasksSchema.parse({ tenantId, userId });

    const db = getPmoDB();

    const { data: tasks, error } = await db
      .from("pmo_tasks")
      .select(`
         id, board_id, group_id, title, status, priority, 
         due_date, assignee_id, is_protected, source_playbook_id,
         pmo_groups ( title, color )
      `)
      .eq("tenant_id", validated.tenantId)
      .eq("assignee_id", validated.userId)
      // Ordenamos primero por prioridad luego por fecha de vencimiento
      .order("priority", { ascending: false, nullsFirst: false })
      .order("due_date", { ascending: true, nullsFirst: false });

    throwIfDbError(error, "getMyTasks");

    // Mapeo para ajustar al tipo PmoTask esperado en frontend (convirtiendo relations)
    const formatted: PmoTask[] = (tasks || []).map((t: any) => ({
      id: t.id,
      tenantId: validated.tenantId,
      boardId: t.board_id,
      groupId: t.group_id,
      title: t.title,
      description: undefined,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      assigneeId: t.assignee_id,
      isProtected: !!t.is_protected,
      sourcePlaybookId: t.source_playbook_id,
      sourcePlaybookTaskId: null,
      taskType: (t.task_type ?? "PERSONAL_TASK") as PmoTask["taskType"],
      subtasks: [] as PmoTask["subtasks"],
      comments: [] as PmoTask["comments"],
      attachments: [] as PmoTask["attachments"],
      customFieldValues: {},
      itemHeight: "simple" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      groupName: t.pmo_groups?.title,
      groupColor: t.pmo_groups?.color,
    }));

    return { success: true, data: formatted };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    }
    return { success: false, error: (err as Error).message };
  }
}
