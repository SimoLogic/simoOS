"use client";

import React, { useState, useCallback } from "react";
import { X, GitBranch, Map, BarChart3, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedProcess } from "@/lib/process-designer-types";
import { getSavedProcesses } from "@/lib/process-designer-store";
import { FlowDesigner } from "./FlowDesigner";
import { VisualMap } from "./VisualMap";
import { ProcessDashboard } from "./ProcessDashboard";

import { useTenant } from "@/lib/tenant-context";
import { getActiveTenants } from "@/lib/tenant-store";
import { Building2 } from "lucide-react";

type TabId = "flow-designer" | "visual-map" | "dashboard";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "flow-designer", label: "Flow Designer", icon: GitBranch },
    { id: "visual-map", label: "Visual Map", icon: Map },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
];

interface ProcessDesignerAppProps {
    onClose: () => void;
}

export const ProcessDesignerApp: React.FC<ProcessDesignerAppProps> = ({ onClose }) => {
    const { currentTenant } = useTenant();
    const hasActiveTenant = !!currentTenant;
    const [anyTenantExists, setAnyTenantExists] = useState(false);

    React.useEffect(() => {
        const check = async () => {
            const list = await getActiveTenants();
            setAnyTenantExists(list.length > 0);
        };
        check();
    }, []);

    const [activeTab, setActiveTab] = useState<TabId>("flow-designer");
    const [savedProcesses, setSavedProcesses] = useState<SavedProcess[]>([]);

    const refreshProcesses = useCallback(async () => {
        if (currentTenant) {
            setSavedProcesses(await getSavedProcesses(currentTenant.tenant_id));
        }
    }, [currentTenant]);

    React.useEffect(() => {
        refreshProcesses();
    }, [refreshProcesses]);

    // Tenant Blocker
    if (!hasActiveTenant) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
                    <div className="px-6 py-8 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-7 h-7 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-navy-blue mb-2">No Active Tenant selected</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-6">
                            {anyTenantExists
                                ? "Please select an active tenant from the header before designing processes."
                                : "You must create and select a Tenant before using the Process Designer. Go to Administrator → Multi-Tenant Set Up."}
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Return to Module
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ── App Header ── */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cobalt-blue/10 flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-cobalt-blue" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Plan</span>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</span>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] font-bold text-cobalt-blue uppercase tracking-widest">Process Designer</span>
                        </div>
                        <h2 className="text-sm font-bold text-navy-blue leading-tight">Process Designer</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{savedProcesses.length} design{savedProcesses.length !== 1 ? "s" : ""} saved</span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="flex items-center gap-0 border-b border-slate-200 bg-white px-6 shrink-0">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                                isActive ? "text-navy-blue" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cobalt-blue rounded-t-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ── */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "flow-designer" && (
                    <FlowDesigner onDesignsChange={refreshProcesses} />
                )}
                {activeTab === "visual-map" && (
                    <VisualMap processes={savedProcesses} />
                )}
                {activeTab === "dashboard" && (
                    <ProcessDashboard processes={savedProcesses} />
                )}
            </div>
        </div>
    );
};
