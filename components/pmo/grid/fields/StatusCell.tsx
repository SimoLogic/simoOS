"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { TaskStatus, PmoTask } from "@/types/pmo.types";
import { ChevronDown } from "lucide-react";

interface StatusCellProps {
  task: PmoTask;
}

const statusConfig: Record<TaskStatus, { label: string; colorClass: string }> = {
  not_started: { label: "No Iniciado", colorClass: "bg-gray-200 text-gray-700" },
  in_progress: { label: "Trabajando", colorClass: "bg-vibe-blue text-white" },
  done: { label: "Listo", colorClass: "bg-green-500 text-white" },
  stuck: { label: "Estancado", colorClass: "bg-vibe-red text-white" },
  pending_review: { label: "En Revisión", colorClass: "bg-yellow-400 text-black" },
};

export const StatusCell: React.FC<StatusCellProps> = ({ task }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const setOptimisticTaskUpdate = usePmoStore((s) => s.setOptimisticTaskUpdate);
  const optimisticTasks = usePmoStore((s) => s.optimisticTasks);

  const displayStatus = optimisticTasks[task.id]?.status || task.status;
  const config = statusConfig[displayStatus];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsOpen(false);
    if (newStatus === displayStatus) return;

    // Optimistic Update
    setOptimisticTaskUpdate(task.id, { status: newStatus });

    try {
      // Assuming a Server Action exists to handle this update DB-side.
      // If none is provided, it can be added later. For now, triggering a mock update.
      console.log(`[StatusCell] Syncing new status ${newStatus} to server for task ${task.id}...`);
      // Simulating a network request:
      await new Promise(res => setTimeout(res, 500));
      
    } catch (err) {
      console.error("Failed to update status", err);
      // Revert optimistic update
      setOptimisticTaskUpdate(task.id, { status: task.status });
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-1" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-8 rounded flex items-center justify-center transition-colors text-xs font-medium group relative ${config.colorClass}`}
      >
        <span className="truncate px-2">{config.label}</span>
        {/* Unobtrusive arrow that appears on hover, following Vibe aesthetics */}
        <div className="absolute top-0 right-0 bottom-0 flex items-center px-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-r">
            <ChevronDown className="w-3 h-3" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-40 bg-white shadow-xl rounded-md border border-gray-100 z-50 overflow-hidden py-1">
          {(Object.entries(statusConfig) as [TaskStatus, typeof config][]).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded-full ${conf.colorClass.split(' ')[0]}`} />
              {conf.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
