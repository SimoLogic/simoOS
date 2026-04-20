"use server";
/**
 * panel-actions.ts - S-15 Dashboard Panels CRUD
 * Manages cross-board dashboard panels stored in pmo_panels.
 */

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { revalidatePath } from "next/cache";

export interface PmoPanel {
  id: string;
  orgId: string;
  ownerId: string;
  name: string;
  icon: string;
  config: { widgets: PanelWidget[] };
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface PanelWidget {
  id: string;
  type: "battery" | "workload" | "activity" | "task_type_breakdown" | "sla_heatmap";
  sourceBoardIds: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

function mapPanel(row: Record<string, unknown>): PmoPanel {
  const config = (row.config as { widgets?: PanelWidget[] }) ?? { widgets: [] };
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    ownerId: String(row.owner_id),
    name: String(row.name ?? "Untitled"),
    icon: String(row.icon ?? "📊"),
    config: { widgets: config.widgets ?? [] },
    position: Number(row.position ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ─── GET ALL PANELS ───────────────────────────────────────────────────────────
export async function getPanelsAction(orgId: string, ownerId: string) {
  try {
    const db = getPmoDB();
    const { data, error } = await db
      .from("pmo_panels")
      .select("*")
      .eq("org_id", orgId)
      .eq("owner_id", ownerId)
      .order("position");
    throwIfDbError(error, "getPanels");
    return { success: true as const, data: (data ?? []).map(mapPanel) };
  } catch (e) {
    return { success: false as const, error: (e as Error).message };
  }
}

// ─── CREATE PANEL ─────────────────────────────────────────────────────────────
export async function createPanelAction(input: {
  orgId: string;
  ownerId: string;
  name: string;
  icon?: string;
}) {
  try {
    const db = getPmoDB();
    const { data, error } = await db
      .from("pmo_panels")
      .insert({
        org_id: input.orgId,
        owner_id: input.ownerId,
        name: input.name.trim(),
        icon: input.icon ?? "📊",
        config: { widgets: [] },
        position: 0,
      })
      .select()
      .single();
    throwIfDbError(error, "createPanel");
    revalidatePath("/pmo");
    return { success: true as const, data: mapPanel(data) };
  } catch (e) {
    return { success: false as const, error: (e as Error).message };
  }
}

// ─── UPDATE PANEL ─────────────────────────────────────────────────────────────
export async function updatePanelAction(
  panelId: string,
  orgId: string,
  patch: { name?: string; icon?: string; config?: { widgets: PanelWidget[] } }
) {
  try {
    const db = getPmoDB();
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) dbPatch.name = patch.name.trim();
    if (patch.icon !== undefined) dbPatch.icon = patch.icon;
    if (patch.config !== undefined) dbPatch.config = patch.config;

    const { data, error } = await db
      .from("pmo_panels")
      .update(dbPatch)
      .eq("id", panelId)
      .eq("org_id", orgId)
      .select()
      .single();
    throwIfDbError(error, "updatePanel");
    revalidatePath("/pmo");
    return { success: true as const, data: mapPanel(data) };
  } catch (e) {
    return { success: false as const, error: (e as Error).message };
  }
}

// ─── DELETE PANEL ─────────────────────────────────────────────────────────────
export async function deletePanelAction(panelId: string, orgId: string) {
  try {
    const db = getPmoDB();
    const { error } = await db
      .from("pmo_panels")
      .delete()
      .eq("id", panelId)
      .eq("org_id", orgId);
    throwIfDbError(error, "deletePanel");
    revalidatePath("/pmo");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: (e as Error).message };
  }
}
