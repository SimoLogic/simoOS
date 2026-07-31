// ⚠️ LEER ARCHITECTURE.md §9 (SIMO IS) y §Llave #2 (WorkdayHelper) antes de modificar
// playbook-processor.ts — Motor que expande Playbooks en pmo_tasks
//
// REGLA DE ORO #1: SIEMPRE isProtected=true + sourcePlaybookId en cada tarea generada
// REGLA CALENDARIO (Llave #2): SIEMPRE usar expandFrequency() para calcular fechas
//
// Flujo:
//   1. Recibir PlaybookAssignment (del endpoint HMAC)
//   2. Iterar taskTemplates[]
//   3. expandFrequency() → fechas hábiles reales
//   4. Idempotencia: skip si tarea ya existe (mismo sourcePlaybookTaskId + occurrenceIndex)
//   5. createTaskService() para cada ocurrencia nueva
//   6. Registrar SyncEvent con resultado

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { createTaskService } from "@/lib/services/pmo/task.service";
import { createGroupService } from "@/lib/services/pmo/group.service";
import {
  expandFrequency,
  type FrequencyConfig,
  type FrequencyType,
  type WorkdayOrgConfig,
} from "@/lib/workday-helper";
import { z } from "zod";

// ─── SCHEMA DEL PAYLOAD ENTRANTE (Zod — Shield 2) ────────────────────────────

const TaskTemplateSchema = z.object({
  sourcePlaybookTaskId: z.string().min(1),
  title:                z.string().min(1).max(255),
  description:          z.string().max(50000).optional(),
  priority:             z.enum(["low","medium","high","critical"]).optional(),
  /** Frecuencia: "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ONCE" */
  frequencyType:        z.enum(["DAILY","WEEKLY","BIWEEKLY","MONTHLY","ONCE"]),
  /** Número de ocurrencias (ignorado para ONCE) */
  occurrences:          z.number().int().min(1).max(365).default(1),
  /** Días hábiles después del startDate para posicionar la 1a ocurrencia */
  offsetWorkdays:       z.number().int().min(0).default(0),
  /** Asignado automáticamente al empleado de la asignación */
  assigneeOverride:     z.string().optional(),
});

export const PlaybookAssignmentSchema = z.object({
  /** ID único del Playbook en Simo IS */
  playbookId:     z.string().min(1),
  /** ID único de esta asignación — clave de idempotencia */
  assignmentId:   z.string().min(1),
  tenantId:          z.string().min(1),
  boardId:        z.string().min(1),
  /** ID del empleado que recibe el Playbook */
  employeeId:     z.string().min(1),
  /** Fecha de inicio (ISO 8601) */
  startDate:      z.string().min(10),
  /** Configuración de calendario del org */
  tenantCountry:  z.string().default("US"),
  userCountry:    z.string().default("CO"),
  timezone:       z.string().default("America/Bogota"),
  /** Grupo destino — si no existe se crea uno nuevo */
  targetGroupId:  z.string().optional(),
  /** Nombre del grupo a crear si targetGroupId no existe */
  groupTitle:     z.string().default("Simo IS Playbook"),
  /** Tareas del Playbook a generar */
  taskTemplates:  z.array(TaskTemplateSchema).min(1).max(500),
});

export type PlaybookAssignment = z.infer<typeof PlaybookAssignmentSchema>;

// ─── TIPOS DE RESULTADO ───────────────────────────────────────────────────────

export interface ProcessResult {
  success:       boolean;
  playbookId:    string;
  assignmentId:  string;
  tasksCreated:  number;
  tasksSkipped:  number;
  groupId:       string;
  errors:        string[];
}

// ─── IDEMPOTENCIA ─────────────────────────────────────────────────────────────

/**
 * Verifica si una tarea ya fue creada por este Playbook + occurrenceIndex.
 * Garantiza que reenvíos de Simo IS no dupliquen tareas.
 */
