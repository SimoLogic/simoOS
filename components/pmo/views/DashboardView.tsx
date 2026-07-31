"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { PmoBoard, PmoTask } from "@/types/pmo.types";
import { BatteryWidget } from "@/components/pmo/widgets/BatteryWidget";
import { WorkloadWidget } from "@/components/pmo/views/WorkloadWidget";
import { AlertCircle, ZapOff, LayoutDashboard, Plus, Save, Loader2 } from "lucide-react";
import { TaskLogWidget } from "@/components/pmo/widgets/TaskLogWidget";
import {
  getPanelsAction,
  createPanelAction,
  updatePanelAction,
  type PmoPanel,
  type PanelWidget,
} from "@/app/actions/pmo/panel-actions";
import type { LayoutItem } from "react-grid-layout";

// ── react-grid-layout: dynamic import (SSR-safe) ────────────────────────────
type GridLayoutComponent = React.ComponentType<{
  className?: string; layout: LayoutItem[]; cols: number; rowHeight: number;
  isDraggable?: boolean; isResizable?: boolean; margin?: [number, number];
  onLayoutChange?: (layout: LayoutItem[]) => void; children?: React.ReactNode;
}>;

const V = {
  purple: "#6161FF", green: "#00CA72", blue: "#0086C0",
  orange: "#FDAB3D", red: "#E5484D", dark: "#323338",
} as const;

export const WIDGETS_WARNING_THRESHOLD = 30;

interface DashboardViewProps {
  board: PmoBoard;
  optimisticTasks: Record<string, Partial<PmoTask>>;
  tenantId?: string;
  ownerId?: string;
}

const DEFAULT_WIDGETS: PanelWidget[] = [
  { id: "battery", type: "battery", sourceBoardIds: [], x: 0, y: 0, w: 4, h: 4, config: {} },
  { id: "workload", type: "workload", sourceBoardIds: [], x: 4, y: 0, w: 8, h: 4, config: {} },
  { id: "activity", type: "activity", sourceBoardIds: [], x: 0, y: 4, w: 12, h: 6, config: {} },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  board, optimisticTasks, tenantId, ownerId,
}) => {
  const [panel, setPanel] = useState<PmoPanel | null>(null);
  const [widgets, setWidgets] = useState<PanelWidget[]>(DEFAULT_WIDGETS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [GridLayout, setGridLayout] = useState<GridLayoutComponent | null>(null);

  // Dynamic import of react-grid-layout (client-only)
  useEffect(() => {
    import("react-grid-layout").then((mod) => {
      const RGL = mod.default || mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const WP = (mod as any).WidthProvider;
      setGridLayout(() => WP(RGL));
    });
  }, []);

  // Load panel from DB
  useEffect(() => {
    if (!tenantId || !ownerId) return;
    getPanelsAction(tenantId, ownerId).then(res => {
      if (res.success && res.data.length > 0) {
        const p = res.data[0];
        setPanel(p);
        if (p.config.widgets.length > 0) setWidgets(p.config.widgets);
      }
    });
  }, [tenantId, ownerId]);

  const metrics = useMemo(() => {
    let total = 0, completed = 0;
    board.groups?.forEach(g => {
      g.tasks?.forEach(t => {
        total++;
        const status = optimisticTasks[t.id]?.status || t.status;
        if (status === "done") completed++;
      });
    });
    return { total, completed };
  }, [board, optimisticTasks]);

  const layout = widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }));

  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setWidgets(prev =>
      prev.map(w => {
        const item = newLayout.find(l => l.i === w.id);
        return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
      })
    );
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!tenantId || !ownerId) return;
    setSaving(true);
    try {
      if (panel) {
        await updatePanelAction(panel.id, tenantId, { config: { widgets } });
      } else {
        const res = await createPanelAction({ tenantId, ownerId, name: `${board.title} Dashboard` });
        if (res.success) {
          setPanel(res.data);
          await updatePanelAction(res.data.id, tenantId, { config: { widgets } });
        }
      }
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const widgetCount = widgets.length;
  const isNearLimit = widgetCount >= WIDGETS_WARNING_THRESHOLD;

  const renderWidget = (w: PanelWidget) => {
    switch (w.type) {
      case "battery":
        return <BatteryWidget completed={metrics.completed} total={metrics.total} />;
      case "workload":
        return <WorkloadWidget boardId={board.id} />;
      case "activity":
        return <TaskLogWidget boardId={board.id} tenantId={tenantId} />;
      default:
        return <div className="bg-white rounded-xl border border-gray-200 p-4 h-full flex items-center justify-center text-gray-400 text-sm">Widget: {w.type}</div>;
    }
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto relative flex flex-col">
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: V.purple + "14" }}>
              <LayoutDashboard className="w-5 h-5" style={{ color: V.purple }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{board.title} Dashboard</h2>
              <p className="text-xs text-gray-500 font-medium">Drag & resize widgets to customize</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex flex-col items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Widgets</span>
              <span className="text-sm font-bold" style={{ color: V.dark }}>{widgetCount}</span>
            </div>
            {dirty && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: V.purple }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Layout
              </button>
            )}
          </div>
        </div>

        {GridLayout ? (
          <GridLayout className="layout" layout={layout} cols={12} rowHeight={80}
            isDraggable={true} isResizable={true} margin={[16, 16]}
            onLayoutChange={handleLayoutChange}>
            {widgets.map(w => (
              <div key={w.id}>{renderWidget(w)}</div>
            ))}
          </GridLayout>
        ) : (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-[#6161FF]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
