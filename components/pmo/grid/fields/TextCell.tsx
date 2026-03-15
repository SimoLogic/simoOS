"use client";

import React, { useState, useRef, useEffect } from "react";
import { PmoTask } from "@/types/pmo.types";
import { usePresence } from "@/components/pmo/shared/PresenceProvider";
import { PresenceBadge } from "@/components/pmo/shared/PresenceBadge";
import { useSessionStore } from "@/lib/session-store";
import { usePmoStore } from "@/lib/stores/pmo.store";

interface TextCellProps {
  task: PmoTask;
}

export const TextCell: React.FC<TextCellProps> = ({ task }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const setOptimisticTaskUpdate = usePmoStore((s) => s.setOptimisticTaskUpdate);
  const optimisticTasks = usePmoStore((s) => s.optimisticTasks);
  
  const { presentUsers, updateCursor } = usePresence();
  const cellId = `${task.id}-title`;
  const user_ide = useSessionStore(s => s.user_ide);
  
  const remoteUsersInCell = presentUsers.filter(u => u.activeCellId === cellId && u.userId !== user_ide);

  const displayTitle = optimisticTasks[task.id]?.title || task.title;
  const [localTitle, setLocalTitle] = useState(displayTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(displayTitle);
  }, [displayTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      updateCursor(cellId);
    } else if (!isEditing) {
      updateCursor(null);
    }
  }, [isEditing, cellId]);

  const commitChanges = async () => {
    setIsEditing(false);
    if (localTitle.trim() === displayTitle || localTitle.trim() === "") {
        setLocalTitle(displayTitle); // reset if empty or no change
        return;
    }

    setOptimisticTaskUpdate(task.id, { title: localTitle.trim() });

    try {
      console.log(`[TextCell] Syncing title to server for task ${task.id}...`);
      await new Promise(res => setTimeout(res, 500));
    } catch (error) {
       console.error("Failed to update title", error);
       setOptimisticTaskUpdate(task.id, { title: task.title });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitChanges();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setLocalTitle(displayTitle);
    }
  };

  if (isEditing) {
    return (
      <div className="w-full h-full p-2 flex items-center">
        <input
          ref={inputRef}
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={commitChanges}
          onKeyDown={handleKeyDown}
          className="w-full text-sm outline-none bg-blue-50/50 border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-vibe-blue transition-all"
        />
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2 flex items-center cursor-pointer group hover:bg-gray-50 transition-colors rounded"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm text-gray-800 truncate select-none group-hover:text-vibe-dark">
        {displayTitle}
      </span>
      <PresenceBadge users={remoteUsersInCell} className="ml-auto" />
    </div>
  );
};
