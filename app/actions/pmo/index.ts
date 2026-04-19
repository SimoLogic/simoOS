// PMO Actions — barrel export
// TOTAL: 8 action modules, 30+ Server Actions, ZERO stubs.

// Board & Workspace actions
export {
  getWorkspacesAction,
  createWorkspaceAction,
  getBoardsAction,
  getBoardAction,
  createBoardAction,
  updateBoardAction,
  deleteBoardAction,
} from "./board-actions";

// Task actions (REGLA DE ORO #1 aplicada en deleteTaskAction)
export {
  getTasksAction,
  getTaskAction,
  createTaskAction,
  updateTaskAction,
  updateTaskFieldAction,
  moveTaskAction,
  deleteTaskAction,
  batchDeleteTasksAction,
} from "./task-actions";

// Group actions
export {
  getGroupsAction,
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  reorderGroupsAction,
} from "./group-actions";

// Column actions
export {
  addColumnAction,
  updateColumnAction,
  deleteColumnAction,
  reorderColumnsAction,
  getColumnsAction,
  updateCustomFieldValueAction,
} from "./column-actions";

// Subitem actions
export {
  getSubitemsAction,
  createSubitemAction,
  updateSubitemAction,
  deleteSubitemAction,
} from "./subitem-actions";

// Update actions (Side Peek comments)
export {
  getUpdatesAction,
  addUpdateAction,
  deleteUpdateAction,
  toggleReactionAction,
} from "./update-actions";

// Activity log actions (auditoría transaccional)
export {
  getTaskActivityAction,
  logActivityAction,
  logFieldChangeAction,
  getTaskActivityLogsAction,
} from "./activity-actions";

// Saved view actions
export {
  getViewsAction,
  createViewAction,
  updateViewAction,
  deleteViewAction,
} from "./view-actions";
