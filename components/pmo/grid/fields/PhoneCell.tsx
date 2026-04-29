"use client";
// PhoneCell.tsx — Phone field with tel: action and E.164 format guidance
// Stores string in JSONB. Shows phone icon + clickable tel: link.

import { useState } from "react";
import { Phone } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

// Accepts international formats: +57 312 000 0000, (312) 000-0000, etc.
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}$/;

interface Props { task: PmoTask; fieldKey: string; }

export function PhoneCell({ task, fieldKey }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [validError, setValidError] = useState(false);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const phone = rawVal ? String(rawVal) : "";

  const startEdit = () => {
    setInputVal(phone);
    setValidError(false);
    setEditing(true);
  };

  const handleCommit = async (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !PHONE_REGEX.test(trimmed)) {
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
          <Phone className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
          <input
            type="tel"
            value={inputVal}
            autoFocus
            onChange={e => { setInputVal(e.target.value); setValidError(false); }}
            className="flex-1 py-0.5 text-[13px] text-[#323338] focus:outline-none bg-transparent"
            placeholder="+1 (555) 000-0000"
            onBlur={e => handleCommit(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCommit(inputVal);
              if (e.key === "Escape") setEditing(false);
            }}
          />
        </div>
        {validError && <span className="text-[11px] text-[#FF3D57] mt-0.5">Invalid phone format</span>}
      </div>
    );
  }

  return (
    <div
      id={`phone-cell-${task.id}-${fieldKey}`}
      className="flex items-center gap-1.5 px-2 w-full group cursor-text hover:bg-[#F5F6F8] rounded transition-colors duration-[70ms]"
      onClick={e => { e.stopPropagation(); startEdit(); }}
    >
      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          onClick={e => e.stopPropagation()}
          className="text-[13px] text-[#0086C0] hover:underline truncate"
          title={`Call ${phone}`}
        >
          {phone}
        </a>
      ) : (
        <span className="text-[12px] text-slate-300">Add phone…</span>
      )}
    </div>
  );
}
