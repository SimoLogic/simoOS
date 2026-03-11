// ⚠️ LEER ARCHITECTURE.md antes de modificar
// group.service.ts — CRUD para pmo_groups + reordenamiento
// Patrón: todas las queries filtran por org_id (multi-tenant)

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { PmoGroup } from "@/types/pmo.types";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface CreateGroupInput {
  orgId:   string;
  boardId: string;
  title:   string;
  color?:  string;      // Vibe hex, default #6161FF (vibe-purple)
}

export interface UpdateGroupInput {
  title?:       string;
  color?:       string;
  isCollapsed?: boolean;
}

export interface ReorderGroupsInput {
  orgId:   string;
  boardId: string;
  /** Array de IDs en el orden deseado */
  orderedIds: string[];
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapGroupFromDb(row: Record<string, unknown>): PmoGroup {
  return {
    id:          String(row.id),
    boardId:     String(row.board_id),
    title:       String(row.title),
    color:       String(row.color ?? "#6161FF"),
    position:    Number(row.position ?? 0),
    isCollapsed: Boolean(row.is_collapsed),
    tasks:       [],   // Cargado por task.service.ts
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getGroupsService(boardId: string, orgId: string): Promise<PmoGroup[]> {
  if (!boardId?.trim() || !orgId?.trim()) return [];
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_groups")
    .select("*")
    .eq("board_id", boardId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });

  throwIfDbError(error, "getGroups");
  return (data ?? []).map(mapGroupFromDb);
}

export async function createGroupService(input: CreateGroupInput): Promise<PmoGroup> {
  const db = getPmoDB();

  // Calcular posición: máximo actual + 1
  const { data: existing } = await db
    .from("pmo_groups")
    .select("position")
    .eq("board_id", input.boardId)
    .eq("org_id", input.orgId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await db
    .from("pmo_groups")
    .insert({
      org_id:   input.orgId,
      board_id: input.boardId,
      title:    input.title.trim(),
      color:    input.color ?? "#6161FF",
      position: nextPosition,
    })
    .select()
    .single();

  throwIfDbError(error, "createGroup");
  return mapGroupFromDb(data);
}

export async function updateGroupService(
  groupId: string,
  boardId: string,
  orgId:   string,
  input:   UpdateGroupInput
): Promise<PmoGroup> {
  const db = getPmoDB();

  const patch: Record<string, unknown> = {};
  if (input.title       !== undefined) patch.title        = input.title.trim();
  if (input.color       !== undefined) patch.color        = input.color;
  if (input.isCollapsed !== undefined) patch.is_collapsed = input.isCollapsed;

  const { data, error } = await db
    .from("pmo_groups")
    .update(patch)
    .eq("id", groupId)
    .eq("board_id", boardId)
    .eq("org_id", orgId)
    .select()
    .single();

  throwIfDbError(error, "updateGroup");
  return mapGroupFromDb(data);
}

export async function deleteGroupService(
  groupId: string,
  boardId: string,
  orgId:   string
): Promise<void> {
  const db = getPmoDB();

  // Verificar que todas las tareas del grupo son eliminables antes de borrar el grupo
  // Nota: La cascada de DB borrará las tareas; el trigger de protección las bloqueará si IsProtected
  const { data: protectedTasks } = await db
    .from("pmo_tasks")
    .select("id, title")
    .eq("group_id", groupId)
    .eq("org_id", orgId)
    .eq("is_protected", true)
    .limit(1);

  if (protectedTasks && protectedTasks.length > 0) {
    throw new Error(
      `Group contains Simo IS protected tasks. Move or complete protected tasks before deleting the group.`
    );
  }

  const { error } = await db
    .from("pmo_groups")
    .delete()
    .eq("id", groupId)
    .eq("board_id", boardId)
    .eq("org_id", orgId);

  throwIfDbError(error, "deleteGroup");
}

/**
 * reorderGroupsService — Actualiza la posición de grupos en lote.
 * Usa upsert por posición para garantizar consistencia.
 */
export async function reorderGroupsService(input: ReorderGroupsInput): Promise<void> {
  const db = getPmoDB();

  const updates = input.orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  // Actualizar posiciones en paralelo (no upsert porque queremos preservar otros campos)
  await Promise.all(
    updates.map(({ id, position }) =>
      db
        .from("pmo_groups")
        .update({ position })
        .eq("id", id)
        .eq("board_id", input.boardId)
        .eq("org_id", input.orgId)
    )
  );
}
