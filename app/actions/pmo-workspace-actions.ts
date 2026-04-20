"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// pmo-workspace-actions.ts — LEGACY CONSOLIDATION FILE
//
// ALL STUBS ERRADICATED. Every function here is a re-export from the modular
// actions in app/actions/pmo/. This file exists only for backward compatibility.
//
// NEW CODE MUST IMPORT DIRECTLY FROM:
//   - @/app/actions/pmo/board-actions
//   - @/app/actions/pmo/column-actions
//   - @/app/actions/pmo/group-actions
//   - @/app/actions/pmo/task-actions
//   - @/app/actions/pmo/subitem-actions
//   - @/app/actions/pmo/update-actions
//   - @/app/actions/pmo/activity-actions
//   - @/app/actions/pmo/view-actions
//   - @/app/actions/pmo/workspace-actions
// ═══════════════════════════════════════════════════════════════════════════════

// ── WORKSPACE ─────────────────────────────────────────────────────────────────
export {
  getWorkspacesAction,
  createWorkspaceAction,
} from "@/app/actions/pmo/board-actions";

// ── BOARDS ────────────────────────────────────────────────────────────────────
export {
  getBoardsAction,
  getBoardAction,
  createBoardAction,
  updateBoardAction as updateBoardActionModular,
  deleteBoardAction as deleteBoardActionModular,
} from "@/app/actions/pmo/board-actions";

// ── COLUMNS ───────────────────────────────────────────────────────────────────
export {
  addColumnAction,
  updateColumnAction,
  deleteColumnAction,
  reorderColumnsAction,
  getColumnsAction,
  updateCustomFieldValueAction,
} from "@/app/actions/pmo/column-actions";

// ── GROUPS ────────────────────────────────────────────────────────────────────
export {
  getGroupsAction,
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  reorderGroupsAction,
} from "@/app/actions/pmo/group-actions";

// ── TASKS / ITEMS ─────────────────────────────────────────────────────────────
export {
  getTasksAction,
  getTaskAction,
  createTaskAction as createItemAction,
  updateTaskAction,
  deleteTaskAction as deleteItemAction,
  updateTaskFieldAction as updateItemFieldAction,
} from "@/app/actions/pmo/task-actions";

// ── SUBITEMS ──────────────────────────────────────────────────────────────────
export {
  getSubitemsAction,
  createSubitemAction,
  updateSubitemAction,
  deleteSubitemAction,
} from "@/app/actions/pmo/subitem-actions";

// ── UPDATES (Side Peek comments) ──────────────────────────────────────────────
export {
  getUpdatesAction,
  addUpdateAction,
  deleteUpdateAction,
  toggleReactionAction,
} from "@/app/actions/pmo/update-actions";

// ── ACTIVITY LOGS ─────────────────────────────────────────────────────────────
export {
  getTaskActivityAction,
  logActivityAction,
  logFieldChangeAction,
  getTaskActivityLogsAction,
} from "@/app/actions/pmo/activity-actions";

// ── SAVED VIEWS ───────────────────────────────────────────────────────────────
export {
  getViewsAction,
  createViewAction,
  updateViewAction,
  deleteViewAction,
} from "@/app/actions/pmo/view-actions";
