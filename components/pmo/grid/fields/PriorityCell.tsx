"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { PmoTask, TaskPriority } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";

const priorityConfig: Record<TaskPriority, { label: string; colorClass: string; icon: React.ElementType }> = {
  critical: { label: "Critical",  colorClass: "bg-[#FF3D57] text-white",  icon: AlertTriangle },
  high:     { label: "High",      colorClass: "bg-[#FDAB3D] text-white",  icon: ArrowUp },
  medium:   { label: "Medium",    colorClass: "bg-[#579BFC] text-white",  icon: Minus },
  low:      { label: "Low",       colorClass: "bg-slate-200 text-slate-700", icon: ArrowDown },
};

interface PriorityCellProps {
  task: PmoTask;
}

export const PriorityCell: React.FC<PriorityCellProps> = ({ task }) => {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const containerRef      = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayPriority = (optimisticTasks[task.id]?.priority ?? task.priority) as TaskPriority | undefined;
  const config = displayPriority ? priorityConfig[displayPriority] : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (priority: TaskPriority) => {
    setIsOpen(false);
    if (priority === displayPriority) return;
    setOptimisticTask(task.id, { priority });
    // Note: actual DB persistence handled by bulkUpdateTasksAction or task-actions in SidePeek
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center p-1">
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-1.5 w-full h-8 px-2.5 rounded text-xs font-semibold transition-colors group ${
          config ? config.colorClass : "bg-slate-100 text-slate-400 hover:bg-slate-200"
        }`}
      >
        {config ? (
          <>
            <config.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{config.label}</span>
          </>
        ) : (
          <span className="text-slate-400">Set priority</span>
        )}
        <ChevronDown className="w-3 h-3 ml-auto opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute top-10 left-0 w-40 bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden py-1">
          {(Object.entries(priorityConfig) as [TaskPriority, typeof priorityConfig[TaskPriority]][]).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${conf.colorClass.split(" ")[0]}`} />
              {conf.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriorityCell;
