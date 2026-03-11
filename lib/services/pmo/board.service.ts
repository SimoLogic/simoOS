// ⚠️ LEER ARCHITECTURE.md antes de modificar
// board.service.ts — CRUD para pmo_workspaces y pmo_boards
// Patrón: Service recibe orgId explícito → TODA query filtra por org_id

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { PmoBoard, PmoWorkspace, BoardView } from "@/types/pmo.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CreateWorkspaceInput {
  orgId:       string;
  name:        string;
  description?: string;
}

export interface CreateBoardInput {
  orgId:        string;
  workspaceId:  string;
  title:        string;
  description?: string;
  simoPlaybookId?: string;    // Si viene de Simo IS
  isPlaybookBoard?: boolean;
}

export interface UpdateBoardInput {
  title?:       string;
  description?: string;
  activeView?:  BoardView;
  isViewLocked?: boolean;
}

// ─── DB MAPPERS ───────────────────────────────────────────────────────────────

function mapBoardFromDb(row: Record<string, unknown>): PmoBoard {
  return {
    id:             String(row.id),
    orgId:          String(row.org_id),
    workspaceId:    String(row.workspace_id),
    title:          String(row.title),
    description:    row.description ? String(row.description) : undefined,
    simoPlaybookId: row.simo_playbook_id ? String(row.simo_playbook_id) : undefined,
    isPlaybookBoard: Boolean(row.is_playbook_board),
    activeView:     (row.active_view as BoardView) ?? "grid",
    isViewLocked:   Boolean(row.is_view_locked),
    groups:         [],      // Cargado por separado en group.service.ts
    columns:        [],      // Cargado por separado en column.service.ts
    createdAt:      String(row.created_at),
    updatedAt:      String(row.updated_at),
    lastSyncedAt:   row.last_synced_at ? String(row.last_synced_at) : undefined,
  };
}

function mapWorkspaceFromDb(row: Record<string, unknown>): PmoWorkspace {
  return {
    id:        String(row.id),
    orgId:     String(row.org_id),
    name:      String(row.name),
    boards:    [],
    createdAt: String(row.created_at),
  };
}

// ─── WORKSPACE SERVICES ───────────────────────────────────────────────────────

export async function getWorkspacesService(orgId: string): Promise<PmoWorkspace[]> {
  if (!orgId?.trim()) return [];
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_workspaces")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  throwIfDbError(error, "getWorkspaces");
  return (data ?? []).map(mapWorkspaceFromDb);
}

export async function createWorkspaceService(input: CreateWorkspaceInput): Promise<PmoWorkspace> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_workspaces")
    .insert({ org_id: input.orgId, name: input.name.trim(), description: input.description })
    .select()
    .single();

  throwIfDbError(error, "createWorkspace");
  return mapWorkspaceFromDb(data);
}

// ─── BOARD SERVICES ───────────────────────────────────────────────────────────

export async function getBoardsService(orgId: string, workspaceId?: string): Promise<PmoBoard[]> {
  if (!orgId?.trim()) return [];
  const db = getPmoDB();

  let query = db.from("pmo_boards").select("*").eq("org_id", orgId);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;
  throwIfDbError(error, "getBoards");
  return (data ?? []).map(mapBoardFromDb);
}

export async function getBoardByIdService(boardId: string, orgId: string): Promise<PmoBoard | null> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_boards")
    .select("*")
    .eq("id", boardId)
    .eq("org_id", orgId)     // ← Multi-tenant guard
    .single();

  if ((error as { code?: string } | null)?.code === "PGRST116") return null;
  throwIfDbError(error, "getBoardById");
  return data ? mapBoardFromDb(data) : null;
}

export async function createBoardService(input: CreateBoardInput): Promise<PmoBoard> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_boards")
    .insert({
      org_id:           input.orgId,
      workspace_id:     input.workspaceId,
      title:            input.title.trim(),
      description:      input.description ?? null,
      simo_playbook_id: input.simoPlaybookId ?? null,
      is_playbook_board: input.isPlaybookBoard ?? false,
    })
    .select()
    .single();

  throwIfDbError(error, "createBoard");
  return mapBoardFromDb(data);
}

export async function updateBoardService(
  boardId: string,
  orgId:   string,
  input:   UpdateBoardInput
): Promise<PmoBoard> {
  const db = getPmoDB();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title       !== undefined) patch.title        = input.title.trim();
  if (input.description !== undefined) patch.description  = input.description;
  if (input.activeView  !== undefined) patch.active_view  = input.activeView;
  if (input.isViewLocked !== undefined) patch.is_view_locked = input.isViewLocked;

  const { data, error } = await db
    .from("pmo_boards")
    .update(patch)
    .eq("id", boardId)
    .eq("org_id", orgId)   // ← Multi-tenant guard
    .select()
    .single();

  throwIfDbError(error, "updateBoard");
  return mapBoardFromDb(data);
}

/**
 * deleteBoardService — Solo permite borrar boards que NO son Playbook boards.
 * Los Playbook boards son gestionados por Simo IS y no pueden borrarse manualmente.
 */
export async function deleteBoardService(boardId: string, orgId: string): Promise<void> {
  const db = getPmoDB();

  // Pre-check: no borrar Playbook boards
  const { data: board } = await db
    .from("pmo_boards")
    .select("is_playbook_board, title")
    .eq("id", boardId)
    .eq("org_id", orgId)
    .single();

  if (board?.is_playbook_board) {
    throw new Error(
      `Board "${board.title}" is a Simo IS Playbook board and cannot be deleted manually.`
    );
  }

  const { error } = await db
    .from("pmo_boards")
    .delete()
    .eq("id", boardId)
    .eq("org_id", orgId);

  throwIfDbError(error, "deleteBoard");
}
