"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ModuleId } from "../layout/SideMenu";
import { ModuleNavigation, moduleSubModules } from "./ModuleNavigation";
import { SplitView } from "./SplitView";
import { PmoSidebar } from "../pmo/layout/PmoSidebar";
import { PmoDashboardHome } from "../pmo/PmoDashboardHome";
import { PmoWorkspaceManager } from "../pmo/workspace/PmoWorkspaceManager";
import { PayrollNovedades } from "../hr/PayrollNovedades";
import { HCMaestro } from "../hr/HCMaestro";
import { CentralizedUploadPage } from "../hr/CentralizedUploadPage";
import { FinancePLUploadPage } from "../finance/FinancePLUploadPage";
import { AdminGate } from "../auth/AdminGate";
import { PerformanceModule } from "../business-plan/PerformanceModule";
import { HRMetricsDashboard } from "../hr/HRMetricsDashboard";
import { GrowthifyModule } from "../business-plan/GrowthifyModule";
import { CommercialActivityModule } from "../commercial-activity/CommercialActivityModule";

import { BranchMasterApp } from "../operations/branches/BranchMasterApp";
import { HierarchyMapApp } from "../operations/branches/HierarchyMapApp";
import { ProformasApp } from "../operations/proformas/ProformasApp";
import { JobTitleApp } from "../hr/recruitment/JobTitleApp";
import { FxManagerApp } from "../finance/fx-manager/FxManagerApp";
import { MyPlanShell } from "../pmo/MyPlan/MyPlanShell";
import { PlaybookDesignerApp } from "../playbook-designer/PlaybookDesignerApp";
import { PlaybookMarketplaceApp } from "../business-plan/playbooks/PlaybookMarketplaceApp";
import { JourneyMapApp } from "../ceo-playground/JourneyMapApp";
import {
    LayoutDashboard, Users, LineChart, Briefcase, ShieldCheck, BrainCircuit, Rocket, LayoutGrid, TrendingUp
} from "lucide-react";

const moduleConfig: Record<ModuleId, { label: string; icon: React.ElementType; color: string }> = {
    "business-plan": { label: "Business Plan", icon: LayoutDashboard, color: "text-cobalt-blue" },
    growthify: { label: "Growthify", icon: Rocket, color: "text-purple-500" },
    pmo: { label: "PMO", icon: LayoutGrid, color: "text-[#6161FF]" },
    "commercial-activity": { label: "Commercial Activity", icon: TrendingUp, color: "text-emerald-500" },
    hr: { label: "Human Resources", icon: Users, color: "text-emerald-500" },
    finance: { label: "Finance", icon: LineChart, color: "text-amber-500" },
    operations: { label: "Operations", icon: Briefcase, color: "text-violet-500" },
    compliance: { label: "Compliance", icon: ShieldCheck, color: "text-rose-500" },
    "ceo-playground": { label: "CEO Playground", icon: BrainCircuit, color: "text-sky-500" },
};

interface DashboardContentProps {
    activeModule: ModuleId;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
    activeModule,
}) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeSubModule, setActiveSubModule] = useState("");

    useEffect(() => {
        const urlSub = searchParams.get("sub");
        const subModules = moduleSubModules[activeModule];

        if (urlSub && subModules?.some(s => s.id === urlSub)) {
            setActiveSubModule(urlSub);
        } else if (subModules && subModules.length > 0) {
            setActiveSubModule(subModules[0].id);
        } else {
            setActiveSubModule("");
        }
    }, [activeModule, searchParams]);

    const config = moduleConfig[activeModule];
    const Icon = config.icon;

    return (
        <div className="flex flex-col h-full bg-white">
            {activeModule !== "pmo" && (
                <>
                    {/* Module Header Bar */}
                    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <h1 className="text-base font-bold text-navy-blue">{config.label}</h1>
                    </div>

                    {/* Sub-module Tab Navigation */}
                    <ModuleNavigation
                        activeModule={activeModule}
                        activeSubModule={activeSubModule}
                        onSelectSubModule={setActiveSubModule}
                    />
                </>
            )}

            {/* Sub-module Content — fills remaining height */}
            <div className="flex-1 min-h-0 overflow-hidden flex">
                {activeModule === "pmo" && (
                    <PmoSidebar 
                        activeSubModule={activeSubModule} 
                        onSelectSubModule={setActiveSubModule} 
                    />
                )}
                
                <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
                    {activeModule === "pmo" ? (
                        activeSubModule === "my-plan" ? <MyPlanShell /> :
                        activeSubModule === "my-work" ? <div className="p-8">My Work / No modificar</div> :
                        activeSubModule === "my-queue" ? <div className="p-8">My Queue / No modificar</div> :
                        activeSubModule === "my-projects" ? <PmoWorkspaceManager /> :
                        <PmoDashboardHome onNavigate={setActiveSubModule} />
                    ) : activeModule === "growthify" ? (
                        <GrowthifyModule activeSubModule={activeSubModule} />
                    ) : activeModule === "commercial-activity" ? (
                        <CommercialActivityModule activeSubModule={activeSubModule} />
                    ) : activeSubModule === "hc-master" ? (
                        <AdminGate title="Datos de empleados (HC Master)">
                            <HCMaestro />
                        </AdminGate>
                    ) : activeSubModule === "centralized-upload" ? (
                        <AdminGate title="Carga Centralizada de Empleados" requiredRoles={["admin", "hr"]}>
                            <CentralizedUploadPage />
                        </AdminGate>
                    ) : activeSubModule === "pnl" ? (
                        <AdminGate title="P&L Overview" requiredRoles={["admin", "branch_manager"]}>
                            <FinancePLUploadPage />
                        </AdminGate>
                    ) : activeSubModule === "payroll-changes" ? (
                        <PayrollNovedades />
                    ) : activeSubModule === "performance" ? (
                        <PerformanceModule />
                    ) : activeSubModule === "hr-metrics" ? (
                        <HRMetricsDashboard />
                    ) : activeSubModule === "branches-master" ? (
                        <BranchMasterApp />
                    ) : activeSubModule === "hierarchy-map" ? (
                        <HierarchyMapApp />
                    ) : activeSubModule === "proformas" ? (
                        <ProformasApp />
                    ) : activeSubModule === "job-titles" || activeSubModule === "job-description" ? (
                        <JobTitleApp />
                    ) : activeSubModule === "fx-manager" ? (
                        <FxManagerApp />
                    ) : activeSubModule === "playbooks" ? (
                        <PlaybookMarketplaceApp />
                    ) : activeSubModule === "playbook-designer" ? (
                        <PlaybookDesignerApp
                            initialPlaybookId={searchParams.get("id") ?? null}
                            duplicateFromId={searchParams.get("duplicate") ?? null}
                        />
                    ) : activeSubModule === "journey-map" ? (
                        <JourneyMapApp />
                    ) : (
                        <SplitView subModuleId={activeSubModule} />
                    )}
                </div>
            </div>
        </div>
    );
};
