"use client";
// DropdownCell.tsx — Single-select from column.settings.options list
// Each option: { id: string, label: string, color?: string }
// Stores selected option id (string) in JSONB

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

interface Option { id: string; label: string; color?: string; }

interface Props {
  task:     PmoTask;
  fieldKey: string;
  options:  Option[];
}

export function DropdownCell({ task, fieldKey, options }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const selectedId = rawVal ? String(rawVal) : null;
  const selected   = options.find(o => o.id === selectedId);

  const handleSelect = async (opt: Option | null) => {
    const val = opt?.id ?? null;
    setOpen(false);
    setOptimisticTask(task.id, { [fieldKey]: val } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, val);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center"
      id={`dropdown-cell-${task.id}-${fieldKey}`}
    >
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#F5F6F8] rounded transition-colors duration-[70ms]"
      >
        {selected ? (
          <span className="flex items-center gap-1.5">
            {selected.color && (
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
            )}
            <span className="text-[13px] text-[#323338]">{selected.label}</span>
          </span>
        ) : (
          <span className="text-[12px] text-slate-300">Select…</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-[70] mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
          style={{ minWidth: 180 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="py-1 max-h-48 overflow-y-auto">
            {/* Clear option */}
            <button
              onClick={() => handleSelect(null)}
              className="w-full flex items-center px-3 py-1.5 hover:bg-slate-50 text-[13px] text-slate-400 italic"
            >
              — None
            </button>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left"
              >
                {opt.color && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                )}
                <span className="flex-1 text-[13px] text-[#323338]">{opt.label}</span>
                {selectedId === opt.id && <Check className="w-3.5 h-3.5 text-[#6161FF] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
