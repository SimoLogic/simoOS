"use server";
/**
 * my-plan-actions.ts — S-16 Playbook Assignment Integration
 *
 * Server Actions for the "My Plan" sub-module.
 * Provides getMyPlanBoardAction to discover the employee's personal board
 * (created by assignPlaybookAction) and return it hydrated with groups,
 * tasks, subtasks, and blocking metadata.
 */

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { PmoBoard, PmoTask, PmoGroup, TaskStatus, TaskType, PmoColumn } from "@/types/pmo.types";
import { getColumnsService } from "@/lib/services/pmo/column.service";
import { getSubitemsByTaskIdsService } from "@/lib/services/pmo/subitem.service";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface MyPlanBoardResult {
  board: PmoBoard;
  /** Map of blocking task IDs → their titles (for tooltip display) */
  blockingTaskTitles: Record<string, string>;
  /** Map of requester EIDs → their names */
  requesterNames: Record<string, string>;
  /** Whether this board has any playbook tasks */
  hasPlaybookTasks: boolean;
}

// ─── MAPPERS ──────────────────────────────────────────────────────────────────

function mapTaskRow(row: Record<string, unknown>): PmoTask {
  return {
    id:                   String(row.id),
    orgId:                String(row.org_id),
    boardId:              String(row.board_id),
    groupId:              String(row.group_id ?? ""),
    title:                String(row.title ?? ""),
    description:          row.description ? String(row.description) : undefined,
    status:               (row.status as TaskStatus) ?? "not_started",
    priority:             row.priority ? String(row.priority) as PmoTask["priority"] : undefined,
    dueDate:              row.due_date ? String(row.due_date) : undefined,
    assigneeId:           row.assignee_id ? String(row.assignee_id) : undefined,
    isProtected:          Boolean(row.is_protected),
    sourcePlaybookId:     row.source_playbook_id ? String(row.source_playbook_id) : null,
    sourcePlaybookTaskId: row.source_playbook_task_id ? String(row.source_playbook_task_id) : null,
    occurrenceIndex:      row.occurrence_index != null ? Number(row.occurrence_index) : undefined,
    taskType:             (row.task_type as TaskType) ?? "PERSONAL_TASK",
    blockingTaskId:       row.blocking_task_id ? String(row.blocking_task_id) : null,
    requestedByEid:       row.requested_by_eid ? String(row.requested_by_eid) : null,
    subtasks:             [],
    comments:             [],
    attachments:          [],
    customFieldValues:    (row.custom_field_values as Record<string, unknown>) ?? {},
    itemHeight:           (row.item_height as "simple" | "double" | "triple") ?? "simple",
    createdAt:            String(row.created_at),
    updatedAt:            String(row.updated_at),
    completedAt:          row.completed_at ? String(row.completed_at) : undefined,
  };
}

function mapGroupRow(row: Record<string, unknown>): PmoGroup {
  return {
    id:          String(row.id),
    boardId:     String(row.board_id),
    title:       String(row.title ?? row.name ?? ""),
    color:       String(row.color ?? "#6161FF"),
    position:    Number(row.position ?? 0),
    isCollapsed: Boolean(row.is_collapsed),
    tasks:       [],
  };
}

// ─── SERVER ACTION ────────────────────────────────────────────────────────────

/**
 * getMyPlanBoardAction — Discovers or creates the employee's "My Plan" board.
 *
 * Flow:
 * 1. Search for board with name = "My Plan — {employeeEid}" AND type = PERSONAL
 * 2. If found, hydrate with groups + tasks + subitems
 * 3. For blocked tasks, resolve the blocking task title
 * 4. For SUPPORT_REQUESTs, resolve the requester name from dim_employee
 *
 * Returns null if no personal board exists (employee has no playbooks assigned).
 */
