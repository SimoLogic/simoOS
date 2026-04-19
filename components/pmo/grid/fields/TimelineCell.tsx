"use client";
// TimelineCell.tsx — Date range (start → end) for Gantt sync
// Stores { start: ISO, end: ISO } in JSONB custom_field_values
// Visual: compact pill showing "MMM d → MMM d"

import { useState, useRef } from "react";
import { CalendarRange } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

interface TimelineValue { start: string; end: string; }

interface Props {
  task:     PmoTask;
  fieldKey: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TimelineCell({ task, fieldKey }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();
  const [open, setOpen]   = useState(false);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const timeline = (rawVal && typeof rawVal === "object" && "start" in (rawVal as object))
    ? rawVal as TimelineValue
    : null;

  const [draft, setDraft] = useState<TimelineValue>({
    start: timeline?.start ?? new Date().toISOString().slice(0, 10),
    end:   timeline?.end   ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });

  const handleSave = async () => {
    setOpen(false);
    setOptimisticTask(task.id, { [fieldKey]: draft } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, draft);
    }
  };

  return (
    <div
      className="relative flex items-center w-full"
      id={`timeline-cell-${task.id}-${fieldKey}`}
    >
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#F5F6F8] w-full transition-colors duration-[70ms]"
      >
        <CalendarRange className="w-3.5 h-3.5 text-[#6161FF] shrink-0" />
        {timeline ? (
          <span className="text-[12px] text-[#323338] font-medium">
            {formatDate(timeline.start)} → {formatDate(timeline.end)}
          </span>
        ) : (
          <span className="text-[12px] text-slate-300">Set range…</span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-[70] mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl p-4"
          style={{ minWidth: 260 }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[12px] font-semibold text-slate-500 mb-3 uppercase tracking-wide">
            Date Range
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Start</label>
              <input
                type="date"
                value={draft.start}
                onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                className="w-full px-2 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-[#6161FF]"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">End</label>
              <input
                type="date"
                value={draft.end}
                min={draft.start}
                onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                className="w-full px-2 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-[#6161FF]"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 text-[13px] border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-1.5 text-[13px] font-semibold text-white rounded-lg"
              style={{ backgroundColor: "#6161FF" }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
