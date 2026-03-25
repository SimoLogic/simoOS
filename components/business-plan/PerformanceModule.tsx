"use client";

import React, { useState } from "react";
import { GitBranch, BarChart3, ClipboardCheck, ChevronRight, Zap } from "lucide-react";
import { ProcessDesignerApp } from "./ProcessDesigner";

interface AppCard {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    available: boolean;
}

const apps: AppCard[] = [
    {
        id: "process-designer",
        title: "Process Designer",
        description: "Map, analyze and optimize your operational processes. Design flow diagrams, calculate workloads, and identify efficiency gains.",
        icon: GitBranch,
        color: "text-cobalt-blue",
        bg: "bg-cobalt-blue/10",
        available: true,
    },
    {
        id: "kpi-tracker",
        title: "KPI Tracker",
        description: "Define and track performance indicators at team and individual level. Connect to real-time data feeds.",
        icon: BarChart3,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
        available: false,
    },
    {
        id: "audit-checklist",
        title: "Audit Checklist",
        description: "Create standardized audit checklists for process compliance and quality assurance reviews.",
        icon: ClipboardCheck,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        available: false,
    },
];

export const PerformanceModule: React.FC = () => {
    const [openApp, setOpenApp] = useState<string | null>(null);

    if (openApp === "process-designer") {
        return <ProcessDesignerApp onClose={() => setOpenApp(null)} />;
    }

    return (
        <div className="h-full bg-white overflow-y-auto">
            {/* Sub-module header */}
            <div className="px-8 pt-8 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-cobalt-blue" />
                    <span className="text-xs font-bold text-cobalt-blue uppercase tracking-widest">Business Plan</span>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">SOP Designer</span>
                </div>
                <h1 className="text-xl font-bold text-navy-blue">SOP Applications</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Select an application to design, measure and improve your operational performance.
                </p>
            </div>

            {/* App cards grid */}
            <div className="px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {apps.map((app) => {
                        const Icon = app.icon;
                        return (
                            <button
                                key={app.id}
                                onClick={() => app.available && setOpenApp(app.id)}
                                disabled={!app.available}
                                className={`
                                    group relative text-left rounded-2xl border p-6 transition-all duration-200
                                    ${app.available
                                        ? "border-slate-200 bg-white hover:border-cobalt-blue/40 hover:shadow-lg hover:shadow-cobalt-blue/8 cursor-pointer"
                                        : "border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-60"
                                    }
                                `}
                            >
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl ${app.bg} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105`}>
                                    <Icon className={`w-6 h-6 ${app.color}`} />
                                </div>

                                {/* Title & badge */}
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-base font-bold text-navy-blue">{app.title}</h3>
                                    {app.available ? (
                                        <span className="text-[10px] font-bold text-cobalt-blue bg-cobalt-blue/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            Available
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-500 leading-relaxed">{app.description}</p>

                                {/* Arrow indicator */}
                                {app.available && (
                                    <div className="absolute right-5 top-5 w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center transition-all duration-200 group-hover:bg-cobalt-blue group-hover:shadow-md">
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
