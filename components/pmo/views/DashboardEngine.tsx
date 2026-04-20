"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// DashboardEngine V2 — DUAL NATURE PROPS
// ═══════════════════════════════════════════════════════════════════════════════
//
// MODE 1 — Ad-hoc (MyPlanShell / MyProjects):
//   <DashboardEngine defaultBoardIds={[boardId]} orgId={orgId} />
//   → Renders the 3 default widgets statically. No pmo_panels dependencies.
//
// MODE 2 — Global Panel (S-15 Cross-Board):
//   <DashboardEngine panelId={panel.id} orgId={orgId} />
//   → Fetches widgets & sourceBoardIds from pmo_panels. Renders unified layout.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState, useCallback } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { getCrossBoardHealthAction, type ProjectHealthMetrics } from "@/app/actions/pmo/dashboard-actions";
import { getPanelByIdAction, updatePanelAction, type PmoPanel, type PanelWidget } from "@/app/actions/pmo/panel-actions";
import { usePmoStore } from "@/lib/stores/pmo.store";

import { BatteryWidget } from "@/components/pmo/widgets/BatteryWidget";
import { WorkloadWidget } from "@/components/pmo/views/WorkloadWidget";
import { TaskLogWidget } from "@/components/pmo/widgets/TaskLogWidget";

import { AlertCircle, LayoutDashboard, Loader2, Save, Layers, Play } from "lucide-react";
import type { LayoutItem } from "react-grid-layout";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const ReactGridLayout = (require("react-grid-layout") as any).default || (require("react-grid-layout") as any);
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const WidthProvider = (require("react-grid-layout") as any).WidthProvider;
const GridLayout = WidthProvider(ReactGridLayout) as React.ComponentType<{
  className?: string; layout: LayoutItem[]; cols: number; rowHeight: number;
  isDraggable?: boolean; isResizable?: boolean; margin?: [number, number];
  onLayoutChange?: (layout: LayoutItem[]) => void; children?: React.ReactNode;
}>;

const V = {
  purple: "#6161FF", green: "#00CA72", blue: "#0086C0",
  orange: "#FDAB3D", red: "#E5484D", dark: "#323338",
  muted: "#676879", bg: "#F7F8FA",
} as const;

export const WIDGETS_WARNING_THRESHOLD = 30;

interface DashboardEngineProps {
  panelId?: string;
  defaultBoardIds?: string[];
  orgId: string;
  isReadOnly?: boolean;
}

const DEFAULT_WIDGETS_FACTORY = (boardIds: string[]): PanelWidget[] => [
  { id: "battery", type: "battery", sourceBoardIds: boardIds, x: 0, y: 0, w: 4, h: 4, config: {} },
  { id: "workload", type: "workload", sourceBoardIds: boardIds, x: 4, y: 0, w: 8, h: 4, config: {} },
  { id: "activity", type: "activity", sourceBoardIds: boardIds, x: 0, y: 4, w: 12, h: 6, config: {} },
];

