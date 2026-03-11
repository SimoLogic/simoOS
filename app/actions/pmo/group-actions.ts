// ⚠️ LEER ARCHITECTURE.md antes de modificar
// group-actions.ts — Server Actions para pmo_groups

"use server";

import { z } from "zod";
import {
  getGroupsService,
  createGroupService,
  updateGroupService,
  deleteGroupService,
  reorderGroupsService,
} from "@/lib/services/pmo/group.service";
import type { PmoGroup } from "@/types/pmo.types";

// ─── ZOD SCHEMAS ──────────────────────────────────────────────────────────────

const OrgIdSchema = z.string().min(1, "orgId is required");

const CreateGroupSchema = z.object({
  orgId:   OrgIdSchema,
  boardId: z.string().min(1, "boardId is required"),
  title:   z.string().min(1, "Group title is required").max(255).trim(),
  color:   z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional(),
});

const UpdateGroupSchema = z.object({
  groupId:     z.string().min(1),
  boardId:     z.string().min(1),
  orgId:       OrgIdSchema,
  title:       z.string().min(1).max(255).trim().optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isCollapsed: z.boolean().optional(),
});

const ReorderGroupsSchema = z.object({
  orgId:      OrgIdSchema,
  boardId:    z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

// ─── RESULT TYPE ──────────────────────────────────────────────────────────────

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getGroupsAction(
  boardId: string,
  orgId:   string
): Promise<PmoGroup[]> {
  if (!boardId?.trim() || !orgId?.trim()) return [];
  try {
    return await getGroupsService(boardId, orgId);
  } catch (err: unknown) {
    console.error("[PMO Action] getGroups:", err);
    return [];
  }
}

export async function createGroupAction(
  input: z.infer<typeof CreateGroupSchema>
): Promise<ActionResult<PmoGroup>> {
  try {
    const validated = CreateGroupSchema.parse(input);
    const group = await createGroupService(validated);
    return { success: true, data: group };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function updateGroupAction(
  input: z.infer<typeof UpdateGroupSchema>
): Promise<ActionResult<PmoGroup>> {
  try {
    const validated = UpdateGroupSchema.parse(input);
    const group = await updateGroupService(
      validated.groupId,
      validated.boardId,
      validated.orgId,
      {
        title:       validated.title,
        color:       validated.color,
        isCollapsed: validated.isCollapsed,
      }
    );
    return { success: true, data: group };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteGroupAction(
  groupId: string,
  boardId: string,
  orgId:   string
): Promise<ActionResult<void>> {
  if (!groupId?.trim() || !boardId?.trim() || !orgId?.trim()) {
    return { success: false, error: "groupId, boardId, and orgId are required" };
  }
  try {
    await deleteGroupService(groupId, boardId, orgId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function reorderGroupsAction(
  input: z.infer<typeof ReorderGroupsSchema>
): Promise<ActionResult<void>> {
  try {
    const validated = ReorderGroupsSchema.parse(input);
    await reorderGroupsService(validated);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}
