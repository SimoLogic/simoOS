// ⚠️ LEER ARCHITECTURE.md antes de modificar
// column.service.ts — CRUD para pmo_columns + reordenamiento

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { PmoColumn, PmoFieldType } from "@/types/pmo.types";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface CreateColumnInput {
  tenantId:    string;
  boardId:  string;
  title:    string;
  type:     PmoFieldType;
  widthPx?: number;
  settings?: Record<string, unknown>;
}

export interface UpdateColumnInput {
  title?:    string;
  widthPx?:  number;
  settings?: Record<string, unknown>;
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapColumnFromDb(row: Record<string, unknown>): PmoColumn {
  return {
    id:       String(row.id),
    boardId:  String(row.board_id),
    title:    String(row.title),
    type:     (row.type as PmoFieldType) ?? "text",
    position: Number(row.position ?? 0),
    width:    Number(row.width_px ?? 200),
    settings: (row.settings as Record<string, unknown>) ?? {},
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getColumnsService(boardId: string, tenantId: string): Promise<PmoColumn[]> {
  if (!boardId?.trim()) return [];
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_columns")
    .select("*")
    .eq("board_id", boardId)
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true });

  throwIfDbError(error, "getColumns");
  return (data ?? []).map(mapColumnFromDb);
}

export async function createColumnService(input: CreateColumnInput): Promise<PmoColumn> {
  const db = getPmoDB();

  const { data: existing } = await db
    .from("pmo_columns")
    .select("position")
    .eq("board_id", input.boardId)
    .eq("tenant_id", input.tenantId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await db
    .from("pmo_columns")
    .insert({
      tenant_id:   input.tenantId,
      board_id: input.boardId,
      title:    input.title.trim(),
      type:     input.type,
      position: nextPosition,
      width_px: input.widthPx ?? 200,
      settings: input.settings ?? {},
    })
    .select()
    .single();

  throwIfDbError(error, "createColumn");
  return mapColumnFromDb(data);
}

export async function updateColumnService(
  columnId: string,
  boardId:  string,
  tenantId:    string,
  input:    UpdateColumnInput
): Promise<PmoColumn> {
  const db = getPmoDB();
  const patch: Record<string, unknown> = {};

  if (input.title    !== undefined) patch.title    = input.title.trim();
  if (input.widthPx  !== undefined) patch.width_px = input.widthPx;
  if (input.settings !== undefined) patch.settings = input.settings;

  const { data, error } = await db
    .from("pmo_columns")
    .update(patch)
    .eq("id", columnId)
    .eq("board_id", boardId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  throwIfDbError(error, "updateColumn");
  return mapColumnFromDb(data);
}

export async function deleteColumnService(
  columnId: string,
  boardId:  string,
  tenantId:    string
): Promise<void> {
  const db = getPmoDB();

  const { error } = await db
    .from("pmo_columns")
    .delete()
    .eq("id", columnId)
    .eq("board_id", boardId)
    .eq("tenant_id", tenantId);

  throwIfDbError(error, "deleteColumn");
}

export async function reorderColumnsService(
  boardId: string,
  tenantId:   string,
  orderedIds: string[]
): Promise<void> {
  const db = getPmoDB();

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .from("pmo_columns")
        .update({ position: index })
        .eq("id", id)
        .eq("board_id", boardId)
        .eq("tenant_id", tenantId)
    )
  );
}

/**
 * seedDefaultColumnsService — Crea las columnas predeterminadas al crear un nuevo board.
 * Columns: Task Name (text), Status (status), Assignee (person), Due Date (date), Priority (dropdown)
 */
export async function seedDefaultColumnsService(
  boardId: string,
  tenantId:   string
): Promise<PmoColumn[]> {
  const defaults: Omit<CreateColumnInput, "tenantId" | "boardId">[] = [
    { title: "Task",      type: "text",     widthPx: 280 },
    { title: "Status",    type: "status",   widthPx: 140 },
    { title: "Assignee",  type: "person",   widthPx: 160 },
    { title: "Due Date",  type: "date",     widthPx: 130 },
    { title: "Priority",  type: "dropdown", widthPx: 120 },
  ];

  const created: PmoColumn[] = [];
  for (let i = 0; i < defaults.length; i++) {
    const col = await createColumnService({ ...defaults[i], tenantId, boardId });
    created.push(col);
  }
  return created;
}
