"use client";

import React, { useState, useRef, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { PmoTask } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";

interface DateCellProps {
  task:     PmoTask;
  fieldKey: string;        // e.g. "due_date_abc123"
  isNative?: boolean;      // true → use task.dueDate, false → use customFieldValues
}

/**
 * DateCell — Renders a date picker for any column of type "date".
 * For native dueDate use isNative=true, for custom columns use fieldKey.
 * Persists via updateCustomFieldValueAction → JSONB custom_field_values.
 */
export const DateCell: React.FC<DateCellProps> = ({ task, fieldKey, isNative = false }) => {
  const optimisticTasks    = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask  = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }      = useSessionStore();

  const optimistic = optimisticTasks[task.id];

  const currentValue = isNative
    ? (optimistic?.dueDate ?? task.dueDate ?? "")
    : String((optimistic as Record<string, unknown> | undefined)?.[fieldKey]
        ?? task.customFieldValues?.[fieldKey]
        ?? "");

  const [isOpen, setIsOpen]     = useState(false);
  const [inputVal, setInputVal] = useState(currentValue ? currentValue.slice(0, 10) : "");
  const containerRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = async (val: string) => {
    setInputVal(val);
    setIsOpen(false);

    if (isNative) {
      setOptimisticTask(task.id, { dueDate: val });
    } else {
      setOptimisticTask(task.id, { [fieldKey]: val } as Partial<PmoTask>);
    }

    // Persist to DB
    if (!isNative && tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, val);
    }
  };

  const displayLabel = inputVal
    ? new Date(inputVal + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center p-1">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-1.5 w-full h-8 px-2 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors group"
      >
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#6161FF] shrink-0" />
        {displayLabel
          ? <span className="truncate">{displayLabel}</span>
          : <span className="text-slate-400">Set date</span>
        }
      </button>
      {isOpen && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-lg p-3">
          <input
            type="date"
            value={inputVal}
            onChange={e => handleChange(e.target.value)}
            className="border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6161FF]/40"
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default DateCell;
