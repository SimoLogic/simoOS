"use client";

import React from "react";
import {
    CheckCircle2,
    Circle,
    Clock,
    FileText,
    UserCheck,
    ClipboardList,
    Send,
    Archive,
    TrendingUp,
    AlertCircle,
    BarChart2,
    Users,
    DollarSign,
    Activity,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessStep {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    status: "completed" | "current" | "pending";
}

interface KpiCard {
    label: string;
    value: string;
    change: number;
    unit?: string;
    sparkline: number[];
    color: string;
}

interface SubModuleData {
    steps: ProcessStep[];
    kpis: KpiCard[];
}

const subModuleData: Record<string, SubModuleData> = {
    "existing-accounts": {
        steps: [
            { id: "1", title: "Account Review", description: "Audit current account health & KPIs", icon: ClipboardList, status: "completed" },
            { id: "2", title: "Strategy Update", description: "Align tactics to client goals", icon: Target, status: "completed" },
            { id: "3", title: "Execution Grid", description: "Assign tasks & set SLA targets", icon: FileText, status: "current" },
            { id: "4", title: "Client Sync", description: "Weekly status call & reporting", icon: UserCheck, status: "pending" },
            { id: "5", title: "Archive & Close", description: "Document outcomes & learnings", icon: Archive, status: "pending" },
        ],
        kpis: [
            { label: "Active Accounts", value: "24", change: 4.2, sparkline: [18, 19, 21, 20, 22, 23, 24], color: "cobalt" },
            { label: "Avg. SLA Score", value: "94%", change: 1.8, sparkline: [88, 90, 91, 92, 93, 93, 94], color: "green" },
            { label: "Revenue (MRR)", value: "$48.2K", change: 6.1, sparkline: [40, 42, 43, 45, 46, 47, 48.2], color: "cobalt" },
            { label: "Churn Risk", value: "2", change: -33, sparkline: [5, 4, 4, 3, 3, 3, 2], color: "red" },
        ],
    },
    "new-business": {
        steps: [
            { id: "1", title: "Lead Qualification", description: "Evaluate ICP fit & budget", icon: Users, status: "completed" },
            { id: "2", title: "Discovery Call", description: "Understand pain points & goals", icon: ClipboardList, status: "completed" },
            { id: "3", title: "Proposal Draft", description: "Build custom service proposal", icon: FileText, status: "current" },
            { id: "4", title: "Negotiation", description: "Align on scope, price & SLAs", icon: Target, status: "pending" },
            { id: "5", title: "Onboarding Kick-off", description: "Contract signed, team assigned", icon: Send, status: "pending" },
        ],
        kpis: [
            { label: "Pipeline Leads", value: "37", change: 12.1, sparkline: [25, 28, 30, 32, 34, 35, 37], color: "cobalt" },
            { label: "Conversion Rate", value: "18%", change: 2.5, sparkline: [14, 15, 15, 16, 17, 17, 18], color: "green" },
            { label: "Avg. Deal Size", value: "$6.4K", change: -1.2, sparkline: [7, 6.8, 6.5, 6.6, 6.4, 6.5, 6.4], color: "red" },
            { label: "Time to Close", value: "18d", change: -5.3, sparkline: [24, 22, 21, 20, 19, 19, 18], color: "green" },
        ],
    },
    "playbooks": {
        steps: [
            { id: "1", title: "Identify Use Case", description: "Define the process to standardize", icon: Target, status: "completed" },
            { id: "2", title: "Draft Playbook", description: "Document steps, owners & SLAs", icon: FileText, status: "current" },
            { id: "3", title: "Peer Review", description: "Team validation & feedback", icon: UserCheck, status: "pending" },
            { id: "4", title: "Publish & Train", description: "Roll out to all team members", icon: Send, status: "pending" },
            { id: "5", title: "Monitor & Iterate", description: "Track adoption & update quarterly", icon: Activity, status: "pending" },
        ],
        kpis: [
            { label: "Active Playbooks", value: "12", change: 20, sparkline: [7, 8, 9, 10, 10, 11, 12], color: "cobalt" },
            { label: "Avg. Adoption", value: "76%", change: 8.4, sparkline: [60, 63, 67, 70, 72, 74, 76], color: "green" },
            { label: "Compliance Rate", value: "89%", change: 3.2, sparkline: [82, 84, 85, 86, 87, 88, 89], color: "cobalt" },
            { label: "Pending Review", value: "3", change: 0, sparkline: [3, 4, 3, 3, 4, 3, 3], color: "red" },
        ],
    },
    recruitment: {
        steps: [
            { id: "1", title: "Job Requisition", description: "Define role, skills & budget", icon: FileText, status: "completed" },
            { id: "2", title: "Sourcing", description: "Post ads & source candidates", icon: Users, status: "completed" },
            { id: "3", title: "Screening", description: "Resume review & initial calls", icon: ClipboardList, status: "current" },
            { id: "4", title: "Interviews", description: "Technical & cultural fit rounds", icon: UserCheck, status: "pending" },
            { id: "5", title: "Offer & Hire", description: "Extend offer & begin onboarding", icon: Send, status: "pending" },
        ],
        kpis: [
            { label: "Open Positions", value: "8", change: 14.3, sparkline: [5, 6, 6, 7, 7, 7, 8], color: "cobalt" },
            { label: "Applicants", value: "142", change: 22.4, sparkline: [90, 100, 110, 120, 130, 138, 142], color: "green" },
            { label: "Time to Hire", value: "21d", change: -8.7, sparkline: [28, 27, 25, 24, 23, 22, 21], color: "green" },
            { label: "Offer Accept Rate", value: "83%", change: 5.1, sparkline: [74, 76, 78, 79, 80, 82, 83], color: "cobalt" },
        ],
    },
};

// Default data for unmapped sub-modules
const defaultData: SubModuleData = {
    steps: [
        { id: "1", title: "Initialize", description: "Set up the workflow", icon: FileText, status: "completed" },
        { id: "2", title: "Configure", description: "Define parameters & rules", icon: ClipboardList, status: "current" },
        { id: "3", title: "Execute", description: "Run the process", icon: Activity, status: "pending" },
        { id: "4", title: "Review", description: "Validate outputs", icon: UserCheck, status: "pending" },
        { id: "5", title: "Close", description: "Archive & document", icon: Archive, status: "pending" },
    ],
    kpis: [
        { label: "Completion Rate", value: "72%", change: 3.4, sparkline: [60, 63, 65, 67, 69, 71, 72], color: "cobalt" },
        { label: "Active Tasks", value: "18", change: -5.3, sparkline: [22, 21, 20, 20, 19, 19, 18], color: "green" },
        { label: "SLA Compliance", value: "91%", change: 1.1, sparkline: [87, 88, 89, 89, 90, 90, 91], color: "cobalt" },
        { label: "Overdue Items", value: "4", change: -20, sparkline: [7, 6, 6, 5, 5, 4, 4], color: "red" },
    ],
};

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80;
    const h = 32;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    });
    const strokeColor = color === "green" ? "#22c55e" : color === "red" ? "#E31837" : "#0047AB";
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
            />
        </svg>
    );
};

