"use client";

import React, { useMemo } from "react";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import { Users, AlertTriangle } from "lucide-react";
import { PmoBoard, PmoTask } from "@/types/pmo.types";
import { cn } from "@/lib/utils";

interface WorkloadWidgetProps {
  board: PmoBoard;
  optimisticTasks: Record<string, Partial<PmoTask>>;
}

const CAPACITY_THRESHOLD = 5;

// Mock user labels for visual polish per Prompt 26
const MOCK_USERS: Record<string, { name: string, avatar: string }> = {
    "default": { name: "Team Member", avatar: "TM" }
};

export const WorkloadWidget: React.FC<WorkloadWidgetProps> = ({ board, optimisticTasks }) => {
  const workloadData = useMemo(() => {
    const map = new Map<string, number>();
    
    board.groups?.forEach(group => {
      group.tasks?.forEach(task => {
        const optimistic = optimisticTasks[task.id] || {};
        const status = optimistic.status || task.status;
        const assignee = optimistic.assigneeId !== undefined ? optimistic.assigneeId : task.assigneeId;

        if (status !== 'done' && assignee) {
          map.set(assignee, (map.get(assignee) || 0) + 1);
        }
      });
    });

    return Array.from(map.entries()).map(([id, count]) => ({
      id,
      count,
      isOverloaded: count > CAPACITY_THRESHOLD
    })).sort((a,b) => b.count - a.count);
  }, [board, optimisticTasks]);

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-vibe-dark" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workload</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400">LIMIT: {CAPACITY_THRESHOLD}</span>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {workloadData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400 italic">
            No active assignments
          </div>
        ) : workloadData.map(person => {
          const user = MOCK_USERS[person.id] || { name: `User ${person.id.slice(0,4)}`, avatar: person.id.slice(0,2).toUpperCase() };
          const progress = Math.min((person.count / CAPACITY_THRESHOLD) * 100, 100);

          return (
            <div key={person.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                    person.isOverloaded ? "bg-action-red text-white" : "bg-gray-100 text-gray-600"
                  )}>
                    {user.avatar}
                  </div>
                  <span className={cn(
                    "text-xs font-semibold truncate max-w-[120px]",
                    person.isOverloaded ? "text-action-red" : "text-vibe-dark"
                  )}>
                    {user.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {person.isOverloaded && <AlertTriangle className="w-3 h-3 text-action-red" />}
                    <span className={cn("text-xs font-bold", person.isOverloaded ? "text-action-red" : "text-gray-500")}>
                        {person.count}
                    </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", person.isOverloaded ? "bg-action-red" : "bg-vibe-purple")} 
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: person.isOverloaded ? VibeTokens.colors.vibePink : VibeTokens.colors.vibePurple
                 }} 
                />
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .bg-action-red { background-color: ${VibeTokens.colors.vibePink}; }
        .text-action-red { color: ${VibeTokens.colors.vibePink}; }
        .bg-vibe-purple { background-color: ${VibeTokens.colors.vibePurple}; }
      `}</style>
    </div>
  );
};
