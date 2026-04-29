"use client";
// AutoNumberCell.tsx — Read-only sequential ID display
// Shows task position within its group (1-indexed) or a persistent custom counter
// The "value" is derived from task metadata, not manually set by users.

import type { PmoTask } from "@/types/pmo.types";
import { Hash } from "lucide-react";

interface Props {
  task:     PmoTask;
  rowIndex?: number; // position passed from GridView row renderer
}

export function AutoNumberCell({ task, rowIndex }: Props) {
  // Use explicit rowIndex if provided; fall back to task position field
  const displayNum = rowIndex !== undefined
    ? rowIndex + 1
    : (typeof task.customFieldValues?.["_auto_number"] === "number"
        ? (task.customFieldValues["_auto_number"] as number)
        : "—");

  return (
    <div
      id={`autonumber-cell-${task.id}`}
      className="flex items-center gap-1 px-2 w-full select-none"
      title="Auto-generated sequence number — read only"
    >
      <Hash className="w-3 h-3 text-slate-300 shrink-0" />
      <span className="text-[13px] font-medium text-slate-400 tabular-nums">
        {displayNum}
      </span>
    </div>
  );
}
