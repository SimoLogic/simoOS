"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTenant } from "@/lib/tenant-context";
import { getEmployeesAction as getEmployees } from "@/app/actions/hr-actions";
import { FullEmployeeRecord } from "@/lib/hr-types";
import {
    getRewardSchemes, getSalesStrategies, getSalesAssigments, saveSalesAssignment, evaluateSalesAssignment
} from "@/lib/growthify-store";
import { SalesStrategy, RewardScheme, SalesHCAssignment, StrategyAllocation, AllocationParam, ApprovalStatus } from "@/lib/growthify-types";
import { Plus, Send, CheckCircle2, Lock, X, AlertCircle, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock Data for Allocation ---
const MOCK_BRANCHES = [
    { id: "BR-01", name: "Miami HQ" },
    { id: "BR-02", name: "NY Branch" },
    { id: "BR-03", name: "Texas Branch" },
];

const MOCK_LOS = [
    { id: "LO-001", name: "Michael Scott" },
    { id: "LO-002", name: "Dwight Schrute" },
    { id: "LO-003", name: "Jim Halpert" },
];

export const SalesHCApp: React.FC = () => {
    const { currentTenant } = useTenant();

    // Core Data
    const [employees, setEmployees] = useState<FullEmployeeRecord[]>([]);
    const [activeStrategies, setActiveStrategies] = useState<SalesStrategy[]>([]);
    const [activeSchemes, setActiveSchemes] = useState<RewardScheme[]>([]);
    const [assignments, setAssignments] = useState<SalesHCAssignment[]>([]);

    // UI State
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [selectedNewEmployees, setSelectedNewEmployees] = useState<Set<string>>(new Set());
    const [simulatedRole, setSimulatedRole] = useState<"Admin" | "Finance" | "Legal">("Admin");

    // Allocation Popup State
    const [allocationPopup, setAllocationPopup] = useState<{
        employeeId: string;
        strategyId: string;
        stratIndex: number;
        tempAllocations: AllocationParam[];
    } | null>(null);

    // Form State for rows (Drafts)
    const [drafts, setDrafts] = useState<Record<string, SalesHCAssignment>>({});

    const loadData = async () => {
        if (!currentTenant) return;

        const emps = await getEmployees(currentTenant.tenant_id);
        setEmployees(emps);

        const strats = await getSalesStrategies(currentTenant.tenant_id);
        const allSchemes = await getRewardSchemes(currentTenant.tenant_id);
        const schemes = allSchemes.filter(r => r.isActive);

        // A strategy is legally active here only if it has an Active Reward Scheme
        const legallyActiveStrats = strats.filter(s =>
            s.isActive && schemes.some(r => r.strategy_id === s.id)
        );

        setActiveStrategies(legallyActiveStrats);
        setActiveSchemes(schemes);

        const existing = await getSalesAssigments(currentTenant.tenant_id);
        setAssignments(existing);

        // Initialize drafts for existing
        const newDrafts: Record<string, SalesHCAssignment> = {};
        existing.forEach(a => {
            newDrafts[a.employee_id] = { ...a };
        });
        setDrafts(newDrafts);
    };

    useEffect(() => {
        loadData();
    }, [currentTenant]);

    // --- Add Employees Popup ---
    const handleAddSelected = () => {
        const newDrafts = { ...drafts };
        selectedNewEmployees.forEach(eid => {
            if (!newDrafts[eid]) {
                const emp = employees.find(e => e.eid === eid);
                newDrafts[eid] = {
                    id: "",
                    tenant_id: currentTenant!.tenant_id,
                    employee_id: eid,
                    sales_role: emp?.historialLaboral.area || "Sales",
                    target_dedication: `${emp?.historialLaboral.dedicationPercentage}%` || "100%",
                    strategies: [],
                    approver1_name: "Jane Doe (Finance)",
                    approver1_role: "Finance",
                    approver1_status: "Pending",
                    approver2_name: "John Smith (Legal)",
                    approver2_role: "Legal",
                    approver2_status: "Pending",
                    isApproved: false,
                    created_at: new Date().toISOString()
                };
            }
        });
        setDrafts(newDrafts);
        setShowAddPopup(false);
        setSelectedNewEmployees(new Set());
    };

    const toggleEmpSelection = (eid: string) => {
        const next = new Set(selectedNewEmployees);
        if (next.has(eid)) next.delete(eid);
        else next.add(eid);
        setSelectedNewEmployees(next);
    };

    // --- Row Editing ---
    const handleStrategySelect = (eid: string, index: number, strategyId: string) => {
        if (!strategyId) {
            // Remove strategy logic
            const currentDraft = drafts[eid];
            const nextStrats = [...currentDraft.strategies];
            nextStrats.splice(index, 1);
            setDrafts(prev => ({ ...prev, [eid]: { ...currentDraft, strategies: nextStrats } }));
            return;
        }

        // Open allocation popup
        setAllocationPopup({
            employeeId: eid,
            strategyId,
            stratIndex: index,
            tempAllocations: []
        });
    };

    // --- Allocation Popup ---
    const addTempAllocationLine = () => {
        if (!allocationPopup) return;
        setAllocationPopup({
            ...allocationPopup,
            tempAllocations: [...allocationPopup.tempAllocations, { branch: "", loan_officer: "", time_pct: 0 }]
        });
    };

    const updateTempAllocation = (idx: number, field: keyof AllocationParam, val: string | number) => {
        if (!allocationPopup) return;
        const next = [...allocationPopup.tempAllocations];
        next[idx] = { ...next[idx], [field]: val };
        setAllocationPopup({ ...allocationPopup, tempAllocations: next });
    };

    const saveAllocation = () => {
        if (!allocationPopup) return;
        const total = allocationPopup.tempAllocations.reduce((acc, curr) => acc + Number(curr.time_pct), 0);
        if (total !== 100) {
            alert("Allocations must sum exactly 100%");
            return;
        }
        if (allocationPopup.tempAllocations.some(a => !a.branch)) {
            alert("All lines must have a branch selected.");
            return;
        }

        const linkedScheme = activeSchemes.find(r => r.strategy_id === allocationPopup.strategyId);

        const newStratAlloc: StrategyAllocation = {
            strategy_id: allocationPopup.strategyId,
            reward_scheme_id: linkedScheme?.id || "",
            allocations: allocationPopup.tempAllocations
        };

        const currentDraft = drafts[allocationPopup.employeeId];
        const nextStrats = [...currentDraft.strategies];
        nextStrats[allocationPopup.stratIndex] = newStratAlloc;

        setDrafts(prev => ({
            ...prev,
            [allocationPopup.employeeId]: { ...currentDraft, strategies: nextStrats }
        }));

        setAllocationPopup(null);
    };

    // --- Submission ---
    const sendRowForApproval = async (eid: string) => {
        const draft = drafts[eid];
        if (!draft || draft.strategies.length === 0) {
            alert("Must assign at least one strategy.");
            return;
        }

        const res = await saveSalesAssignment(draft);
        if (res.success) {
            loadData();
        } else {
            alert(res.message);
        }
    };

    const handleApprove = (eid: string, approverNum: 1 | 2, status: ApprovalStatus) => {
        evaluateSalesAssignment(eid, approverNum, status);
        loadData();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-black text-navy-blue flex items-center gap-2">
                        <Users className="w-5 h-5 text-cobalt-blue" />
                        Sales Human Capital (HC)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Map authorized personnel to active strategies and perform structural capacity allocations.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Simulation Toolkit */}
                    <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200">
                        <span className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Simulate User:
                        </span>
                        <select
                            value={simulatedRole}
                            onChange={(e) => setSimulatedRole(e.target.value as any)}
                            className="text-xs font-bold text-navy-blue bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-cobalt-blue"
                        >
                            <option value="Admin">Admin (Manager)</option>
                            <option value="Finance">Jane Doe (Finance - Appr 1)</option>
                            <option value="Legal">John Smith (Legal - Appr 2)</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowAddPopup(true)}
                        className="bg-cobalt-blue hover:bg-navy-blue text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        disabled={simulatedRole !== "Admin"}
                    >
                        <Plus className="w-4 h-4" /> Add Sales Team
                    </button>
                </div>
            </div>

            {/* Main Content: Grid */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                                <th className="p-4 w-64">Employee</th>
                                <th className="p-4 w-48">Strategy 1</th>
                                <th className="p-4 w-48">Strategy 2</th>
                                <th className="p-4 w-48">Strategy 3</th>
                                <th className="p-4 text-center">Status & Approvals</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.values(drafts).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 text-sm border-dashed">
                                        No sales force members allocated yet. Click "Add Sales Team" to begin.
                                    </td>
                                </tr>
                            ) : (
                                Object.values(drafts).map((draft) => {
                                    const isSaved = assignments.some(a => a.id === draft.id);
                                    const actualAssig = assignments.find(a => a.employee_id === draft.employee_id);
                                    const isFullyApproved = actualAssig?.isApproved;

                                    const canApprove1 = simulatedRole === "Finance";
                                    const canApprove2 = simulatedRole === "Legal";

                                    const empData = employees.find(e => e.eid === draft.employee_id);

                                    return (
                                        <tr key={draft.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-navy-blue text-sm">{empData?.maestro.firstName} {empData?.maestro.lastName}</div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{empData?.eid} • {draft.sales_role}</div>
                                            </td>

                                            {/* Strategies Dropdowns: Up to 3 */}
                                            {[0, 1, 2].map(idx => {
                                                const stratAlloc = draft.strategies[idx];
                                                const selectedId = stratAlloc?.strategy_id || "";
                                                return (
                                                    <td key={idx} className="p-4 align-top">
                                                        <select
                                                            value={selectedId}
                                                            onChange={(e) => handleStrategySelect(draft.employee_id, idx, e.target.value)}
                                                            disabled={simulatedRole !== "Admin"}
                                                            className={cn(
                                                                "w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none appearance-none pr-8 bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] transition-all",
                                                                selectedId ? "bg-cobalt-blue/5 border-cobalt-blue/20 text-cobalt-blue font-bold shadow-sm" : "bg-white border-slate-200 text-slate-500",
                                                                simulatedRole !== "Admin" && "opacity-60 cursor-not-allowed"
                                                            )}
                                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' class='w-4 h-4 text-slate-400'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")` }}
                                                        >
                                                            <option value="">-- None --</option>
                                                            {activeStrategies.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                        {selectedId && stratAlloc.allocations.length > 0 && (
                                                            <div className="mt-2 text-[10px] text-slate-500 space-y-1 bg-white border border-slate-100 p-1.5 rounded-md shadow-sm">
                                                                {stratAlloc.allocations.map((al, alIdx) => (
                                                                    <div key={alIdx} className="flex justify-between items-center">
                                                                        <span className="truncate pr-1">{al.branch} {al.loan_officer ? `> ${al.loan_officer}` : ""}</span>
                                                                        <span className="font-bold text-emerald-600">{al.time_pct}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            <td className="p-4 align-top">
                                                {isSaved && actualAssig ? (
                                                    <div className="flex flex-col gap-2">
                                                        {isFullyApproved && (
                                                            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 py-1 rounded border border-emerald-200 w-full mb-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Assigned
                                                            </span>
                                                        )}
                                                        <div className="grid grid-cols-2 gap-2 text-center">
                                                            {/* Approver 1 */}
                                                            <div>
                                                                <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Jane Doe</div>
                                                                <select
                                                                    disabled={!canApprove1 && simulatedRole !== "Admin"}
                                                                    value={actualAssig.approver1_status}
                                                                    onChange={(e) => handleApprove(draft.employee_id, 1, e.target.value as ApprovalStatus)}
                                                                    className={cn(
                                                                        "w-full text-[10px] font-bold border rounded p-1 outline-none text-center",
                                                                        actualAssig.approver1_status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                                                            actualAssig.approver1_status.includes("Inactive") ? "bg-red-50 text-red-700 border-red-300" : "bg-white text-navy-blue"
                                                                    )}
                                                                >
                                                                    <option value="Pending">Wait</option>
                                                                    <option value="Active">Active</option>
                                                                    <option value="Inactive">Reject</option>
                                                                </select>
                                                            </div>
                                                            {/* Approver 2 */}
                                                            <div>
                                                                <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">John Smith</div>
                                                                <select
                                                                    disabled={!canApprove2 && simulatedRole !== "Admin"}
                                                                    value={actualAssig.approver2_status}
                                                                    onChange={(e) => handleApprove(draft.employee_id, 2, e.target.value as ApprovalStatus)}
                                                                    className={cn(
                                                                        "w-full text-[10px] font-bold border rounded p-1 outline-none text-center",
                                                                        actualAssig.approver2_status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                                                            actualAssig.approver2_status.includes("Inactive") ? "bg-red-50 text-red-700 border-red-300" : "bg-white text-navy-blue"
                                                                    )}
                                                                >
                                                                    <option value="Pending">Wait</option>
                                                                    <option value="Active">Active</option>
                                                                    <option value="Inactive">Reject</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => sendRowForApproval(draft.employee_id)}
                                                        disabled={simulatedRole !== "Admin"}
                                                        className="w-full text-[10px] bg-cobalt-blue hover:bg-blue-600 text-white py-1.5 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        Apply <Send className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Allocation Popup Window --- */}
            {allocationPopup && (
                <div className="fixed inset-0 bg-navy-blue/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-black text-navy-blue flex items-center gap-2">
                                <Activity className="w-4 h-4 text-cobalt-blue" />
                                Strategy Allocation Matrix
                            </h3>
                            <button onClick={() => setAllocationPopup(null)} className="text-slate-400 hover:text-action-red transition-colors p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                                Allocate the sales representative's time across specific organizational branches and/or target Loan Officers. Note: <strong>Total allocation must equal 100%.</strong>
                            </p>

                            <div className="space-y-3 mb-6">
                                {allocationPopup.tempAllocations.map((alloc, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                        <div className="flex-1">
                                            <select
                                                value={alloc.branch}
                                                onChange={(e) => updateTempAllocation(idx, "branch", e.target.value)}
                                                className="w-full text-xs font-bold text-navy-blue border-none bg-transparent outline-none cursor-pointer"
                                            >
                                                <option value="">Select Branch...</option>
                                                {MOCK_BRANCHES.map(b => (
                                                    <option key={b.id} value={b.name}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 border-l border-slate-200 pl-2">
                                            <select
                                                value={alloc.loan_officer || ""}
                                                onChange={(e) => updateTempAllocation(idx, "loan_officer", e.target.value)}
                                                className="w-full text-xs text-slate-600 border-none bg-transparent outline-none cursor-pointer"
                                            >
                                                <option value="">Any LO (Optional)</option>
                                                {MOCK_LOS.map(lo => (
                                                    <option key={lo.id} value={lo.name}>{lo.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-20 border-l border-slate-200 pl-2 relative">
                                            <input
                                                type="number"
                                                placeholder="%"
                                                value={alloc.time_pct || ""}
                                                onChange={(e) => updateTempAllocation(idx, "time_pct", Number(e.target.value))}
                                                className="w-full text-sm font-bold text-cobalt-blue bg-transparent outline-none text-right pr-4"
                                            />
                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addTempAllocationLine}
                                className="w-full py-2 mb-6 border-2 border-dashed border-slate-200 text-slate-500 rounded-lg hover:border-cobalt-blue hover:text-cobalt-blue hover:bg-slate-50 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add Allocation Line
                            </button>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-sm font-bold text-navy-blue">
                                    Total: <span className={cn(
                                        "ml-1",
                                        allocationPopup.tempAllocations.reduce((acc, curr) => acc + curr.time_pct, 0) === 100 ? "text-emerald-500" : "text-action-red"
                                    )}>
                                        {allocationPopup.tempAllocations.reduce((acc, curr) => acc + curr.time_pct, 0)}%
                                    </span>
                                </div>
                                <button
                                    onClick={saveAllocation}
                                    className="bg-cobalt-blue hover:bg-navy-blue text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors"
                                >
                                    Confirm Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Add Employees Popup --- */}
            {showAddPopup && (
                <div className="fixed inset-0 bg-navy-blue/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-black text-navy-blue text-lg">Add Sales Force</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Select employees from the active tenant map.</p>
                            </div>
                            <button onClick={() => setShowAddPopup(false)} className="text-slate-400 hover:text-action-red transition-colors p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 sticky top-0">
                                        <th className="p-3 w-10 text-center"></th>
                                        <th className="p-3">EID</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Area</th>
                                        <th className="p-3">Dedication</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {employees.map(e => {
                                        const isSelected = selectedNewEmployees.has(e.eid);
                                        const alreadyDrafted = !!drafts[e.eid];
                                        return (
                                            <tr key={e.eid} className={cn(
                                                "transition-colors",
                                                alreadyDrafted ? "opacity-50 bg-slate-50 cursor-not-allowed" : "hover:bg-cobalt-blue/5 cursor-pointer",
                                                isSelected && "bg-cobalt-blue/10"
                                            )} onClick={() => !alreadyDrafted && toggleEmpSelection(e.eid)}>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected || alreadyDrafted}
                                                        disabled={alreadyDrafted}
                                                        onChange={() => { }}
                                                        className="w-4 h-4 rounded border-slate-300 text-cobalt-blue focus:ring-cobalt-blue pointer-events-none"
                                                    />
                                                </td>
                                                <td className="p-3 text-xs font-bold text-slate-500">{e.eid}</td>
                                                <td className="p-3 text-sm font-bold text-navy-blue">{e.maestro.firstName} {e.maestro.lastName}</td>
                                                <td className="p-3 text-xs text-slate-600">{e.historialLaboral.area} &gt; {e.historialLaboral.subArea}</td>
                                                <td className="p-3 text-xs text-slate-600 font-bold">{e.historialLaboral.dedicationPercentage}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowAddPopup(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddSelected}
                                disabled={selectedNewEmployees.size === 0}
                                className="bg-cobalt-blue hover:bg-navy-blue text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                Import Selected ({selectedNewEmployees.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
