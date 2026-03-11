"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { PmoTask } from "@/types/pmo.types";

interface TextCellProps {
  task: PmoTask;
}

export const TextCell: React.FC<TextCellProps> = ({ task }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const setOptimisticTaskUpdate = usePmoStore((s) => s.setOptimisticTaskUpdate);
  const optimisticTasks = usePmoStore((s) => s.optimisticTasks);

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
    }
  }, [isEditing]);

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
    </div>
  );
};