interface SplitViewProps {
    subModuleId: string;
}

export const SplitView: React.FC<SplitViewProps> = ({ subModuleId }) => {
    const data = subModuleData[subModuleId] || defaultData;
    const { steps, kpis } = data;

    return (
        <div className="flex h-full gap-0">
            {/* ── LEFT PANEL: Process Flow ── */}
            <div className="w-[340px] shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        Process Flow
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="relative">
                        {/* Vertical connector line */}
                        <div className="absolute left-[19px] top-5 bottom-5 w-px bg-slate-100" />

                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isCompleted = step.status === "completed";
                            const isCurrent = step.status === "current";

                            return (
                                <div key={step.id} className="relative flex gap-4 mb-6 last:mb-0">
                                    {/* Step Icon */}
                                    <div
                                        className={cn(
                                            "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                            isCompleted
                                                ? "bg-emerald-50 border border-emerald-200"
                                                : isCurrent
                                                    ? "bg-cobalt-blue shadow-lg shadow-cobalt-blue/25 border border-cobalt-blue"
                                                    : "bg-slate-50 border border-slate-200"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Icon
                                                className={cn(
                                                    "w-5 h-5",
                                                    isCurrent ? "text-white" : "text-slate-400"
                                                )}
                                            />
                                        )}
                                    </div>

                                    {/* Step Content */}
                                    <div className="pt-1.5 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4
                                                className={cn(
                                                    "text-sm font-semibold",
                                                    isCurrent ? "text-navy-blue" : isCompleted ? "text-slate-600" : "text-slate-400"
                                                )}
                                            >
                                                {step.title}
                                            </h4>
                                            {isCurrent && (
                                                <span className="text-[10px] font-bold bg-cobalt-blue/10 text-cobalt-blue px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL: KPI Dashboard ── */}
            <div className="flex-1 bg-slate-50 overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                            Performance Dashboard
                        </h3>
                        <span className="text-xs text-slate-400">Last 7 days</span>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {kpis.map((kpi, i) => {
                            const isPositive = kpi.change > 0;
                            const isNeutral = kpi.change === 0;
                            const isGoodDown = kpi.color === "green" && !isPositive;
                            const isBadDown = kpi.color === "red" && !isPositive;

                            return (
                                <div
                                    key={i}
                                    className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                                        <span
                                            className={cn(
                                                "flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                                                isNeutral
                                                    ? "bg-slate-100 text-slate-500"
                                                    : isPositive
                                                        ? kpi.color === "red"
                                                            ? "bg-red-50 text-action-red"
                                                            : "bg-emerald-50 text-emerald-600"
                                                        : kpi.color === "red"
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : "bg-red-50 text-action-red"
                                            )}
                                        >
                                            {isNeutral ? (
                                                <Minus className="w-3 h-3" />
                                            ) : isPositive ? (
                                                <ArrowUpRight className="w-3 h-3" />
                                            ) : (
                                                <ArrowDownRight className="w-3 h-3" />
                                            )}
                                            {Math.abs(kpi.change)}%
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-navy-blue mb-3">
                                        {kpi.value}
                                    </div>
                                    <Sparkline data={kpi.sparkline} color={kpi.color} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Activity Feed Placeholder */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Recent Activity</span>
                            <button className="text-xs text-cobalt-blue font-medium hover:underline">View all</button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {[
                                { text: "SLA target met for Account #A-0042", time: "2m ago", dot: "bg-emerald-400" },
                                { text: "New task assigned: Q1 Strategy Review", time: "18m ago", dot: "bg-cobalt-blue" },
                                { text: "Overdue: Client follow-up for Acme Corp", time: "1h ago", dot: "bg-action-red" },
                                { text: "Playbook updated: Outreach Daily SOP", time: "3h ago", dot: "bg-slate-300" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                    <div className={cn("w-2 h-2 rounded-full shrink-0", item.dot)} />
                                    <span className="text-sm text-slate-600 flex-1">{item.text}</span>
                                    <span className="text-xs text-slate-400 shrink-0">{item.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
