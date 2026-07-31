"use server";

import { z } from "zod";
import { getPmoDB } from "@/lib/pmo/pmo-db";
import { revalidatePath } from "next/cache";

const ResolveConflictSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string(),
  resolutionMode: z.enum(["keep_employee", "apply_simo"]),
});

export async function getPendingConflictsAction(tenantId: string, limit = 50) {
  const db = getPmoDB();
  const { data, error } = await db
    .from("pmo_sync_events")
    .select(`
      id, tenant_id, task_id, event_type, status,
      synced_fields, conflicts_found, timestamp_at, payload,
      pmo_tasks(title, group_id, board_id)
    `)
    .eq("tenant_id", tenantId)
    .eq("status", "conflict_detected")
    .order("timestamp_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function resolveConflictAction(payload: z.infer<typeof ResolveConflictSchema>, userId: string) {
  const result = ResolveConflictSchema.safeParse(payload);
  if (!result.success) return { success: false, error: "Invalid payload" };

  const { eventId, tenantId, resolutionMode } = result.data;
  const db = getPmoDB();

  // 1. Obtener el evento
  const { data: event, error: fetchErr } = await db
    .from("pmo_sync_events")
    .select("task_id, conflicts_found")
    .eq("id", eventId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchErr || !event) {
    return { success: false, error: "Sync event not found" };
  }

  // 2. Aplicar resolución si se eligió "apply_simo"
  if (resolutionMode === "apply_simo") {
    // Tomar el valor de simoValue de 'status' (el único conflicto modelado ahora)
    const conflicts = event.conflicts_found as any[];
    const statusConflict = conflicts?.find(c => c.field === "status");
    
    if (statusConflict?.simoValue) {
      const { error: updateErr } = await db
        .from("pmo_tasks")
        .update({ status: statusConflict.simoValue, updated_at: new Date().toISOString() })
        .eq("id", event.task_id)
        .eq("tenant_id", tenantId);
        
      if (updateErr) return { success: false, error: "Failed to apply Simo value to task" };
    }
  }

  // 3. Marcar evento como resuelto
  const { error: resolveErr } = await db
    .from("pmo_sync_events")
    .update({
      status: "completed",
      resolved_by: userId,
      resolved_at: new Date().toISOString()
    })
    .eq("id", eventId)
    .eq("tenant_id", tenantId);

  if (resolveErr) return { success: false, error: resolveErr.message };

  revalidatePath("/pmo/my-plan");
  return { success: true };
}
