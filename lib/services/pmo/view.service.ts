// ⚠️ LEER ARCHITECTURE.md antes de modificar
// view.service.ts — CRUD para pmo_views (Vistas guardadas por tablero)

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type SavedViewType = "grid" | "kanban" | "gantt" | "calendar" | "dashboard" | "cards" | "form";

export interface PmoSavedView {
  id:        string;
  orgId:     string;
  boardId:   string;
  name:      string;
  viewType:  SavedViewType;
  config:    Record<string, unknown>;
  isDefault: boolean;
  position:  number;
  createdBy: string;
  createdAt: string;
}

export interface CreateViewInput {
  orgId:     string;
  boardId:   string;
  name:      string;
  viewType:  SavedViewType;
  config?:   Record<string, unknown>;
  createdBy: string;
}

export interface UpdateViewInput {
  name?:      string;
  config?:    Record<string, unknown>;
  isDefault?: boolean;
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapViewFromDb(row: Record<string, unknown>): PmoSavedView {
  return {
    id:        String(row.id),
    orgId:     String(row.org_id),
    boardId:   String(row.board_id),
    name:      String(row.name),
    viewType:  String(row.view_type) as SavedViewType,
    config:    (row.config as Record<string, unknown>) ?? {},
    isDefault: Boolean(row.is_default),
    position:  Number(row.position ?? 0),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getViewsService(boardId: string, orgId: string): Promise<PmoSavedView[]> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_views")
    .select("*")
    .eq("board_id", boardId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });

  throwIfDbError(error, "getViews");
  return (data ?? []).map(mapViewFromDb);
}

export async function createViewService(input: CreateViewInput): Promise<PmoSavedView> {
  const db = getPmoDB();

  // Determine next position
  const { data: existing } = await db
    .from("pmo_views")
    .select("position")
    .eq("board_id", input.boardId)
    .eq("org_id", input.orgId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await db
    .from("pmo_views")
    .insert({
      org_id:     input.orgId,
      board_id:   input.boardId,
      name:       input.name.trim(),
      view_type:  input.viewType,
      config:     input.config ?? {},
      position:   nextPosition,
      created_by: input.createdBy,
      is_default: false,
    })
    .select()
    .single();

  throwIfDbError(error, "createView");
  return mapViewFromDb(data);
}

export async function updateViewService(
  viewId:  string,
  boardId: string,
  orgId:   string,
  input:   UpdateViewInput
): Promise<PmoSavedView> {
  const db = getPmoDB();
  const patch: Record<string, unknown> = {};

  if (input.name      !== undefined) patch.name       = input.name.trim();
  if (input.config    !== undefined) patch.config     = input.config;
  if (input.isDefault !== undefined) {
    // If setting as default, unset all others first
    if (input.isDefault) {
      await db
        .from("pmo_views")
        .update({ is_default: false })
        .eq("board_id", boardId)
        .eq("org_id", orgId);
    }
    patch.is_default = input.isDefault;
  }

  const { data, error } = await db
    .from("pmo_views")
    .update(patch)
    .eq("id", viewId)
    .eq("board_id", boardId)
    .eq("org_id", orgId)
    .select()
    .single();

  throwIfDbError(error, "updateView");
  return mapViewFromDb(data);
}

export async function deleteViewService(
  viewId:  string,
  boardId: string,
  orgId:   string
): Promise<void> {
  const db = getPmoDB();
  const { error } = await db
    .from("pmo_views")
    .delete()
    .eq("id", viewId)
    .eq("board_id", boardId)
    .eq("org_id", orgId);

  throwIfDbError(error, "deleteView");
}
