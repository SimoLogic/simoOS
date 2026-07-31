// ⚠️ LEER ARCHITECTURE.md §REGLA DE ORO #1 ANTES DE MODIFICAR
// task-guard.ts — Capa de protección Triple Shield para pmo_tasks
//
// REGLA DE ORO #1: task.sourcePlaybookId !== null → isProtected = true
//   → NUNCA DELETE, NUNCA UI de borrado
//   → Registrar SecurityEvent en CADA intento bloqueado
//
// Este archivo implementa el "Shield 1 (Service Layer)" del Triple Shield:
//   Shield 1 → ESTE ARCHIVO (intercepta antes del DB call)
//   Shield 2 → CHECK constraint en DB (Sprint 1 migration)
//   Shield 3 → DB Trigger BEFORE DELETE (Sprint 2 migration)

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type DeleteVector = "http_api" | "ui" | "sql_direct" | "server_action";

export interface GuardContext {
  taskId:  string;
  tenantId:   string;
  userId:  string;
  vector:  DeleteVector;
  ipAddress?: string;
}

export interface GuardResult {
  allowed:  boolean;
  blocked?: {
    code:    403;
    error:   "TASK_PLAYBOOK_PROTECTED";
    message: string;
    taskId:  string;
  };
}

// ─── CONSULTA DE PROTECCIÓN ───────────────────────────────────────────────────

/**
 * checkTaskProtection — Consulta is_protected de una tarea directamente en DB.
 * 
 * Usa la DB como fuente de verdad (no confiar en el estado del cliente).
 * Filtra por tenantId para garantizar aislamiento multi-tenant.
 */
async function checkTaskProtection(
  taskId: string,
  tenantId: string
): Promise<{ isProtected: boolean; title: string } | null> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_tasks")
    .select("id, is_protected, title, source_playbook_id")
    .eq("id", taskId)
    .eq("tenant_id", tenantId)   // ← SIEMPRE filtrar por tenant_id (multi-tenant)
    .single();

  if (error) {
    // Si código 406 = no hay filas → tarea no existe en este org (correctamente devuelve null)
    if ((error as { code?: string }).code === "PGRST116") return null;
    throwIfDbError(error, `checkTaskProtection(taskId=${taskId})`);
  }

  if (!data) return null;

  return {
    isProtected: data.is_protected === true || data.source_playbook_id != null,
    title: data.title,
  };
}

// ─── REGISTRO DE SECURITY EVENT ───────────────────────────────────────────────

/**
 * logSecurityEvent — Registra en pmo_security_events cada intento de borrado bloqueado.
 * 
 * REGLA: NUNCA omitir este log. Todo intento de borrar una tarea protegida queda auditado.
 */
async function logSecurityEvent(
  ctx: GuardContext,
  details?: Record<string, unknown>
): Promise<void> {
  const db = getPmoDB();

  const { error } = await db.from("pmo_security_events").insert({
    tenant_id:       ctx.tenantId,
    user_id:      ctx.userId,
    task_id:      ctx.taskId,
    attempted_at: new Date().toISOString(),
    ip_address:   ctx.ipAddress ?? "unknown",
    vector:       ctx.vector,
    details:      details ?? null,
  });

  if (error) {
    // Log pero no lanzar — el error de auditoría no debe ocultar el 403 principal
    console.error("[TaskGuard] Failed to write SecurityEvent:", error.message);
  }
}

// ─── GUARD PRINCIPAL ──────────────────────────────────────────────────────────

/**
 * guardDelete — Shield 1 del Triple Shield de protección de tareas.
 * 
 * Llamar OBLIGATORIAMENTE antes de cualquier DELETE en pmo_tasks.
 * 
 * @returns GuardResult con allowed=true si la tarea puede borrarse.
 * @returns GuardResult con allowed=false + código 403 si está protegida.
 * 
 * Uso:
 * ```ts
 * const guard = await guardDelete({ taskId, tenantId, userId, vector: "server_action" });
 * if (!guard.allowed) {
 *   return { success: false, ...guard.blocked };
 * }
 * // Solo aquí: ejecutar el DELETE
 * ```
 */
export async function guardDelete(ctx: GuardContext): Promise<GuardResult> {
  const task = await checkTaskProtection(ctx.taskId, ctx.tenantId);

  // Tarea no encontrada en este org → OK (no hay nada que borrar, no es violación)
  if (!task) {
    return { allowed: true };
  }

  // ✅ Tarea no protegida → permitir borrado
  if (!task.isProtected) {
    return { allowed: true };
  }

  // 🔒 TAREA PROTEGIDA → bloquear y auditar
  await logSecurityEvent(ctx, {
    taskTitle: task.title,
    reason: "Task linked to Simo IS Playbook — deletion blocked by TaskGuard",
  });

  return {
    allowed: false,
    blocked: {
      code:    403,
      error:   "TASK_PLAYBOOK_PROTECTED",
      message: `Task "${task.title}" is protected by a Simo IS Playbook and cannot be deleted.`,
      taskId:  ctx.taskId,
    },
  };
}

/**
 * guardBatchDelete — Versión batch del guardDelete para operaciones masivas.
 * 
 * Filtra la lista: retorna solo los IDs que SÍ pueden borrarse.
 * Registra un SecurityEvent por cada tarea bloqueada.
 */
export async function guardBatchDelete(
  taskIds: string[],
  tenantId: string,
  userId: string,
  vector: DeleteVector
): Promise<{ deletableIds: string[]; blockedIds: string[] }> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_tasks")
    .select("id, is_protected, title, source_playbook_id")
    .in("id", taskIds)
    .eq("tenant_id", tenantId);

  throwIfDbError(error, "guardBatchDelete");

  const deletableIds: string[] = [];
  const blockedIds:   string[] = [];
  const logPromises:  Promise<void>[] = [];

  for (const task of data ?? []) {
    const isProtected = task.is_protected === true || task.source_playbook_id != null;
    if (isProtected) {
      blockedIds.push(task.id);
      logPromises.push(
        logSecurityEvent({ taskId: task.id, tenantId, userId, vector }, {
          taskTitle: task.title,
          reason: "Batch delete blocked — Simo IS Playbook task",
        })
      );
    } else {
      deletableIds.push(task.id);
    }
  }

  await Promise.all(logPromises);

  return { deletableIds, blockedIds };
}
