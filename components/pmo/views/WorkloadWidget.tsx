"use client";

import React, { useMemo } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { Users, AlertTriangle } from "lucide-react";

// The simulated capacity threshold. If a user exceeds this active limit, trigger Action Red.
const CAPACITY_THRESHOLD = 5;

// Mock dictionary mapping assignee IDs to names/avatars 
// (In a real app, this comes from an Identity Store or the `users` table via JOIN)
const MOCK_USER_DICT: Record<string, { name: string, avatar: string }> = {
    "emp_luna_10": { name: "Sofía Luna", avatar: "SL" },
    "emp_vega_02": { name: "Carlos Vega", avatar: "CV" },
    "emp_cruz_15": { name: "Ana Cruz", avatar: "AC" },
    "emp_rios_04": { name: "David Ríos", avatar: "DR" },
    "user_ana_id": { name: "Ana (Marketing)", avatar: "AM" },
};

import { PmoBoard, PmoGroup, PmoTask } from "@/types/pmo.types";
import { getBoardAction } from "@/app/actions/pmo/board-actions";

export const WorkloadWidget = ({ boardId }: { boardId: string }) => {
    const [board, setBoard] = React.useState<PmoBoard | null>(null);
    const optimisticTasks = usePmoStore((s) => s.optimisticTasks);

    React.useEffect(() => {
        async function load() {
            // orgId is required, we can get it from store or generic
            const res = await getBoardAction(boardId, "org-1"); 
            if (res.success) setBoard(res.data);
        }
        load();
    }, [boardId]);

    // 2. Aggregate Workload
    const workloadMap = useMemo(() => {
        if (!board) return new Map<string, number>();

        const map = new Map<string, number>();

        board.groups?.forEach((group: PmoGroup) => {
            group.tasks?.forEach((task: PmoTask) => {
                // Apply optimistic state
                const currentStatus = optimisticTasks[task.id]?.status || task.status;
                const currentAssignee = optimisticTasks[task.id]?.assigneeId !== undefined 
                    ? optimisticTasks[task.id]?.assigneeId 
                    : task.assigneeId;

                // Only count non-completed tasks
                if (currentStatus !== "done" && currentAssignee) {
                    map.set(currentAssignee, (map.get(currentAssignee) || 0) + 1);
                }
            });
        });
        
        return map;
    }, [board, optimisticTasks]);

    // 3. Format strictly to render array
    const workloadList = Array.from(workloadMap.entries())
        .map(([assigneeId, count]) => {
            const user = MOCK_USER_DICT[assigneeId] || { name: `Unknown (${assigneeId.substring(0,4)})`, avatar: "?" };
            return {
                id: assigneeId,
                name: user.name,
                avatar: user.avatar,
                count,
                isOverloaded: count > CAPACITY_THRESHOLD
            };
        })
        .sort((a, b) => b.count - a.count); // Highest load first

    if (!workloadList.length) return null; // Hide if no assignees have active tasks

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-[300px] flex-1">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#001e42]" />
                    <h3 className="text-sm font-bold text-vibe-dark uppercase tracking-widest leading-none mt-1">
                        People Workload
                    </h3>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-400">
                    Max: {CAPACITY_THRESHOLD}
                </span>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
                {workloadList.map(person => {
                   // Vibe Token UI rules apply here
                   const percent = Math.min((person.count / CAPACITY_THRESHOLD) * 100, 100);
                   const isCritical = person.isOverloaded;

                   return (
                       <div key={person.id} className="flex flex-col gap-2">
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                                       ${isCritical ? 'bg-action-red text-white' : 'bg-gray-100 text-gray-500'}`}
                                  >
                                      {person.avatar}
                                  </div>
                                  <span className={`text-sm font-semibold truncate max-w-[150px] ${isCritical ? 'text-action-red' : 'text-vibe-dark'}`}>
                                      {person.name}
                                  </span>
                               </div>
                               
                               <div className="flex items-center gap-2">
                                   {isCritical && <AlertTriangle className="w-4 h-4 text-action-red" />}
                                   <span className={`text-xs font-bold font-mono ${isCritical ? 'text-action-red' : 'text-gray-500'}`}>
                                       {person.count} <span className="text-[10px] text-gray-300">/ {CAPACITY_THRESHOLD}</span>
                                   </span>
                               </div>
                           </div>

                           {/* Capacity Bar */}
                           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shrink-0">
                               <div 
                                  className={`h-full rounded-full transition-all duration-300 ease-out 
                                     ${isCritical ? 'bg-action-red' : 'bg-[#002B5B]'}`}
                                  style={{ width: `${percent}%` }}
                               />
                           </div>
                       </div>
                   );
                })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
               <p className="text-[11px] text-gray-400 text-center font-medium">Workload includes only pending tasks (Current Board)</p>
            </div>
        </div>
    );
};
