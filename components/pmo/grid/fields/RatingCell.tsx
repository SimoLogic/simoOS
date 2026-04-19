"use client";
// RatingCell.tsx — 1–5 star rating stored in custom_field_values JSONB

import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

interface Props { task: PmoTask; fieldKey: string; }

export function RatingCell({ task, fieldKey }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const rating = rawVal !== undefined ? Number(rawVal) : 0;

  const handleClick = async (val: number) => {
    const newVal = val === rating ? 0 : val;
    setOptimisticTask(task.id, { [fieldKey]: newVal } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, newVal);
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          id={`rating-star-${task.id}-${i}`}
          onClick={e => { e.stopPropagation(); handleClick(i); }}
          className={`text-base leading-none transition-colors duration-[70ms] ${
            i <= rating ? "text-[#FDAB3D]" : "text-slate-200 hover:text-[#FDAB3D]"
          }`}
          aria-label={`Rate ${i} of 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
