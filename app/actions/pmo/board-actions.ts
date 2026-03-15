// ⚠️ LEER ARCHITECTURE.md antes de modificar — Shield de Validación Zod
// board-actions.ts — Server Actions para Boards y Workspaces PMO
// Patrón: "use server" → Zod validation → Service call → return result
// Idéntico al patrón de hr-actions.ts

"use server";

import { z } from "zod";
import {
  getWorkspacesService,
  createWorkspaceService,
  getBoardsService,
  getBoardByIdService,
  createBoardService,
  updateBoardService,
  deleteBoardService,
} from "@/lib/services/pmo/board.service";
import { seedDefaultColumnsService } from "@/lib/services/pmo/column.service";
import type { PmoBoard, PmoWorkspace, BoardView } from "@/types/pmo.types";

// ─── ZOD SCHEMAS (Triple Shield — Shield 2) ────────────────────────────────────

const OrgIdSchema = z.string().min(1, "orgId is required").max(100);

const CreateWorkspaceSchema = z.object({
  orgId:       OrgIdSchema,
  name:        z.string().min(1, "Workspace name is required").max(255).trim(),
  description: z.string().max(1000).optional(),
});

const CreateBoardSchema = z.object({
  orgId:        OrgIdSchema,
  workspaceId:  z.string().min(1, "workspaceId is required"),
  title:        z.string().min(1, "Board title is required").max(255).trim(),
  description:  z.string().max(2000).optional(),
  simoPlaybookId: z.string().optional(),
  isPlaybookBoard: z.boolean().optional().default(false),
  seedColumns:  z.boolean().optional().default(true),  // Auto-crear columnas default
});

const UpdateBoardSchema = z.object({
  boardId:     z.string().min(1),
  orgId:       OrgIdSchema,
  title:       z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).optional(),
  activeView:  z.enum(["grid","kanban","gantt","calendar","dashboard"]).optional(),
  isViewLocked: z.boolean().optional(),
});

// ─── ACTION RESULT TYPE ────────────────────────────────────────────────────────

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── WORKSPACE ACTIONS ─────────────────────────────────────────────────────────

export async function getWorkspacesAction(orgId: string): Promise<PmoWorkspace[]> {
  if (!orgId?.trim()) return [];
  try {
    return await getWorkspacesService(orgId);
  } catch (err: unknown) {
    console.error("[PMO Action] getWorkspaces:", err);
    return [];
  }
}

export async function createWorkspaceAction(
  input: z.infer<typeof CreateWorkspaceSchema>
): Promise<ActionResult<PmoWorkspace>> {
  try {
    const validated = CreateWorkspaceSchema.parse(input);
    const workspace = await createWorkspaceService(validated);
    return { success: true, data: workspace };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    }
    console.error("[PMO Action] createWorkspace:", err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── BOARD ACTIONS ─────────────────────────────────────────────────────────────

export async function getBoardsAction(
  orgId: string,
  workspaceId?: string
): Promise<PmoBoard[]> {
  if (!orgId?.trim()) return [];
  try {
    return await getBoardsService(orgId, workspaceId);
  } catch (err: unknown) {
    console.error("[PMO Action] getBoards:", err);
    return [];
  }
}

export async function getBoardAction(
  boardId: string,
  orgId: string
): Promise<ActionResult<PmoBoard>> {
  try {
    const board = await getBoardByIdService(boardId, orgId);
    if (!board) return { success: false, error: "Board not found" };
    return { success: true, data: board };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createBoardAction(
  input: z.infer<typeof CreateBoardSchema>
): Promise<ActionResult<PmoBoard>> {
  try {
    const validated = CreateBoardSchema.parse(input);
    const board = await createBoardService(validated);

    // Auto-crear columnas default (Task, Status, Assignee, Due Date, Priority)
    if (validated.seedColumns) {
      await seedDefaultColumnsService(board.id, board.orgId);
    }

    return { success: true, data: board };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    }
    console.error("[PMO Action] createBoard:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateBoardAction(
  input: z.infer<typeof UpdateBoardSchema>
): Promise<ActionResult<PmoBoard>> {
  try {
    const validated = UpdateBoardSchema.parse(input);
    const board = await updateBoardService(validated.boardId, validated.orgId, {
      title:        validated.title,
      description:  validated.description,
      activeView:   validated.activeView as BoardView | undefined,
      isViewLocked: validated.isViewLocked,
    });
    return { success: true, data: board };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    }
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBoardAction(
  boardId: string,
  orgId: string
): Promise<ActionResult<void>> {
  if (!boardId?.trim() || !orgId?.trim()) {
    return { success: false, error: "boardId and orgId are required" };
  }
  try {
    await deleteBoardService(boardId, orgId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function archiveBoardAction(
  boardId: string,
  orgId: string
): Promise<ActionResult<void>> {
  try {
    await updateBoardService(boardId, orgId, { isArchived: true });
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

