// lib/pmo/index.ts — Barrel export del módulo lib/pmo
// ⚠️ Actualizar al agregar nuevos hooks, utils o stores en Sprints 2+

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { usePmoBoard } from "./hooks/usePmoBoard";
export { usePmoTasks } from "./hooks/usePmoTasks";

// ─── Utils ────────────────────────────────────────────────────────────────────
export {
    PMO_LIMITS,
    getRenderMode,
    shouldDisableAI,
    shouldShowWidgetWarning,
    isTaskProtected,
    filterDeletableTasks,
    calculateCompletionPercentage,
    groupTasksByStatus,
} from "./utils/pmo-monday-limits";

export { VIBE_TOKENS, VIBE_VARS, vibeAlpha } from "./utils/vibe-tokens";
export type { VibeToken } from "./utils/vibe-tokens";
