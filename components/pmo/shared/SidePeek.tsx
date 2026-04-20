"use client";

// ⚠️ LEER ARCHITECTURE.md antes de modificar
// SidePeek.tsx — S-08: Item Detail Panel (Side Peek)
//
// Tres pestañas: Updates (comentarios), Activity Log (auditoría), Subitems (mini-grid)
// Shield Protocol: delete desactivado para tareas isProtected
// Tokens Vibe: #6161FF purple, #181B34, motion productive-medium 100ms

import { useState, useEffect, useRef, useCallback } from "react";
import type { PmoTask } from "@/types/pmo.types";
import { PlaybookBadge } from "@/components/pmo/shared/PlaybookBadge";
import { StatusBadge } from "@/components/pmo/shared/StatusBadge";
import { PriorityBadge } from "@/components/pmo/shared/PriorityBadge";
import {
  getUpdatesAction,
  addUpdateAction,
  deleteUpdateAction,
} from "@/app/actions/pmo/update-actions";
import {
  getTaskActivityAction,
} from "@/app/actions/pmo/activity-actions";
import {
  getSubitemsAction,
  createSubitemAction,
  updateSubitemAction,
  deleteSubitemAction,
} from "@/app/actions/pmo/subitem-actions";
import type { PmoItemUpdate } from "@/lib/services/pmo/update.service";
import type { PmoActivityEntry } from "@/lib/services/pmo/activity.service";
import type { PmoSubitem } from "@/lib/services/pmo/subitem.service";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type SidePeekTab = "updates" | "activity" | "subitems";

