"use client";

import React, { useState, useRef, useEffect } from "react";
import { PmoTask } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";

interface NumberCellProps {
  task:     PmoTask;
  fieldKey: string;
  format?:  "plain" | "currency" | "percent";
  currency?: string; // e.g. "USD", "COP"
}

const formatValue = (val: number, format: string, currency: string): string => {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(val);
  }
  if (format === "percent") {
    return `${val.toFixed(1)}%`;
  }
  return new Intl.NumberFormat("en-US").format(val);
};

export const NumberCell: React.FC<NumberCellProps> = ({
  task, fieldKey, format = "plain", currency = "USD"
}) => {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();

  const rawValue = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const numericValue = rawValue !== undefined && rawValue !== "" ? Number(rawValue) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal]   = useState(numericValue !== null ? String(numericValue) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleBlur = async () => {
    setIsEditing(false);
    const parsed = parseFloat(inputVal.replace(/[^0-9.\-]/g, ""));
    if (isNaN(parsed)) return;

    setOptimisticTask(task.id, { [fieldKey]: parsed } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, parsed);
    }
  };

  const displayLabel = numericValue !== null
    ? formatValue(numericValue, format, currency)
    : null;

  return (
    <div
      className="relative w-full h-full flex items-center px-2 cursor-text"
      onClick={() => setIsEditing(true)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") setIsEditing(false); }}
          className="w-full text-xs font-medium text-slate-800 bg-white border border-[#6161FF] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#6161FF]/40"
          placeholder={format === "currency" ? "$0" : format === "percent" ? "0%" : "0"}
        />
      ) : (
        <span className={`text-xs font-semibold truncate ${numericValue !== null ? "text-slate-800" : "text-slate-300"}`}>
          {displayLabel ?? "—"}
        </span>
      )}
    </div>
  );
};

export default NumberCell;
