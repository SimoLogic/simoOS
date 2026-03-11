// ⚠️ Lee ARCHITECTURE.md §STATE VS DB PROTOCOL antes de modificar
// usePmoStore — Zustand store para el módulo PMO (SOLO estado de interfaz)
//
// REGLA CRÍTICA (ARCHITECTURE.md):
// ✅ SÍ guardar: activeView, isSidebarOpen, activeBoardId (llaves de referencia)
// ❌ PROHIBIDO: arrays masivos de tasks/groups, datos de negocio cross-módulo
//
// La fuente de verdad de datos está en PostgreSQL (Supabase).
// Este store es la memoria a CORTO PLAZO de la interfaz.

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { BoardView, PmoUIState } from "@/types/pmo.types";

// ─── STATE SHAPE ──────────────────────────────────────────────────────────
interface PmoStore extends PmoUIState {
  // ─── Navegación de vistas ────────────────────────────────────────────
  setActiveView: (view: BoardView) => void;
  setViewLocked: (locked: boolean) => void;
  setItemHeightMode: (mode: "simple" | "double" | "triple") => void;
  
  // ─── Contexto de board/workspace (llaves de referencia, no datos) ────
  setActiveBoardId: (boardId: string | null) => void;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  
  // ─── mondayDB Performance Flags (Regla de Oro #8) ───────────────────
  setWidgetCount: (count: number) => void;
  setHPCMode: (enabled: boolean) => void;
  
  // ─── UI Flags ────────────────────────────────────────────────────────
  isSidePeekOpen: boolean;
  sidePeekTaskId: string | null;
  openSidePeek: (taskId: string) => void;
  closeSidePeek: () => void;
  
  isFilterPanelOpen: boolean;
  toggleFilterPanel: () => void;
  
  // ─── Search ──────────────────────────────────────────────────────────
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  
  // ─── Reset ───────────────────────────────────────────────────────────
  resetPmoStore: () => void;
}

// ─── INITIAL STATE ────────────────────────────────────────────────────────
const INITIAL_STATE: PmoUIState & {
  isSidePeekOpen: boolean;
  sidePeekTaskId: string | null;
  isFilterPanelOpen: boolean;
  globalSearchQuery: string;
} = {
  // PmoUIState
  activeView:          "grid",
  itemHeightMode:      "simple",
  isViewLocked:        false,
  activeBoardId:       null,
  activeWorkspaceId:   null,
  widgetCount:         0,
  isHPCMode:           false,
  
  // UI Flags
  isSidePeekOpen:      false,
  sidePeekTaskId:      null,
  isFilterPanelOpen:   false,
  globalSearchQuery:   "",
};

// ─── STORE ────────────────────────────────────────────────────────────────
export const usePmoStore = create<PmoStore>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      // ── Vista ──────────────────────────────────────────────────────────
      setActiveView: (view) =>
        set({ activeView: view }, false, "pmo/setActiveView"),

      setViewLocked: (locked) =>
        set({ isViewLocked: locked }, false, "pmo/setViewLocked"),

      setItemHeightMode: (mode) =>
        set({ itemHeightMode: mode }, false, "pmo/setItemHeightMode"),

      // ── Board/Workspace context ────────────────────────────────────────
      setActiveBoardId: (boardId) =>
        set({ activeBoardId: boardId }, false, "pmo/setActiveBoardId"),

      setActiveWorkspaceId: (workspaceId) =>
        set({ activeWorkspaceId: workspaceId }, false, "pmo/setActiveWorkspaceId"),

      // ── mondayDB Performance ───────────────────────────────────────────
      setWidgetCount: (count) =>
        set(
          { widgetCount: count, isHPCMode: count > 3000 },
          false,
          "pmo/setWidgetCount"
        ),

      setHPCMode: (enabled) =>
        set({ isHPCMode: enabled }, false, "pmo/setHPCMode"),

      // ── Side Peek ─────────────────────────────────────────────────────
      openSidePeek: (taskId) =>
        set(
          { isSidePeekOpen: true, sidePeekTaskId: taskId },
          false,
          "pmo/openSidePeek"
        ),

      closeSidePeek: () =>
        set(
          { isSidePeekOpen: false, sidePeekTaskId: null },
          false,
          "pmo/closeSidePeek"
        ),

      // ── Filter Panel ──────────────────────────────────────────────────
      toggleFilterPanel: () =>
        set(
          (state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen }),
          false,
          "pmo/toggleFilterPanel"
        ),

      // ── Search ────────────────────────────────────────────────────────
      setGlobalSearchQuery: (query) =>
        set({ globalSearchQuery: query }, false, "pmo/setGlobalSearchQuery"),

      // ── Reset (al cambiar de módulo) ──────────────────────────────────
      resetPmoStore: () =>
        set(INITIAL_STATE, false, "pmo/reset"),
    }),
    {
      name: "pmo-store",
      // Solo trackear en development
      enabled: process.env.NODE_ENV === "development",
    }
  )
);

// ─── SELECTORS (evitar renders innecesarios) ──────────────────────────────
export const usePmoActiveView = () => usePmoStore((s) => s.activeView);
export const usePmoActiveBoardId = () => usePmoStore((s) => s.activeBoardId);
export const usePmoBoardViewLocked = () => usePmoStore((s) => s.isViewLocked);
export const usePmoPeek = () => usePmoStore((s) => ({
  isOpen: s.isSidePeekOpen,
  taskId: s.sidePeekTaskId,
}));
export const usePmoHPCMode = () => usePmoStore((s) => s.isHPCMode);
