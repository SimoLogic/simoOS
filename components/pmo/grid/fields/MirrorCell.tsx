"use client";

import React from "react";
import type { PmoTask } from "@/types/pmo.types";

interface Props {
  task?: PmoTask;
}

export function MirrorCell({ task }: Props) {
  return (
    <div className="flex items-center gap-1 px-2 w-full opacity-50" title="Mirror columns require cross-board configuration">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-slate-400">
        <path d="M8 5v14M16 5v14M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className="text-[11px] text-slate-400 italic">Mirror</span>
    </div>
  );
}
