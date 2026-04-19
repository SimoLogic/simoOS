"use client";
// FormulaCell.tsx — CRITICAL: Real formula evaluation using mathjs
// Formula is defined in column.settings.formula as a string
// e.g.: "{precio} * {cantidad}" where {fieldKey} references other columns
//
// Resolution order:
// 1. Collect all custom field values from the task
// 2. Replace {key} tokens with their numeric values
// 3. Evaluate with mathjs evaluate()
// 4. Display result (read-only). Re-evaluates reactively on task change.
//
// WRITE: The result is stored in JSONB so it's queryable.
// Formula columns are read-only in the UI — only the formula author edits.

import { useMemo, useEffect } from "react";
import { evaluate } from "mathjs";
import { Sigma, AlertCircle } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

interface Props {
  task:     PmoTask;
  fieldKey: string;
  formula:  string; // e.g. "{precio} * {cantidad}"
  format?:  "number" | "currency" | "percent";
  currency?: string;
}

/**
 * Resolves {token} references in formula to numeric values from task fields.
 * Falls back to 0 for missing/non-numeric values.
 */
function resolveFormula(formula: string, task: PmoTask, optimistic: Record<string, unknown>): string {
  return formula.replace(/\{([^}]+)\}/g, (_, key) => {
    const mergedCfv = { ...task.customFieldValues, ...optimistic };
    // Check native fields first
    const nativeMap: Record<string, string | number | undefined> = {
      title:   task.title,
      status:  task.status,
    };
    const val = nativeMap[key] ?? mergedCfv[key];
    const num = parseFloat(String(val ?? 0));
    return isNaN(num) ? "0" : String(num);
  });
}

function formatResult(val: number, format?: string, currency?: string): string {
  if (format === "currency") {
    const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
    return `${sym}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(val)}`;
  }
  if (format === "percent") return `${val.toFixed(1)}%`;
  // Default: smart rounding
  return Number.isInteger(val) ? String(val) : val.toFixed(2);
}

export function FormulaCell({ task, fieldKey, formula, format, currency }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const { tenant_id }     = useSessionStore();

  const optimisticForTask = (optimisticTasks[task.id] ?? {}) as Record<string, unknown>;

  // ── COMPUTE ──────────────────────────────────────────────────────────────────
  const { result, error } = useMemo(() => {
    if (!formula?.trim()) return { result: null, error: "No formula defined" };
    try {
      const resolved = resolveFormula(formula, task, optimisticForTask);
      const val = evaluate(resolved);
      if (typeof val !== "number" || isNaN(val)) throw new Error("Non-numeric result");
      return { result: val, error: null };
    } catch (e: unknown) {
      return { result: null, error: (e as Error).message.slice(0, 40) };
    }
  }, [formula, task, optimisticForTask]);

  // ── PERSIST result to JSONB when it changes ──────────────────────────────────
  // This makes the computed value queryable in Supabase without re-computing in SQL.
  useEffect(() => {
    if (result === null || !tenant_id) return;
    const stored = task.customFieldValues?.[fieldKey];
    if (stored === result) return; // no change — avoid infinite update

    // Fire-and-forget persist
    updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, result)
      .catch(console.error);
  }, [result, task.id, task.boardId, fieldKey, tenant_id]);

  // ── RENDER ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        id={`formula-cell-${task.id}-${fieldKey}`}
        className="flex items-center gap-1 px-2 w-full"
        title={`Formula error: ${error}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-[#FF3D57] shrink-0" />
        <span className="text-[11px] text-[#FF3D57] italic truncate">{error}</span>
      </div>
    );
  }

  return (
    <div
      id={`formula-cell-${task.id}-${fieldKey}`}
      className="flex items-center gap-1.5 px-2 w-full cursor-default"
      title={`Formula: ${formula}`}
    >
      <Sigma className="w-3 h-3 text-slate-300 shrink-0" />
      <span className="text-[13px] font-medium text-[#323338] tabular-nums">
        {formatResult(result!, format, currency)}
      </span>
    </div>
  );
}
