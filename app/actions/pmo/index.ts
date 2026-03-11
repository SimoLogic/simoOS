// PMO Actions — barrel export
// ⚠️ Actualizar al agregar nuevas actions en Sprint 3+

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
