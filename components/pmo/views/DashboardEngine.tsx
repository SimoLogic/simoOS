"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// DashboardEngine V2 — DUAL NATURE PROPS
// ═══════════════════════════════════════════════════════════════════════════════
//
// MODE 1 — Ad-hoc (MyPlanShell, single board views):
//   <DashboardEngine boardIds={[boardId]} orgId={orgId} />
//   → Uses the boardIds array directly. Zero DB lookups to pmo_panels.
//
// MODE 2 — Panel (GlobalDashboardView, S-15 Cross-Board):
//   <DashboardEngine boardIds={widget.sourceBoardIds} orgId={orgId} />
//   → Receives pre-resolved boardIds from the widget config.
//
// CRITICAL SAFETY: boardIds is ALWAYS the single source of rendering truth.
// The component NEVER fetches from pmo_panels internally — callers resolve first.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from "react";
import { getProjectHealthAction, getCrossBoardHealthAction, type ProjectHealthMetrics } from "@/app/actions/pmo/dashboard-actions";
import { CheckCircle2, CircleDashed, Clock, AlertCircle, Loader2, BarChart3, Target, Layers } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { WorkloadWidget } from "@/components/pmo/views/WorkloadWidget";

const V = {
  purple: "#6161FF", green: "#00CA72", blue: "#0086C0",
  orange: "#FDAB3D", red: "#E5484D", dark: "#323338",
  muted: "#676879", bg: "#F7F8FA",
} as const;

/**
 * DUAL NATURE PROPS:
 * - boardIds: string[] — ALWAYS required. The boards to aggregate.
 *   For single-board (MyPlan): pass [boardId].
 *   For cross-board (S-15 Panels): pass widget.sourceBoardIds.
 * - title/subtitle: optional display overrides.
 * - isReadOnly: disables interactive elements.
 */
interface DashboardEngineProps {
  boardIds: string[];
  orgId: string;
  isReadOnly?: boolean;
  title?: string;
  subtitle?: string;
}

const StatCard: React.FC<{
  icon: React.ElementType; label: string; value: number;
  color: string; accent?: string; subtitle?: string;
}> = ({ icon: Icon, label, value, color, accent, subtitle }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2 hover:shadow-md transition-all duration-100 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-14 h-14 rounded-bl-[2rem] opacity-[0.07]" style={{ backgroundColor: color }} />
    <div className="flex items-center justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "14" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {accent && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{accent}</span>}
    </div>
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
    <p className="text-3xl font-bold tracking-tight" style={{ color: V.dark }}>{value}</p>
    {subtitle && <p className="text-[10px] text-gray-400 font-medium">{subtitle}</p>}
  </div>
);

const BurnRateHero: React.FC<{ burnRate: number; completed: number; total: number }> = ({ burnRate, completed, total }) => {
  const barColor = burnRate >= 80 ? V.green : burnRate >= 40 ? V.blue : V.orange;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-8 justify-between">
      <div className="flex flex-col gap-2 flex-1 w-full">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Execution Burn Rate</h3>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${burnRate}%`, backgroundColor: barColor }} />
        </div>
        <p className="text-sm text-gray-400 mt-1 font-medium">Completed {completed} of {total} tasks.</p>
      </div>
      <div className="flex items-center gap-6 border-l border-gray-100 pl-8 shrink-0">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold tracking-tighter" style={{ color: V.dark }}>{burnRate}%</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: barColor }}>Burn Rate</span>
        </div>
      </div>
    </div>
  );
};

export function DashboardEngine({ boardIds, orgId, title, subtitle, isReadOnly }: DashboardEngineProps) {
  const [metrics, setMetrics] = useState<ProjectHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optimisticTasks = usePmoStore(s => s.optimisticTasks);

  // Determine mode from boardIds length
  const isCrossBoard = boardIds.length > 1;
  const resolvedTitle = title ?? (isCrossBoard ? "Cross-Board Health" : "Project Health");
  const resolvedSubtitle = subtitle ?? (isCrossBoard ? `Aggregating ${boardIds.length} boards` : "High Density Dashboard");

  // Stable reference for the dependency array (avoid infinite re-renders)
  const boardKey = useMemo(() => boardIds.join(","), [boardIds]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!boardIds || boardIds.length === 0) return;
      setLoading(true);
      setError(null);
      const res = boardIds.length === 1
        ? await getProjectHealthAction(boardIds[0], orgId)
        : await getCrossBoardHealthAction(boardIds, orgId);
      if (!alive) return;
      if (res.success && res.data) setMetrics(res.data);
      else setError(res.error || "Failed to load dashboard metrics");
      setLoading(false);
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, orgId, optimisticTasks]);

  if (loading && !metrics) {
    return (
      <div className="flex w-full h-full items-center justify-center absolute inset-0" style={{ backgroundColor: V.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: V.purple }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-2 absolute inset-0" style={{ backgroundColor: V.bg }}>
        <AlertCircle className="w-8 h-8" style={{ color: V.red }} />
        <p className="text-gray-400 font-medium">{error}</p>
      </div>
    );
  }
  if (!metrics) return null;

  const healthScore = metrics.totalTasks > 0
    ? Math.round(((metrics.completedTasks + metrics.inProgressTasks) / metrics.totalTasks) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto absolute inset-0 p-6 space-y-6" style={{ backgroundColor: V.bg }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: V.purple + "14" }}>
            {isCrossBoard ? <Layers className="w-5 h-5" style={{ color: V.purple }} /> : <BarChart3 className="w-5 h-5" style={{ color: V.purple }} />}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: V.dark }}>{resolvedTitle}</h2>
            <p className="text-xs font-medium" style={{ color: V.muted }}>{resolvedSubtitle}</p>
          </div>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" style={{ color: V.green }} />
          <span className="text-[11px] font-bold" style={{ color: V.dark }}>Health: {healthScore}%</span>
        </div>
      </div>
      <BurnRateHero burnRate={metrics.burnRate} completed={metrics.completedTasks} total={metrics.totalTasks} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={AlertCircle} label="SLA Breaches" value={metrics.slaBreaches} color={V.red} accent={metrics.slaBreaches > 0 ? "ALERT" : undefined} />
        <StatCard icon={CheckCircle2} label="Completed" value={metrics.completedTasks} color={V.green} />
        <StatCard icon={Clock} label="In Progress" value={metrics.inProgressTasks} color={V.blue} />
        <StatCard icon={AlertCircle} label="Stuck" value={metrics.stuckTasks} color={V.orange} />
        <StatCard icon={CircleDashed} label="Not Started" value={metrics.notStartedTasks} color={V.muted} />
      </div>
      <div className="flex w-full">
        {boardIds.length === 1 && <WorkloadWidget boardId={boardIds[0]} />}
      </div>
    </div>
  );
}
