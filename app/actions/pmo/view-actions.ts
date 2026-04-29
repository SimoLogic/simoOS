"use server";

// view-actions.ts — Server Actions para pmo_views (Vistas guardadas por tablero)
// Permite guardar/recuperar configuraciones de vista personalizadas.
// Multi-tenant: orgId obligatorio.

import { z } from "zod";
import {
  getViewsService,
  createViewService,
  updateViewService,
  deleteViewService,
  type PmoSavedView,
  type SavedViewType,
} from "@/lib/services/pmo/view.service";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ViewTypeEnum = z.enum([
  "grid", "kanban", "gantt", "calendar", "dashboard", "cards", "form"
]);

const CreateViewSchema = z.object({
  boardId:   z.string().min(1),
  orgId:     z.string().min(1),
  name:      z.string().min(1, "View name is required").max(100).trim(),
  viewType:  ViewTypeEnum,
  config:    z.record(z.string(), z.unknown()).optional(),
  createdBy: z.string().min(1),
});

const UpdateViewSchema = z.object({
  viewId:    z.string().min(1),
  boardId:   z.string().min(1),
  orgId:     z.string().min(1),
  name:      z.string().min(1).max(100).trim().optional(),
  config:    z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getViewsAction(
  boardId: string,
  orgId:   string
): Promise<PmoSavedView[]> {
  if (!boardId?.trim() || !orgId?.trim()) return [];
  try {
    return await getViewsService(boardId, orgId);
  } catch (err: unknown) {
    console.error("[PMO] getViews:", err);
    return [];
  }
}

export async function createViewAction(
  input: z.infer<typeof CreateViewSchema>
): Promise<ActionResult<PmoSavedView>> {
  try {
    const v = CreateViewSchema.parse(input);
    const view = await createViewService({
      orgId:     v.orgId,
      boardId:   v.boardId,
      name:      v.name,
      viewType:  v.viewType as SavedViewType,
      config:    v.config,
      createdBy: v.createdBy,
    });
    return { success: true, data: view };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function updateViewAction(
  input: z.infer<typeof UpdateViewSchema>
): Promise<ActionResult<PmoSavedView>> {
  try {
    const v = UpdateViewSchema.parse(input);
    const view = await updateViewService(v.viewId, v.boardId, v.orgId, {
      name:      v.name,
      config:    v.config,
      isDefault: v.isDefault,
    });
    return { success: true, data: view };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteViewAction(
  viewId:  string,
  boardId: string,
  orgId:   string
): Promise<ActionResult<void>> {
  if (!viewId?.trim() || !boardId?.trim() || !orgId?.trim()) {
    return { success: false, error: "viewId, boardId, and orgId are required" };
  }
  try {
    await deleteViewService(viewId, boardId, orgId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
