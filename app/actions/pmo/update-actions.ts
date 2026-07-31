"use server";

// update-actions.ts — Server Actions para pmo_item_updates (Side Peek comments/updates)
// Multi-tenant: tenantId obligatorio. Reactions con emoji JSONB toggle.

import { z } from "zod";
import {
  getUpdatesService,
  createUpdateService,
  deleteUpdateService,
  addReactionService,
  type PmoItemUpdate,
} from "@/lib/services/pmo/update.service";
import { logActivityService } from "@/lib/services/pmo/activity.service";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const AddUpdateSchema = z.object({
  taskId:   z.string().min(1),
  tenantId:    z.string().min(1),
  userId:   z.string().min(1),
  body:     z.string().min(1, "Update body cannot be empty").max(10000).trim(),
  mentions: z.array(z.string()).optional(),
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getUpdatesAction(
  taskId: string,
  tenantId:  string
): Promise<PmoItemUpdate[]> {
  if (!taskId?.trim() || !tenantId?.trim()) return [];
  try {
    return await getUpdatesService(taskId, tenantId);
  } catch (err: unknown) {
    console.error("[PMO] getUpdates:", err);
    return [];
  }
}

export async function addUpdateAction(
  input: z.infer<typeof AddUpdateSchema>
): Promise<ActionResult<PmoItemUpdate>> {
  try {
    const v = AddUpdateSchema.parse(input);
    const update = await createUpdateService({
      tenantId:    v.tenantId,
      taskId:   v.taskId,
      userId:   v.userId,
      body:     v.body,
      mentions: v.mentions,
    });

    // Log activity
    await logActivityService({
      tenantId:    v.tenantId,
      taskId:   v.taskId,
      userId:   v.userId,
      action:   "update_posted",
      newValue: v.body.substring(0, 200), // Truncate for log
    });

    return { success: true, data: update };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteUpdateAction(
  updateId: string,
  tenantId:    string,
  userId:   string
): Promise<ActionResult<void>> {
  if (!updateId?.trim() || !tenantId?.trim() || !userId?.trim()) {
    return { success: false, error: "updateId, tenantId, and userId are required" };
  }
  try {
    await deleteUpdateService(updateId, tenantId, userId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function toggleReactionAction(
  updateId: string,
  tenantId:    string,
  emoji:    string,
  userId:   string
): Promise<ActionResult<PmoItemUpdate>> {
  if (!updateId || !tenantId || !userId || !emoji) {
    return { success: false, error: "All parameters are required" };
  }
  try {
    const updated = await addReactionService(updateId, tenantId, emoji, userId);
    return { success: true, data: updated };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
