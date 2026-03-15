"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import { Activity, Clock } from "lucide-react";

interface TaskLogWidgetProps {
  itemCount?: number;
}

export const TaskLogWidget: React.FC<TaskLogWidgetProps> = ({ itemCount = 3000 }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Generate mock data for 3000 items
  const logs = React.useMemo(() => {
    return Array.from({ length: itemCount }).map((_, i) => ({
      id: i,
      user: `User ${Math.floor(i / 10)}`,
      action: i % 2 === 0 ? "updated status" : "added comment",
      task: `Task #${1000 + i}`,
      time: `${i}m ago`,
      color: i % 3 === 0 ? VibeTokens.colors.vibeBlue : VibeTokens.colors.vibePurple
    }));
  }, [itemCount]);

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-vibe-dark" />
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Activity</h3>
        </div>
        <div className="bg-vibe-blue/10 px-2 py-0.5 rounded text-[9px] font-bold text-vibe-blue uppercase">
           HPC Engine: ON ({itemCount} items)
        </div>
      </div>

      <div 
        ref={parentRef} 
        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const log = logs[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full flex items-center gap-3 px-2 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: log.color }} 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-vibe-dark truncate">
                    <span className="font-bold">{log.user}</span> {log.action} on <span className="font-medium text-vibe-blue">{log.task}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[10px] text-gray-400 font-medium">
                  <Clock className="w-3 h-3" />
                  {log.time}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style jsx>{`
        .bg-vibe-blue\/10 { background-color: rgba(0, 134, 192, 0.1); }
        .text-vibe-blue { color: ${VibeTokens.colors.vibeBlue}; }
        .text-vibe-dark { color: ${VibeTokens.colors.vibeTextPrime}; }
      `}</style>
    </div>
  );
};
