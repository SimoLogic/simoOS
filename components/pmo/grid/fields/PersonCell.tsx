"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { PmoTask } from "@/types/pmo.types";
import { UserCircle } from "lucide-react";

// Mock users for Assignee dropdown
const mockUsers = [
  { id: "usr1", name: "David Gomez" },
  { id: "usr2", name: "Laura Martinez" },
  { id: "usr3", name: "Carlos Perez" },
];

interface PersonCellProps {
  task: PmoTask;
}

export const PersonCell: React.FC<PersonCellProps> = ({ task }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const setOptimisticTaskUpdate = usePmoStore((s) => s.setOptimisticTaskUpdate);
  const optimisticTasks = usePmoStore((s) => s.optimisticTasks);

  const displayAssigneeId = optimisticTasks[task.id]?.assigneeId || task.assigneeId;
  const currentAssignee = mockUsers.find(u => u.id === displayAssigneeId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAssign = async (userId: string | undefined) => {
    setIsOpen(false);
    if (userId === displayAssigneeId) return;

    setOptimisticTaskUpdate(task.id, { assigneeId: userId });

    try {
      console.log(`[PersonCell] Syncing assignee override to server for task ${task.id}...`);
      await new Promise(res => setTimeout(res, 500));
    } catch (err) {
      console.error("Failed to update assignee", err);
      setOptimisticTaskUpdate(task.id, { assigneeId: task.assigneeId });
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-1" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 flex flex-col items-center justify-center transition-colors group relative rounded-full hover:bg-gray-100"
      >
        {currentAssignee ? (
            <div className="flex items-center gap-2 px-2 bg-indigo-50 border border-indigo-100 text-vibe-dark rounded-full h-full w-full justify-center">
               <UserCircle className="w-4 h-4 text-vibe-blue" />
               <span className="text-xs font-medium truncate">{currentAssignee.name}</span>
            </div>
        ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center text-gray-400 group-hover:text-gray-600">
                <UserCircle className="w-5 h-5" />
            </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-white shadow-xl rounded-md border border-gray-100 z-50 overflow-hidden py-1">
          <button
            onClick={() => handleAssign(undefined)}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 flex items-center gap-2"
          >
            <UserCircle className="w-4 h-4" />
            Sin Asignar
          </button>
          {mockUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => handleAssign(u.id)}
              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 text-vibe-dark"
            >
              <div className="w-6 h-6 rounded-full bg-vibe-blue/10 flex items-center justify-center text-vibe-blue">
                 {u.name.charAt(0)}
              </div>
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
