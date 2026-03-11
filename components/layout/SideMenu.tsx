"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Users,
    LineChart,
    Briefcase,
    ShieldCheck,
    LayoutDashboard,
    BrainCircuit,
    Settings,
    Shield,
    UserCog,
    ChevronRight,
    Rocket,
    LayoutGrid,
    CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleId =
    | "hr"
    | "finance"
    | "operations"
    | "compliance"
    | "business-plan"
    | "growthify"
    | "pmo"
    | "ceo-playground";

// PMO sub-modules
export type PmoSubModuleId = "my-plan";

interface PmoSubModule {
    id: PmoSubModuleId;
    label: string;
    icon: React.ElementType;
    href: string;
}

const pmoSubModules: PmoSubModule[] = [
    { id: "my-plan", label: "My Plan", icon: CalendarDays, href: "/pmo/my-plan" },
];

interface ModuleItem {
    id: ModuleId;
    label: string;
    icon: React.ElementType;
    color: string;
}

const modules: ModuleItem[] = [
    { id: "business-plan", label: "Business Plan", icon: LayoutDashboard, color: "text-cobalt-blue" },
    { id: "growthify", label: "Growthify", icon: Rocket, color: "text-purple-500" },
    { id: "pmo", label: "PMO", icon: LayoutGrid, color: "text-[#6161FF]" },
    { id: "hr", label: "HR", icon: Users, color: "text-emerald-500" },
    { id: "finance", label: "Finance", icon: LineChart, color: "text-amber-500" },
    { id: "operations", label: "Operations", icon: Briefcase, color: "text-violet-500" },
    { id: "compliance", label: "Compliance", icon: ShieldCheck, color: "text-rose-500" },
    { id: "ceo-playground", label: "CEO Playground", icon: BrainCircuit, color: "text-sky-500" },
];

const bottomItems = [
    { label: "Administrator", icon: UserCog },
    { label: "User Roles", icon: Shield },
    { label: "Settings", icon: Settings },
];

interface SideMenuProps {
    activeModule: ModuleId;
    onSelectModule: (id: ModuleId) => void;
    onAdminClick?: () => void;
    activePmoSubModule?: PmoSubModuleId;
    onSelectPmoSubModule?: (id: PmoSubModuleId) => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
    activeModule,
    onSelectModule,
    onAdminClick,
    activePmoSubModule = "my-plan",
    onSelectPmoSubModule,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Collapse when clicking outside the sidebar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div
            ref={sidebarRef}
            className={cn(
                "fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-[#001e42] transition-all duration-300 ease-in-out flex flex-col z-40 overflow-hidden",
                isExpanded ? "w-56" : "w-14"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute -right-3 top-6 w-6 h-6 bg-cobalt-blue rounded-full flex items-center justify-center shadow-md z-50 border-2 border-[#001e42] hover:bg-cobalt-blue/80 transition-colors"
            >
                <ChevronRight
                    className={cn(
                        "w-3 h-3 text-white transition-transform duration-300",
                        isExpanded && "rotate-180"
                    )}
                />
            </button>

            {/* Top 3/4: Module Navigation */}
            <div className="flex-1 pt-4 pb-2 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
                {modules.map((module) => {
                    const isActive = activeModule === module.id;
                    const isPmo = module.id === "pmo";
                    return (
                        <React.Fragment key={module.id}>
                            <button
                                onClick={() => onSelectModule(module.id)}
                                title={!isExpanded ? module.label : undefined}
                                className={cn(
                                    "relative flex items-center gap-3 mx-2 rounded-lg transition-all duration-150 group",
                                    isExpanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center",
                                    isActive && isPmo
                                        ? "bg-[#6161FF]/20 shadow-lg shadow-[#6161FF]/20"
                                        : isActive
                                        ? "bg-cobalt-blue shadow-lg shadow-cobalt-blue/30"
                                        : "hover:bg-white/8"
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className={cn(
                                        "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full",
                                        isPmo ? "bg-[#6161FF]" : "bg-white"
                                    )} />
                                )}

                                <module.icon
                                    className={cn(
                                        "w-5 h-5 shrink-0 transition-colors",
                                        isActive && isPmo ? "text-[#6161FF]" : isActive ? "text-white" : module.color
                                    )}
                                />

                                <span
                                    className={cn(
                                        "text-sm font-medium whitespace-nowrap transition-all duration-200 overflow-hidden",
                                        isExpanded ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0",
                                        isActive && isPmo ? "text-[#6161FF]" : isActive ? "text-white" : "text-white/70"
                                    )}
                                >
                                    {module.label}
                                </span>
                            </button>

                            {/* PMO Sub-modules — shown when PMO is active and sidebar is expanded */}
                            {isPmo && isActive && isExpanded && (
                                <div className="ml-2 border-l border-[#6161FF]/30 pl-2 flex flex-col gap-0.5">
                                    {pmoSubModules.map((sub) => {
                                        const isSubActive = activePmoSubModule === sub.id;
                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => onSelectPmoSubModule?.(sub.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-100",
                                                    isSubActive
                                                        ? "bg-[#6161FF]/20 text-[#6161FF]"
                                                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                                )}
                                            >
                                                <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                                <span>{sub.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-white/10" />

            {/* Bottom: Admin/Settings */}
            <div className="py-3 flex flex-col gap-1">
                {bottomItems.map((item) => (
                    <button
                        key={item.label}
                        title={!isExpanded ? item.label : undefined}
                        onClick={item.label === "Administrator" ? onAdminClick : undefined}
                        className={cn(
                            "flex items-center gap-3 mx-2 rounded-lg py-2 transition-all duration-150 hover:bg-white/8",
                            item.label === "Administrator" ? "hover:bg-cobalt-blue/20" : "",
                            isExpanded ? "px-3" : "px-0 justify-center"
                        )}
                    >
                        <item.icon className={cn("w-4 h-4 shrink-0", item.label === "Administrator" ? "text-cobalt-blue/70" : "text-white/40")} />
                        <span
                            className={cn(
                                "text-xs font-medium whitespace-nowrap transition-all duration-200 overflow-hidden",
                                item.label === "Administrator" ? "text-cobalt-blue/70" : "text-white/40",
                                isExpanded ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
                            )}
                        >
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
