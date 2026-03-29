"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PmoBoard, PmoGroup, PmoTask, TaskStatus, TaskPriority } from "@/types/pmo.types";
import { filterTasks } from "@/lib/pmo/filter-engine";
import { getBoardAction } from "@/app/actions/pmo/board-actions";
import { GroupHeader } from "@/components/pmo/grid/GroupHeader";
import { TextCell } from "@/components/pmo/grid/fields/TextCell";
import { StatusCell } from "@/components/pmo/grid/fields/StatusCell";
import { PersonCell } from "@/components/pmo/grid/fields/PersonCell";
import { PmoToolbar } from "@/components/pmo/navigation/PmoToolbar";
import { CommandPalette } from "@/components/pmo/navigation/CommandPalette";
import GanttView from "@/components/pmo/views/GanttView";
import { DashboardEngine } from "@/components/pmo/views/DashboardEngine";
import { BulkActionBar } from "@/components/pmo/grid/BulkActionBar";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { bulkUpdateTasksAction } from "@/app/actions/pmo/bulk-task-actions";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidePeek } from "@/components/pmo/grid/SidePeek";
import { PresenceProvider } from "@/components/pmo/shared/PresenceProvider";
import { NewTaskModal } from "@/components/pmo/shared/NewTaskModal";
import { useSessionStore } from "@/lib/session-store";

interface GridViewProps {
  boardId: string;
  orgId: string;
  isReadOnly?: boolean;
}

/**
 * RowItem — Unified row type for the flattened virtualized grid.
 * We flatten groups and tasks into a single array for virtualization.
 */
type RowItem = 
  | { type: 'header'; group: PmoGroup; isExpanded: boolean; depth: number }
  | { type: 'task'; task: PmoTask; groupColor: string; depth: number };

const columnHelper = createColumnHelper<PmoTask>();

/**
 * GridView — The central project engine.
 * Literal implementation of Prompt #7 & #9 (Sprint 2).
 * Uses tanstack/react-table for logical engine and tanstack/react-virtual for HPC render.
 */
