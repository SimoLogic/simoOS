"use client";

import React, { useState, useRef } from "react";
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
    LayoutGrid,
    CalendarDays,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MODULE IDs — Literal as per Plan Maestro
 */
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
export type PmoSubModuleId = "my-plan" | "my-work";

interface PmoSubModule {
    id: PmoSubModuleId;
    label: string;
    icon: React.ElementType;
    href: string;
}

const pmoSubModules: PmoSubModule[] = [
    { id: "my-plan", label: "My Plan", icon: CalendarDays, href: "/pmo/my-plan" },
    { id: "my-work", label: "My Work", icon: Briefcase, href: "/pmo/my-work" },
];



interface ModuleItem {
    id: ModuleId;
    label: string;
    icon: React.ElementType;
    colorVar: string; // Using CSS variable or hex from tokens.ts logic
}

function RocketIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" />
            <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" />
        </svg>
    )
}

const modules: ModuleItem[] = [
    { id: "business-plan", label: "Business Plan", icon: LayoutDashboard, colorVar: "var(--cobalt-blue)" },
    { id: "growthify", label: "Growthify", icon: RocketIcon, colorVar: "#9333ea" }, // tailwind purple-600 logic
    { id: "pmo", label: "PMO", icon: LayoutGrid, colorVar: "var(--vibe-purple)" },
    { id: "hr", label: "HR", icon: Users, colorVar: "#10b981" }, // emerald-500
    { id: "finance", label: "Finance", icon: LineChart, colorVar: "#f59e0b" }, // amber-500
    { id: "operations", label: "Operations", icon: Briefcase, colorVar: "#8b5cf6" }, // violet-500
    { id: "compliance", label: "Compliance", icon: ShieldCheck, colorVar: "#f43f5e" }, // rose-500
    { id: "ceo-playground", label: "CEO Playground", icon: BrainCircuit, colorVar: "#0ea5e9" }, // sky-500
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
    onAiSummaryClick?: () => void;
}

/**
 * SideMenu — Modular & Responsive Sidebar
 * Uses Vibe Tokens for professional feel (Master Key #1 Integration).
 */
export const SideMenu: React.FC<SideMenuProps> = ({
    activeModule,
    onSelectModule,
    onAdminClick,
    activePmoSubModule = "my-plan",
    onSelectPmoSubModule,
    onAiSummaryClick,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Expand on hover for snappy professional feel
    const handleMouseEnter = () => setIsExpanded(true);
    const handleMouseLeave = () => setIsExpanded(false);

    return (
        <aside
            ref={sidebarRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-[var(--vibe-mirage)] transition-all ease-[var(--ease-productive)] z-40 overflow-hidden flex flex-col",
                isExpanded ? "w-64" : "w-16 shadow-lg shadow-black/20",
                "duration-[var(--motion-productive-medium)]"
            )}
        >
            {/* Top Navigation */}
            <nav className="flex-1 pt-4 pb-2 flex flex-col gap-1 overflow-y-auto overflow-x-hidden scrollbar-none">
                {modules.map((module) => {
                    const isActive = activeModule === module.id;
                    const isPmo = module.id === "pmo";
                    
                    return (
                        <React.Fragment key={module.id}>
                            <button
                                onClick={() => onSelectModule(module.id)}
                                title={!isExpanded ? module.label : undefined}
                                className={cn(
                                    "relative flex items-center gap-3 mx-2 rounded-[var(--radius-sm)] transition-all group",
                                    isExpanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center",
                                    isActive 
                                        ? isPmo 
                                            ? "bg-[rgba(97,97,255,0.15)] shadow-sm" 
                                            : "bg-[var(--cobalt-blue)] shadow-lg shadow-[var(--cobalt-blue)]/20"
                                        : "hover:bg-white/8",
                                    "duration-[var(--motion-productive-short)]"
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className={cn(
                                        "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-sm",
                                        isPmo ? "bg-[var(--vibe-purple)]" : "bg-white"
                                    )} />
                                )}

                                <module.icon
                                    style={{ color: isActive && !isPmo ? "white" : module.colorVar }}
                                    className={cn(
                                        "w-5 h-5 shrink-0 transition-colors duration-[var(--motion-productive-short)]"
                                    )}
                                />

                                <span
                                    className={cn(
                                        "text-[14px] font-medium whitespace-nowrap transition-all duration-[var(--motion-productive-medium)] overflow-hidden",
                                        isExpanded ? "opacity-100 max-w-[170px]" : "opacity-0 max-w-0",
                                        isActive && isPmo ? "text-[var(--vibe-purple)]" : "text-white/90"
                                    )}
                                >
                                    {module.label}
                                </span>

                                {/* Visual hint for PMO activity */}
                                {isPmo && !isExpanded && isActive && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--vibe-purple)] animate-pulse" />
                                )}
                            </button>

                            {/* Sub-modules for PMO */}
                            {isPmo && isActive && isExpanded && (
                                <div className="ml-5 mt-1 mb-2 border-l border-white/10 pl-3 flex flex-col gap-1 animate-fade-in">
                                    {pmoSubModules.map((sub) => {
                                        const isSubActive = activePmoSubModule === sub.id;
                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => onSelectPmoSubModule?.(sub.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-xs)] text-[12px] font-medium transition-all duration-[var(--motion-productive-short)]",
                                                    isSubActive
                                                        ? "bg-[rgba(97,97,255,0.2)] text-[var(--vibe-purple)]"
                                                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                                )}
                                            >
                                                <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                                <span>{sub.label}</span>
                                            </button>
                                        );
                                    })}

                                    {/* AI Smart Summary Contextual Link */}
                                    <button
                                        onClick={onAiSummaryClick}
                                        className="mt-3 mx-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-[var(--radius-xs)] bg-gradient-to-r from-[var(--vibe-blue)] to-[var(--vibe-purple)] text-white text-[9px] font-bold uppercase tracking-wider hover:brightness-110 transition-all"
                                    >
                                        <BrainCircuit className="w-3 h-3" />
                                        <span>AI Summary</span>
                                    </button>
                                </div>
                            )}

                        </React.Fragment>
                    );
                })}
            </nav>

            {/* Bottom Controls */}
            <div className="mt-auto py-4 border-t border-white/5 flex flex-col gap-1">
                {bottomItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={item.label === "Administrator" ? onAdminClick : undefined}
                        className={cn(
                            "flex items-center gap-3 mx-2 rounded-[var(--radius-sm)] py-2 transition-all hover:bg-white/5",
                            isExpanded ? "px-3" : "px-0 justify-center",
                            "duration-[var(--motion-productive-short)]"
                        )}
                    >
                        <item.icon className="w-4 h-4 shrink-0 text-white/40" />
                        <span
                            className={cn(
                                "text-[12px] font-medium whitespace-nowrap transition-all duration-[var(--motion-productive-medium)]",
                                isExpanded ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0",
                                "text-white/40"
                            )}
                        >
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </aside>
    );
};
