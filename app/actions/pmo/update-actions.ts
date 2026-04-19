"use server";

// update-actions.ts — Server Actions para pmo_item_updates (Side Peek comments/updates)
// Multi-tenant: orgId obligatorio. Reactions con emoji JSONB toggle.

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
  orgId:    z.string().min(1),
  userId:   z.string().min(1),
  body:     z.string().min(1, "Update body cannot be empty").max(10000).trim(),
  mentions: z.array(z.string()).optional(),
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getUpdatesAction(
  taskId: string,
  orgId:  string
): Promise<PmoItemUpdate[]> {
  if (!taskId?.trim() || !orgId?.trim()) return [];
  try {
    return await getUpdatesService(taskId, orgId);
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
      orgId:    v.orgId,
      taskId:   v.taskId,
      userId:   v.userId,
      body:     v.body,
      mentions: v.mentions,
    });

    // Log activity
    await logActivityService({
      orgId:    v.orgId,
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
  orgId:    string,
  userId:   string
): Promise<ActionResult<void>> {
  if (!updateId?.trim() || !orgId?.trim() || !userId?.trim()) {
    return { success: false, error: "updateId, orgId, and userId are required" };
  }
  try {
    await deleteUpdateService(updateId, orgId, userId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function toggleReactionAction(
  updateId: string,
  orgId:    string,
  emoji:    string,
  userId:   string
): Promise<ActionResult<PmoItemUpdate>> {
  if (!updateId || !orgId || !userId || !emoji) {
    return { success: false, error: "All parameters are required" };
  }
  try {
    const updated = await addReactionService(updateId, orgId, emoji, userId);
    return { success: true, data: updated };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
