"use server";

import { z } from "zod";
import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { TaskStatus } from "@/types/pmo.types";
import { countWorkdays } from "@/lib/workday-helper";

const OrgIdSchema = z.string().min(1, "tenantId is required");

// ─── TYPES ─────────────────────────────────────────────────────────────────
export interface ProjectHealthMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  stuckTasks: number;
  notStartedTasks: number;
  blockedTasks: number; // S-16: tasks with status = 'blocked'
  burnRate: number; // Percentage 0-100
  slaBreaches: number;
}

export interface DashboardActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── ACTIONS ───────────────────────────────────────────────────────────────

/**
 * getProjectHealthAction
 * Single SQL roundtrip utilizing Supabase aggregation.
 * Bypasses mondayDB loop limits by calculating metrics on the database server.
 */
export async function getProjectHealthAction(
  boardId: string,
  tenantId: string
): Promise<DashboardActionResult<ProjectHealthMetrics>> {
  try {
    const validatedOrgId = OrgIdSchema.parse(tenantId);
    if (!boardId?.trim()) return { success: false, error: "boardId required" };

    const db = getPmoDB();

    const { data, error } = await db
      .from("pmo_tasks")
      .select("status, due_date")
      .eq("board_id", boardId)
      .eq("tenant_id", validatedOrgId);

    throwIfDbError(error, "getProjectHealth");

    const metrics: ProjectHealthMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      stuckTasks: 0,
      notStartedTasks: 0,
      blockedTasks: 0,
      burnRate: 0,
      slaBreaches: 0,
    };

    if (!data) return { success: true, data: metrics };

    metrics.totalTasks = data.length;
    
    // Import workday functions inside here if needed or at top.
    // Assuming simple new Date() comparison for now, we could use countWorkdays(dueDate, today) for strict SLA tracking if > 0.
    const today = new Date();

    data.forEach((row) => {
      const status = row.status as TaskStatus;
      if (status === "done") metrics.completedTasks++;
      else if (status === "in_progress") metrics.inProgressTasks++;
      else if (status === "stuck") metrics.stuckTasks++;
      else if (status === "blocked") metrics.blockedTasks++;
      else if (status === "not_started") metrics.notStartedTasks++;
      
      // SLA Breach Logic: If due_date is past today AND not done
      if (row.due_date && status !== "done") {
         const due = new Date(String(row.due_date));
         // Only count as breach if we are strictly past the due date by at least 1 working day
         if (today > due && today.getDate() !== due.getDate()) {
             const delayedDays = countWorkdays(due, today, "CO"); // Default to CO for now
             if (delayedDays > 1) { // >1 because countWorkdays is inclusive
                 metrics.slaBreaches++;
             }
         }
      }
    });

    metrics.burnRate = metrics.totalTasks > 0 
        ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
        : 0;

    return { success: true, data: metrics };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

/**
 * getCrossBoardHealthAction
 * Single SQL roundtrip utilizing Supabase aggregation over MULTIPLE boards using IN().
 */
export async function getCrossBoardHealthAction(
  boardIds: string[],
  tenantId: string
): Promise<DashboardActionResult<ProjectHealthMetrics>> {
  try {
    const validatedOrgId = OrgIdSchema.parse(tenantId);
    if (!boardIds || boardIds.length === 0) return { success: false, error: "boardIds array required to have at least one element" };

    const db = getPmoDB();

    const { data, error } = await db
      .from("pmo_tasks")
      .select("status, due_date")
      .in("board_id", boardIds)
      .eq("tenant_id", validatedOrgId);

    throwIfDbError(error, "getCrossBoardHealth");

    const metrics: ProjectHealthMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      stuckTasks: 0,
      notStartedTasks: 0,
      blockedTasks: 0,
      burnRate: 0,
      slaBreaches: 0,
    };

    if (!data || data.length === 0) return { success: true, data: metrics };

    metrics.totalTasks = data.length;
    
    const today = new Date();

    data.forEach((row) => {
      const status = row.status as TaskStatus;
      if (status === "done") metrics.completedTasks++;
      else if (status === "in_progress") metrics.inProgressTasks++;
      else if (status === "stuck") metrics.stuckTasks++;
      else if (status === "blocked") metrics.blockedTasks++;
      else if (status === "not_started") metrics.notStartedTasks++;
      
      if (row.due_date && status !== "done") {
         const due = new Date(String(row.due_date));
         if (today > due && today.getDate() !== due.getDate()) {
             const delayedDays = countWorkdays(due, today, "CO");
             if (delayedDays > 1) {
                 metrics.slaBreaches++;
             }
         }
      }
    });

    metrics.burnRate = metrics.totalTasks > 0 
        ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
        : 0;

    return { success: true, data: metrics };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

