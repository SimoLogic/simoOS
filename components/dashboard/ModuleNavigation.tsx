"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ModuleId } from "../layout/SideMenu";

export type SubModule = {
    id: string;
    label: string;
};

export const moduleSubModules: Record<ModuleId, SubModule[]> = {
    "business-plan": [

        { id: "existing-accounts", label: "Existing Accounts" },
        { id: "new-business", label: "New Business" },
        { id: "playbooks", label: "Playbooks" },
        { id: "playbook-designer", label: "Playbook Designer" },
        { id: "performance", label: "SOP Designer" },
    ],
    growthify: [
        { id: "race-now", label: "Race Track LIVE" },
        { id: "seller-activity", label: "Seller Activity (Trading Floor)" },
        { id: "engine-setup", label: "Sales Engine Set Up" },
        { id: "sales-hc", label: "Sales HC" },
    ],
    hr: [
        { id: "hc-master", label: "HC Master" },
        { id: "recruitment", label: "Recruitment" },
        { id: "job-description", label: "Job Description" },
        { id: "onboarding", label: "Onboarding" },
        { id: "payroll", label: "Payroll & Benefits" },
        { id: "hr-metrics", label: "HR Metrics" },
        { id: "payroll-changes", label: "Payroll Changes" },
        { id: "centralized-upload", label: "Carga Centralizada" },
    ],
    finance: [
        { id: "pnl", label: "P&L Overview" },
        { id: "invoicing", label: "Invoicing" },
        { id: "projections", label: "Projections" },
        { id: "fx-manager", label: "FX Manager" },
    ],
    operations: [
        { id: "branches-master", label: "Branch Master" },
        { id: "hierarchy-map", label: "Hierarchy Map" },
        { id: "proformas", label: "Proformas" },
        { id: "workflow", label: "Daily Workflow" },
        { id: "sla-tracking", label: "SLA Tracking" },
        { id: "resource-allocation", label: "Resources" },
    ],
    compliance: [
        { id: "audits", label: "Audits" },
        { id: "regulatory", label: "Regulatory" },
        { id: "security", label: "Data Security" },
    ],
    "ceo-playground": [
        { id: "journey-map", label: "Journey Map" },
        { id: "strategy", label: "Strategic Overview" },
        { id: "market-analysis", label: "Market Analysis" },
    ],
    pmo: [
        { id: "my-plan", label: "My Plan" },
        { id: "my-work", label: "My Work" },
        { id: "my-queue", label: "My Queue" },
        { id: "my-projects", label: "My Projects" },
    ],
    "commercial-activity": [
        { id: "activity", label: "Commercial Activity" },
    ],
};

interface ModuleNavigationProps {
    activeModule: ModuleId;
    activeSubModule: string;
    onSelectSubModule: (id: string) => void;
}

export const ModuleNavigation: React.FC<ModuleNavigationProps> = ({
    activeModule,
    activeSubModule,
    onSelectSubModule,
}) => {
    const subModules = moduleSubModules[activeModule] || [];

    return (
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 shrink-0">
            {subModules.map((sub) => (
                <button
                    key={sub.id}
                    onClick={() => onSelectSubModule(sub.id)}
                    className={cn(
                        "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                        activeSubModule === sub.id
                            ? "text-navy-blue"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    {sub.label}
                    {activeSubModule === sub.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cobalt-blue rounded-t-full" />
                    )}
                </button>
            ))}
        </div>
    );
};