export function DashboardEngine({ panelId, defaultBoardIds, orgId, isReadOnly }: DashboardEngineProps) {
  const [panel, setPanel] = useState<PmoPanel | null>(null);
  const [widgets, setWidgets] = useState<PanelWidget[]>([]);
  const [metrics, setMetrics] = useState<ProjectHealthMetrics | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimisticTasks = usePmoStore(s => s.optimisticTasks);

  const isCrossBoard = !!panelId;
  const resolvedTitle = isCrossBoard ? (panel?.name ?? "Global Panel") : "Dashboard Engine";
  const resolvedSubtitle = isCrossBoard ? "Cross-Board Multidimensional Insights" : "Project Execution View";

  // 1. Resolve Widgets (Dual Nature)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);

      // MODO GLOBAL (S-15)
      if (panelId) {
        const res = await getPanelByIdAction(panelId, orgId);
        if (!alive) return;
        if (res.success && res.data) {
          setPanel(res.data);
          setWidgets(res.data.config.widgets || []);
        } else {
          setError(res.error || "Failed to load global panel configuration.");
        }
      } 
      // MODO AD-HOC (S-16 retrocompatibilidad)
      else if (defaultBoardIds && defaultBoardIds.length > 0) {
        setWidgets(DEFAULT_WIDGETS_FACTORY(defaultBoardIds));
      } else {
        setError("Invalid configuration: Neither panelId nor defaultBoardIds provided.");
      }

      setLoading(false);
    })();
    return () => { alive = false; };
  }, [panelId, defaultBoardIds, orgId]);

  // 2. Fetch Aggregated Metrics for everything requested by widgets
  const uniqueBoardIds = useMemo(() => {
    const ids = new Set<string>();
    widgets.forEach(w => {
      w.sourceBoardIds?.forEach(id => ids.add(id));
    });
    return Array.from(ids);
  }, [widgets]);

  const boardsKey = uniqueBoardIds.join(",");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (uniqueBoardIds.length === 0) return;
      const res = await getCrossBoardHealthAction(uniqueBoardIds, orgId);
      if (!alive) return;
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardsKey, orgId, optimisticTasks]);

  const layout = widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }));

  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    if (isReadOnly) return;
    setWidgets(prev =>
      prev.map(w => {
        const item = newLayout.find(l => l.i === w.id);
        return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
      })
    );
    setDirty(true);
  }, [isReadOnly]);

  const handleSave = async () => {
    if (!panelId || isReadOnly) return;
    setSaving(true);
    try {
      const res = await updatePanelAction(panelId, orgId, { config: { widgets } });
      if (res.success) setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const widgetCount = widgets.length;
  const isNearLimit = widgetCount >= WIDGETS_WARNING_THRESHOLD;

  const renderWidget = (w: PanelWidget) => {
    // Para simplificar, asumimos que si un widget no especifica sourceBoardIds, usa todo
    const targetBoardIds = w.sourceBoardIds?.length > 0 ? w.sourceBoardIds : uniqueBoardIds;
    
    switch (w.type) {
      case "battery":
        // For accurate cross-board battery, we use the central metrics state.
        // It aggregates ALL boards, which is fine for the MVP widget scope.
        return <BatteryWidget completed={metrics?.completedTasks || 0} total={metrics?.totalTasks || 0} />;
      case "workload":
        // Fallback constraint if Workload widget currently only accepts one boardId.
        // For MVP S-15, we pass the first sourceBoardId
        return <WorkloadWidget boardId={targetBoardIds[0]} />;
      case "activity":
        return <TaskLogWidget boardId={targetBoardIds[0]} orgId={orgId} />;
      default:
        // Future extensions: "task_type_breakdown", "sla_heatmap"
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-4 h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <Layers className="w-5 h-5 text-gray-300" />
            Widget: {w.type} (Coming soon)
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex w-full h-full flex-col items-center justify-center absolute inset-0 bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: V.purple }} />
        <p className="text-sm font-medium text-gray-500 animate-pulse">Initializing Data Engine...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-2 absolute inset-0 bg-gray-50">
        <AlertCircle className="w-8 h-8" style={{ color: V.red }} />
        <p className="text-gray-400 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto relative flex flex-col absolute inset-0">
      {isNearLimit && (
        <div className="w-full px-6 py-3 flex items-center gap-3 border-b sticky top-0 z-20"
          style={{ backgroundColor: `${V.orange}15`, borderColor: V.orange, color: V.orange }}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Warning: Approaching performance limit ({widgetCount}/{WIDGETS_WARNING_THRESHOLD} widgets)
          </span>
        </div>
      )}

      <div className="p-8 flex-1">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: V.purple + "14" }}>
              {isCrossBoard ? <Layers className="w-6 h-6" style={{ color: V.purple }} /> : <LayoutDashboard className="w-6 h-6" style={{ color: V.purple }} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{resolvedTitle}</h2>
                {isCrossBoard && (
                   <span className="bg-gradient-to-r from-[#6161FF] to-[#00CA72] text-white text-[10px] uppercase font-bold py-1 px-2 rounded-md tracking-wider flex items-center gap-1 shadow-sm">
                     <Play className="w-3 h-3 fill-current" /> HPC Render Engine ACTIVE
                   </span>
                )}
              </div>
              <p className="text-sm text-gray-500 font-medium mt-1">{resolvedSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Widgets</span>
              <span className="text-lg font-black" style={{ color: V.dark }}>{widgetCount}</span>
            </div>
            {isCrossBoard && dirty && !isReadOnly && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: V.purple }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Layout Config
              </button>
            )}
          </div>
        </div>

        <GridLayout className="layout" layout={layout} cols={12} rowHeight={80}
          isDraggable={!isReadOnly} isResizable={!isReadOnly} margin={[16, 16]}
          onLayoutChange={handleLayoutChange}>
          {widgets.map(w => (
            <div key={w.id} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white rounded-xl overflow-hidden border border-gray-100">
               {renderWidget(w)}
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
