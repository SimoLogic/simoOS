"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTenant } from "@/lib/tenant-context";
import { getRewardSchemes, saveRewardScheme, getSalesStrategies, evaluateRewardScheme, deleteRewardScheme, getPlaybooks } from "@/lib/growthify-store";
import { getEmployeesAction as getEmployees } from "@/app/actions/hr-actions";
import { RewardScheme, SalesStrategy, ApprovalStatus, RewardDriver, Playbook } from "@/lib/growthify-types";
import { FullEmployeeRecord } from "@/lib/hr-types";
import { Calculator, CheckCircle2, DollarSign, Send, AlertCircle, Percent, Users, Lock, Activity, Plus, X, Trash2, Clock, GitMerge } from "lucide-react";
import { cn } from "@/lib/utils";

export const RewardDesigner: React.FC = () => {
    const { currentTenant } = useTenant();
    const [strategies, setStrategies] = useState<SalesStrategy[]>([]);
    const [schemes, setSchemes] = useState<RewardScheme[]>([]);
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [employees, setEmployees] = useState<FullEmployeeRecord[]>([]);

    // Simulation tool for Approvers
    const [simulatedRole, setSimulatedRole] = useState<"Admin" | "Finance" | "Legal">("Admin");

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

    // Form
    const [selectedStrategyId, setSelectedStrategyId] = useState("");
    const [schemeName, setSchemeName] = useState("");
    const [overridePct, setOverridePct] = useState(0);
    const [fixedBonus, setFixedBonus] = useState(0);
    const [unitsTier, setUnitsTier] = useState(0);
    const [recruitmentPct, setRecruitmentPct] = useState(0);
    const [drivers, setDrivers] = useState<RewardDriver[]>([]);

    const [approver1Name, setApprover1Name] = useState("");
    const [approver2Name, setApprover2Name] = useState("");

    const loadData = async () => {
        if (currentTenant) {
            const strats = await getSalesStrategies(currentTenant.tenant_id);
            setStrategies(strats.filter(s => s.isActive));

            setSchemes(await getRewardSchemes(currentTenant.tenant_id));

            const pbs = await getPlaybooks(currentTenant.tenant_id);
            setPlaybooks(pbs.filter(p => p.isActive));

            // Load real employees from Database
            const emps = await getEmployees(currentTenant.tenant_id);
            setEmployees(emps);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentTenant]);

    const handleOpenForm = () => {
        setSelectedStrategyId("");
        setSchemeName("");
        setOverridePct(0);
        setFixedBonus(0);
        setUnitsTier(0);
        setRecruitmentPct(0);
        setDrivers([]);
        setIsFormOpen(true);
    };

    const handleSendForApproval = () => {
        if (!currentTenant || !selectedStrategyId) return;

        saveRewardScheme({
            tenant_id: currentTenant.tenant_id,
            strategy_id: selectedStrategyId,
            name: schemeName || "Standard Reward",
            override_closed_loan_pct: overridePct,
            fixed_bonus: fixedBonus,
            units_won_tier: unitsTier,
            recruitment_override_pct: recruitmentPct,
            drivers,
            approver1_name: approver1Name || "Pending Assignment (Finance)",
            approver1_role: "Finance",
            approver2_name: approver2Name || "Pending Assignment (Legal)",
            approver2_role: "Legal",
        });

        setIsFormOpen(false);
        loadData();
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the reward scheme "${name}"?`)) {
            deleteRewardScheme(id);
            loadData();
        }
    };

    const handleEvaluate = (schemeId: string, approverNum: 1 | 2, status: ApprovalStatus) => {
        evaluateRewardScheme(schemeId, approverNum, status);
        loadData();
    };

    const activeStrategiesMap = useMemo(() => {
        const map = new Map<string, string>();
        strategies.forEach(s => map.set(s.id, s.name));
        return map;
    }, [strategies]);

    // Derived projection
    const sampleLoan = 350000;
    const baseBonus = fixedBonus + (sampleLoan * (overridePct / 100));

    // Calculate projected driver payouts (simplistic sum for now)
    const projectedDrivers = drivers.reduce((sum, d) => {
        if (d.type === "Volume") {
            return sum + (sampleLoan * (d.payout_amount / 10000)); // bps
        } else {
            return sum + d.payout_amount;
        }
    }, 0);

    const projectedBonus = baseBonus + projectedDrivers;

    const addDriver = () => {
        setDrivers([...drivers, { id: `DRV-${Date.now()}`, type: "Activity", payout_amount: 0 }]);
    };

    const removeDriver = (id: string) => {
        setDrivers(drivers.filter(d => d.id !== id));
    };

    const updateDriver = (id: string, field: keyof RewardDriver, value: any) => {
        setDrivers(drivers.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    // Derived steps from linked strategy playbook
    const availableSteps = useMemo(() => {
        if (!selectedStrategyId) return [];
        const pb = playbooks.find(p => p.strategy_id === selectedStrategyId);
        return pb ? pb.steps : [];
    }, [selectedStrategyId, playbooks]);

    // Calculate Pendings: Schemes that are not fully active
    const pendingSchemes = useMemo(() => {
        return schemes.filter(s => !s.isActive);
    }, [schemes]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
            {/* Header Actions */}
            <div className="p-6 flex items-center justify-between sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
                <div>
                    <h2 className="text-xl font-black text-navy-blue flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-cobalt-blue" />
                        Master Ledger: Reward Schemes
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Simulate multi-tier compensations and process dual-approvals.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Simulation Toolkit */}
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> System Role:
                        </span>
                        <select
                            value={simulatedRole}
                            onChange={(e) => setSimulatedRole(e.target.value as any)}
                            className="text-xs font-bold text-navy-blue bg-transparent outline-none cursor-pointer"
                        >
                            <option value="Admin">System Admin</option>
                            <option value="Finance">Finance Role (Approver 1)</option>
                            <option value="Legal">Legal Role (Approver 2)</option>
                        </select>
                    </div>

                    <div className="h-6 w-px bg-slate-200" /> {/* Divider */}

                    <button
                        onClick={() => setIsPendingModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-navy-blue text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Clock className="w-4 h-4 text-amber-500" />
                        See Pending ({pendingSchemes.length})
                    </button>

                    {simulatedRole === "Admin" && (
                        <button
                            onClick={handleOpenForm}
                            className="bg-cobalt-blue hover:bg-navy-blue text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm shadow-cobalt-blue/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Scheme
                        </button>
                    )}
                </div>
            </div>

            {/* List Content */}
            <div className="p-6 max-w-5xl mx-auto w-full">
                <div className="space-y-4">
                    {schemes.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                            <p className="text-sm text-slate-400 font-medium">No reward schemes configured yet.</p>
                        </div>
                    ) : (
                        schemes.map(s => {
                            const stratName = activeStrategiesMap.get(s.strategy_id) || "Unknown Strategy";
                            const isFullyActive = s.isActive;
                            const canApprove1 = simulatedRole === s.approver1_role;
                            const canApprove2 = simulatedRole === s.approver2_role;

                            return (
                                <div key={s.id} className={cn(
                                    "bg-white rounded-xl shadow-sm border p-5 flex items-center justify-between transition-all group",
                                    isFullyActive ? "border-emerald-500/30" : "border-slate-200 hover:border-cobalt-blue/50"
                                )}>
                                    {/* Left Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                                ID: {s.id}
                                            </span>
                                            <h4 className="font-bold text-navy-blue text-base">{s.name}</h4>
                                            {isFullyActive && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> Firm & Active
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 border border-slate-100 rounded text-navy-blue font-medium">
                                                <Activity className="w-3 h-3 text-cobalt-blue" />
                                                Strategy: {stratName}
                                            </span>
                                            <span><strong className="text-slate-700">Override:</strong> {s.override_closed_loan_pct}%</span>
                                            <span><strong className="text-slate-700">Bonus:</strong> ${s.fixed_bonus}</span>
                                        </div>
                                    </div>

                                    {/* Right Actions & Approvers */}
                                    <div className="flex items-center gap-6">

                                        {/* Action Buttons (Admin Only) */}
                                        {simulatedRole === "Admin" && (
                                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                                <button
                                                    onClick={() => handleDelete(s.id, s.name)}
                                                    className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-200 shadow-sm transition-all"
                                                    title="Delete Scheme"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4">
                                            {/* Approver 1 */}
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">{s.approver1_name}</span>
                                                <select
                                                    disabled={!canApprove1 && simulatedRole !== "Admin"}
                                                    value={s.approver1_status}
                                                    onChange={(e) => handleEvaluate(s.id, 1, e.target.value as ApprovalStatus)}
                                                    className={cn(
                                                        "text-xs font-bold border rounded-lg px-3 py-1.5 outline-none appearance-none pr-8 relative bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]",
                                                        !canApprove1 ? "opacity-60 cursor-not-allowed bg-slate-50 text-slate-500" : "cursor-pointer focus:ring-2 focus:ring-cobalt-blue/50 focus:border-cobalt-blue shadow-sm",
                                                        s.approver1_status === "Active" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                                                            s.approver1_status.includes("Inactive") ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-navy-blue"
                                                    )}
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' class='w-4 h-4 text-slate-400'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")` }}
                                                >
                                                    <option value="Pending">Pending Review</option>
                                                    <option value="Active">Active 1</option>
                                                    <option value="Inactive">Inactive 1</option>
                                                </select>
                                            </div>

                                            {/* Approver 2 */}
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">{s.approver2_name}</span>
                                                <select
                                                    disabled={!canApprove2 && simulatedRole !== "Admin"}
                                                    value={s.approver2_status}
                                                    onChange={(e) => handleEvaluate(s.id, 2, e.target.value as ApprovalStatus)}
                                                    className={cn(
                                                        "text-xs font-bold border rounded-lg px-3 py-1.5 outline-none appearance-none pr-8 relative bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]",
                                                        !canApprove2 ? "opacity-60 cursor-not-allowed bg-slate-50 text-slate-500" : "cursor-pointer focus:ring-2 focus:ring-cobalt-blue/50 focus:border-cobalt-blue shadow-sm",
                                                        s.approver2_status === "Active" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                                                            s.approver2_status.includes("Inactive") ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-navy-blue"
                                                    )}
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' class='w-4 h-4 text-slate-400'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")` }}
                                                >
                                                    <option value="Pending">Pending Review</option>
                                                    <option value="Active">Active 2</option>
                                                    <option value="Inactive">Inactive 2</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- Modals --- */}

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50 line-clamp-1">
                            <h3 className="text-lg font-black text-navy-blue flex items-center gap-2">
                                <Plus className="w-5 h-5 text-cobalt-blue" />
                                Design Reward Scheme
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            {/* Left Configuration */}
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">Scheme Name</label>
                                    <input
                                        type="text"
                                        value={schemeName}
                                        onChange={(e) => setSchemeName(e.target.value)}
                                        placeholder="e.g. Standard Retention Payout"
                                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-blue outline-none focus:border-cobalt-blue focus:ring-1 focus:ring-cobalt-blue"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 mt-4 text-cobalt-blue">Link to Active Strategy</label>
                                    <select
                                        value={selectedStrategyId}
                                        onChange={(e) => setSelectedStrategyId(e.target.value)}
                                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-blue font-semibold outline-none focus:border-cobalt-blue focus:ring-1 focus:ring-cobalt-blue"
                                    >
                                        <option value="">-- Required: Target Base Strategy --</option>
                                        {strategies.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} - ({s.id})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1"><Percent className="w-3 h-3 text-emerald-500" /> Override %</label>
                                        <input
                                            type="number" step="0.01" value={overridePct} onChange={(e) => setOverridePct(Number(e.target.value))}
                                            className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-sm text-navy-blue"
                                        />
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-500" /> Fixed Bonus</label>
                                        <input
                                            type="number" value={fixedBonus} onChange={(e) => setFixedBonus(Number(e.target.value))}
                                            className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-sm text-navy-blue"
                                        />
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Units Threshold</label>
                                        <input
                                            type="number" value={unitsTier} onChange={(e) => setUnitsTier(Number(e.target.value))}
                                            className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-sm text-navy-blue"
                                        />
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1"><Users className="w-3 h-3 text-emerald-500" /> Recruit Ratio %</label>
                                        <input
                                            type="number" step="0.01" value={recruitmentPct} onChange={(e) => setRecruitmentPct(Number(e.target.value))}
                                            className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-sm text-navy-blue"
                                        />
                                    </div>
                                </div>

                                {/* Advanced Drivers Section */}
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-black text-navy-blue flex items-center gap-2">
                                            <GitMerge className="w-4 h-4 text-purple-500" /> Compensation Drivers
                                        </h4>
                                        <button
                                            onClick={addDriver}
                                            className="text-xs font-bold text-cobalt-blue bg-cobalt-blue/10 px-3 py-1.5 rounded-md hover:bg-cobalt-blue hover:text-white transition-all flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Add Driver
                                        </button>
                                    </div>

                                    {drivers.length === 0 ? (
                                        <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                                            No advanced drivers added. Payouts will rely solely on fixed base settings.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {drivers.map((drv, idx) => (
                                                <div key={drv.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group">
                                                    <button
                                                        onClick={() => removeDriver(drv.id)}
                                                        className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    <div className="grid grid-cols-12 gap-3 items-center">
                                                        <div className="col-span-4">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Driver Type</label>
                                                            <select
                                                                value={drv.type}
                                                                onChange={(e) => updateDriver(drv.id, "type", e.target.value)}
                                                                className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-cobalt-blue font-bold text-navy-blue"
                                                            >
                                                                <option value="Activity">Activity Bonus</option>
                                                                <option value="Milestone">Milestone Bonus</option>
                                                                <option value="Volume">Volume BPS</option>
                                                            </select>
                                                        </div>

                                                        {drv.type !== "Volume" && (
                                                            <div className="col-span-4">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Trigger Execution Node</label>
                                                                <select
                                                                    value={drv.trigger_step_id || ""}
                                                                    onChange={(e) => updateDriver(drv.id, "trigger_step_id", e.target.value)}
                                                                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-cobalt-blue truncate"
                                                                >
                                                                    <option value="">-- Select Playbook Node --</option>
                                                                    {availableSteps.map(step => (
                                                                        <option key={step.id} value={step.id}>{step.title}</option>
                                                                    ))}
                                                                    {availableSteps.length === 0 && <option disabled>No steps in strategy playbook</option>}
                                                                </select>
                                                            </div>
                                                        )}

                                                        <div className={cn("col-span-4", drv.type === "Volume" && "col-start-9")}>
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                                                                Payout {drv.type === "Volume" ? "(# BPS)" : "($ Flat)"}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={drv.payout_amount}
                                                                onChange={(e) => updateDriver(drv.id, "payout_amount", Number(e.target.value))}
                                                                className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-cobalt-blue font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Projection */}
                            <div className="p-6 bg-navy-blue text-white flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-cobalt-blue/30 rounded-full blur-3xl pointer-events-none" />

                                <div>
                                    <h4 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Live Projection Model
                                    </h4>
                                    <p className="text-xs text-white/70 mb-6">Estimated outputs based on an average $350k closed loan volume.</p>

                                    <div className="text-5xl font-black tracking-tighter text-white">
                                        ${projectedBonus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mt-2 font-semibold">Est. Payout / Transaction</p>
                                </div>

                                <div className="mt-8 space-y-4">
                                    <div className="text-xs bg-black/20 p-4 rounded-xl border border-white/10 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                        <div className="flex flex-col gap-2 w-full">
                                            <p className="text-white/80 leading-relaxed">
                                                Select the real employees who will govern this structure. Upon saving, approval requisitions will be explicitly dispatched to them.
                                            </p>

                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Level 1: Finance Approver</label>
                                                <select
                                                    value={approver1Name}
                                                    onChange={(e) => setApprover1Name(e.target.value)}
                                                    className="w-full bg-white/10 border border-white/20 text-white text-xs rounded-lg p-2 outline-none"
                                                >
                                                    <option value="" className="text-navy-blue">-- Select Employee --</option>
                                                    {employees.map(e => (
                                                        <option key={e.eid} value={`${e.maestro.firstName} ${e.maestro.lastName}`} className="text-navy-blue">
                                                            {e.maestro.firstName} {e.maestro.lastName} - {e.historialLaboral.area}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Level 2: Legal Approver</label>
                                                <select
                                                    value={approver2Name}
                                                    onChange={(e) => setApprover2Name(e.target.value)}
                                                    className="w-full bg-white/10 border border-white/20 text-white text-xs rounded-lg p-2 outline-none"
                                                >
                                                    <option value="" className="text-navy-blue">-- Select Employee --</option>
                                                    {employees.map(e => (
                                                        <option key={e.eid} value={`${e.maestro.firstName} ${e.maestro.lastName}`} className="text-navy-blue">
                                                            {e.maestro.firstName} {e.maestro.lastName} - {e.historialLaboral.area}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSendForApproval}
                                            disabled={!selectedStrategyId || !schemeName.trim()}
                                            className="w-full h-12 bg-cobalt-blue hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-400 active:scale-[0.98] transition-all text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cobalt-blue/20"
                                        >
                                            Submit for Governance <Send className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Rewards Modal */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-amber-100 bg-amber-50">
                            <h3 className="text-lg font-black text-amber-700 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Schemes Pending Signatures
                            </h3>
                            <button onClick={() => setIsPendingModalOpen(false)} className="text-amber-500 hover:text-amber-700 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-5">
                                These Reward Schemes possess incomplete governance workflows and are blocked from use in HC allocations.
                            </p>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {pendingSchemes.length === 0 ? (
                                    <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-navy-blue">All Clear!</p>
                                        <p className="text-xs text-slate-500 mt-1">All schemes have achieved dual active status.</p>
                                    </div>
                                ) : (
                                    pendingSchemes.map(s => {
                                        return (
                                            <div key={s.id} className="p-4 border border-amber-200 bg-amber-50/30 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-navy-blue text-sm">{s.name}</h4>
                                                    <p className="text-xs text-slate-500 mt-1">ID: {s.id}</p>
                                                </div>

                                                <div className="flex flex-col gap-1 items-end">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approver Hold-ups:</span>
                                                    <div className="flex gap-2">
                                                        {s.approver1_status !== "Active" && (
                                                            <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                                End: {s.approver1_status}
                                                            </span>
                                                        )}
                                                        {s.approver2_status !== "Active" && (
                                                            <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                                Leg: {s.approver2_status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsPendingModalOpen(false)}
                                className="px-5 py-2 text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
