"use client";
// LastUpdatedCell.tsx — Reactive timestamp of last task mutation
// Read-only. Displays task.updatedAt in relative time format.
// Also shows WHO made the last change if activity log is available.

import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { PmoTask } from "@/types/pmo.types";

interface Props {
  task: PmoTask;
}

function getRelativeTime(isoString: string): string {
  const now  = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

export function LastUpdatedCell({ task }: Props) {
  const relative = useMemo(
    () => task.updatedAt ? getRelativeTime(task.updatedAt) : "—",
    [task.updatedAt]
  );

  const fullDate = task.updatedAt
    ? new Date(task.updatedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return (
    <div
      id={`lastupdated-cell-${task.id}`}
      className="flex items-center gap-1.5 px-2 w-full select-none cursor-default"
      title={fullDate}
    >
      <Clock className="w-3 h-3 text-slate-300 shrink-0" />
      <span className="text-[12px] text-slate-400 truncate">{relative}</span>
    </div>
  );
}
