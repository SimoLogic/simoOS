"use client";

import React, { useState, useMemo } from "react";
import { Clock, User, ArrowRight, X, Calendar, Zap, AlertTriangle, Coffee, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedProcess, ProcessRow, TaskFrequency, TaskValue, FREQUENCY_DAILY_FACTOR } from "@/lib/process-designer-types";

// ── Color maps ────────────────────────────────────────────────────────────────

const VALUE_STYLES: Record<TaskValue, { bg: string; border: string; badge: string; icon: React.ElementType; label: string }> = {
    "Value-Added": { bg: "bg-emerald-50", border: "border-emerald-300", badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "VA" },
    "Necessary": { bg: "bg-blue-50", border: "border-blue-300", badge: "bg-blue-100 text-blue-700", icon: Zap, label: "NE" },
    "Wait": { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-100 text-amber-700", icon: Coffee, label: "WT" },
    "Waste": { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-100 text-red-700", icon: AlertTriangle, label: "WS" },
};

// ── Daily equivalence helper ──────────────────────────────────────────────────

function toDailyMin(pt: number, freq: TaskFrequency): number {
    return Math.round(pt * (FREQUENCY_DAILY_FACTOR[freq] ?? 0) * 10) / 10;
}

// ── Task Node ─────────────────────────────────────────────────────────────────

interface TaskNodeProps {
    row: ProcessRow;
    isLast: boolean;
    dailyMode: boolean;
    onClick: (row: ProcessRow) => void;
}

const TaskNode: React.FC<TaskNodeProps> = ({ row, isLast, dailyMode, onClick }) => {
    const style = VALUE_STYLES[row.value];
    const Icon = style.icon;
    const time = dailyMode ? toDailyMin(row.pt, row.frequency) : row.pt;
    const timeLabel = dailyMode ? `${time} min/day` : `${time} min`;

    return (
        <div className="flex items-center gap-0">
            {/* Node card */}
            <button
                onClick={() => onClick(row)}
                className={cn(
                    "group relative flex flex-col gap-1 w-40 p-2.5 rounded-xl border-2 text-left transition-all duration-150",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    style.bg, style.border
                )}
            >
                {/* Step badge */}
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Step {row.stepNumber}</span>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", style.badge)}>
                        <Icon className="w-2.5 h-2.5 inline mr-0.5" />
                        {style.label}
                    </span>
                </div>

                {/* Task name */}
                <p className="text-[11px] font-semibold text-navy-blue leading-snug line-clamp-2">{row.task || "—"}</p>

                {/* Owner */}
                <div className="flex items-center gap-1">
                    <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-500 truncate">{row.owner || "—"}</span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className={cn("text-[10px] font-semibold", dailyMode ? "text-cobalt-blue" : "text-slate-600")}>{timeLabel}</span>
                </div>

                {/* Frequency badge */}
                <div className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-400">{row.frequency}</span>
                </div>
            </button>

            {/* Arrow connector */}
            {!isLast && (
                <div className="flex items-center px-1">
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
            )}
        </div>
    );
};

// ── Swimlane ──────────────────────────────────────────────────────────────────

interface SwimlaneProps {
    subProcess: string;
    rows: ProcessRow[];
    dailyMode: boolean;
    onClickTask: (row: ProcessRow) => void;
}

const Swimlane: React.FC<SwimlaneProps> = ({ subProcess, rows, dailyMode, onClickTask }) => {
    const totalPT = rows.reduce((s, r) => s + r.pt, 0);
    const totalDailyMin = rows.reduce((s, r) => s + toDailyMin(r.pt, r.frequency), 0);

    return (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* Swimlane header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#001e42]">
                <div>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Sub-Process</p>
                    <p className="text-sm font-bold text-white">{subProcess}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[9px] text-white/50 uppercase tracking-widest">Total PT</p>
                        <p className="text-xs font-bold text-white">{totalPT} min</p>
                    </div>
                    {dailyMode && (
                        <div className="text-right">
                            <p className="text-[9px] text-cobalt-blue/80 uppercase tracking-widest">Daily Eq.</p>
                            <p className={cn("text-xs font-bold", totalDailyMin > 480 ? "text-red-400" : "text-emerald-400")}>
                                {Math.round(totalDailyMin * 10) / 10} min
                            </p>
                        </div>
                    )}
                    <div className="text-[10px] text-white/50">{rows.length} tasks</div>
                </div>
            </div>

            {/* Tasks row */}
            <div className="px-4 py-4 overflow-x-auto">
                <div className="flex items-center gap-0 min-w-max">
                    {rows
                        .slice()
                        .sort((a, b) => a.stepNumber - b.stepNumber)
                        .map((row, idx, arr) => (
                            <TaskNode
                                key={row.id}
                                row={row}
                                isLast={idx === arr.length - 1}
                                dailyMode={dailyMode}
                                onClick={onClickTask}
                            />
                        ))}
                </div>
            </div>
        </div>
    );
};

// ── Daily Equivalence Modal ───────────────────────────────────────────────────

interface DailyEquivModalProps {
    rows: ProcessRow[];
    onClose: () => void;
}

const DAILY_CAP = 480; // 8 hours in minutes

const DailyEquivModal: React.FC<DailyEquivModalProps> = ({ rows, onClose }) => {
    const tasks = rows
        .map((r) => ({
            ...r,
            dailyMin: toDailyMin(r.pt, r.frequency),
        }))
        .filter((r) => r.dailyMin > 0)
        .sort((a, b) => b.dailyMin - a.dailyMin);

    const totalDailyMin = tasks.reduce((s, t) => s + t.dailyMin, 0);
    const ownerTotals: Record<string, number> = {};
    tasks.forEach((t) => {
        const key = t.owner || "Unassigned";
        ownerTotals[key] = (ownerTotals[key] ?? 0) + t.dailyMin;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-navy-blue">Daily Equivalence Analysis</h3>
                        <p className="text-xs text-slate-500 mt-0.5">All tasks converted to minutes per standard 8-hour workday (480 min)</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Total workload bar */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">Total Daily Workload</span>
                            <span className={cn("text-sm font-bold", totalDailyMin > DAILY_CAP ? "text-red-500" : "text-emerald-600")}>
                                {Math.round(totalDailyMin * 10) / 10} / {DAILY_CAP} min
                                {totalDailyMin > DAILY_CAP && <span className="ml-2 text-xs font-semibold text-red-500">⚠ Overloaded</span>}
                            </span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all", totalDailyMin > DAILY_CAP ? "bg-red-400" : "bg-cobalt-blue")}
                                style={{ width: `${Math.min((totalDailyMin / DAILY_CAP) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Per-owner breakdown */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Workload by Owner</h4>
                        <div className="space-y-2">
                            {Object.entries(ownerTotals).sort(([, a], [, b]) => b - a).map(([owner, min]) => (
                                <div key={owner}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-slate-600">{owner}</span>
                                        <span className={cn("text-xs font-bold", min > DAILY_CAP ? "text-red-500" : "text-slate-600")}>
                                            {Math.round(min * 10) / 10} min/day ({Math.round((min / DAILY_CAP) * 100)}%)
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", min > DAILY_CAP ? "bg-red-400" : "bg-cobalt-blue/70")}
                                            style={{ width: `${Math.min((min / DAILY_CAP) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task breakdown table */}
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Task-Level Breakdown</h4>
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freq.</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">PT</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Eq.</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">% of Day</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((t, idx) => (
                                <tr key={t.id} className={cn("border-b border-slate-50", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                    <td className="px-3 py-2 font-medium text-navy-blue">{t.task}</td>
                                    <td className="px-3 py-2 text-slate-500">{t.owner || "—"}</td>
                                    <td className="px-3 py-2 text-center text-slate-400">{t.frequency}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{t.pt} min</td>
                                    <td className="px-3 py-2 text-center font-semibold text-cobalt-blue">{t.dailyMin} min</td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-cobalt-blue/60 rounded-full" style={{ width: `${Math.min((t.dailyMin / DAILY_CAP) * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-slate-500">{Math.round((t.dailyMin / DAILY_CAP) * 100)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ── Task Detail Popup ─────────────────────────────────────────────────────────

interface TaskDetailPopupProps {
    row: ProcessRow;
    onClose: () => void;
}

const TaskDetailPopup: React.FC<TaskDetailPopupProps> = ({ row, onClose }) => {
    const style = VALUE_STYLES[row.value];
    const dailyMin = toDailyMin(row.pt, row.frequency);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-96 border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step {row.stepNumber} — Task Detail</span>
                        <h3 className="text-base font-bold text-navy-blue mt-0.5">{row.task || "Untitled Task"}</h3>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Owner → Stakeholder */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600 min-w-[80px]">From (Owner)</span>
                        <span className="bg-cobalt-blue/10 text-cobalt-blue px-2 py-0.5 rounded-full font-medium">{row.owner || "—"}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="font-semibold text-slate-600">To</span>
                        <span className="bg-navy-blue/10 text-navy-blue px-2 py-0.5 rounded-full font-medium">{row.stakeholder || "—"}</span>
                    </div>

                    {/* Deliverable */}
                    <div className="flex gap-2 text-xs">
                        <span className="font-semibold text-slate-600 min-w-[80px]">Deliverable</span>
                        <span className="text-slate-500">{row.deliverable || "—"}</span>
                    </div>

                    {/* Timing */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: "PT", value: `${row.pt} min` },
                            { label: "LT", value: `${row.lt} min` },
                            { label: "Daily Eq.", value: `${dailyMin} min/day` },
                        ].map((item) => (
                            <div key={item.label} className="bg-slate-50 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</p>
                                <p className="text-xs font-bold text-navy-blue mt-0.5">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Value + Freq */}
                    <div className="flex gap-2">
                        <div className={cn("flex-1 rounded-lg p-2 text-center text-xs font-semibold", style.badge)}>
                            {row.value}
                        </div>
                        <div className="flex-1 rounded-lg p-2 text-center bg-slate-50">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Frequency</p>
                            <p className="text-xs font-bold text-navy-blue mt-0.5">{row.frequency}</p>
                        </div>
                    </div>

                    {/* Comments */}
                    {row.comments && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Notes</p>
                            <p className="text-xs text-amber-800">{row.comments}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Visual Map Main ───────────────────────────────────────────────────────────

interface VisualMapProps {
    processes: SavedProcess[];
}

export const VisualMap: React.FC<VisualMapProps> = ({ processes }) => {
    const [filterSubProcess, setFilterSubProcess] = useState("All");
    const [filterOwner, setFilterOwner] = useState("All");
    const [filterFrequency, setFilterFrequency] = useState<TaskFrequency | "All">("All");
    const [dailyMode, setDailyMode] = useState(false);
    const [selectedRow, setSelectedRow] = useState<ProcessRow | null>(null);
    const [showDailyModal, setShowDailyModal] = useState(false);

    const allRows = useMemo(() => processes.flatMap((p) => p.rows), [processes]);

    const subProcesses = useMemo(() => {
        const set = new Set(allRows.map((r) => r.subProcess).filter(Boolean));
        return ["All", ...Array.from(set)];
    }, [allRows]);

    const owners = useMemo(() => {
        const set = new Set(allRows.map((r) => r.owner).filter(Boolean));
        return ["All", ...Array.from(set)];
    }, [allRows]);

    const filteredRows = useMemo(() => {
        return allRows.filter((r) => {
            if (filterSubProcess !== "All" && r.subProcess !== filterSubProcess) return false;
            if (filterOwner !== "All" && r.owner !== filterOwner) return false;
            if (filterFrequency !== "All" && r.frequency !== filterFrequency) return false;
            return true;
        });
    }, [allRows, filterSubProcess, filterOwner, filterFrequency]);

    // Group by sub-process
    const grouped = useMemo(() => {
        const map = new Map<string, ProcessRow[]>();
        filteredRows.forEach((r) => {
            const key = r.subProcess || "Default";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        });
        return map;
    }, [filteredRows]);

    return (
        <div className="h-full flex flex-col">
            {/* Filter bar */}
            <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center gap-3 flex-wrap shrink-0">
                {/* Sub-Process filter */}
                <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-Process</label>
                    <select value={filterSubProcess} onChange={(e) => setFilterSubProcess(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue">
                        {subProcesses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                {/* Owner filter */}
                <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Owner</label>
                    <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue">
                        {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                {/* Frequency filter */}
                <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Frequency</label>
                    <select value={filterFrequency} onChange={(e) => setFilterFrequency(e.target.value as TaskFrequency | "All")}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue">
                        <option value="All">All</option>
                        {(["Daily", "Weekly", "Biweekly", "Monthly", "Quarterly", "Annual", "On-Demand"] as TaskFrequency[]).map((f) =>
                            <option key={f} value={f}>{f}</option>
                        )}
                    </select>
                </div>

                <div className="flex-1" />

                {/* Legend */}
                <div className="flex items-center gap-2">
                    {Object.entries(VALUE_STYLES).map(([val, s]) => (
                        <span key={val} className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", s.badge)}>{val}</span>
                    ))}
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Daily Equivalence button */}
                <button
                    onClick={() => setShowDailyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cobalt-blue rounded-lg hover:bg-cobalt-blue/90 transition-all shadow-sm"
                >
                    <Clock className="w-3.5 h-3.5" />
                    Daily Equivalence
                </button>
            </div>

            {/* Swimlanes area */}
            <div className="flex-1 overflow-y-auto px-5 py-5 bg-slate-50/50">
                {grouped.size === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <ArrowRight className="w-8 h-8 text-slate-300" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">No process data</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Save a design in the <span className="font-semibold text-cobalt-blue">Flow Designer</span> tab to see the visual map
                            </p>
                        </div>
                    </div>
                ) : (
                    Array.from(grouped.entries()).map(([subProcess, rows]) => (
                        <Swimlane
                            key={subProcess}
                            subProcess={subProcess}
                            rows={rows}
                            dailyMode={dailyMode}
                            onClickTask={setSelectedRow}
                        />
                    ))
                )}
            </div>

            {/* Task detail popup */}
            {selectedRow && (
                <TaskDetailPopup row={selectedRow} onClose={() => setSelectedRow(null)} />
            )}

            {/* Daily equivalence modal */}
            {showDailyModal && (
                <DailyEquivModal rows={filteredRows} onClose={() => setShowDailyModal(false)} />
            )}
        </div>
    );
};
