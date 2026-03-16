"use client";

import React, { useMemo, useState } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import { PmoBoard, PmoTask } from "@/types/pmo.types";
import { BatteryWidget } from "@/components/pmo/widgets/BatteryWidget";
import { WorkloadWidget } from "@/components/pmo/widgets/WorkloadWidget";
import { AlertCircle, ZapOff, LayoutDashboard, Terminal } from "lucide-react";
import { TaskLogWidget } from "@/components/pmo/widgets/TaskLogWidget";
import type { LayoutItem } from "react-grid-layout";
// CJS interop: cast to any to bypass react-grid-layout type conflicts
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const ReactGridLayout = (require("react-grid-layout") as any).default ||
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  (require("react-grid-layout") as any);
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const WidthProvider = (require("react-grid-layout") as any).WidthProvider;
const GridLayout = WidthProvider(ReactGridLayout) as React.ComponentType<{
  className?: string;
  layout: LayoutItem[];
  cols: number;
  rowHeight: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  margin?: [number, number];
  children?: React.ReactNode;
}>;

interface DashboardViewProps {
  board: PmoBoard;
  optimisticTasks: Record<string, Partial<PmoTask>>;
}

// mondayDB limits constants (Literal per Prompt 26)
export const WIDGETS_WARNING_THRESHOLD = 30;
export const WIDGETS_AI_DISABLE_THRESHOLD = 50;
export const ITEMS_HPC_THRESHOLD = 3000;

export const DashboardView: React.FC<DashboardViewProps> = ({ board, optimisticTasks }) => {
  const [widgets] = useState([
    { id: "battery", type: "battery", x: 0, y: 0, w: 4, h: 4 },
    { id: "workload", type: "workload", x: 4, y: 0, w: 8, h: 4 },
    { id: "activity", type: "activity", x: 0, y: 4, w: 12, h: 6 },
  ]);

  const widgetCount = widgets.length;
  const isNearLimit = widgetCount >= WIDGETS_WARNING_THRESHOLD;
  const isAiDisabled = widgetCount > WIDGETS_AI_DISABLE_THRESHOLD;

  const metrics = useMemo(() => {
    let total = 0;
    let completed = 0;
    board.groups?.forEach(g => {
        g.tasks?.forEach(t => {
            total++;
            const status = optimisticTasks[t.id]?.status || t.status;
            if (status === 'done') completed++;
        });
    });
    return { total, completed };
  }, [board, optimisticTasks]);

  const layout = widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }));

  return (
    <div className="h-full bg-gray-50 overflow-y-auto relative flex flex-col">
      {/* mondayDB Limits Banner */}
      {isNearLimit && (
        <div 
          className="w-full px-6 py-3 flex items-center gap-3 border-b sticky top-0 z-20"
          style={{ 
            backgroundColor: `${VibeTokens.colors.vibeOrange}15`, 
            borderColor: VibeTokens.colors.vibeOrange, 
            color: VibeTokens.colors.vibeOrange 
          }}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isAiDisabled 
              ? "AI Features Disabled: Exceeded 50 widgets limit" 
              : `Warning: Approaching performance limit (${widgetCount}/${WIDGETS_WARNING_THRESHOLD} widgets)`
            }
          </span>
          {isAiDisabled && <ZapOff className="w-4 h-4 ml-auto" />}
        </div>
      )}

      <div className="p-8 flex-1">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-vibe-purple/10 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-vibe-purple" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{board.title} Dashboard</h2>
                    <p className="text-xs text-gray-500 font-medium">Project Insights & Performance</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Widgets</span>
                    <span className="text-sm font-bold text-vibe-dark">{widgetCount}</span>
                </div>
                {board.groups.flatMap(g => g.tasks).length > ITEMS_HPC_THRESHOLD && (
                   <div className="bg-vibe-blue/10 px-3 py-1.5 rounded-lg border border-vibe-blue/20 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-vibe-blue uppercase">HPC MODE</span>
                        <span className="text-sm font-bold text-vibe-blue">ACTIVE</span>
                   </div>
                )}
            </div>
        </div>

        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={80}
          isDraggable={true}
          isResizable={true}
          margin={[16, 16]}
        >
          <div key="battery">
            <BatteryWidget completed={metrics.completed} total={metrics.total} />
          </div>
          <div key="workload">
            <WorkloadWidget board={board} optimisticTasks={optimisticTasks} />
          </div>
          <div key="activity">
            <TaskLogWidget />
          </div>
        </GridLayout>
      </div>

      <style jsx>{`
        .bg-vibe-purple\/10 { background-color: rgba(97, 97, 255, 0.1); }
        .text-vibe-purple { color: ${VibeTokens.colors.vibePurple}; }
        .text-vibe-dark { color: ${VibeTokens.colors.vibeTextPrime}; }
        .text-vibe-blue { color: ${VibeTokens.colors.vibeBlue}; }
        .bg-vibe-blue\/10 { background-color: rgba(0, 134, 192, 0.1); }
        .border-vibe-blue\/20 { border-color: rgba(0, 134, 192, 0.2); }
      `}</style>
    </div>
  );
};

export default DashboardView;
