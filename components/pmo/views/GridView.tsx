"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PmoBoard, PmoGroup, PmoTask } from "@/types/pmo.types";
import { getBoardAction } from "@/app/actions/pmo/board-actions";
import { GroupHeader } from "@/components/pmo/grid/GroupHeader";
import { TextCell } from "@/components/pmo/grid/fields/TextCell";
import { StatusCell } from "@/components/pmo/grid/fields/StatusCell";
import { PersonCell } from "@/components/pmo/grid/fields/PersonCell";
import { PmoToolbar } from "@/components/pmo/navigation/PmoToolbar";
import { CommandPalette } from "@/components/pmo/navigation/CommandPalette";
import { GanttView } from "@/components/pmo/views/GanttView";
import { DashboardEngine } from "@/components/pmo/views/DashboardEngine";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { Loader2, AlertCircle } from "lucide-react";

interface GridViewProps {
  boardId: string;
  orgId: string;
}

type RowItem = 
  | { type: 'header'; group: PmoGroup; isExpanded: boolean }
  | { type: 'task'; task: PmoTask; groupColor: string };

export const GridView: React.FC<GridViewProps> = ({ boardId, orgId }) => {
  const [board, setBoard] = useState<PmoBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for expanded groups to support toggling hierarchy
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await getBoardAction(boardId, orgId);
      if (isMounted) {
        if (res.success) {
          setBoard(res.data);
          // Initialize grouping states
          const initialExpanded: Record<string, boolean> = {};
          res.data.groups?.forEach(g => {
             initialExpanded[g.id] = !g.isCollapsed;
          });
          setExpandedGroups(initialExpanded);
        } else {
          setError(res.error || "Failed to load board");
        }
        setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [boardId, orgId]);

  const activeView = usePmoStore(s => s.activeView);
  const filterStatus = usePmoStore(s => s.filterStatus);
  const filterAssignee = usePmoStore(s => s.filterAssignee);
  const globalSearchQuery = usePmoStore(s => s.globalSearchQuery);
  const optimisticTasks = usePmoStore(s => s.optimisticTasks);

  // Flatten the board groups into a 1D array for Virtualization
  const rows = useMemo(() => {
    if (!board) return [];
    const flat: RowItem[] = [];
    board.groups?.forEach(group => {
       const isExpanded = !!expandedGroups[group.id];
       
       // Filter tasks inside mapping
       const filteredTasks = group.tasks?.filter(task => {
          // Calculate actual value considering optimistic updates
          const currentStatus = optimisticTasks[task.id]?.status || task.status;
          const currentAssigneeId = optimisticTasks[task.id]?.assigneeId !== undefined 
            ? optimisticTasks[task.id]?.assigneeId 
            : task.assigneeId;
          const currentTitle = optimisticTasks[task.id]?.title || task.title;

          if (filterStatus && currentStatus !== filterStatus) return false;
          if (filterAssignee && currentAssigneeId !== filterAssignee) return false;
          if (globalSearchQuery && !currentTitle.toLowerCase().includes(globalSearchQuery.toLowerCase())) return false;
          
          return true;
       });

       flat.push({ type: 'header', group, isExpanded });
       if (isExpanded && filteredTasks) {
           filteredTasks.forEach(task => {
              flat.push({ type: 'task', task, groupColor: group.color || "#6161FF" });
           });
       }
    });
    return flat;
  }, [board, expandedGroups, filterStatus, filterAssignee, globalSearchQuery, optimisticTasks]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rows[index].type === 'header' ? 40 : 36, // Header height 40px, Task row height 36px
    overscan: 10,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (loading) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white absolute inset-0">
        <Loader2 className="w-8 h-8 animate-spin text-vibe-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center bg-white absolute inset-0 text-vibe-dark gap-2">
        <AlertCircle className="w-8 h-8 text-vibe-red" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden absolute inset-0 rounded-tl-lg shadow-sm">
      <CommandPalette orgId={orgId} />
      
      <PmoToolbar 
        boardName={board?.title || "Board"} 
        workspaceName="Ejecución de Estrategia" 
      />

      {/* Dynamic View rendering based on pmoStore */}
      {activeView === 'dashboard' ? (
        <div className="flex-1 w-full h-full relative">
           <DashboardEngine boardId={boardId} orgId={orgId} />
        </div>
      ) : activeView === 'gantt' && board ? (
        <div className="flex-1 w-full h-full relative">
           <GanttView 
              board={board} 
              orgCountryCode="CO" 
              filterStatus={filterStatus}
              filterAssignee={filterAssignee}
              optimisticTasks={optimisticTasks}
           />
        </div>
      ) : (
        <>
          {/* Grid Headers Static Row */}
          <div className="flex items-center h-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 min-w-max">
             {/* Fixed Left Checkbox/Color column spacer */}
         <div className="w-10 shrink-0 border-r border-gray-200 h-full"></div>
         {/* Task Name Column */}
         <div className="w-80 px-4 flex items-center shrink-0 border-r border-gray-200 h-full">
            Tarea
         </div>
         {/* Assignee Column */}
         <div className="w-40 px-4 flex items-center shrink-0 justify-center border-r border-gray-200 h-full">
            Responsable
         </div>
         {/* Status Column */}
         <div className="w-32 px-4 flex items-center shrink-0 justify-center border-r border-gray-200 h-full">
            Estado
         </div>
         {/* Fill remaining space */}
         <div className="flex-1 min-w-[100px] h-full"></div>
      </div>

      {/* Virtualized Body */}
      <div className="flex-1 overflow-auto w-full relative" ref={scrollRef}>
        <div
          className="w-full relative min-w-max"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isHeader = row.type === 'header';
            
            let isCriticalSLA = false;
            const today = new Date();
            if (!isHeader && row.task.dueDate && row.task.status !== "done") {
               const due = new Date(row.task.dueDate);
               // Simple approximation assuming countWorkdays has already been imported
               // Need to import WorkdayHelper at top level.
               isCriticalSLA = today > due || (due.getTime() - today.getTime()) < 86400000;
            }

            return (
              <div
                key={virtualRow.key}
                className={`absolute top-0 left-0 w-full flex items-center border-b hover:bg-gray-50/50 ${isCriticalSLA ? 'bg-rose-50/40 border-rose-100' : 'border-gray-100'}`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                 {isHeader ? (
                    <GroupHeader 
                       group={row.group} 
                       isExpanded={row.isExpanded} 
                       onToggle={() => toggleGroup(row.group.id)}
                       taskCount={row.group.tasks?.length || 0}
                    />
                 ) : (
                    <div className="flex items-center w-full h-full group/row">
                        {/* Color Strip for Task Row */}
                        <div className="w-1 shrink-0 h-full" style={{ backgroundColor: row.groupColor }}></div>
                        <div className={`w-9 shrink-0 h-full border-r border-gray-100 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity ${isCriticalSLA ? 'bg-rose-50' : ''}`}>
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-vibe-blue focus:ring-vibe-blue" />
                        </div>

                        {/* Task Title Cell */}
                        <div className="w-80 h-full border-r border-gray-100 shrink-0 flex items-center">
                            <TextCell task={row.task} />
                            {isCriticalSLA && (
                                <span className="ml-2 flex items-center shrink-0 gap-1 text-[10px] text-action-red font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200 shadow-sm" title="SLA Breach Risk < 24h">
                                   <AlertCircle className="w-3 h-3" /> SLA
                                </span>
                            )}
                        </div>
                        
                        {/* Assignee Cell */}
                        <div className="w-40 h-full border-r border-gray-100 shrink-0 flex items-center justify-center p-1">
                            <PersonCell task={row.task} />
                        </div>
                        
                        {/* Status Cell */}
                        <div className="w-32 h-full border-r border-gray-100 shrink-0 flex items-center justify-center p-1">
                            <StatusCell task={row.task} />
                        </div>
                        
                        {/* Fill remaining space */}
                        <div className="flex-1 h-full min-w-[100px]"></div>
                    </div>
                 )}
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default GridView;
