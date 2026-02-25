"use client";

import React, { useMemo, useState } from "react";
import { BarChart3, Activity, TrendingUp, AlertTriangle, CheckCircle2, Zap, Coffee, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedProcess, TaskValue, TaskFrequency, FREQUENCY_DAILY_FACTOR } from "@/lib/process-designer-types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDailyMin(pt: number, freq: TaskFrequency): number {
    return Math.round(pt * (FREQUENCY_DAILY_FACTOR[freq] ?? 0) * 10) / 10;
}

const VALUE_COLORS: Record<TaskValue, { bar: string; badge: string; icon: React.ElementType }> = {
    "Value-Added": { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    "Necessary": { bar: "bg-cobalt-blue", badge: "bg-blue-100 text-blue-700", icon: Zap },
    "Wait": { bar: "bg-amber-400", badge: "bg-amber-100 text-amber-700", icon: Coffee },
    "Waste": { bar: "bg-red-400", badge: "bg-red-100 text-red-700", icon: AlertTriangle },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
                <Icon className={cn("w-4 h-4", color)} />
            </div>
        </div>
        <div className="text-2xl font-bold text-navy-blue">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
);

// ── Horizontal Bar Chart Row ───────────────────────────────────────────────────

interface BarRowProps {
    label: string;
    value: number;
    maxValue: number;
    color: string;
    unit?: string;
}

const BarRow: React.FC<BarRowProps> = ({ label, value, maxValue, color, unit = "" }) => (
    <div className="flex items-center gap-3">
        <div className="w-28 text-xs text-slate-600 truncate shrink-0 text-right">{label}</div>
        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
                className={cn("h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500", color)}
                style={{ width: `${Math.max((value / maxValue) * 100, 4)}%` }}
            >
                {(value / maxValue) > 0.2 && (
                    <span className="text-[10px] font-bold text-white">{value}{unit}</span>
                )}
            </div>
        </div>
        {(value / maxValue) <= 0.2 && (
            <span className="text-[10px] text-slate-500 w-12">{value}{unit}</span>
        )}
    </div>
);

// ── Dashboard Main ────────────────────────────────────────────────────────────

interface ProcessDashboardProps {
    processes: SavedProcess[];
}

export const ProcessDashboard: React.FC<ProcessDashboardProps> = ({ processes }) => {
    const [filterArea, setFilterArea] = useState("All");

    const filtered = useMemo(() => {
        return filterArea === "All" ? processes : processes.filter((p) => p.area === filterArea);
    }, [processes, filterArea]);

    const areas = useMemo(() => {
        const set = new Set(processes.map((p) => p.area).filter(Boolean));
        return ["All", ...Array.from(set)];
    }, [processes]);

    const allRows = useMemo(() => filtered.flatMap((p) => p.rows), [filtered]);

    // ── KPIs ──
    const kpis = useMemo(() => {
        const totalTasks = allRows.length;
        const totalFteMin = allRows.reduce((s, r) => s + toDailyMin(r.pt, r.frequency), 0);
        const valueCounts: Record<TaskValue, number> = { "Value-Added": 0, "Necessary": 0, "Wait": 0, "Waste": 0 };
        allRows.forEach((r) => valueCounts[r.value]++);
        const vaP = totalTasks > 0 ? (valueCounts["Value-Added"] / totalTasks) * 100 : 0;
        const wstP = totalTasks > 0 ? ((valueCounts["Wait"] + valueCounts["Waste"]) / totalTasks) * 100 : 0;
        return { totalTasks, totalFteMin: Math.round(totalFteMin * 10) / 10, vaP: Math.round(vaP), wstP: Math.round(wstP), valueCounts };
    }, [allRows]);

    // ── Workload by owner ──
    const ownerWorkload = useMemo(() => {
        const map: Record<string, number> = {};
        allRows.forEach((r) => {
            const k = r.owner || "Unassigned";
            map[k] = (map[k] ?? 0) + toDailyMin(r.pt, r.frequency);
        });
        return Object.entries(map)
            .map(([owner, min]) => ({ owner, min: Math.round(min * 10) / 10 }))
            .sort((a, b) => b.min - a.min)
            .slice(0, 10);
    }, [allRows]);

    // ── Tasks by frequency ──
    const freqData = useMemo(() => {
        const map: Record<string, number> = {};
        allRows.forEach((r) => { map[r.frequency] = (map[r.frequency] ?? 0) + 1; });
        return Object.entries(map).sort(([, a], [, b]) => b - a);
    }, [allRows]);

    const maxOwnerMin = ownerWorkload.length > 0 ? ownerWorkload[0].min : 1;
    const maxFreqCount = freqData.length > 0 ? freqData[0][1] : 1;

    const DAILY_CAP = 480;

    if (processes.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-slate-50/50">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-500">No data to display</p>
                    <p className="text-xs text-slate-400 mt-1">Save a process design in the <span className="font-semibold text-cobalt-blue">Flow Designer</span> to see analytics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-slate-50/50 px-6 py-5">
            {/* Filter bar */}
            <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Area</span>
                <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue"
                >
                    {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <span className="text-xs text-slate-400">{filtered.length} process design{filtered.length !== 1 ? "s" : ""} · {allRows.length} tasks</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                    label="Total Tasks"
                    value={String(kpis.totalTasks)}
                    sub="across all processes"
                    icon={Activity}
                    color="text-cobalt-blue"
                    bgColor="bg-cobalt-blue/10"
                />
                <KpiCard
                    label="Total FTE Load"
                    value={`${kpis.totalFteMin} min`}
                    sub={`${Math.round((kpis.totalFteMin / DAILY_CAP) * 10) / 10}× daily cap (${DAILY_CAP} min)`}
                    icon={Users}
                    color={kpis.totalFteMin > DAILY_CAP ? "text-red-500" : "text-emerald-500"}
                    bgColor={kpis.totalFteMin > DAILY_CAP ? "bg-red-100" : "bg-emerald-100"}
                />
                <KpiCard
                    label="Value-Added %"
                    value={`${kpis.vaP}%`}
                    sub={`${kpis.valueCounts["Value-Added"]} of ${kpis.totalTasks} tasks`}
                    icon={TrendingUp}
                    color="text-emerald-600"
                    bgColor="bg-emerald-100"
                />
                <KpiCard
                    label="Waste + Wait %"
                    value={`${kpis.wstP}%`}
                    sub={`${kpis.valueCounts["Wait"] + kpis.valueCounts["Waste"]} tasks to improve`}
                    icon={AlertTriangle}
                    color="text-red-500"
                    bgColor="bg-red-100"
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Workload by owner */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workload by Owner (min/day)</h3>
                        <span className="text-[10px] text-slate-400">Daily equivalence</span>
                    </div>
                    {ownerWorkload.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No owner data</p>
                    ) : (
                        <div className="space-y-2.5">
                            {ownerWorkload.map(({ owner, min }) => (
                                <BarRow key={owner} label={owner} value={min} maxValue={Math.max(maxOwnerMin, DAILY_CAP)} color={min > DAILY_CAP ? "bg-red-400" : "bg-cobalt-blue/80"} unit=" min" />
                            ))}
                            {/* 8h reference line label */}
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                <div className="w-3 h-0.5 bg-slate-300" />
                                <span className="text-[10px] text-slate-400">480 min = 8h standard day</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Value classification */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Task Value Classification</h3>
                    <div className="space-y-3">
                        {(["Value-Added", "Necessary", "Wait", "Waste"] as TaskValue[]).map((v) => {
                            const count = kpis.valueCounts[v];
                            const pct = kpis.totalTasks > 0 ? Math.round((count / kpis.totalTasks) * 100) : 0;
                            const style = VALUE_COLORS[v];
                            const Icon = style.icon;
                            return (
                                <div key={v}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <Icon className={cn("w-3 h-3", style.badge.split(" ")[1])} />
                                            <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-full", style.badge)}>{v}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tasks by frequency */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Task Count by Frequency</h3>
                    <div className="flex items-end gap-4 overflow-x-auto pb-2">
                        {freqData.map(([freq, count]) => {
                            const pct = maxFreqCount > 0 ? (count / maxFreqCount) * 100 : 0;
                            return (
                                <div key={freq} className="flex flex-col items-center gap-1.5 min-w-[70px]">
                                    <span className="text-xs font-bold text-navy-blue">{count}</span>
                                    <div className="w-full h-24 bg-slate-100 rounded-lg overflow-hidden flex items-end">
                                        <div
                                            className="w-full bg-cobalt-blue/70 rounded-t-lg transition-all duration-500"
                                            style={{ height: `${Math.max(pct, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 text-center leading-tight">{freq}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
