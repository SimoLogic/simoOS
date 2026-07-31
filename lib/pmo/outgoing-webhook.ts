// ⚠️ LEER ARCHITECTURE.md §9 (SIMO IS) antes de modificar
// outgoing-webhook.ts — Envía reportes firmados a Simo IS al completar tareas
//
// Activación: cuando una tarea protegida cambia status → 'done'
// Pattern: fire-and-forget (no bloquea la respuesta al usuario)
// Logging: resultado guardado en pmo_sync_events.webhook_status

import { signOutgoingPayload } from "@/lib/pmo/hmac";
import { getPmoDB } from "@/lib/pmo/pmo-db";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface CompletedTaskPayload {
  taskId:               string;
  tenantId:                string;
  sourcePlaybookId:     string;
  sourcePlaybookTaskId: string;
  occurrenceIndex:      number | null;
  completedAt:          string;          // ISO 8601
  completedBy:          string;          // userId
  title:                string;
}

export interface WebhookResult {
  sent:       boolean;
  statusCode?: number;
  error?:     string;
}

// ─── ENVÍO SEGURO ─────────────────────────────────────────────────────────────

/**
 * sendTaskCompletedWebhook — Notifica a Simo IS que una tarea protegida se completó.
 *
 * Firmado con HMAC-SHA256 en header X-Simo-Signature.
 * Fire-and-forget: si falla, no interrumpe la UX del usuario.
 * El status se registra en pmo_sync_events para reintento manual.
 */
export async function sendTaskCompletedWebhook(
  task: CompletedTaskPayload
): Promise<WebhookResult> {
  const secret      = process.env.SIMO_IS_HMAC_SECRET;
  const endpoint    = process.env.SIMO_IS_WEBHOOK_ENDPOINT;

  if (!secret || !endpoint) {
    console.warn("[Webhook] SIMO_IS_HMAC_SECRET or SIMO_IS_WEBHOOK_ENDPOINT not configured — skip");
    return { sent: false, error: "Integration not configured" };
  }

  const idempotencyKey = `task-complete-${task.taskId}-${task.completedAt}`;

  const event = {
    event:                "task.completed",
    taskId:               task.taskId,
    tenantId:                task.tenantId,
    sourcePlaybookId:     task.sourcePlaybookId,
    sourcePlaybookTaskId: task.sourcePlaybookTaskId,
    occurrenceIndex:      task.occurrenceIndex,
    completedAt:          task.completedAt,
    completedBy:          task.completedBy,
    title:                task.title,
    sentAt:               new Date().toISOString(),
  };

  const { body, signature } = signOutgoingPayload(event, secret);

  let result: WebhookResult = { sent: false };

  try {
    const response = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "X-Simo-Signature":  signature,
        "Idempotency-Key":   idempotencyKey,
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    result = {
      sent:       response.ok,
      statusCode: response.status,
      error:      response.ok ? undefined : `HTTP ${response.status}`,
    };

    if (!response.ok) {
      console.error("[Webhook] Simo IS responded with error:", response.status);
    }
  } catch (err) {
    const msg = (err as Error).message;
    result = { sent: false, error: msg };
    console.error("[Webhook] Failed to send to Simo IS:", msg);
  }

  // ── Registrar resultado en pmo_sync_events ──────────────────────────────
  try {
    const db = getPmoDB();
    await db.from("pmo_sync_events").insert({
      tenant_id:           task.tenantId,
      idempotency_key:  idempotencyKey,
      event_type:       "webhook_outgoing",
      status:           result.sent ? "completed" : "failed",
      payload: {
        taskId:       task.taskId,
        event:        "task.completed",
        statusCode:   result.statusCode,
        error:        result.error,
        webhookSentAt: result.sent ? new Date().toISOString() : null,
      },
    });
  } catch (logErr) {
    console.error("[Webhook] Failed to log webhook result:", (logErr as Error).message);
  }

  return result;
}

/**
 * triggerOutgoingWebhook — Fire-and-forget wrapper.
 * Llamar desde updateTaskService cuando status === 'done' y is_protected === true.
 * NO usar await — no bloquear la respuesta al usuario.
 *
 * @example
 * // En updateTaskService, después de hacer el UPDATE en DB:
 * if (input.status === 'done' && currentTask.isProtected) {
 *   triggerOutgoingWebhook(currentTask); // fire-and-forget
 * }
 */
export function triggerOutgoingWebhook(task: CompletedTaskPayload): void {
  // Ejecutar en background — errores capturados internamente
  sendTaskCompletedWebhook(task).catch((err) => {
    console.error("[Webhook] Unexpected error in fire-and-forget:", err);
  });
}
