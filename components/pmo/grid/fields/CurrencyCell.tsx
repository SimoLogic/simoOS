"use client";
// CurrencyCell.tsx — Numeric input with configurable currency symbol (USD/COP/EUR)
// Reads/writes to custom_field_values JSONB. Format: { amount: number, currency: string }

import { useState } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",  COP: "$",  EUR: "€",  GBP: "£",  MXN: "$",
};

interface Props {
  task:     PmoTask;
  fieldKey: string;
  currency?: string; // from column.settings.currency
}

export function CurrencyCell({ task, fieldKey, currency = "USD" }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();
  const [editing, setEditing] = useState(false);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const amount = rawVal !== undefined ? Number(rawVal) : 0;
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$";

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const handleCommit = async (raw: string) => {
    const val = parseFloat(raw.replace(/[^0-9.-]/g, "")) || 0;
    setEditing(false);
    setOptimisticTask(task.id, { [fieldKey]: val } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, val);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center px-2 w-full" onClick={e => e.stopPropagation()}>
        <span className="text-[12px] text-slate-400 mr-1">{symbol}</span>
        <input
          type="number"
          defaultValue={amount}
          step="0.01"
          autoFocus
          className="flex-1 py-0.5 text-[13px] text-[#323338] font-medium focus:outline-none border-b border-[#6161FF] bg-transparent"
          onBlur={e => handleCommit(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleCommit((e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <span className="text-[11px] text-slate-400 ml-1">{currency}</span>
      </div>
    );
  }

  return (
    <div
      id={`currency-cell-${task.id}-${fieldKey}`}
      className="flex items-center gap-1 px-2 w-full cursor-text hover:bg-[#F5F6F8] rounded transition-colors duration-[70ms]"
      onClick={e => { e.stopPropagation(); setEditing(true); }}
    >
      <span className="text-[12px] text-slate-400">{symbol}</span>
      <span className="text-[13px] font-medium text-[#323338] tabular-nums">
        {amount === 0 ? <span className="text-slate-300">0.00</span> : formatted}
      </span>
      <span className="text-[11px] text-slate-400">{currency}</span>
    </div>
  );
}