async function taskAlreadyExists(
  tenantId:                string,
  boardId:              string,
  sourcePlaybookTaskId: string,
  occurrenceIndex:      number
): Promise<boolean> {
  const db = getPmoDB();
  const { data } = await db
    .from("pmo_tasks")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("board_id", boardId)
    .eq("source_playbook_task_id", sourcePlaybookTaskId)
    .eq("occurrence_index", occurrenceIndex)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ─── REGISTRO DE SYNC EVENT ───────────────────────────────────────────────────

async function logSyncEvent(
  tenantId:        string,
  assignmentId: string,
  status:       "queued" | "processing" | "completed" | "failed",
  details:      Record<string, unknown>
): Promise<void> {
  const db = getPmoDB();
  const { error } = await db.from("pmo_sync_events").upsert(
    {
      tenant_id:           tenantId,
      idempotency_key:  assignmentId,
      event_type:       "playbook_assignment",
      status,
      payload:          details,
    },
    { onConflict: "idempotency_key" }
  );
  if (error) {
    console.error("[PlaybookProcessor] logSyncEvent error:", error.message);
  }
}

// ─── MOTOR PRINCIPAL ──────────────────────────────────────────────────────────

/**
 * processPlaybookAssignment — Expande un Playbook Assignment en pmo_tasks.
 *
 * REGLAS CRÍTICAS:
 * - Cada tarea se crea con isProtected=true (REGLA DE ORO #1)
 * - Fechas calculadas siempre con expandFrequency() (LLAVE #2)
 * - Idempotente: tareas existentes se omiten, no se duplican
 */
export async function processPlaybookAssignment(
  assignment: PlaybookAssignment
): Promise<ProcessResult> {
  const {
    playbookId, assignmentId, tenantId, boardId,
    employeeId, startDate, tenantCountry, userCountry, timezone,
    taskTemplates, targetGroupId, groupTitle,
  } = assignment;

  const orgConfig: WorkdayOrgConfig = { tenantCountry, userCountry, timezone };
  const errors: string[] = [];
  let tasksCreated = 0;
  let tasksSkipped = 0;

  await logSyncEvent(tenantId, assignmentId, "processing", { playbookId, taskCount: taskTemplates.length });

  // ── Resolver o crear grupoo destino ────────────────────────────────────────
  let groupId = targetGroupId ?? "";
  if (!groupId) {
    try {
      const group = await createGroupService({
        tenantId,
        boardId,
        title: groupTitle,
        color: "#6161FF", // vibe-purple — identifica grupos de Playbook
      });
      groupId = group.id;
    } catch (err) {
      const msg = `Failed to create group: ${(err as Error).message}`;
      errors.push(msg);
      await logSyncEvent(tenantId, assignmentId, "failed", { error: msg });
      return { success: false, playbookId, assignmentId, tasksCreated: 0, tasksSkipped: 0, groupId: "", errors };
    }
  }

  // ── Procesar cada taskTemplate ─────────────────────────────────────────────
  for (const template of taskTemplates) {
    try {
      const freqConfig: FrequencyConfig = {
        type:        template.frequencyType as FrequencyType,
        occurrences: template.occurrences,
      };

      // Calcular fecha de inicio con offset si aplica
      const { addWorkdays } = await import("@/lib/workday-helper");
      const baseDate = template.offsetWorkdays > 0
        ? addWorkdays(new Date(startDate), template.offsetWorkdays, tenantCountry, userCountry)
        : new Date(startDate);

      // 🗝️ LLAVE #2 — expandFrequency para fechas hábiles reales
      const occurrences = expandFrequency(freqConfig, baseDate, orgConfig);

      for (const occ of occurrences) {
        // IDEMPOTENCIA: skip si ya existe
        const exists = await taskAlreadyExists(
          tenantId, boardId,
          template.sourcePlaybookTaskId,
          occ.occurrenceIndex
        );

        if (exists) {
          tasksSkipped++;
          continue;
        }

        // REGLA DE ORO #1: isProtected=true + sourcePlaybookId SIEMPRE
        await createTaskService({
          tenantId,
          boardId,
          groupId,
          title:               template.title + (occurrences.length > 1 ? ` (${occ.occurrenceIndex + 1}/${occurrences.length})` : ""),
          description:         template.description,
          priority:            template.priority,
          dueDate:             occ.isoDate,
          assigneeId:          template.assigneeOverride ?? employeeId,
          isProtected:         true,                          // ← REGLA DE ORO #1
          sourcePlaybookId:    playbookId,                   // ← Llave de protección
          sourcePlaybookTaskId: template.sourcePlaybookTaskId,
          occurrenceIndex:     occ.occurrenceIndex,
        });

        tasksCreated++;
      }
    } catch (err) {
      const msg = `Template "${template.sourcePlaybookTaskId}" failed: ${(err as Error).message}`;
      errors.push(msg);
      console.error("[PlaybookProcessor]", msg);
    }
  }

  const finalStatus = errors.length === 0 ? "completed" : (tasksCreated > 0 ? "completed" : "failed");
  await logSyncEvent(tenantId, assignmentId, finalStatus, {
    playbookId, tasksCreated, tasksSkipped,
    errors: errors.length > 0 ? errors : undefined,
  });

  return {
    success:      tasksCreated > 0 || tasksSkipped > 0,
    playbookId,
    assignmentId,
    tasksCreated,
    tasksSkipped,
    groupId,
    errors,
  };
}
