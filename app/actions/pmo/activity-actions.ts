"use server";

// activity-actions.ts — Server Actions para pmo_item_activity (Auditoría transaccional)
// Registra cada mutación de campo: quién cambió qué, de qué a qué, cuándo.
// Tabla: pmo_item_activity

import { z } from "zod";
import {
  getActivityService,
  logActivityService,
  logFieldChangeService,
  type PmoActivityEntry,
} from "@/lib/services/pmo/activity.service";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const LogActivitySchema = z.object({
  taskId:    z.string().min(1),
  orgId:     z.string().min(1),
  userId:    z.string().min(1),
  action:    z.string().min(1).max(100),
  fieldName: z.string().max(100).optional(),
  oldValue:  z.string().max(5000).nullable().optional(),
  newValue:  z.string().max(5000).nullable().optional(),
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getTaskActivityAction(
  taskId: string,
  orgId:  string,
  limit?: number
): Promise<PmoActivityEntry[]> {
  if (!taskId?.trim() || !orgId?.trim()) return [];
  try {
    return await getActivityService(taskId, orgId, limit);
  } catch (err: unknown) {
    console.error("[PMO] getActivity:", err);
    return [];
  }
}

/**
 * logActivityAction — Registra un evento de auditoría en pmo_item_activity.
 * Llamado por UI triggers o internamente por otras Server Actions.
 */
export async function logActivityAction(
  input: z.infer<typeof LogActivitySchema>
): Promise<ActionResult<PmoActivityEntry>> {
  try {
    const v = LogActivitySchema.parse(input);
    const entry = await logActivityService({
      orgId:     v.orgId,
      taskId:    v.taskId,
      userId:    v.userId,
      action:    v.action,
      fieldName: v.fieldName,
      oldValue:  v.oldValue,
      newValue:  v.newValue,
    });
    return { success: true, data: entry };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

/**
 * logFieldChangeAction — Convenience action for field change auditing.
 * UI components call this when a user modifies a cell value.
 * E.g.: Person changed from "null" to "UsuarioX".
 */
export async function logFieldChangeAction(
  orgId:     string,
  taskId:    string,
  userId:    string,
  fieldName: string,
  oldValue:  unknown,
  newValue:  unknown
): Promise<ActionResult<PmoActivityEntry>> {
  if (!orgId || !taskId || !userId || !fieldName) {
    return { success: false, error: "orgId, taskId, userId, and fieldName are required" };
  }
  try {
    const entry = await logFieldChangeService(
      orgId, taskId, userId, fieldName, oldValue, newValue
    );
    return { success: true, data: entry };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── RE-EXPORT legacy format for backward compatibility ───────────────────────

export interface ActivityLog {
  id:         string;
  actionType: string;
  oldValue:   string | null;
  newValue:   string | null;
  createdAt:  string;
  userEmail:  string;
  userId:     string;
}

/**
 * getTaskActivityLogsAction — Legacy compat wrapper.
 * Backward compatible with existing ActivityLogPanel.
 */
export async function getTaskActivityLogsAction(
  orgId:  string,
  taskId: string
): Promise<{ success: boolean; data?: ActivityLog[]; error?: string }> {
  try {
    const entries = await getActivityService(taskId, orgId, 50);
    const formatted: ActivityLog[] = entries.map(e => ({
      id:         e.id,
      actionType: e.action,
      oldValue:   e.oldValue,
      newValue:   e.newValue,
      createdAt:  e.createdAt,
      userId:     e.userId,
      userEmail:  "User", // Resolved via user dictionary in UI layer
    }));
    return { success: true, data: formatted };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
