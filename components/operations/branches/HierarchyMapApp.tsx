"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Layers, Globe, GitBranch, Users, Shield, ChevronDown, ChevronRight,
    BarChart2, FileText, Search, Filter, RefreshCw, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BranchNode, BranchEmployee, HierarchyLevel } from "@/lib/branch-types";
import { getBranchHierarchyAction } from "@/app/actions/branch-actions";
import { useTenant } from "@/lib/tenant-context";

// ─── Margins Stub Popup ───────────────────────────────────────────────────────

const MarginsPopup: React.FC<{ branchCode: string; onClose: () => void }> = ({ branchCode, onClose }) => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-navy-blue text-white">
                <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Margin Table — {branchCode}</h3>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-6">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {["Loan Program", "Category", "Division %", "Region %", "Branch %"].map(h => (
                                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[["Conventional", "Purchase", "0.25%", "0.15%", "0.60%"],
                            ["FHA", "Refinance", "0.20%", "0.12%", "0.68%"],
                            ["VA", "Purchase", "0.18%", "0.10%", "0.72%"],
                            ["Jumbo", "Purchase", "0.30%", "0.18%", "0.52%"]].map(([prog, cat, div, reg, br], i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5 font-semibold text-slate-700">{prog}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{cat}</td>
                                    <td className="px-4 py-2.5 text-center font-mono text-purple-700">{div}</td>
                                    <td className="px-4 py-2.5 text-center font-mono text-cobalt-blue">{reg}</td>
                                    <td className="px-4 py-2.5 text-center font-mono text-emerald-700 font-bold">{br}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 italic">
                    ✦ Margin table under construction — data is illustrative. Full Margin Management module coming soon.
                </p>
            </div>
        </div>
    </div>
);

// ─── Proforma Popup ───────────────────────────────────────────────────────────

const ProformaPopup: React.FC<{ branchCode: string; onClose: () => void }> = ({ branchCode, onClose }) => {
    const rows = [
        { label: "Loan Volume (Units)", value: "—", sub: true },
        { label: "Avg Loan Size", value: "—", sub: true },
        { label: "Total Revenue (BPS)", value: "$0", bold: true },
        { label: "Loan Officer Comp (40%)", value: "$0", sub: true },
        { label: "Processor / Support", value: "$0", sub: true },
        { label: "Gross Revenue", value: "$0", bold: true, highlight: true },
        { label: "Rent / Utilities", value: "$0", sub: true },
        { label: "Technology", value: "$0", sub: true },
        { label: "Marketing", value: "$0", sub: true },
        { label: "Other Indirect Costs", value: "$0", sub: true },
        { label: "Net Profit", value: "$0", bold: true, highlight: true },
    ];
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-blue to-cobalt-blue text-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <h3 className="text-sm font-bold">Branch Proforma</h3>
                        </div>
                        <p className="text-[10px] text-white/60 mt-0.5">{branchCode} · Read-only preview</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white">✕</button>
                </div>
                <div className="p-4 divide-y divide-slate-50">
                    {rows.map(r => (
                        <div key={r.label} className={cn("flex items-center justify-between py-2 px-2",
                            r.highlight && "bg-cobalt-blue/5 rounded-lg my-1 px-3")}>
                            <span className={cn("text-xs", r.bold ? "font-bold text-navy-blue" : "text-slate-500 pl-3")}>
                                {r.sub && "↳ "}{r.label}
                            </span>
                            <span className={cn("text-xs font-mono", r.bold ? "font-bold text-navy-blue" : "text-slate-400")}>{r.value}</span>
                        </div>
                    ))}
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 italic text-center">
                        ✦ Full editing available in <strong>Operations → Proformas</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Employee Card ────────────────────────────────────────────────────────────

const EmployeeCard: React.FC<{ emp: BranchEmployee }> = ({ emp }) => (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-cobalt-blue/20 transition-all">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
            {emp.full_name.charAt(0)}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{emp.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{emp.position}</p>
        </div>
        <span className={cn("ml-auto shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
            emp.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>
            {emp.status}
        </span>
    </div>
);

// ─── Branch Card ──────────────────────────────────────────────────────────────

const levelConfig = {
    Division: { color: "from-purple-600 to-purple-800", badge: "bg-purple-50 text-purple-700 border-purple-200", icon: Layers, label: "Division" },
    Region: { color: "from-cobalt-blue to-navy-blue", badge: "bg-cobalt-blue/10 text-cobalt-blue border-cobalt-blue/20", icon: Globe, label: "Region" },
    Branch: { color: "from-emerald-600 to-emerald-800", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: GitBranch, label: "Branch" },
};

const BranchCard: React.FC<{
    node: BranchNode;
    depth?: number;
    showEmployees: boolean;
}> = ({ node, depth = 0, showEmployees }) => {
    const [expanded, setExpanded] = useState(true);
    const [showMargins, setShowMargins] = useState(false);
    const [showProforma, setShowProforma] = useState(false);
    const cfg = levelConfig[node.hierarchy_level];
    const Icon = cfg.icon;
    const hasChildren = node.children.length > 0;
    const hasEmps = node.employees.length > 0;

    return (
        <div className={cn("flex flex-col", depth > 0 && "border-l-2 border-slate-100 ml-6 pl-4")}>
            {showMargins && <MarginsPopup branchCode={node.branch_code} onClose={() => setShowMargins(false)} />}
            {showProforma && <ProformaPopup branchCode={node.branch_code} onClose={() => setShowProforma(false)} />}

            {/* Card */}
            <div className={cn(
                "bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all w-80 shrink-0",
                !node.is_active && "opacity-60"
            )}>
                {/* Header bar */}
                <div className={cn("h-1.5 rounded-t-2xl bg-gradient-to-r", cfg.color)} />

                <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm", cfg.color)}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-navy-blue font-mono">{node.branch_code}</p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{node.branch_name || cfg.label}</p>
                            </div>
                        </div>
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", cfg.badge)}>
                            {node.hierarchy_level}
                        </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-500">
                        {node.employees.length > 0 && (
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{node.employees.length} staff</span>
                        )}
                        {node.states_licensed?.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {node.states_licensed.slice(0, 3).join(", ")}
                                {node.states_licensed.length > 3 && ` +${node.states_licensed.length - 3}`}
                            </span>
                        )}
                    </div>

                    {node.branch_manager_name && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-3">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[9px]">
                                {node.branch_manager_name.charAt(0)}
                            </div>
                            <span>{node.branch_manager_name}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button onClick={() => setShowMargins(true)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-cobalt-blue bg-cobalt-blue/8 hover:bg-cobalt-blue/15 rounded-lg transition-colors">
                            <BarChart2 className="w-3 h-3" /> Margins
                        </button>
                        <button onClick={() => setShowProforma(true)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
                            <FileText className="w-3 h-3" /> Proforma
                        </button>
                        {(hasChildren || hasEmps) && (
                            <button onClick={() => setExpanded(!expanded)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500">
                                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Children + Employees */}
            {expanded && (
                <div className="mt-4 space-y-4">
                    {/* Employees under this branch */}
                    {showEmployees && hasEmps && node.hierarchy_level === "Branch" && (
                        <div className="ml-4 space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Team Members</p>
                            {node.employees.map(emp => (
                                <EmployeeCard key={emp.eid} emp={emp} />
                            ))}
                        </div>
                    )}
                    {/* Child nodes */}
                    {node.children.map(child => (
                        <BranchCard key={child.id} node={child} depth={depth + 1} showEmployees={showEmployees} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const HierarchyMapApp: React.FC = () => {
    const { currentTenant } = useTenant();
    const [roots, setRoots] = useState<BranchNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
    const [showEmployees, setShowEmployees] = useState(true);

    const tenantId = currentTenant?.tenant_id || "";

    const load = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const includeInactive = statusFilter !== "active";
        const tree = await getBranchHierarchyAction(tenantId, includeInactive);
        // If inactive only, filter out active roots
        const filtered = statusFilter === "inactive"
            ? tree.filter(n => !n.is_active)
            : tree;
        setRoots(filtered);
        setLoading(false);
    }, [tenantId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    if (!currentTenant) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <p className="text-sm">Select a tenant to view the hierarchy.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/40">
            {/* Toolbar */}
            <div className="px-8 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-base font-bold text-navy-blue">Hierarchy Map</h2>
                    <p className="text-xs text-slate-400">Visual org chart of Divisions, Regions, Branches & Teams</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                        <div onClick={() => setShowEmployees(!showEmployees)}
                            className={cn("w-8 h-4 rounded-full transition-all relative", showEmployees ? "bg-cobalt-blue" : "bg-slate-200")}>
                            <div className={cn("w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow", showEmployees ? "left-4" : "left-0.5")} />
                        </div>
                        Show Employees
                    </label>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                        {(["active", "all", "inactive"] as const).map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={cn("px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all",
                                    statusFilter === s ? "bg-white text-navy-blue shadow-sm" : "text-slate-500")}>
                                {s}
                            </button>
                        ))}
                    </div>
                    <button onClick={load} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-cobalt-blue">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 overflow-auto p-8">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
                        <GitBranch className="w-8 h-8 mr-2" /> Loading hierarchy...
                    </div>
                ) : roots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Layers className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">No hierarchy data.</p>
                        <p className="text-xs text-slate-400">Create Divisions, Regions, and Branches in the Branch Master tab.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-8 items-start">
                        {roots.map(root => (
                            <BranchCard key={root.id} node={root} depth={0} showEmployees={showEmployees} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
