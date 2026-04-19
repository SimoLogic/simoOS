"use client";

/**
 * GridView.tsx — Motor de Renderizado Dinámico PMO
 *
 * ARQUITECTURA:
 * - Las columnas se leen de board.columns (hidratadas desde pmo_columns en DB)
 * - El renderizado de celdas se delega a ColumnFactory (fieldType → CellComponent)
 * - NO existen columnas hardcodeadas. Agregar una columna = agregar un registro en DB.
 * - TanStack Virtual maneja la virtualización HPC para 10,000+ filas.
 *
 * SHIELD PROTOCOL:
 * - isProtected=true → row marcada con borde dashed, Shield icon visible.
 * - deleteItemAction bloqueado a nivel Server Action (ver task-actions.ts).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PmoBoard, PmoColumn, PmoGroup, PmoTask, TaskStatus } from "@/types/pmo.types";
import { filterTasks } from "@/lib/pmo/filter-engine";
import { getBoardAction } from "@/app/actions/pmo/board-actions";
import { GroupHeader } from "@/components/pmo/grid/GroupHeader";
import { ColumnFactory } from "@/components/pmo/grid/ColumnFactory";
import { ColumnTypeSelector } from "@/components/pmo/grid/ColumnTypeSelector";
import { PmoToolbar } from "@/components/pmo/navigation/PmoToolbar";
import { CommandPalette } from "@/components/pmo/navigation/CommandPalette";
import { BulkActionBar } from "@/components/pmo/grid/BulkActionBar";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { bulkUpdateTasksAction } from "@/app/actions/pmo/bulk-task-actions";
import { Loader2, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidePeek } from "@/components/pmo/grid/SidePeek";
import { PresenceProvider } from "@/components/pmo/shared/PresenceProvider";
import { NewTaskModal } from "@/components/pmo/shared/NewTaskModal";
import { useSessionStore } from "@/lib/session-store";

interface GridViewProps {
  boardId:    string;
  orgId:      string;
  isReadOnly?: boolean;
}

type RowItem =
  | { type: "header"; group: PmoGroup; isExpanded: boolean }
  | { type: "task";   task: PmoTask;   groupColor: string };

// ── COLUMN WIDTH DEFAULTS ────────────────────────────────────────────────────
const TITLE_COL_WIDTH = 280;  // Always first col
const CHECKBOX_WIDTH  = 48;
const COLOR_STRIP_W   = 4;

export const GridView: React.FC<GridViewProps> = ({ boardId, orgId, isReadOnly }) => {
  const [board, setBoard]                   = useState<PmoBoard | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [rowSelection, setRowSelection]     = useState<Record<string, boolean>>({});
  const [activePeekTaskId, setActivePeekTaskId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen]   = useState(false);

  // Dynamically injected columns (when user adds via ColumnTypeSelector)
  const [localColumns, setLocalColumns]     = useState<PmoColumn[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { user_ide, user_name } = useSessionStore();
  const currentUser = useMemo(() => {
    if (!user_ide || !user_name) return null;
    return { userId: user_ide, name: user_name };
  }, [user_ide, user_name]);

  const filterStatus      = usePmoStore(s => s.filterStatus);
  const filterAssignee    = usePmoStore(s => s.filterAssignee);
  const globalSearchQuery = usePmoStore(s => s.globalSearchQuery);
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);

  // ── DATA FETCH ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadBoard() {
      if (!boardId || !orgId) {
        setLoading(false);
        setError("No board selected.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await getBoardAction(boardId, orgId);
        if (cancelled) return;
        if (result.success) {
          setBoard(result.data);
          // Sync localColumns with DB columns
          setLocalColumns(result.data.columns ?? []);
          const expanded: Record<string, boolean> = {};
          result.data.groups?.forEach(g => { expanded[g.id] = true; });
          setExpandedGroups(expanded);
        } else {
          setError(result.error ?? "Failed to load board");
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBoard();
    return () => { cancelled = true; };
  }, [boardId, orgId]);

  // ── REACTIVE COLUMN ADDITION (No page reload) ───────────────────────────────
  const handleColumnAdded = useCallback((newCol: PmoColumn) => {
    setLocalColumns(prev => [...prev, newCol]);
  }, []);

  // ── FLATTENED ROW LIST FOR VIRTUALIZER ──────────────────────────────────────
  const flatRows = useMemo((): RowItem[] => {
    if (!board) return [];
    const flat: RowItem[] = [];
    board.groups?.forEach(group => {
      const isExpanded = !!expandedGroups[group.id];
      const tasks = filterTasks(group.tasks ?? [], {
        status:    filterStatus as TaskStatus,
        assigneeId: filterAssignee ?? undefined,
        searchQuery: globalSearchQuery,
      });
      flat.push({ type: "header", group, isExpanded });
      if (isExpanded) {
        tasks.forEach(task => {
          flat.push({
            type: "task",
            task: { ...task, ...optimisticTasks[task.id] },
            groupColor: group.color ?? "var(--vibe-purple)",
          });
        });
      }
    });
    return flat;
  }, [board, expandedGroups, filterStatus, filterAssignee, globalSearchQuery, optimisticTasks]);

  const virtualizer = useVirtualizer({
    count:           flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize:    (i) => flatRows[i].type === "header" ? 44 : 38,
    overscan:        15,
  });

  // ── ACTIONS ─────────────────────────────────────────────────────────────────
  const toggleGroup = (groupId: string) =>
    setExpandedGroups(p => ({ ...p, [groupId]: !p[groupId] }));

  const clearSelection = () => setRowSelection({});
  const selectedCount  = Object.keys(rowSelection).length;

  const reloadBoard = useCallback(async () => {
    const result = await getBoardAction(boardId, orgId);
    if (result.success) {
      setBoard(result.data);
      setLocalColumns(result.data.columns ?? []);
      const expanded: Record<string, boolean> = {};
      result.data.groups?.forEach(g => { expanded[g.id] = true; });
      setExpandedGroups(expanded);
    }
  }, [boardId, orgId]);

  const activePeekTask = useMemo(() => {
    if (!activePeekTaskId || !board) return null;
    for (const g of board.groups ?? []) {
      const found = g.tasks?.find(t => t.id === activePeekTaskId);
      if (found) return { ...found, ...optimisticTasks[found.id] };
    }
    return null;
  }, [activePeekTaskId, board, optimisticTasks]);

  const defaultGroupId = board?.groups?.[0]?.id ?? "";

  // ── HEADER COLUMN WIDTH COMPUTATION ─────────────────────────────────────────
  // First column is always the Task title column. Rest come from localColumns.
  // We skip the first localColumns entry if it's type=text (it IS the task title).
  const dynamicColumns = useMemo((): PmoColumn[] => {
    if (!localColumns.length) return [];
    // The "Task" text column (position 0) is always rendered as the first sticky column.
    // Remaining columns are rendered dynamically via ColumnFactory.
    return localColumns.filter(c => c.title.toLowerCase() !== "task" && c.type !== "text" || localColumns.indexOf(c) > 0);
  }, [localColumns]);

  // ────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white absolute inset-0">
        <Loader2 className="w-8 h-8 animate-spin text-[#6161FF]" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center bg-white absolute inset-0 gap-2">
        <AlertCircle className="w-8 h-8 text-[#FF3D57]" />
        <p className="font-medium text-slate-700">{error}</p>
      </div>
    );
  }

  return (
    <PresenceProvider boardId={boardId} orgId={orgId} currentUser={currentUser}>
      <div className="w-full h-full flex flex-col bg-white overflow-hidden absolute inset-0">
        {!isReadOnly && <CommandPalette orgId={orgId} />}

        <PmoToolbar
          boardId={boardId}
          orgId={orgId}
          boardName={board?.title ?? "Board"}
          onNewTaskClick={() => setIsNewTaskOpen(true)}
          onNewGroupClick={() => console.log("New Group — S-13")}
          isReadOnly={isReadOnly}
        />

        {/* ── GRID TABLE ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── COLUMN HEADERS (dynamic) ── */}
          <div className="flex items-center h-10 border-b border-slate-200 bg-slate-50 text-[12px] font-semibold text-slate-500 min-w-max sticky top-0 z-10">
            {/* Checkbox header */}
            <div className={`w-[${CHECKBOX_WIDTH}px] shrink-0 border-r border-slate-200 h-full flex items-center justify-center`}>
              <input
                type="checkbox"
                className="rounded border-slate-300 text-[#6161FF]"
                checked={selectedCount > 0 && selectedCount === flatRows.filter(r => r.type === "task").length}
                onChange={e => {
                  if (e.target.checked) {
                    const newSel: Record<string, boolean> = {};
                    flatRows.forEach(r => { if (r.type === "task") newSel[r.task.id] = true; });
                    setRowSelection(newSel);
                  } else {
                    setRowSelection({});
                  }
                }}
              />
            </div>

            {/* Task title — always first */}
            <div
              className="px-4 flex items-center shrink-0 border-r border-slate-200 h-full uppercase tracking-wide"
              style={{ width: TITLE_COL_WIDTH }}
            >
              Task
            </div>

            {/* Dynamic columns from DB */}
            {dynamicColumns.map(col => (
              <div
                key={col.id}
                className="px-3 flex items-center shrink-0 justify-center border-r border-slate-200 h-full uppercase tracking-wide truncate"
                style={{ width: col.width ?? 150 }}
                title={col.title}
              >
                {col.title}
              </div>
            ))}

            {/* [+] Add Column button */}
            {!isReadOnly && (
              <div className="flex items-center justify-center px-2 h-full border-r border-slate-200">
                <ColumnTypeSelector
                  boardId={boardId}
                  orgId={orgId}
                  onColumnAdded={handleColumnAdded}
                />
              </div>
            )}

            <div className="flex-1 h-full" />
          </div>

          {/* ── VIRTUALIZED BODY ── */}
          <div className="flex-1 overflow-auto w-full relative" ref={scrollRef}>
            <div
              className="w-full relative min-w-max"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualizer.getVirtualItems().map(vRow => {
                const row = flatRows[vRow.index];
                const isHeader = row.type === "header";

                return (
                  <div
                    key={vRow.key}
                    className={cn(
                      "absolute top-0 left-0 w-full flex items-center border-b border-slate-200 transition-colors duration-[70ms]",
                      isHeader
                        ? "bg-white z-0"
                        : "hover:bg-slate-50 cursor-pointer",
                      !isHeader && rowSelection[row.task.id]
                        ? "bg-[#6161FF]/5"
                        : "",
                      !isHeader && row.task.isProtected
                        ? "border-l-2 border-l-[#6161FF]"
                        : ""
                    )}
                    style={{
                      height:    `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                    onClick={() => { if (!isHeader) setActivePeekTaskId(row.task.id); }}
                  >
                    {isHeader ? (
                      <GroupHeader
                        group={row.group}
                        isExpanded={row.isExpanded}
                        onToggle={() => toggleGroup(row.group.id)}
                        taskCount={row.group.tasks?.length ?? 0}
                      />
                    ) : (
                      <div className="flex items-center w-full h-full group/row">
                        {/* Group Color Strip */}
                        <div
                          className="shrink-0 h-full"
                          style={{ width: COLOR_STRIP_W, backgroundColor: row.groupColor }}
                        />

                        {/* Selection Checkbox */}
                        <div
                          className="shrink-0 h-full border-r border-slate-200 flex items-center justify-center"
                          style={{ width: CHECKBOX_WIDTH - COLOR_STRIP_W }}
                        >
                          <input
                            type="checkbox"
                            checked={!!rowSelection[row.task.id]}
                            onChange={() => setRowSelection(prev => {
                              const next = { ...prev };
                              if (next[row.task.id]) delete next[row.task.id];
                              else next[row.task.id] = true;
                              return next;
                            })}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-[#6161FF] cursor-pointer"
                          />
                        </div>

                        {/* Task Title — always first */}
                        <div
                          className="shrink-0 h-full border-r border-slate-200 flex items-center px-2 gap-1"
                          style={{ width: TITLE_COL_WIDTH }}
                        >
                          {/* Shield Protocol visual indicator */}
                          {row.task.isProtected && (
                            <Lock className="w-3 h-3 text-[#6161FF] shrink-0" title="Protected by Simo IS" />
                          )}
                          {/* TextCell always renders the task title */}
                          <div className="flex-1 min-w-0">
                            <ColumnFactory
                              column={{ id: "_title", boardId, title: "Task", type: "text", position: 0, width: TITLE_COL_WIDTH }}
                              task={row.task}
                            />
                          </div>
                          {/* Salesforce indicator */}
                          {(row.task as PmoTask & { sfExternalId?: string }).sfExternalId && (
                            <span
                              title="Linked to Salesforce"
                              className="w-2 h-2 rounded-full bg-[#0086C0] shrink-0"
                            />
                          )}
                        </div>

                        {/* Dynamic columns — ColumnFactory renders the right cell per type */}
                        {dynamicColumns.map(col => (
                          <div
                            key={col.id}
                            className="shrink-0 h-full border-r border-slate-200 flex items-center justify-center"
                            style={{ width: col.width ?? 150 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <ColumnFactory column={col} task={row.task} />
                          </div>
                        ))}

                        <div className="flex-1 h-full" />
                      </div>
                    )}
                  </div>
                );
              })}

              {flatRows.filter(r => r.type === "task").length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-600">No tasks found</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Try changing filters or adding a new task.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BULK ACTIONS ── */}
        <BulkActionBar
          selectedCount={selectedCount}
          onClear={clearSelection}
          onUpdateStatus={async (status) => {
            const ids = Object.keys(rowSelection);
            ids.forEach(id => usePmoStore.getState().setOptimisticTaskUpdate(id, { status }));
            const res = await bulkUpdateTasksAction(ids, orgId, user_ide ?? "system", { status });
            if (res.success) clearSelection();
            else ids.forEach(id => usePmoStore.getState().clearOptimisticTaskUpdate(id));
          }}
          onUpdatePriority={async (priority) => {
            const ids = Object.keys(rowSelection);
            ids.forEach(id => usePmoStore.getState().setOptimisticTaskUpdate(id, { priority }));
            const res = await bulkUpdateTasksAction(ids, orgId, user_ide ?? "system", { priority });
            if (res.success) clearSelection();
            else ids.forEach(id => usePmoStore.getState().clearOptimisticTaskUpdate(id));
          }}
          onDelete={() => console.warn("Shield Protocol: bulk delete blocked for protected tasks.")}
        />

        {/* ── SIDE PEEK ── */}
        {activePeekTask && (
          <>
            <div
              className="fixed inset-0 bg-transparent z-[55]"
              onClick={() => setActivePeekTaskId(null)}
            />
            <SidePeek
              task={activePeekTask}
              isOpen={!!activePeekTaskId}
              onClose={() => setActivePeekTaskId(null)}
              onUpdate={async (updates) => {
                if (activePeekTaskId) {
                  usePmoStore.getState().setOptimisticTaskUpdate(activePeekTaskId, updates);
                }
              }}
            />
          </>
        )}
      </div>

      {/* ── NEW TASK MODAL ── */}
      {defaultGroupId && (
        <NewTaskModal
          boardId={boardId}
          groupId={defaultGroupId}
          orgId={orgId}
          isOpen={isNewTaskOpen}
          onClose={() => setIsNewTaskOpen(false)}
          onTaskCreated={reloadBoard}
        />
      )}
    </PresenceProvider>
  );
};

export default GridView;
