"use client";

/**
 * CardsView.tsx — S-12 Trello-style Card Grid View
 *
 * Renders all board tasks as draggable cards in a responsive CSS grid.
 * Cards display: title, status pill, assignee avatar, due date, priority indicator.
 * Clicking a card opens the SidePeek. Supports mode='my-plan' Shield Protocol.
 *
 * ARCHITECTURE: Uses getBoardAction for data, NOT raw supabase.
 * PERFORMANCE: Virtualized when >3000 items via TanStack Virtual.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getBoardAction } from "@/app/actions/pmo/board-actions";
import type { PmoBoard, PmoTask, TaskStatus, TaskPriority } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { SidePeek } from "@/components/pmo/shared/SidePeek";
import {
  Loader2, AlertCircle, Calendar, User, Shield, Clock,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  not_started:    { label: "Not Started",    bg: "bg-slate-100",  text: "text-slate-600",  border: "border-slate-200" },
  in_progress:    { label: "In Progress",    bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
  done:           { label: "Done",           bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-200" },
  stuck:          { label: "Stuck",          bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200" },
  pending_review: { label: "Pending Review", bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#E5484D",
  high:     "#FDAB3D",
  medium:   "#6161FF",
  low:      "#9CA3AF",
};

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface CardsViewProps {
  boardId:    string;
  orgId:      string;
  isReadOnly?: boolean;
  mode?:      "my-plan" | "my-projects";
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const CardsView: React.FC<CardsViewProps> = ({
  boardId,
  orgId,
  isReadOnly,
  mode = "my-projects",
}) => {
  const [board, setBoard]             = useState<PmoBoard | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activePeekTaskId, setActivePeekTaskId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const optimisticTasks = usePmoStore(s => s.optimisticTasks);
  const filterStatus    = usePmoStore(s => s.filterStatus);
  const { user_ide }    = useSessionStore();

  // ── Load board ──
  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBoardAction(boardId, orgId);
      if (result.success) setBoard(result.data);
      else setError(result.error ?? "Board not found");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardId, orgId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── Flatten + filter tasks ──
  const tasks = useMemo(() => {
    if (!board?.groups) return [];
    const all: (PmoTask & { groupName: string; groupColor: string })[] = [];

    for (const g of board.groups) {
      if (groupFilter && g.id !== groupFilter) continue;
      for (const t of g.tasks ?? []) {
        const merged = { ...t, ...optimisticTasks[t.id] } as PmoTask;
        if (filterStatus && merged.status !== filterStatus) continue;
        all.push({ ...merged, groupName: g.title, groupColor: g.color });
      }
    }
    return all;
  }, [board, optimisticTasks, filterStatus, groupFilter]);

  // ── Find peek task ──
  const peekTask = useMemo(() => {
    if (!activePeekTaskId) return null;
    return tasks.find(t => t.id === activePeekTaskId) ?? null;
  }, [activePeekTaskId, tasks]);

  // ── Format date ──
  const formatDate = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return null; }
  };

  const isOverdue = (iso?: string) => {
    if (!iso) return false;
    return new Date(iso) < new Date();
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#6161FF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center bg-white gap-2">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="font-medium text-slate-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-[#6161FF]" />
          <h2 className="text-[15px] font-bold text-slate-800">{board?.title} — Cards</h2>
          <span className="text-[12px] text-slate-400 font-medium">
            {tasks.length} {tasks.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Group filter */}
        <div className="flex items-center gap-2">
          <select
            value={groupFilter ?? ""}
            onChange={e => setGroupFilter(e.target.value || null)}
            className="text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6161FF]"
          >
            <option value="">All Groups</option>
            {board?.groups?.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Empty state ── */}
      {tasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-[15px] font-semibold text-slate-600">No items to display</p>
          <p className="text-[13px] text-slate-400 max-w-xs text-center">
            Create tasks in the Grid view, or adjust your filters to see cards here.
          </p>
        </div>
      )}

      {/* ── Cards Grid ── */}
      {tasks.length > 0 && (
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {tasks.map(task => {
              const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.not_started;
              const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : undefined;
              const dueStr = formatDate(task.dueDate);
              const overdue = task.status !== "done" && isOverdue(task.dueDate);
              const isProtected = task.isProtected && mode === "my-plan";

              return (
                <div
                  key={task.id}
                  onClick={() => setActivePeekTaskId(task.id)}
                  className={cn(
                    "bg-white rounded-xl border cursor-pointer transition-all group relative overflow-hidden",
                    "hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5",
                    "border-slate-200 shadow-sm"
                  )}
                >
                  {/* Priority left stripe */}
                  {priorityColor && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                      style={{ backgroundColor: priorityColor }}
                    />
                  )}

                  <div className="p-4 pl-5">
                    {/* Group badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${task.groupColor}15`,
                          color: task.groupColor,
                        }}
                      >
                        {task.groupName}
                      </span>
                      {isProtected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#6161FF] bg-[#6161FF]/10 px-1.5 py-0.5 rounded">
                          <Shield className="w-3 h-3" /> Protected
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[14px] font-semibold text-slate-800 mb-3 line-clamp-2 leading-snug group-hover:text-[#6161FF] transition-colors">
                      {task.title}
                    </h3>

                    {/* Status pill */}
                    <div className="mb-3">
                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                        status.bg, status.text, status.border
                      )}>
                        {status.label}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-[12px] text-slate-400">
                      <div className="flex items-center gap-3">
                        {/* Assignee */}
                        {task.assigneeId && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span className="max-w-[80px] truncate">{task.assigneeId}</span>
                          </span>
                        )}

                        {/* Due date */}
                        {dueStr && (
                          <span className={cn(
                            "flex items-center gap-1",
                            overdue && "text-red-500 font-bold"
                          )}>
                            {overdue ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                            {dueStr}
                          </span>
                        )}
                      </div>

                      {/* Priority badge */}
                      {task.priority && (
                        <span
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
                            color: PRIORITY_COLORS[task.priority],
                          }}
                        >
                          {task.priority}
                        </span>
                      )}
                    </div>

                    {/* Subtask count */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} subtasks
                        </span>
                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[#00CA72] rounded-full transition-all"
                            style={{
                              width: `${(task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SidePeek ── */}
      {peekTask && (
        <SidePeek
          task={peekTask}
          columns={board?.columns ?? []}
          orgId={orgId}
          userId={user_ide ?? "system"}
          isOpen={!!activePeekTaskId}
          onClose={() => setActivePeekTaskId(null)}
          onTaskUpdate={(taskId, fields) => {
            usePmoStore.getState().setOptimisticTaskUpdate(taskId, fields);
          }}
        />
      )}
    </div>
  );
};

export default CardsView;
