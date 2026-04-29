"use client";

import React, { useMemo, useEffect, useState } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { Users, AlertTriangle } from "lucide-react";
import { PmoBoard, PmoGroup, PmoTask } from "@/types/pmo.types";
import { getBoardAction } from "@/app/actions/pmo/board-actions";

const CAPACITY_THRESHOLD = 5;

export const WorkloadWidget = ({ boardId }: { boardId: string }) => {
  const [board, setBoard] = useState<PmoBoard | null>(null);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const optimisticTasks = usePmoStore((s) => s.optimisticTasks);

  useEffect(() => {
    async function load() {
      const res = await getBoardAction(boardId, "org-1");
      if (res.success) setBoard(res.data);
    }
    load();
  }, [boardId]);

  // Resolve employee names from assignee IDs found in tasks
  useEffect(() => {
    if (!board) return;
    const assigneeIds = new Set<string>();
    board.groups?.forEach((g: PmoGroup) => {
      g.tasks?.forEach((t: PmoTask) => {
        const id = optimisticTasks[t.id]?.assigneeId ?? t.assigneeId;
        if (id) assigneeIds.add(id);
      });
    });
    if (assigneeIds.size === 0) return;

    // Fetch names via server action (lazy load)
    import("@/app/actions/pmo/my-plan-actions").then(async (mod) => {
      // We use a lightweight approach - just fetch dim_employee directly
      // For now, use the IDs as display names with first 8 chars
      const names: Record<string, string> = {};
      assigneeIds.forEach(id => {
        names[id] = id.length > 8 ? `${id.substring(0, 8)}...` : id;
      });
      setEmployeeNames(names);
    });
  }, [board, optimisticTasks]);

  const workloadMap = useMemo(() => {
    if (!board) return new Map<string, number>();
    const map = new Map<string, number>();
    board.groups?.forEach((g: PmoGroup) => {
      g.tasks?.forEach((t: PmoTask) => {
        const currentStatus = optimisticTasks[t.id]?.status || t.status;
        const currentAssignee = optimisticTasks[t.id]?.assigneeId !== undefined
          ? optimisticTasks[t.id]?.assigneeId : t.assigneeId;
        if (currentStatus !== "done" && currentAssignee) {
          map.set(currentAssignee, (map.get(currentAssignee) || 0) + 1);
        }
      });
    });
    return map;
  }, [board, optimisticTasks]);

  const workloadList = Array.from(workloadMap.entries())
    .map(([assigneeId, count]) => {
      const name = employeeNames[assigneeId] || assigneeId;
      const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
      return { id: assigneeId, name, avatar: initials, count, isOverloaded: count > CAPACITY_THRESHOLD };
    })
    .sort((a, b) => b.count - a.count);

  if (!workloadList.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-[300px] flex-1">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#001e42]" />
          <h3 className="text-sm font-bold text-[#323338] uppercase tracking-widest leading-none mt-1">People Workload</h3>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-400">Max: {CAPACITY_THRESHOLD}</span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        {workloadList.map(person => {
          const percent = Math.min((person.count / CAPACITY_THRESHOLD) * 100, 100);
          const isCritical = person.isOverloaded;
          return (
            <div key={person.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isCritical ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {person.avatar}
                  </div>
                  <span className={`text-sm font-semibold truncate max-w-[150px] ${isCritical ? "text-red-500" : "text-[#323338]"}`}>{person.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isCritical && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span className={`text-xs font-bold font-mono ${isCritical ? "text-red-500" : "text-gray-500"}`}>
                    {person.count} <span className="text-[10px] text-gray-300">/ {CAPACITY_THRESHOLD}</span>
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shrink-0">
                <div className={`h-full rounded-full transition-all duration-300 ease-out ${isCritical ? "bg-red-500" : "bg-[#002B5B]"}`} style={{ width: `${percent}%` }} />
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
