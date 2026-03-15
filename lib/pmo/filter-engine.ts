import { PmoTask, TaskStatus, TaskPriority } from "@/types/pmo.types";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

export interface PmoFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  isProtected?: boolean;
  sourcePlaybookId?: string | null;
  searchQuery?: string;
  dateRange?: {
    start?: string; // ISO
    end?: string;   // ISO
  };
}

/**
 * FilterEngine — Motor centralizado de filtrado para tareas PMO.
 * Soporta lógica de negocio avanzada como isProtected y Simo IS metadata.
 */
export const filterTasks = (tasks: PmoTask[], options: PmoFilterOptions): PmoTask[] => {
  return tasks.filter((task) => {
    // 1. Status Filter
    if (options.status && task.status !== options.status) return false;

    // 2. Priority Filter
    if (options.priority && task.priority !== options.priority) return false;

    // 3. Assignee Filter
    if (options.assigneeId && task.assigneeId !== options.assigneeId) return false;

    // 4. Protection Filter (Regla de Oro #1)
    if (options.isProtected !== undefined) {
      // Una tarea es protegida si tiene isProtected=true O si viene de un Playbook
      const taskIsProtected = Boolean(task.isProtected || task.sourcePlaybookId);
      if (taskIsProtected !== options.isProtected) return false;
    }

    // 5. Playbook ID Filter
    if (options.sourcePlaybookId !== undefined) {
      if (task.sourcePlaybookId !== options.sourcePlaybookId) return false;
    }

    // 6. Search Query (Title or Description)
    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const query = options.searchQuery.toLowerCase();
      const inTitle = task.title.toLowerCase().includes(query);
      const inDesc = task.description?.toLowerCase().includes(query);
      if (!inTitle && !inDesc) return false;
    }

    // 7. Date Range Filter (dueDate)
    if (options.dateRange && task.dueDate) {
      try {
        const date = parseISO(task.dueDate);
        if (options.dateRange.start) {
          const start = startOfDay(parseISO(options.dateRange.start));
          if (date < start) return false;
        }
        if (options.dateRange.end) {
          const end = endOfDay(parseISO(options.dateRange.end));
          if (date > end) return false;
        }
      } catch (e) {
        console.error("[FilterEngine] Invalid date calculation:", e);
      }
    } else if (options.dateRange && !task.dueDate) {
      // Si hay filtro de fecha pero la tarea no tiene fecha, queda fuera del rango
      return false;
    }

    return true;
  });
};