export const GridView: React.FC<GridViewProps> = ({ boardId, orgId, isReadOnly }) => {
  const [board, setBoard] = useState<PmoBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [activePeekTaskId, setActivePeekTaskId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { user_ide, user_name, tenant_id } = useSessionStore();
  const currentUser = useMemo(() => {
    if (!user_ide || !user_name) return null;
    return { userId: user_ide, name: user_name };
  }, [user_ide, user_name]);

  // ── GLOBAL STATE CONNECTIVITY ───────────────────────────────────────────────
  const activeView = usePmoStore(s => s.activeView);
  const filterStatus = usePmoStore(s => s.filterStatus);
  const filterAssignee = usePmoStore(s => s.filterAssignee);
  const globalSearchQuery = usePmoStore(s => s.globalSearchQuery);
  const optimisticTasks = usePmoStore(s => s.optimisticTasks);

  // ── DATA FETCH (FIX 1 — Critical: getBoardAction was imported but never called) ──
  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      setLoading(true);
      setError(null);

      try {
        const result = await getBoardAction(boardId, orgId);

        if (cancelled) return;

        if (result.success) {
          setBoard(result.data);
          // Auto-expand all groups on first load for immediate data visibility
          const expanded: Record<string, boolean> = {};
          result.data.groups?.forEach((g) => { expanded[g.id] = true; });
          setExpandedGroups(expanded);
        } else {
          setError(result.error || "Failed to load board");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unexpected error loading board");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (boardId && orgId) {
      loadBoard();
    } else {
      // No boardId/orgId yet — show empty state, not infinite spinner
      setLoading(false);
      setError("No board selected. Create or select a board to get started.");
    }

    return () => { cancelled = true; };
  }, [boardId, orgId]);

  const activePeekTask = useMemo(() => {
    if (!activePeekTaskId || !board) return null;
    // Search for task in groups
    for (const g of board.groups || []) {
      const found = g.tasks?.find(t => t.id === activePeekTaskId);
      if (found) return { ...found, ...optimisticTasks[found.id] };
    }
    return null;
  }, [activePeekTaskId, board, optimisticTasks]);

  // ── TABLE LOGICAL ENGINE (tanstack/react-table) ───────────────────────────
  // We use the table for individual tasks, but the Virtualizer handles the flat list.
  const columns = useMemo(() => [
    columnHelper.accessor("title", {
      header: "Task",
      cell: info => <TextCell task={info.row.original} />,
    }),
    columnHelper.accessor("assigneeId", {
      header: "Assignee",
      cell: info => <PersonCell task={info.row.original} />,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => <StatusCell task={info.row.original} />,
    }),
  ], []);

  // ── HPC RENDER (Flattening & Virtualization) ─────────────────────────────
  const flatRows = useMemo(() => {
    if (!board) return [];
    const flat: RowItem[] = [];
    
    board.groups?.forEach(group => {
      const isExpanded = !!expandedGroups[group.id];
      
      // Filter logic (Logic moved to FilterEngine)
      const tasks = filterTasks(group.tasks || [], {
        status: filterStatus as TaskStatus,
        assigneeId: filterAssignee || undefined,
        searchQuery: globalSearchQuery
      });

      flat.push({ type: 'header', group, isExpanded, depth: 0 });
      if (isExpanded) {
        tasks.forEach(task => {
          flat.push({ type: 'task', task: { ...task, ...optimisticTasks[task.id] }, groupColor: group.color || "var(--vibe-purple)", depth: 1 });
        });
      }
    });

    return flat;
  }, [board, expandedGroups, filterStatus, filterAssignee, globalSearchQuery, optimisticTasks]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => flatRows[index].type === 'header' ? 44 : 38,
    overscan: 15,
  });

  // ── ACTIONS ─────────────────────────────────────────────────────────────────
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const clearSelection = () => setRowSelection({});
  const selectedCount = Object.keys(rowSelection).length;

  // Reload board data (called after task creation)
  const reloadBoard = useCallback(async () => {
    try {
      const result = await getBoardAction(boardId, orgId);
      if (result.success) {
        setBoard(result.data);
        const expanded: Record<string, boolean> = {};
        result.data.groups?.forEach((g) => { expanded[g.id] = true; });
        setExpandedGroups(expanded);
      }
    } catch { /* silent */ }
  }, [boardId, orgId]);

  const defaultGroupId = board?.groups?.[0]?.id || "";

  if (loading) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white absolute inset-0">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--vibe-blue)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center bg-white absolute inset-0 text-[var(--vibe-text-prime)] gap-2">
        <AlertCircle className="w-8 h-8 text-[var(--vibe-pink)]" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <PresenceProvider boardId={boardId} orgId={orgId} currentUser={currentUser}>
      <div className="w-full h-full flex flex-col bg-white overflow-hidden absolute inset-0 rounded-tl-xl shadow-sm border-l border-t border-[var(--vibe-border)]">
      {!isReadOnly && <CommandPalette orgId={orgId} />}
      
      <PmoToolbar 
        boardId={boardId}
        orgId={orgId}
        boardName={board?.title || "Board"} 
        onNewTaskClick={() => setIsNewTaskOpen(true)}
        onNewGroupClick={() => console.log("New Group")}
        isReadOnly={isReadOnly}
      />

      {activeView === 'dashboard' ? (
        <DashboardEngine boardId={boardId} orgId={orgId} isReadOnly={isReadOnly} />
      ) : activeView === 'gantt' && board ? (
        <GanttView 
          board={board} 
          orgCountryCode="CO" 
          filterStatus={filterStatus}
          filterAssignee={filterAssignee}
          optimisticTasks={optimisticTasks}
          isReadOnly={isReadOnly}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center h-10 border-b border-[var(--vibe-border)] bg-[var(--vibe-surface-2)] text-[12px] font-semibold text-[var(--vibe-text-muted)] min-w-max sticky top-0 z-10">
            <div className="w-12 shrink-0 border-r border-[var(--vibe-border)] h-full flex items-center justify-center">
               <input 
                 type="checkbox" 
                 className="rounded-[var(--radius-xs)] border-[var(--vibe-border)]"
                 checked={selectedCount > 0 && selectedCount === flatRows.filter(r => r.type === 'task').length}
                 onChange={(e) => {
                    if (e.target.checked) {
                      const newSel: Record<string, boolean> = {};
                      flatRows.forEach(r => { if(r.type === 'task') newSel[r.task.id] = true; });
                      setRowSelection(newSel);
                    } else {
                      setRowSelection({});
                    }
                 }}
               />
            </div>
            <div className="w-80 px-4 flex items-center shrink-0 border-r border-[var(--vibe-border)] h-full">Task</div>
            <div className="w-40 px-4 flex items-center shrink-0 justify-center border-r border-[var(--vibe-border)] h-full">Responsable</div>
            <div className="w-32 px-4 flex items-center shrink-0 justify-center border-r border-[var(--vibe-border)] h-full">Status</div>
            <div className="flex-1 min-w-[200px] h-full"></div>
          </div>

          {/* Virtualized Body */}
          <div className="flex-1 overflow-auto w-full relative scrollbar-thin" ref={scrollRef}>
            <div
              className="w-full relative min-w-max"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualizer.getVirtualItems().map((vRow) => {
                const row = flatRows[vRow.index];
                const isHeader = row.type === 'header';
                
                return (
                  <div
                    key={vRow.key}
                    className={cn(
                      "absolute top-0 left-0 w-full flex items-center border-b transition-colors duration-[var(--motion-productive-short)]",
                      isHeader ? "bg-white z-0" : "hover:bg-[var(--vibe-surface-2)] cursor-pointer",
                      !isHeader && rowSelection[row.task.id] ? "bg-[rgba(97,97,255,0.05)]" : "border-[var(--vibe-border)]"
                    )}
                    style={{
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                    onClick={() => {
                      if (!isHeader) setActivePeekTaskId(row.task.id);
                    }}
                  >
                    {isHeader ? (
                      <GroupHeader 
                        group={row.group} 
                        isExpanded={row.isExpanded} 
                        onToggle={() => toggleGroup(row.group.id)}
                        taskCount={row.group.tasks?.length || 0}
                      />
                    ) : (
                      <div className="flex items-center w-full h-full group/row">
                        {/* Group Color Strip */}
                        <div className="w-1 shrink-0 h-full" style={{ backgroundColor: row.groupColor }}></div>
                        
                        {/* Selection Checkbox */}
                        <div className="w-11 shrink-0 h-full border-r border-[var(--vibe-border)] flex items-center justify-center">
                           <input 
                             type="checkbox" 
                             checked={!!rowSelection[row.task.id]}
                             onChange={() => setRowSelection(prev => {
                               const next = { ...prev };
                               if (next[row.task.id]) delete next[row.task.id];
                               else next[row.task.id] = true;
                               return next;
                             })}
                             className="w-4 h-4 rounded-[var(--radius-xs)] border-[var(--vibe-border)] text-[var(--vibe-purple)] focus:ring-[var(--vibe-purple)] cursor-pointer" 
                           />
                        </div>

                        {/* Task Data */}
                        <div className="w-80 h-full border-r border-[var(--vibe-border)] shrink-0 flex items-center px-2">
                           <TextCell task={row.task} />
                           {(row.task as any).sfExternalId && (
                             <span
                               title="Vinculada a Salesforce"
                               style={{
                                 width: 8,
                                 height: 8,
                                 borderRadius: "50%",
                                 backgroundColor: "#0086C0",
                                 marginLeft: 6,
                                 flexShrink: 0,
                                 display: "inline-block",
                               }}
                             />
                           )}
                        </div>
                        <div className="w-40 h-full border-r border-[var(--vibe-border)] shrink-0 flex items-center justify-center p-1">
                           <PersonCell task={row.task} />
                        </div>
                        <div className="w-32 h-full border-r border-[var(--vibe-border)] shrink-0 flex items-center justify-center p-1">
                           <StatusCell task={row.task} />
                        </div>
                        <div className="flex-1 h-full min-w-[200px]"></div>
                      </div>
                    )}
                  </div>
                );
              })}
              {flatRows.filter(r => r.type === 'task').length === 0 && (
                <div className="flex items-center justify-center p-20 text-slate-400">
                  <div className="text-center">
                    <p className="text-lg font-bold">No tasks found</p>
                    <p className="text-sm">Try changing filters or adding a new task.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <BulkActionBar 
        selectedCount={selectedCount}
        onClear={clearSelection}
        onUpdateStatus={async (status) => {
           const ids = Object.keys(rowSelection);
           ids.forEach(id => usePmoStore.getState().setOptimisticTaskUpdate(id, { status }));
           const res = await bulkUpdateTasksAction(ids, orgId, "RECON-AGENT", { status });
           if (res.success) clearSelection();
           else {
             ids.forEach(id => usePmoStore.getState().clearOptimisticTaskUpdate(id));
             console.error("Bulk update failed:", res.error);
           }
        }}
        onUpdatePriority={async (priority) => {
           const ids = Object.keys(rowSelection);
           ids.forEach(id => usePmoStore.getState().setOptimisticTaskUpdate(id, { priority }));
           const res = await bulkUpdateTasksAction(ids, orgId, "RECON-AGENT", { priority });
           if (res.success) clearSelection();
           else ids.forEach(id => usePmoStore.getState().clearOptimisticTaskUpdate(id));
        }}
        onDelete={() => console.warn("Delete not allowed for protected tasks via bulk action yet.")}
      />

      {/* Side Peek Panel */}
      {activePeekTask && (
        <>
          {/* Overlay to close when clicking outside */}
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
                // Implementation of the actual update call would go here in Sprint 4
              }
            }}
          />
        </>
      )}
      </div>

      {/* New Task Modal */}
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