interface SidePeekProps {
  task: PmoTask;
  orgId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate?: (taskId: string, fields: Partial<PmoTask>) => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function SidePeek({
  task,
  orgId,
  userId,
  isOpen,
  onClose,
  onTaskUpdate,
}: SidePeekProps) {
  const [activeTab, setActiveTab] = useState<SidePeekTab>("updates");
  const [updates, setUpdates] = useState<PmoItemUpdate[]>([]);
  const [activity, setActivity] = useState<PmoActivityEntry[]>([]);
  const [subitems, setSubitems] = useState<PmoSubitem[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [newUpdateText, setNewUpdateText] = useState("");
  const [newSubitemTitle, setNewSubitemTitle] = useState("");
  const [isAddingSubitem, setIsAddingSubitem] = useState(false);
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load data when tab changes or task changes
  useEffect(() => {
    if (!isOpen || !task?.id) return;
    loadTabData(activeTab);
  }, [activeTab, task?.id, isOpen]);

  const loadTabData = useCallback(async (tab: SidePeekTab) => {
    setLoadingTab(true);
    setError(null);
    try {
      if (tab === "updates") {
        const data = await getUpdatesAction(task.id, orgId);
        setUpdates(data);
      } else if (tab === "activity") {
        const data = await getTaskActivityAction(task.id, orgId, 50);
        setActivity(data);
      } else if (tab === "subitems") {
        const data = await getSubitemsAction(task.id, orgId);
        setSubitems(data);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoadingTab(false);
    }
  }, [task.id, orgId]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handlePostUpdate = async () => {
    if (!newUpdateText.trim()) return;
    setIsPostingUpdate(true);
    try {
      const result = await addUpdateAction({
        taskId:  task.id,
        orgId,
        userId,
        body:    newUpdateText.trim(),
      });
      if (result.success) {
        setUpdates(prev => [result.data, ...prev]);
        setNewUpdateText("");
      } else {
        setError(result.error);
      }
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    const result = await deleteUpdateAction(updateId, orgId, userId);
    if (result.success) {
      setUpdates(prev => prev.filter(u => u.id !== updateId));
    }
  };

  const handleAddSubitem = async () => {
    if (!newSubitemTitle.trim()) return;
    setIsAddingSubitem(true);
    try {
      const result = await createSubitemAction({
        taskId: task.id,
        orgId,
        title:  newSubitemTitle.trim(),
      });
      if (result.success) {
        setSubitems(prev => [...prev, result.data]);
        setNewSubitemTitle("");
      } else {
        setError(result.error);
      }
    } finally {
      setIsAddingSubitem(false);
    }
  };

  const handleToggleSubitem = async (subitem: PmoSubitem) => {
    // Optimistic
    setSubitems(prev =>
      prev.map(s => s.id === subitem.id ? { ...s, isCompleted: !s.isCompleted } : s)
    );
    const result = await updateSubitemAction({
      subitemId:   subitem.id,
      orgId,
      userId,
      isCompleted: !subitem.isCompleted,
    });
    if (!result.success) {
      // Rollback
      setSubitems(prev =>
        prev.map(s => s.id === subitem.id ? { ...s, isCompleted: subitem.isCompleted } : s)
      );
    }
  };

  const handleDeleteSubitem = async (subitemId: string) => {
    setSubitems(prev => prev.filter(s => s.id !== subitemId));
    const result = await deleteSubitemAction(subitemId, orgId);
    if (!result.success) {
      // Refetch to restore state
      loadTabData("subitems");
    }
  };

  if (!isOpen) return null;

  const completedSubitems = subitems.filter(s => s.isCompleted).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Peek Panel — 480px, slides from right */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Task detail: ${task.title}`}
        className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 flex flex-col shadow-2xl border-l border-[#E6E9EF]"
        style={{ animation: "slideInRight 100ms cubic-bezier(0.4,0,0.2,1)" }}
      >
        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#E6E9EF]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.isProtected && <PlaybookBadge simoPlaybookId={task.simoPlaybookId ?? ""} />}
              <StatusBadge status={task.status} />
              {task.priority && <PriorityBadge priority={task.priority} />}
            </div>
            <h1 className="text-xl font-semibold text-[#323338] leading-tight break-words">
              {task.title}
            </h1>
            {task.description && (
              <p className="text-[14px] text-[#676879] mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <button
            id="side-peek-close"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded hover:bg-[#F5F6F8] text-[#676879] transition-colors"
            style={{ transitionDuration: "70ms" }}
            aria-label="Close side peek"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ─── META ROW ───────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-6 py-2.5 bg-[#F5F6F8] border-b border-[#E6E9EF] text-[12px] text-[#676879]">
          {task.dueDate && (
            <span>
              Due: <span className="text-[#323338] font-medium">
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </span>
          )}
          {task.assigneeId && (
            <span>Assigned to: <span className="text-[#323338] font-medium">{task.assigneeId}</span></span>
          )}
          {task.isProtected && (
            <span className="text-[#6161FF] font-medium">🔒 Simo Intellisense</span>
          )}
        </div>

        {/* ─── TABS ───────────────────────────────────────────────── */}
        <div className="flex border-b border-[#E6E9EF]" role="tablist">
          {(["updates", "subitems", "activity"] as SidePeekTab[]).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              id={`side-peek-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-[13px] font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-[#6161FF] text-[#6161FF]"
                  : "border-transparent text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8]"
              }`}
              style={{ transitionDuration: "100ms" }}
            >
              {tab === "subitems"
                ? `Subitems${subitems.length > 0 ? ` (${completedSubitems}/${subitems.length})` : ""}`
                : tab.charAt(0).toUpperCase() + tab.slice(1)
              }
            </button>
          ))}
        </div>

        {/* ─── TAB CONTENT ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto" role="tabpanel" aria-labelledby={`side-peek-tab-${activeTab}`}>
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error}
            </div>
          )}

          {loadingTab ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#6161FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── UPDATES TAB ──────────────────────────────── */}
              {activeTab === "updates" && (
                <div className="flex flex-col h-full">
                  {/* Composer */}
                  <div className="px-6 py-4 border-b border-[#E6E9EF]">
                    <textarea
                      id="side-peek-update-input"
                      value={newUpdateText}
                      onChange={e => setNewUpdateText(e.target.value)}
                      placeholder="Write an update..."
                      rows={3}
                      className="w-full px-3 py-2 text-[14px] text-[#323338] border border-[#E6E9EF] rounded-[4px] resize-none placeholder:text-[#676879] focus:outline-none focus:border-[#6161FF] focus:ring-1 focus:ring-[#6161FF]"
                      style={{ transitionDuration: "70ms" }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handlePostUpdate();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[12px] text-[#676879]">⌘+Enter to post</span>
                      <button
                        id="side-peek-post-update"
                        onClick={handlePostUpdate}
                        disabled={!newUpdateText.trim() || isPostingUpdate}
                        className="px-4 py-1.5 bg-[#6161FF] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#5151EF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ transitionDuration: "70ms" }}
                      >
                        {isPostingUpdate ? "Posting..." : "Post Update"}
                      </button>
                    </div>
                  </div>

                  {/* Updates list */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {updates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-full bg-[#F5F6F8]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#676879]">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <p className="text-[14px] text-[#676879]">No updates yet</p>
                        <p className="text-[13px] text-[#676879] mt-1">Be the first to post an update</p>
                      </div>
                    ) : (
                      updates.map(update => (
                        <UpdateCard
                          key={update.id}
                          update={update}
                          currentUserId={userId}
                          onDelete={handleDeleteUpdate}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── SUBITEMS TAB ─────────────────────────────── */}
              {activeTab === "subitems" && (
                <div className="px-6 py-4">
                  {/* Progress bar */}
                  {subitems.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-[12px] text-[#676879] mb-1">
                        <span>Progress</span>
                        <span>{completedSubitems}/{subitems.length} completed</span>
                      </div>
                      <div className="h-2 bg-[#E6E9EF] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00CA72] rounded-full transition-all"
                          style={{
                            width: `${subitems.length > 0 ? (completedSubitems / subitems.length) * 100 : 0}%`,
                            transitionDuration: "250ms",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Subitems list */}
                  <div className="space-y-1 mb-4">
                    {subitems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-[14px] text-[#676879]">No subitems yet</p>
                        <p className="text-[13px] text-[#676879] mt-1">Break this task into smaller steps</p>
                      </div>
                    ) : (
                      subitems.map(subitem => (
                        <SubitemRow
                          key={subitem.id}
                          subitem={subitem}
                          onToggle={handleToggleSubitem}
                          onDelete={handleDeleteSubitem}
                        />
                      ))
                    )}
                  </div>

                  {/* Add subitem */}
                  <div className="flex gap-2 mt-3">
                    <input
                      id="side-peek-subitem-input"
                      type="text"
                      value={newSubitemTitle}
                      onChange={e => setNewSubitemTitle(e.target.value)}
                      placeholder="+ Add subitem..."
                      className="flex-1 px-3 py-2 text-[14px] border border-[#E6E9EF] rounded-[4px] placeholder:text-[#676879] focus:outline-none focus:border-[#6161FF] focus:ring-1 focus:ring-[#6161FF]"
                      onKeyDown={e => { if (e.key === "Enter") handleAddSubitem(); }}
                    />
                    <button
                      id="side-peek-add-subitem"
                      onClick={handleAddSubitem}
                      disabled={!newSubitemTitle.trim() || isAddingSubitem}
                      className="px-4 py-2 bg-[#6161FF] text-white text-[13px] rounded-[4px] hover:bg-[#5151EF] disabled:opacity-50 transition-colors"
                      style={{ transitionDuration: "70ms" }}
                    >
                      {isAddingSubitem ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── ACTIVITY TAB ─────────────────────────────── */}
              {activeTab === "activity" && (
                <div className="px-6 py-4 space-y-3">
                  {activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-[14px] text-[#676879]">No activity yet</p>
                      <p className="text-[13px] text-[#676879] mt-1">Changes to this item will appear here</p>
                    </div>
                  ) : (
                    activity.map(entry => (
                      <ActivityRow key={entry.id} entry={entry} />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── FOOTER (Shield indicator) ──────────────────────────── */}
        {task.isProtected && (
          <div className="px-6 py-3 border-t border-[#E6E9EF] bg-[#F5F6F8]">
            <p className="text-[12px] text-[#6161FF] flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
              This task is managed by Simo Intellisense. Subitems and updates are yours to keep.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function UpdateCard({
  update,
  currentUserId,
  onDelete,
}: {
  update: PmoItemUpdate;
  currentUserId: string;
  onDelete: (id: string) => void;
}) {
  const isOwner = update.userId === currentUserId;
  const timeAgo = getTimeAgo(update.createdAt);

  return (
    <div className="group flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6161FF] flex items-center justify-center text-white text-[12px] font-semibold">
        {update.userId.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[13px] font-medium text-[#323338]">User</span>
          <span className="text-[12px] text-[#676879]">{timeAgo}</span>
        </div>
        <div className="bg-[#F5F6F8] rounded-[8px] px-4 py-3 text-[14px] text-[#323338] leading-relaxed">
          {update.body}
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(update.id)}
            className="mt-1 text-[12px] text-[#676879] hover:text-[#FF3D57] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ transitionDuration: "70ms" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function SubitemRow({
  subitem,
  onToggle,
  onDelete,
}: {
  subitem: PmoSubitem;
  onToggle: (s: PmoSubitem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors" style={{ transitionDuration: "70ms" }}>
      <button
        id={`subitem-toggle-${subitem.id}`}
        onClick={() => onToggle(subitem)}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          subitem.isCompleted
            ? "bg-[#00CA72] border-[#00CA72]"
            : "border-[#E6E9EF] hover:border-[#6161FF]"
        }`}
        style={{ transitionDuration: "70ms" }}
        aria-label={subitem.isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        {subitem.isCompleted && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <span className={`flex-1 text-[14px] ${subitem.isCompleted ? "line-through text-[#676879]" : "text-[#323338]"}`}>
        {subitem.title}
      </span>
      <button
        id={`subitem-delete-${subitem.id}`}
        onClick={() => onDelete(subitem.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#676879] hover:text-[#FF3D57] hover:bg-red-50 transition-all"
        style={{ transitionDuration: "70ms" }}
        aria-label="Delete subitem"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
}

function ActivityRow({ entry }: { entry: PmoActivityEntry }) {
  const icons: Record<string, string> = {
    field_change:   "✏️",
    status_change:  "🔄",
    update_posted:  "💬",
    subitem_created: "➕",
    subitem_completion: "✅",
    bulk_update:    "📦",
  };

  const labels: Record<string, string> = {
    field_change:   "Changed",
    status_change:  "Updated status",
    update_posted:  "Posted update",
    subitem_created: "Added subitem",
    subitem_completion: "Marked subitem",
    bulk_update:    "Batch updated",
  };

  return (
    <div className="flex gap-3 text-[13px]">
      <span className="flex-shrink-0 mt-0.5">{icons[entry.action] ?? "📝"}</span>
      <div className="flex-1">
        <span className="text-[#323338]">
          {labels[entry.action] ?? entry.action}
          {entry.fieldName && (
            <span className="text-[#6161FF] font-medium"> {entry.fieldName}</span>
          )}
        </span>
        {entry.oldValue !== null && entry.newValue !== null && (
          <span className="text-[#676879]">
            {" "}from <span className="text-[#323338]">"{entry.oldValue}"</span>
            {" "}to <span className="text-[#323338]">"{entry.newValue}"</span>
          </span>
        )}
        <span className="block text-[12px] text-[#676879] mt-0.5">
          {getTimeAgo(entry.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getTimeAgo(isoString: string): string {
  const now  = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
