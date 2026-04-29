"use client";
// EmailCell.tsx — Email field with mailto: action and validation
// Stores string in JSONB. Shows envelope icon + clickable mailto link.

import { useState } from "react";
import { Mail, ExternalLink } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props { task: PmoTask; fieldKey: string; }

export function EmailCell({ task, fieldKey }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [validError, setValidError] = useState(false);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const email = rawVal ? String(rawVal) : "";

  const startEdit = () => {
    setInputVal(email);
    setValidError(false);
    setEditing(true);
  };

  const handleCommit = async (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setValidError(true);
      return;
    }
    setEditing(false);
    setOptimisticTask(task.id, { [fieldKey]: trimmed || null } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, trimmed || null);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col px-2 w-full" onClick={e => e.stopPropagation()}>
        <div className={`flex items-center border-b ${validError ? "border-[#FF3D57]" : "border-[#6161FF]"}`}>
          <Mail className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
          <input
            type="email"
            value={inputVal}
            autoFocus
            onChange={e => { setInputVal(e.target.value); setValidError(false); }}
            className="flex-1 py-0.5 text-[13px] text-[#323338] focus:outline-none bg-transparent"
            placeholder="name@example.com"
            onBlur={e => handleCommit(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCommit(inputVal);
              if (e.key === "Escape") setEditing(false);
            }}
          />
        </div>
        {validError && <span className="text-[11px] text-[#FF3D57] mt-0.5">Invalid email format</span>}
      </div>
    );
  }

  return (
    <div
      id={`email-cell-${task.id}-${fieldKey}`}
      className="flex items-center gap-1.5 px-2 w-full group cursor-text hover:bg-[#F5F6F8] rounded transition-colors duration-[70ms]"
      onClick={e => { e.stopPropagation(); startEdit(); }}
    >
      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      {email ? (
        <>
          <span className="text-[13px] text-[#0086C0] truncate flex-1" title={email}>{email}</span>
          <a
            href={`mailto:${email}`}
            onClick={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Send email to ${email}`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0086C0]" />
          </a>
        </>
      ) : (
        <span className="text-[12px] text-slate-300">Add email…</span>
      )}
    </div>
  );
}
