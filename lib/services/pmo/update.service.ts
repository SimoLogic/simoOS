// ⚠️ LEER ARCHITECTURE.md antes de modificar
// update.service.ts — CRUD para pmo_item_updates (Side Peek comments/updates)

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PmoItemUpdate {
  id:        string;
  tenantId:     string;
  taskId:    string;
  userId:    string;
  body:      string;
  mentions:  string[];
  reactions: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUpdateInput {
  tenantId:    string;
  taskId:   string;
  userId:   string;
  body:     string;
  mentions?: string[];
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function mapUpdateFromDb(row: Record<string, unknown>): PmoItemUpdate {
  return {
    id:        String(row.id),
    tenantId:     String(row.tenant_id),
    taskId:    String(row.task_id),
    userId:    String(row.user_id),
    body:      String(row.body),
    mentions:  (row.mentions as string[]) ?? [],
    reactions: (row.reactions as Record<string, string[]>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getUpdatesService(taskId: string, tenantId: string): Promise<PmoItemUpdate[]> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_item_updates")
    .select("*")
    .eq("task_id", taskId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  throwIfDbError(error, "getUpdates");
  return (data ?? []).map(mapUpdateFromDb);
}

export async function createUpdateService(input: CreateUpdateInput): Promise<PmoItemUpdate> {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_item_updates")
    .insert({
      tenant_id:   input.tenantId,
      task_id:  input.taskId,
      user_id:  input.userId,
      body:     input.body.trim(),
      mentions: input.mentions ?? [],
    })
    .select()
    .single();

  throwIfDbError(error, "createUpdate");
  return mapUpdateFromDb(data);
}

export async function deleteUpdateService(
  updateId: string,
  tenantId:    string,
  userId:   string
): Promise<void> {
  const db = getPmoDB();
  // Only the author can delete their own update
  const { error } = await db
    .from("pmo_item_updates")
    .delete()
    .eq("id", updateId)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  throwIfDbError(error, "deleteUpdate");
}

export async function addReactionService(
  updateId: string,
  tenantId:    string,
  emoji:    string,
  userId:   string
): Promise<PmoItemUpdate> {
  const db = getPmoDB();

  // Read existing reactions
  const { data: existing } = await db
    .from("pmo_item_updates")
    .select("reactions")
    .eq("id", updateId)
    .eq("tenant_id", tenantId)
    .single();

  const reactions = (existing as { reactions?: Record<string, string[]> } | null)
    ?.reactions ?? {};

  // Toggle: add if not present, remove if present
  const users = reactions[emoji] ?? [];
  if (users.includes(userId)) {
    reactions[emoji] = users.filter(u => u !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, userId];
  }

  const { data, error } = await db
    .from("pmo_item_updates")
    .update({ reactions })
    .eq("id", updateId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  throwIfDbError(error, "addReaction");
  return mapUpdateFromDb(data);
}
