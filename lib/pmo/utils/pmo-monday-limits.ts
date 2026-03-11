// ⚠️ Lee ARCHITECTURE.md antes de modificar
// pmo-monday-limits — Utilidades para respetar límites mondayDB

import type { PmoTask } from "@/types/pmo.types";

// ─── mondayDB LIMITS (Regla de Oro #8) ────────────────────────────────────
export const PMO_LIMITS = {
  WIDGETS_WARNING:    30,     // Banner amarillo #FDAB3D
  WIDGETS_AI_DISABLE: 50,     // Desactivar AI features
  ITEMS_HPC_MODE:     3_000,  // Virtualización agresiva
  ITEMS_MAX:          20_000, // Error bloqueante
} as const;

/**
 * Determina el modo de renderizado según el número de items
 */
export function getRenderMode(itemCount: number): "normal" | "hpc" | "blocked" {
  if (itemCount > PMO_LIMITS.ITEMS_MAX) return "blocked";
  if (itemCount > PMO_LIMITS.ITEMS_HPC_MODE) return "hpc";
  return "normal";
}

/**
 * Determina si los widgets de IA deben desactivarse
 */
export function shouldDisableAI(widgetCount: number): boolean {
  return widgetCount > PMO_LIMITS.WIDGETS_AI_DISABLE;
}

/**
 * Determina si mostrar banner de advertencia de widgets
 */
export function shouldShowWidgetWarning(widgetCount: number): boolean {
  return widgetCount >= PMO_LIMITS.WIDGETS_WARNING;
}

// ─── REGLA DE ORO #1 — PROTECTION UTILS ──────────────────────────────────

/**
 * Verifica si una tarea es protegida por Simo IS
 * NUNCA permitir DELETE si esta función retorna true
 */
export function isTaskProtected(task: Pick<PmoTask, "isProtected" | "sourcePlaybookId">): boolean {
  return task.isProtected || task.sourcePlaybookId != null;
}

/**
 * Filtra una lista de tareas para obtener solo las no-protegidas
 * Uso: Para habilitar acciones masivas de borrado
 */
export function filterDeletableTasks(tasks: PmoTask[]): PmoTask[] {
  return tasks.filter((t) => !isTaskProtected(t));
}

// ─── STATUS UTILS ─────────────────────────────────────────────────────────

/**
 * Calcula el porcentaje de completitud de un array de tareas
 */
export function calculateCompletionPercentage(tasks: PmoTask[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

/**
 * Agrupa tareas por status (para Kanban view)
 */
export function groupTasksByStatus(tasks: PmoTask[]): Record<string, PmoTask[]> {
  return tasks.reduce(
    (acc, task) => {
      const key = task.status;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    },
    {} as Record<string, PmoTask[]>
  );
}
