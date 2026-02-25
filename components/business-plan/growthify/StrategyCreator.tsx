"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTenant } from "@/lib/tenant-context";
import { SalesStrategy, RewardScheme } from "@/lib/growthify-types";
import { getSalesStrategies, saveSalesStrategy, toggleStrategyStatus, deleteSalesStrategy, getRewardSchemes } from "@/lib/growthify-store";
import { Plus, Power, Save, FileText, Activity, X, Edit, Trash2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const StrategyCreator: React.FC = () => {
    const { currentTenant } = useTenant();
    const [strategies, setStrategies] = useState<SalesStrategy[]>([]);
    const [rewards, setRewards] = useState<RewardScheme[]>([]);

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [purpose, setPurpose] = useState("");

    // Toasts
    const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "warning" | "error" }[]>([]);

    const addToast = (message: string, type: "success" | "warning" | "error" = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    const loadData = async () => {
        if (currentTenant) {
            setStrategies(await getSalesStrategies(currentTenant.tenant_id));
            setRewards(await getRewardSchemes(currentTenant.tenant_id));
        }
    };

    useEffect(() => {
        loadData();
    }, [currentTenant]);

    const handleOpenForm = (strat?: SalesStrategy) => {
        if (strat) {
            setEditId(strat.id);
            setName(strat.name);
            setPurpose(strat.purpose);
        } else {
            setEditId(null);
            setName("");
            setPurpose("");
        }
        setIsFormOpen(true);
    };

    const handleSave = () => {
        if (!currentTenant || !name.trim() || !purpose.trim()) return;

        // Duplicate Check
        const existing = strategies.find(s =>
            s.name.toLowerCase().trim() === name.toLowerCase().trim() &&
            s.id !== editId
        );

        if (existing) {
            addToast(`Strategy name "${name}" already exists. Each strategy must have a unique identity.`, "warning");
            return;
        }

        saveSalesStrategy({
            id: editId || undefined,
            tenant_id: currentTenant.tenant_id,
            name,
            purpose,
            isActive: editId ? undefined : false, // preserve active state if editing, default false if new
        });

        addToast(editId ? "Strategy updated successfully." : "New strategy created successfully.", "success");
        setIsFormOpen(false);
        loadData();
    };

    const handleDelete = (id: string, stratName: string) => {
        if (window.confirm(`Are you sure you want to delete strategy "${stratName}"? This will also remove any linked reward schemes.`)) {
            deleteSalesStrategy(id);
            addToast(`Strategy "${stratName}" deleted.`, "success");
            loadData();
        }
    };

    const handleToggle = (id: string, currentStatus: boolean, name: string) => {
        toggleStrategyStatus(id);
        addToast(`Strategy "${name}" is now ${!currentStatus ? 'Active' : 'Inactive'}.`, "success");
        loadData();
    };

    // Calculate Pendings: Strategies that are Active themselves, BUT do not have any fully active Reward Scheme linked.
    const pendingStrategies = useMemo(() => {
        return strategies.filter(s => {
            if (!s.isActive) return false;
            // Does it have an active reward scheme?
            const hasActiveReward = rewards.some(r => r.strategy_id === s.id && r.isActive);
            return !hasActiveReward;
        });
    }, [strategies, rewards]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
            {/* Header Actions */}
            <div className="p-6 flex items-center justify-between sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
                <div>
                    <h2 className="text-xl font-black text-navy-blue flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cobalt-blue" />
                        Master Ledger: Target Strategies
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Design and manage the structural sales initiatives for your human capital.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsPendingModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-navy-blue text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Clock className="w-4 h-4 text-amber-500" />
                        See Pending ({pendingStrategies.length})
                    </button>
                    <button
                        onClick={() => handleOpenForm()}
                        className="bg-cobalt-blue hover:bg-navy-blue text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm shadow-cobalt-blue/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New Strategy
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="p-6 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {strategies.length === 0 ? (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-sm text-slate-400 font-medium">No strategies defined yet.</p>
                        </div>
                    ) : (
                        strategies.map(s => {
                            const linkedRewardsCount = rewards.filter(r => r.strategy_id === s.id).length;

                            return (
                                <div key={s.id} className="bg-white border text-left border-slate-200 p-5 rounded-2xl shadow-sm hover:border-cobalt-blue/30 transition-all group flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="font-bold text-navy-blue text-base pr-2 leading-tight">
                                            {s.name}
                                        </div>
                                        <button
                                            onClick={() => handleToggle(s.id, s.isActive, s.name)}
                                            className={cn(
                                                "w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all",
                                                s.isActive ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                            )}
                                            title={s.isActive ? "Deactivate Strategy" : "Activate Strategy"}
                                        >
                                            <Power className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-2 text-xs text-slate-500 mb-6 flex-1">
                                        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                                        <p className="line-clamp-3 leading-relaxed">{s.purpose}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded border",
                                                s.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                {s.isActive ? "Active" : "Inactive"}
                                            </span>
                                            {linkedRewardsCount > 0 && (
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-blue-50 text-cobalt-blue border-blue-200">
                                                    {linkedRewardsCount} Schemes
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenForm(s)}
                                                className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition-all"
                                                title="Edit Strategy"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id, s.name)}
                                                className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded border border-red-200 transition-all"
                                                title="Delete Strategy"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                            <h3 className="text-lg font-black text-navy-blue">
                                {editId ? "Edit Strategy" : "Create New Strategy"}
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">Strategy Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., B2B, Recruitment, NPPM"
                                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-blue focus:outline-none focus:border-cobalt-blue focus:ring-1 focus:ring-cobalt-blue transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">Purpose & Scope</label>
                                <textarea
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    placeholder="Explain the operational boundaries and goals..."
                                    className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-blue focus:outline-none focus:border-cobalt-blue focus:ring-1 focus:ring-cobalt-blue transition-all resize-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || !purpose.trim()}
                                className="px-5 py-2.5 bg-cobalt-blue hover:bg-navy-blue text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                {editId ? "Save Changes" : "Create Strategy"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Strategies Modal */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-amber-100 bg-amber-50">
                            <h3 className="text-lg font-black text-amber-700 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Pending Action Required
                            </h3>
                            <button onClick={() => setIsPendingModalOpen(false)} className="text-amber-500 hover:text-amber-700 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-5">
                                The following Sales Strategies are marked as <span className="font-bold">Active</span>, but they cannot be deployed in HC assignments yet because they <strong>lack a fully-approved Reward Scheme</strong>.
                            </p>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {pendingStrategies.length === 0 ? (
                                    <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50">
                                        <Activity className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-navy-blue">All Clear!</p>
                                        <p className="text-xs text-slate-500 mt-1">All active strategies have an approved reward scheme.</p>
                                    </div>
                                ) : (
                                    pendingStrategies.map(s => {
                                        const unapprovedRewards = rewards.filter(r => r.strategy_id === s.id && !r.isActive);
                                        return (
                                            <div key={s.id} className="p-4 border border-amber-200 bg-amber-50/30 rounded-xl flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-navy-blue text-sm">{s.name}</h4>
                                                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                                        Missing Scheme
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">{s.purpose}</p>

                                                {unapprovedRewards.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-amber-100/50">
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Unapproved Drafts exist:</p>
                                                        {unapprovedRewards.map(ur => (
                                                            <div key={ur.id} className="text-xs text-slate-600 flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-100 mb-1">
                                                                <span>{ur.name}</span>
                                                                <span className="text-[10px] text-slate-400">{ur.approver1_status === 'Active' && ur.approver2_status === 'Active' ? 'Active' : 'Pending Governance'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
                                Close Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts */}
            <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className={cn("px-4 py-2.5 rounded-xl shadow-2xl border text-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300",
                        t.type === "success" ? "bg-white border-emerald-100 text-emerald-700 shadow-emerald-500/10" :
                            t.type === "warning" ? "bg-white border-amber-100 text-amber-700 shadow-amber-500/10" :
                                "bg-white border-red-100 text-red-700 shadow-red-500/10")}>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            t.type === "success" ? "bg-emerald-50" : t.type === "warning" ? "bg-amber-50" : "bg-red-50")}>
                            {t.type === "success" ? <Activity className="w-4 h-4 text-emerald-600" /> :
                                t.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                                    <X className="w-4 h-4 text-red-600" />}
                        </div>
                        <div className="flex flex-col py-0.5">
                            <span className="font-bold text-xs uppercase tracking-wider opacity-60">
                                {t.type === "success" ? "Operation Successful" : t.type === "warning" ? "Validation Warning" : "System Error"}
                            </span>
                            <span className="font-medium text-[13px]">{t.message}</span>
                        </div>
                        <button onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))} className="ml-2 p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

        </div>
    );
};
