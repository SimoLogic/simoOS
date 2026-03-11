"use client";

import React, { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { addDays, differenceInDays, format, isSameDay, startOfDay } from "date-fns";
import { PmoBoard, PmoGroup, PmoTask } from "@/types/pmo.types";
import { isWorkday } from "@/lib/workday-helper";
import { GroupHeader } from "@/components/pmo/grid/GroupHeader";
import { TextCell } from "@/components/pmo/grid/fields/TextCell";

interface GanttViewProps {
  board: PmoBoard;
  orgCountryCode?: string; // Default 'CO' handled by WorkdayHelper
  filterStatus?: string | null;
  filterAssignee?: string | null;
  optimisticTasks: Record<string, Partial<PmoTask>>;
}

type RowItem = 
  | { type: 'header'; group: PmoGroup; isExpanded: boolean }
  | { type: 'task'; task: PmoTask; groupColor: string };

const DAYS_TO_SHOW = 60; // 2 Months view
const CELL_WIDTH = 40; // High-Density width per day strip

export const GanttView: React.FC<GanttViewProps> = ({ 
  board, 
  orgCountryCode = "CO", 
  filterStatus, 
  filterAssignee, 
  optimisticTasks 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    board.groups?.forEach(g => {
       initial[g.id] = !g.isCollapsed;
    });
    return initial;
  });

  // ── Timeline Generation ──
  const timelineDates = useMemo(() => {
    const today = startOfDay(new Date());
    // Start timeline 5 days before today to give some padding
    const start = addDays(today, -5); 
    const dates = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
       const date = addDays(start, i);
       // Check if it's a workday via WorkdayHelper
       const workday = isWorkday(date, orgCountryCode);
       dates.push({ date, isWorkday: workday, isToday: isSameDay(date, today) });
    }
    return { start, dates };
  }, [orgCountryCode]);

  // ── Flattened Rows (similar to GridView) ──
  const rows = useMemo(() => {
    const flat: RowItem[] = [];
    board.groups?.forEach(group => {
       const isExpanded = !!expandedGroups[group.id];
       
       const filteredTasks = group.tasks?.filter(task => {
          const currentStatus = optimisticTasks[task.id]?.status || task.status;
          const currentAssigneeId = optimisticTasks[task.id]?.assigneeId !== undefined 
            ? optimisticTasks[task.id]?.assigneeId 
            : task.assigneeId;

          if (filterStatus && currentStatus !== filterStatus) return false;
          if (filterAssignee && currentAssigneeId !== filterAssignee) return false;
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
  }, [board, expandedGroups, filterStatus, filterAssignee, optimisticTasks]);

  // ── Virtualization ──
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => rows[index].type === 'header' ? 40 : 36,
    overscan: 10,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  /** Calculation for rendering the task's timeline bar */
  const getTaskBarStyles = (task: PmoTask) => {
    // If no specific due date, we just return empty or default placement.
    // Ideally, tasks would have startDate and dueDate. Since only dueDate exists in PmoTask, 
    // we assume a 1-day bar or estimate from creation if required. Here we render a 3-day bar ending on dueDate.
    if (!task.dueDate) return null;

    const due = startOfDay(new Date(task.dueDate));
    const startOffsetDays = differenceInDays(addDays(due, -2), timelineDates.start);
    const lengthDays = 3; // Fixed 3 day estimation for demo
    
    // Bounds check
    if (startOffsetDays + lengthDays < 0 || startOffsetDays > DAYS_TO_SHOW) return null;

    const left = Math.max(0, startOffsetDays * CELL_WIDTH);
    const end = Math.min(DAYS_TO_SHOW * CELL_WIDTH, (startOffsetDays + lengthDays) * CELL_WIDTH);
    const width = end - left;

    return { left, width };
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden relative border-t border-gray-200">
      
      {/* ── HEADER ROW ── */}
      <div className="flex z-10 sticky top-0 bg-white border-b border-gray-200 shadow-sm min-w-max h-12">
        {/* Left Frozen Pane (Task Name) */}
        <div className="w-[350px] shrink-0 border-r border-gray-200 relative flex items-center justify-center bg-gray-50 text-xs font-semibold text-gray-500">
           Tarea
        </div>
        
        {/* Right Scrollable Timeline Header */}
        <div className="flex h-full">
            {timelineDates.dates.map((d, i) => (
                <div 
                  key={i} 
                  className={`w-[40px] shrink-0 border-r border-gray-100 flex flex-col items-center justify-center text-[10px] 
                    ${d.isToday ? 'bg-blue-50 text-vibe-blue font-bold border-b-2 border-b-vibe-blue' : 'text-gray-400 font-medium'}
                    ${!d.isWorkday ? 'bg-gray-100/60' : ''}
                  `}
                >
                    <span className="uppercase">{format(d.date, "E")}</span>
                    <span>{format(d.date, "d")}</span>
                </div>
            ))}
        </div>
      </div>

      {/* ── VIRTUALIZED BODY ── */}
      <div className="flex-1 overflow-auto w-full relative" ref={containerRef}>
        <div
          className="w-full relative min-w-max"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isHeader = row.type === 'header';

            return (
              <div
                key={virtualRow.key}
                className="absolute top-0 left-0 flex w-full border-b border-gray-100 hover:bg-gray-50/30"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                  {/* LEFT PANE (Task Information) */}
                  <div className={`w-[350px] shrink-0 border-r border-gray-200 bg-white z-10 ${isHeader ? 'bg-gray-50/50' : ''}`}>
                    {isHeader ? (
                        <GroupHeader 
                          group={row.group} 
                          isExpanded={row.isExpanded} 
                          onToggle={() => toggleGroup(row.group.id)}
                          taskCount={row.group.tasks?.length || 0}
                        />
                    ) : (
                        <div className="flex items-center w-full h-full">
                           <div className="w-1 shrink-0 h-full" style={{ backgroundColor: row.groupColor }}></div>
                           <div className="px-3 w-full h-full flex items-center">
                              <TextCell task={row.task} />
                           </div>
                        </div>
                    )}
                  </div>

                  {/* RIGHT PANE (Timeline Grid & Bars) */}
                  <div className="flex relative items-center">
                     {/* Background Grid Cells */}
                     {timelineDates.dates.map((d, i) => (
                         <div 
                           key={i} 
                           className={`w-[40px] shrink-0 h-full border-r border-gray-50
                             ${d.isToday ? 'bg-blue-50/30' : ''}
                             ${!d.isWorkday ? 'bg-gray-100/60 [background-image:repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.02)_2px,rgba(0,0,0,0.02)_4px)]' : ''}
                           `}
                         />
                     ))}

                     {/* Task Bar Overlay (Only for Tasks, not Headers) */}
                     {!isHeader && row.type === 'task' && (
                         (() => {
                           const barStyle = getTaskBarStyles(row.task);
                           if (!barStyle) return null;

                           // LLAVE #3: Protected styling (Simo IS Playbook Source)
                           const isProtected = row.task.isProtected;

                           return (
                             <div 
                                className={`absolute h-[24px] rounded-full shadow-sm flex items-center px-3 text-xs font-semibold overflow-hidden transition-all duration-100
                                  ${isProtected 
                                      ? 'cursor-not-allowed pointer-events-none bg-slate-700/80 text-white border-2 border-slate-800 [background-image:repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] border-dashed' 
                                      : 'cursor-grab hover:brightness-110 active:cursor-grabbing text-white border border-black/10 hover:shadow-md'
                                  }
                                `}
                                style={{ 
                                  left: `${barStyle.left + 4}px`, // +4px margin inside cell
                                  width: `${barStyle.width - 8}px`, // -8px total margins
                                  backgroundColor: !isProtected ? row.groupColor : undefined
                                }}
                                title={isProtected ? "Protegido: Creado por Simo IS Playbook (No Editable)" : row.task.title}
                             >
                                <span className="truncate w-full relative z-10">{row.task.title}</span>
                             </div>
                           );
                         })()
                     )}
                  </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
