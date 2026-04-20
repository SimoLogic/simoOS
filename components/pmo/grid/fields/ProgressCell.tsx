"use client";
// ProgressCell.tsx — 0–100% progress bar with inline editable input

import { useState } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

interface Props { task: PmoTask; fieldKey: string; }

export function ProgressCell({ task, fieldKey }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();
  const [editing, setEditing] = useState(false);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const pct = rawVal !== undefined ? Math.min(100, Math.max(0, Number(rawVal))) : 0;

  const handleCommit = async (raw: string) => {
    const val = Math.min(100, Math.max(0, Number(raw) || 0));
    setEditing(false);
    setOptimisticTask(task.id, { [fieldKey]: val } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, val);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 w-full" onClick={e => e.stopPropagation()}>
        <input
          type="number"
          defaultValue={pct}
          min={0}
          max={100}
          autoFocus
          className="w-14 px-1.5 py-0.5 text-[12px] border border-[#6161FF] rounded text-center focus:outline-none"
          onBlur={e => handleCommit(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleCommit((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(false); }}
        />
        <span className="text-[12px] text-slate-400">%</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-2 w-full cursor-pointer"
      onClick={e => { e.stopPropagation(); setEditing(true); }}
    >
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[250ms]"
          style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#00CA72" : "#6161FF" }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}
