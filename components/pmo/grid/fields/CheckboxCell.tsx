"use client";

import React from "react";
import { Check } from "lucide-react";
import { PmoTask } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";

interface CheckboxCellProps {
  task:     PmoTask;
  fieldKey: string;
}

export const CheckboxCell: React.FC<CheckboxCellProps> = ({ task, fieldKey }) => {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const checked = rawVal === true || rawVal === "true" || rawVal === 1;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !checked;
    setOptimisticTask(task.id, { [fieldKey]: newVal } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, newVal);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <button
        onClick={handleToggle}
        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-[100ms] ${
          checked
            ? "bg-[#6161FF] border-[#6161FF]"
            : "bg-white border-slate-300 hover:border-[#6161FF]/50"
        }`}
        aria-label={checked ? "Uncheck" : "Check"}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
    </div>
  );
};

export default CheckboxCell;
