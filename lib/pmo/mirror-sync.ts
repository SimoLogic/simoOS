// ⚠️ LEER ARCHITECTURE.md §Llave #4 (Mirror Sync Protocol) antes de modificar
// mirror-sync.ts — Protocolo de sincronización inteligente Simo IS → PMO
//
// REGLA DE ORO #2:
//   SIMO IS es fuente de verdad para: title, description, dueDate, priority
//   EMPLEADO es dueño exclusivo de: subtasks[], comments[], attachments[], customFieldValues[]
//   NUNCA sobreescribir campos del empleado durante Mirror Sync
//   Conflicto en 'status': NO sobreescribir — registrar conflicto para resolución manual

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { TaskStatus, TaskPriority } from "@/types/pmo.types";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

/** Campos que Simo IS puede enviar en un update */
export interface SimoUpdatePayload {
  taskId?:               string;   // Por PMO task ID (si se tiene)
  sourcePlaybookTaskId?: string;   // Por Simo IS task ID (identificador alternativo)
  occurrenceIndex?:      number;   // Junto con sourcePlaybookTaskId para unicidad
  tenantId:                 string;

  // Campos actualizables por Simo IS (REGLA #2 — datos del Playbook)
  title?:       string;
  description?: string;
  dueDate?:     string;
  priority?:    TaskPriority;
  status?:      TaskStatus;   // Solo se aplica si no hay conflicto — se registra si hay
}

export interface MirrorSyncResult {
  success:         boolean;
  taskId?:         string;
  syncedFields:    string[];        // Campos efectivamente actualizados
  conflictsFound:  ConflictDetail[];
  skippedFields:   string[];        // Campos que Simo envió pero NO se tocaron (del empleado)
  error?:          string;
}

export interface ConflictDetail {
  field:           string;
  simoValue:       unknown;
  currentValue:    unknown;
  requiresResolve: boolean;
}

/** Campos de propiedad exclusiva del Empleado — NUNCA tocar en Mirror Sync */
const EMPLOYEE_OWNED_FIELDS = new Set([
  "subtasks", "comments", "attachments", "customFieldValues",
  "item_height", "collaborators",
]);

// ─── LÓGICA PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * mirrorSyncTask — Aplica actualizaciones de Simo IS respetando la propiedad del empleado.
 *
 * REGLA #2 aplicada:
 *   - Solo actualiza: title, description, dueDate, priority (campos Playbook)
 *   - 'status' = campo mixto: si el empleado lo cambió manualmente → conflicto
 *   - Campos del empleado (subtasks, comments…) → jamás tocados
 */
export async function mirrorSyncTask(
  update: SimoUpdatePayload,
  idempotencyKey: string
): Promise<MirrorSyncResult> {
  const { tenantId } = update;
  const syncedFields: string[]    = [];
  const conflictsFound: ConflictDetail[] = [];
  const skippedFields: string[]   = [];

  // ── Buscar la tarea en DB ────────────────────────────────────────────────
  const db = getPmoDB();
  let taskQuery = db.from("pmo_tasks").select("*").eq("tenant_id", tenantId);

  if (update.taskId) {
    taskQuery = taskQuery.eq("id", update.taskId);
  } else if (update.sourcePlaybookTaskId !== undefined) {
    taskQuery = taskQuery.eq("source_playbook_task_id", update.sourcePlaybookTaskId);
    if (update.occurrenceIndex !== undefined) {
      taskQuery = taskQuery.eq("occurrence_index", update.occurrenceIndex);
    }
  } else {
    return { success: false, syncedFields, conflictsFound, skippedFields, error: "Must provide taskId or sourcePlaybookTaskId" };
  }

  const { data: tasks, error: fetchError } = await taskQuery.limit(1);
  throwIfDbError(fetchError, "mirrorSync.fetchTask");

  const task = tasks?.[0];
  if (!task) {
    return { success: false, syncedFields, conflictsFound, skippedFields, error: "Task not found" };
  }

  // ── Construir patch respetando REGLA #2 ─────────────────────────────────
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // title — campo del Playbook → actualizar siempre
  if (update.title !== undefined && update.title !== task.title) {
    patch.title = update.title.trim();
    syncedFields.push("title");
  }

  // description — campo del Playbook → actualizar siempre
  if (update.description !== undefined && update.description !== task.description) {
    patch.description = update.description;
    syncedFields.push("description");
  }

  // dueDate — campo del Playbook → actualizar siempre
  if (update.dueDate !== undefined && update.dueDate !== task.due_date) {
    patch.due_date = update.dueDate;
    syncedFields.push("dueDate");
  }

  // priority — campo del Playbook → actualizar siempre
  if (update.priority !== undefined && update.priority !== task.priority) {
    patch.priority = update.priority;
    syncedFields.push("priority");
  }

  // status — CAMPO MIXTO: detectar conflicto
  if (update.status !== undefined) {
    const taskHasManualStatus  = task.status !== "not_started";
    const simoStatusDiffers    = update.status !== task.status;

    if (simoStatusDiffers && taskHasManualStatus) {
      // CONFLICTO: el empleado ya cambió el status manualmente
      conflictsFound.push({
        field:           "status",
        simoValue:       update.status,
        currentValue:    task.status,
        requiresResolve: true,
      });
      // NO actualizar — el empleado decide (Modal de resolución en Sprint 4)
    } else if (simoStatusDiffers) {
      // No hay conflicto (estaba en 'not_started') → actualizar
      patch.status = update.status;
      syncedFields.push("status");
    }
  }

  // ── Detectar si se enviaron campos del empleado (log + skip) ─────────────
  Array.from(EMPLOYEE_OWNED_FIELDS).forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(update, field)) {
      skippedFields.push(field);
    }
  });

  // ── Aplicar patch si hay cambios ──────────────────────────────────────────
  if (syncedFields.length > 0) {
    const { error: updateError } = await db
      .from("pmo_tasks")
      .update(patch)
      .eq("id", task.id)
      .eq("tenant_id", tenantId);

    throwIfDbError(updateError, "mirrorSync.updateTask");
  }

  // ── Registrar SyncEvent ───────────────────────────────────────────────────
  const { error: logError } = await db.from("pmo_sync_events").insert({
    tenant_id:           tenantId,
    idempotency_key:  idempotencyKey,
    event_type:       "mirror_sync",
    status:           conflictsFound.length > 0 ? "conflict_detected" : "completed",
    payload: {
      taskId:         task.id,
      syncedFields,
      conflictsFound,
      skippedFields,
      resolvedBy:     null,   // Sprint 4: llenado cuando empleado resuelve en modal
    },
  });

  if (logError) {
    console.error("[MirrorSync] Failed to log SyncEvent:", logError.message);
  }

  return {
    success:        true,
    taskId:         task.id,
    syncedFields,
    conflictsFound,
    skippedFields,
  };
}
