"use server";

// column-actions.ts — Server Actions para gestión de columnas dinámicas PMO
// Shield Protocol: columnas de tableros protegidos son read-only.

import { z } from "zod";
import {
  createColumnService,
  updateColumnService,
  deleteColumnService,
  reorderColumnsService,
  getColumnsService,
} from "@/lib/services/pmo/column.service";
import { getPmoDB } from "@/lib/pmo/pmo-db";
import type { PmoColumn, PmoFieldType } from "@/types/pmo.types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const AddColumnSchema = z.object({
  boardId: z.string().min(1),
  orgId:   z.string().min(1),
  title:   z.string().min(1).max(255).trim(),
  type:    z.enum([
    "text", "status", "person", "date", "date_range", "number",
    "formula", "checkbox", "dropdown", "file", "mirror", "link",
    "email", "phone", "rating", "progress", "currency", "tags", "auto_number"
  ]),
  widthPx: z.number().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// ── SHIELD: verify board is not locked before mutations ───────────────────────
async function assertBoardIsNotLocked(boardId: string, orgId: string): Promise<void> {
  const db = getPmoDB();
  const { data } = await db
    .from("pmo_boards")
    .select("is_view_locked")
    .eq("id", boardId)
    .eq("org_id", orgId)
    .single();
  if ((data as { is_view_locked?: boolean } | null)?.is_view_locked) {
    throw new Error("BOARD_LOCKED: This board is locked. Unlock it before adding columns.");
  }
}

export async function addColumnAction(
  input: z.infer<typeof AddColumnSchema>
): Promise<ActionResult<PmoColumn>> {
  try {
    const validated = AddColumnSchema.parse(input);
    await assertBoardIsNotLocked(validated.boardId, validated.orgId);
    const column = await createColumnService({
      orgId:    validated.orgId,
      boardId:  validated.boardId,
      title:    validated.title,
      type:     validated.type as PmoFieldType,
      widthPx:  validated.widthPx,
      settings: validated.settings,
    });
    return { success: true, data: column };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    }
    return { success: false, error: (err as Error).message };
  }
}

export async function updateColumnAction(
  columnId: string,
  boardId:  string,
  orgId:    string,
  patch:    { title?: string; widthPx?: number; settings?: Record<string, unknown> }
): Promise<ActionResult<PmoColumn>> {
  try {
    await assertBoardIsNotLocked(boardId, orgId);
    const column = await updateColumnService(columnId, boardId, orgId, patch);
    return { success: true, data: column };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteColumnAction(
  columnId: string,
  boardId:  string,
  orgId:    string
): Promise<ActionResult<void>> {
  try {
    await assertBoardIsNotLocked(boardId, orgId);
    // Protect system columns (Task, Status, Assignee) — position 0, 1, 2
    const db = getPmoDB();
    const { data } = await db
      .from("pmo_columns")
      .select("position, title")
      .eq("id", columnId)
      .single();
    const row = data as { position?: number; title?: string } | null;
    if (row && typeof row.position === "number" && row.position < 3) {
      return { success: false, error: "COLUMN_PROTECTED: Cannot delete a system column." };
    }
    await deleteColumnService(columnId, boardId, orgId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function reorderColumnsAction(
  boardId: string,
  orgId:   string,
  orderedIds: string[]
): Promise<ActionResult<void>> {
  try {
    await reorderColumnsService(boardId, orgId, orderedIds);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getColumnsAction(
  boardId: string,
  orgId:   string
): Promise<PmoColumn[]> {
  try {
    return await getColumnsService(boardId, orgId);
  } catch {
    return [];
  }
}

export async function updateCustomFieldValueAction(
  taskId:   string,
  boardId:  string,
  orgId:    string,
  fieldKey: string,
  value:    unknown
): Promise<ActionResult<void>> {
  try {
    const db = getPmoDB();
    // Read existing custom_field_values JSONB, merge, and update
    const { data: taskRow } = await db
      .from("pmo_tasks")
      .select("custom_field_values")
      .eq("id", taskId)
      .eq("org_id", orgId)
      .single();

    const existing = (taskRow as { custom_field_values?: Record<string, unknown> } | null)
      ?.custom_field_values ?? {};

    const merged = { ...existing, [fieldKey]: value };

    const { error } = await db
      .from("pmo_tasks")
      .update({
        custom_field_values: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("board_id", boardId)
      .eq("org_id", orgId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
