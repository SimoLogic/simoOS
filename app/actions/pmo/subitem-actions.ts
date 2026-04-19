"use server";

// subitem-actions.ts — Server Actions para pmo_subtasks
// REGLA: Subtasks NUNCA son protegidas. Son propiedad exclusiva del empleado.
// Multi-tenant: orgId obligatorio en toda operación.

import { z } from "zod";
import {
  getSubitemsService,
  createSubitemService,
  updateSubitemService,
  deleteSubitemService,
  type PmoSubitem,
} from "@/lib/services/pmo/subitem.service";
import { logFieldChangeService } from "@/lib/services/pmo/activity.service";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const OrgId = z.string().min(1, "orgId is required");

const CreateSubitemSchema = z.object({
  taskId:            z.string().min(1, "taskId is required"),
  orgId:             OrgId,
  title:             z.string().min(1, "Subitem title is required").max(500).trim(),
  assigneeId:        z.string().optional(),
  dueDate:           z.string().optional(),
  customFieldValues: z.record(z.unknown()).optional(),
});

const UpdateSubitemSchema = z.object({
  subitemId:         z.string().min(1),
  orgId:             OrgId,
  userId:            z.string().min(1),
  title:             z.string().min(1).max(500).trim().optional(),
  isCompleted:       z.boolean().optional(),
  assigneeId:        z.string().nullable().optional(),
  dueDate:           z.string().nullable().optional(),
  customFieldValues: z.record(z.unknown()).optional(),
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getSubitemsAction(
  taskId: string,
  orgId:  string
): Promise<PmoSubitem[]> {
  if (!taskId?.trim() || !orgId?.trim()) return [];
  try {
    return await getSubitemsService(taskId, orgId);
  } catch (err: unknown) {
    console.error("[PMO] getSubitems:", err);
    return [];
  }
}

export async function createSubitemAction(
  input: z.infer<typeof CreateSubitemSchema>
): Promise<ActionResult<PmoSubitem>> {
  try {
    const v = CreateSubitemSchema.parse(input);
    const subitem = await createSubitemService({
      taskId:            v.taskId,
      orgId:             v.orgId,
      title:             v.title,
      assigneeId:        v.assigneeId,
      dueDate:           v.dueDate,
      customFieldValues: v.customFieldValues,
    });

    // Log activity on parent task
    await logFieldChangeService(
      v.orgId, v.taskId, "system",
      "subitem_created", null, v.title
    );

    return { success: true, data: subitem };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function updateSubitemAction(
  input: z.infer<typeof UpdateSubitemSchema>
): Promise<ActionResult<PmoSubitem>> {
  try {
    const v = UpdateSubitemSchema.parse(input);
    const { subitemId, orgId, userId, ...fields } = v;

    // Fetch existing for activity log diff
    const existing = (await getSubitemsService(subitemId, orgId))[0];

    const updated = await updateSubitemService(subitemId, orgId, fields);

    // Log completion changes
    if (fields.isCompleted !== undefined && existing) {
      await logFieldChangeService(
        orgId,
        updated.taskId,
        userId,
        "subitem_completion",
        String(existing.isCompleted),
        String(fields.isCompleted)
      );
    }

    return { success: true, data: updated };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteSubitemAction(
  subitemId: string,
  orgId:     string
): Promise<ActionResult<void>> {
  if (!subitemId?.trim() || !orgId?.trim()) {
    return { success: false, error: "subitemId and orgId are required" };
  }
  try {
    await deleteSubitemService(subitemId, orgId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