export async function getMyPlanBoardAction(
  employeeEid: string,
  orgId: string
): Promise<{ success: true; data: MyPlanBoardResult } | { success: true; data: null } | { success: false; error: string }> {
  try {
    if (!employeeEid?.trim() || !orgId?.trim()) {
      return { success: false, error: "Missing employeeEid or orgId" };
    }

    const db = getPmoDB();

    // 1. Discover the personal board
    const boardName = `My Plan — ${employeeEid}`;
    const { data: boardRow, error: boardErr } = await db
      .from("pmo_boards")
      .select("*")
      .eq("org_id", orgId)
      .eq("name", boardName)
      .single();

    if (boardErr?.code === "PGRST116" || !boardRow) {
      // No board found — employee has no playbooks assigned yet
      return { success: true, data: null };
    }
    if (boardErr) throwIfDbError(boardErr, "getMyPlanBoard");

    const boardId = String(boardRow.id);

    // 2. Fetch groups, tasks, columns in parallel
    const [groupsResult, tasksResult] = await Promise.all([
      db.from("pmo_groups").select("*").eq("board_id", boardId).eq("org_id", orgId).order("position"),
      db.from("pmo_tasks").select("*").eq("board_id", boardId).eq("org_id", orgId).order("position"),
    ]);

    throwIfDbError(groupsResult.error, "getMyPlanGroups");
    throwIfDbError(tasksResult.error, "getMyPlanTasks");

    const groups = (groupsResult.data ?? []).map(mapGroupRow);
    const tasks = (tasksResult.data ?? []).map(mapTaskRow);

    // Also fetch tasks assigned to this employee across ALL boards (for My Work aggregation)
    // but for My Plan we focus on the personal board only.

    // 3. Fetch subitems
    const taskIds = tasks.map(t => t.id);
    let columns: PmoColumn[] = [];
    try { columns = await getColumnsService(boardId, orgId); } catch { /* empty fallback */ }

    const subitems = taskIds.length > 0
      ? await getSubitemsByTaskIdsService(taskIds, orgId)
      : [];

    // 4. Resolve blocking task titles
    const blockingIds = tasks
      .filter(t => t.blockingTaskId)
      .map(t => t.blockingTaskId!)
      .filter((id, i, a) => a.indexOf(id) === i); // unique

    const blockingTaskTitles: Record<string, string> = {};
    if (blockingIds.length > 0) {
      const { data: blockers } = await db
        .from("pmo_tasks")
        .select("id, title")
        .in("id", blockingIds);
      (blockers ?? []).forEach(b => {
        blockingTaskTitles[String(b.id)] = String(b.title);
      });
    }

    // 5. Resolve requester EID names (for SUPPORT_REQUESTs)
    const requesterEids = tasks
      .filter(t => t.requestedByEid)
      .map(t => t.requestedByEid!)
      .filter((eid, i, a) => a.indexOf(eid) === i);

    const requesterNames: Record<string, string> = {};
    if (requesterEids.length > 0) {
      const { data: empRows } = await db
        .from("dim_employee")
        .select("eid, primer_nombre, primer_apellido")
        .in("eid", requesterEids);
      (empRows ?? []).forEach(e => {
        requesterNames[String(e.eid)] = `${e.primer_nombre ?? ""} ${e.primer_apellido ?? ""}`.trim();
      });
    }

    // 6. Nest tasks under groups with subitems
    const hydratedGroups = groups.map(g => ({
      ...g,
      tasks: tasks
        .filter(t => t.groupId === g.id)
        .map(t => ({
          ...t,
          subtasks: subitems.filter(s => s.taskId === t.id).map(s => ({
            ...s,
            isProtected: false as const,
          })),
        })),
    }));

    // 7. Also include "ungrouped" tasks (group_id is empty or doesn't match any group)
    const groupIds = new Set(groups.map(g => g.id));
    const ungroupedTasks = tasks.filter(t => !groupIds.has(t.groupId));
    if (ungroupedTasks.length > 0) {
      hydratedGroups.push({
        id: "__personal__",
        boardId,
        title: "My Personal Tasks",
        color: "#9CA3AF",
        position: 99999,
        isCollapsed: false,
        tasks: ungroupedTasks.map(t => ({
          ...t,
          subtasks: subitems.filter(s => s.taskId === t.id).map(s => ({
            ...s,
            isProtected: false as const,
          })),
        })),
      });
    }

    const hasPlaybookTasks = tasks.some(t => t.taskType === "PLAYBOOK_TASK");

    const board: PmoBoard = {
      id: boardId,
      orgId,
      workspaceId: String(boardRow.workspace_id ?? ""),
      title: String(boardRow.name ?? boardRow.title ?? "My Plan"),
      description: boardRow.description ? String(boardRow.description) : undefined,
      isPlaybookBoard: true,
      activeView: "grid",
      isViewLocked: false,
      isArchived: false,
      groups: hydratedGroups,
      columns,
      createdAt: String(boardRow.created_at),
      updatedAt: String(boardRow.updated_at),
    };

    return {
      success: true,
      data: { board, blockingTaskTitles, requesterNames, hasPlaybookTasks },
    };
  } catch (err) {
    console.error("[getMyPlanBoardAction] Error:", err);
    return { success: false, error: (err as Error).message };
  }
}
