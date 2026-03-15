"use client";

import React from "react";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import { cn } from "@/lib/utils";

interface BatteryWidgetProps {
  completed: number;
  total: number;
  title?: string;
}

export const BatteryWidget: React.FC<BatteryWidgetProps> = ({ 
  completed, 
  total, 
  title = "Project Progress" 
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        <span className="text-xl font-bold text-vibe-dark">{percentage}%</span>
      </div>

      <div className="flex-1 flex items-end gap-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const isActive = (i + 1) <= (percentage / 10);
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-all duration-500",
                isActive ? "bg-vibe-green h-full" : "bg-gray-100 h-1/3"
              )}
              style={{
                backgroundColor: isActive ? VibeTokens.colors.vibeGreen : undefined
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] font-bold text-gray-400">
        <span>0%</span>
        <span>{completed} / {total} TASKS</span>
        <span>100%</span>
      </div>
      
      <style jsx>{`
        .bg-vibe-green {
            background-color: ${VibeTokens.colors.vibeGreen};
        }
      `}</style>
    </div>
  );
};
