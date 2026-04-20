"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link, ExternalLink, X } from "lucide-react";
import { PmoTask } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";

interface LinkCellProps {
  task:     PmoTask;
  fieldKey: string;
}

function isValidUrl(val: string): boolean {
  try {
    const url = new URL(val.startsWith("http") ? val : `https://${val}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

export const LinkCell: React.FC<LinkCellProps> = ({ task, fieldKey }) => {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();

  const rawVal = String(
    (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey]
    ?? ""
  );

  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal]   = useState(rawVal);
  const [error, setError]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSave = async () => {
    if (inputVal && !isValidUrl(inputVal)) {
      setError(true);
      return;
    }
    setError(false);
    setIsEditing(false);
    setOptimisticTask(task.id, { [fieldKey]: inputVal } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, inputVal);
    }
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputVal("");
    setOptimisticTask(task.id, { [fieldKey]: "" } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, "");
    }
  };

  const normalizedUrl = rawVal && !rawVal.startsWith("http") ? `https://${rawVal}` : rawVal;

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center px-1 group/link">
      {isEditing ? (
        <div className="w-full flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setError(false); }}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
            onBlur={handleSave}
            className={`flex-1 text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
              error
                ? "border-red-400 focus:ring-red-300"
                : "border-[#6161FF] focus:ring-[#6161FF]/40"
            }`}
            placeholder="https://..."
          />
        </div>
      ) : rawVal ? (
        <div className="flex items-center gap-1.5 w-full">
          <a
            href={normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-[#6161FF] hover:underline truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{rawVal}</span>
          </a>
          <button
            onClick={handleClear}
            className="ml-auto opacity-0 group-hover/link:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-500 shrink-0 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#6161FF] transition-colors"
        >
          <Link className="w-3.5 h-3.5" />
          <span>Add link</span>
        </button>
      )}
      {error && (
        <div className="absolute top-10 left-0 z-50 bg-red-50 border border-red-200 text-red-600 text-xs px-2 py-1 rounded shadow">
          Invalid URL. Use https://...
        </div>
      )}
    </div>
  );
};

export default LinkCell;
