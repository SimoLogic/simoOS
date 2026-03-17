"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Plus,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Flag,
  User,
  Type,
} from "lucide-react";
import { createTaskAction } from "@/app/actions/pmo/task-actions";
import type { TaskStatus, TaskPriority } from "@/types/pmo.types";
import { cn } from "@/lib/utils";

// ─── VIBE TOKENS ──────────────────────────────────────────────────────────────
const VIBE = {
  purple: "#6161FF",
  pink: "#FF3D57",
  green: "#00CA72",
  orange: "#FDAB3D",
  blue: "#0086C0",
  mirage: "#181B34",
} as const;

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Not Started", color: "#C4C4C4" },
  { value: "in_progress", label: "In Progress", color: VIBE.orange },
  { value: "done",        label: "Done",        color: VIBE.green },
  { value: "stuck",       label: "Stuck",       color: VIBE.pink },
  { value: "pending_review", label: "Pending Review", color: VIBE.blue },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low",      label: "Low",      color: "#579BFC" },
  { value: "medium",   label: "Medium",   color: VIBE.orange },
  { value: "high",     label: "High",     color: "#E44258" },
  { value: "critical", label: "Critical", color: "#333333" },
];

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface NewTaskModalProps {
  boardId: string;
  groupId: string;
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  boardId,
  groupId,
  orgId,
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus title on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setStatus("not_started");
      setPriority("");
      setDueDate("");
      setAssigneeId("");
      setError(null);
      setSuccessFlash(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        setError("Task title is required");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const result = await createTaskAction({
          boardId,
          groupId,
          title: title.trim(),
          status,
          priority: priority || undefined,
          dueDate: dueDate || undefined,
          assigneeId: assigneeId || undefined,
        });

        if (result.success) {
          setSuccessFlash(true);
          setTimeout(() => {
            onClose();
            onTaskCreated?.();
          }, 600);
        } else {
          setError(result.error);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, status, priority, dueDate, assigneeId, boardId, groupId, onClose, onTaskCreated]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#001e42]/50 backdrop-blur-[2px]"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-lg bg-white shadow-2xl border border-gray-100 overflow-hidden"
            style={{ borderRadius: 16 }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${VIBE.purple}, ${VIBE.blue})` }}
            >
              <div className="flex items-center gap-2 text-white">
                <Plus className="w-5 h-5" />
                <h2 className="font-bold text-[15px] tracking-wide">New Task</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/15 transition-colors duration-[70ms]"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Success Flash Overlay */}
            <AnimatePresence>
              {successFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <CheckCircle2
                      className="w-16 h-16"
                      style={{ color: VIBE.green }}
                    />
                    <p className="text-[15px] font-semibold text-[#323338]">
                      Task Created!
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* ── Title ── */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#323338] mb-1.5">
                  <Type className="w-3.5 h-3.5 text-[#676879]" />
                  Task Title
                  <span className="text-[#FF3D57]">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  id="new-task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  maxLength={255}
                  className={cn(
                    "w-full px-3 py-2.5 text-[14px] rounded border bg-white text-[#323338]",
                    "placeholder:text-[#C5C7D0]",
                    "transition-all duration-[100ms]",
                    "focus:outline-none focus:ring-2 focus:ring-offset-0",
                    error && !title.trim()
                      ? "border-[#FF3D57] focus:ring-[#FF3D57]/30"
                      : "border-[#D0D4E4] focus:border-[#6161FF] focus:ring-[#6161FF]/20"
                  )}
                  style={{ borderRadius: 4 }}
                />
              </div>

              {/* ── Status ── */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#323338] mb-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{
                      backgroundColor:
                        STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "#C4C4C4",
                    }}
                  />
                  Status
                </label>
                <div className="relative">
                  <select
                    id="new-task-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2.5 text-[14px] rounded border border-[#D0D4E4] bg-white text-[#323338] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6161FF]/20 focus:border-[#6161FF] transition-all duration-[100ms]"
                    style={{ borderRadius: 4 }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#676879] pointer-events-none" />
                </div>
              </div>

              {/* ── Priority ── */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#323338] mb-1.5">
                  <Flag className="w-3.5 h-3.5 text-[#676879]" />
                  Priority
                </label>
                <div className="relative">
                  <select
                    id="new-task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
                    className="w-full px-3 py-2.5 text-[14px] rounded border border-[#D0D4E4] bg-white text-[#323338] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6161FF]/20 focus:border-[#6161FF] transition-all duration-[100ms]"
                    style={{ borderRadius: 4 }}
                  >
                    <option value="">No priority</option>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#676879] pointer-events-none" />
                </div>
              </div>

              {/* ── Due Date ── */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#323338] mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#676879]" />
                  Due Date
                </label>
                <input
                  id="new-task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-[14px] rounded border border-[#D0D4E4] bg-white text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#6161FF]/20 focus:border-[#6161FF] transition-all duration-[100ms]"
                  style={{ borderRadius: 4 }}
                />
              </div>

              {/* ── Assignee ── */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#323338] mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#676879]" />
                  Assignee
                </label>
                <input
                  id="new-task-assignee"
                  type="text"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="Employee ID (e.g. EID-0001)"
                  className="w-full px-3 py-2.5 text-[14px] rounded border border-[#D0D4E4] bg-white text-[#323338] placeholder:text-[#C5C7D0] focus:outline-none focus:ring-2 focus:ring-[#6161FF]/20 focus:border-[#6161FF] transition-all duration-[100ms]"
                  style={{ borderRadius: 4 }}
                />
              </div>

              {/* ── Error Message ── */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#FFF0F0] border border-[#FFCDD2] text-[#D32F2F] text-[13px]"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* ── Actions ── */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[13px] font-semibold text-[#676879] bg-white border border-[#D0D4E4] rounded hover:bg-[#F5F6F8] transition-colors duration-[70ms] disabled:opacity-50"
                  style={{ borderRadius: 4 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="new-task-submit"
                  disabled={isSubmitting || !title.trim()}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 text-[13px] font-bold text-white rounded",
                    "transition-all duration-[100ms]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "hover:shadow-lg hover:shadow-[#6161FF]/25"
                  )}
                  style={{ backgroundColor: VIBE.purple, borderRadius: 4 }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Task
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
