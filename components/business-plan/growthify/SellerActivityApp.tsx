"use client";

import React, { useState, useEffect } from "react";
import {
    Phone, Mail, Target, Zap, DollarSign, Award, ArrowUpRight,
    Flame, CheckCircle2, User, Megaphone, Activity, BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import { Playbook, PlaybookStep, SellerActivityLog } from "@/lib/growthify-types";
import { getPlaybooks, logSellerActivity, getSellerActivities, getSalesAssigments } from "@/lib/growthify-store";
import { getEmployeesAction as getEmployees } from "@/app/actions/hr-actions";

// Mock User falls back if no DB employee exists
let MOCK_USER_EID = "EMP-001";

// Mock Social Feed Data
const SOCIAL_FEED = [
    { id: 1, user: "Fernando V.", action: "Booked NPPM Meeting", amount: "+$50", time: "2 min ago", type: "milestone" },
    { id: 2, user: "Sarah J.", action: "Closed B2B Alliance", amount: "+$500", time: "14 min ago", type: "deal" },
    { id: 3, user: "Mike R.", action: "Hit 50 Calls Daily Goal", amount: "+$20", time: "1 hr ago", type: "activity" },
];

export const SellerActivityApp: React.FC = () => {
    const { currentTenant } = useTenant();

    // Core State
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [activePlaybookId, setActivePlaybookId] = useState<string>("");

    // User Activity State
    const [activities, setActivities] = useState<SellerActivityLog[]>([]);
    const [activeEmployeeId, setActiveEmployeeId] = useState<string>("EMP-001");

    // Live Earnings State
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [monthEarnings, setMonthEarnings] = useState(0);

    const [isLogging, setIsLogging] = useState<string | null>(null);

    useEffect(() => {
        const loadDashboard = async () => {
            if (!currentTenant) return;

            // 1. Fetch real employees
            const dbEmployees = await getEmployees(currentTenant.tenant_id);
            const firstEmp = dbEmployees.length > 0 ? dbEmployees[0].eid : MOCK_USER_EID;
            setActiveEmployeeId(firstEmp);

            // 2. Fetch assignments to find WHICH strategies this employee has
            const assignments = await getSalesAssigments(currentTenant.tenant_id);
            const userAssignment = assignments.find(a => a.employee_id === firstEmp && a.isApproved);

            // 3. Load Playbooks linked to those strategies
            const loadedPlaybooks = await getPlaybooks(currentTenant.tenant_id);

            let active = loadedPlaybooks.filter(p => p.isActive);

            if (userAssignment) {
                const assignedStrategyIds = userAssignment.strategies.map(s => s.strategy_id);
                active = active.filter(p => assignedStrategyIds.includes(p.strategy_id));
            }

            setPlaybooks(active);
            if (active.length > 0) {
                setActivePlaybookId(active[0].id);
            }

            // Load activities for real user
            setActivities(await getSellerActivities(currentTenant.tenant_id, firstEmp));

            // Set mock earnings for now
            setTodayEarnings(125);
            setMonthEarnings(2450);
        };
        loadDashboard();
    }, [currentTenant]);

    const activePlaybook = playbooks.find(p => p.id === activePlaybookId);

    // Filter steps to only show Daily steps for the HUD execution map
    const dailySteps = activePlaybook?.steps.filter(s => s.frequency === "Daily" || s.frequency === "Once") || [];

    const handleLogActivity = async (stepId: string) => {
        if (!currentTenant || !activePlaybook) return;
        setIsLogging(stepId);

        // Form Log Action
        const newLog = await logSellerActivity({
            tenant_id: currentTenant.tenant_id,
            employee_id: activeEmployeeId,
            playbook_id: activePlaybook.id,
            step_id: stepId,
            count_logged: 1,
            log_date: new Date().toISOString().split("T")[0],
        });

        // Optimistic UI update
        setTimeout(() => {
            setActivities(prev => [...prev, newLog]);
            // Mock earnings bump +$5
            setTodayEarnings(prev => prev + 5);
            setMonthEarnings(prev => prev + 5);
            setIsLogging(null);
        }, 500);
    };

    const getProgress = (stepId: string, target: number) => {
        const today = new Date().toISOString().split("T")[0];
        const count = activities
            .filter(a => a.step_id === stepId && a.log_date === today)
            .reduce((sum, act) => sum + act.count_logged, 0);

        return {
            count,
            pct: Math.min(100, Math.round((count / target) * 100)),
            isComplete: count >= target
        };
    };

    return (
        <div className="flex h-full bg-[#0b1121]">

            {/* Main Center Area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
                {/* HUD Header & Top Stats */}
                <div className="p-6 shrink-0 bg-gradient-to-b from-[#0b1121] to-[#111827]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                                <Zap className="w-6 h-6 text-amber-400" />
                                Trading Floor
                            </h2>
                            <p className="text-sm text-slate-400 mt-1 font-medium">
                                Execute the playbook. Log actions. Stack rewards.
                            </p>
                        </div>

                        {/* Playbook Switcher */}
                        {playbooks.length > 1 && (
                            <select
                                value={activePlaybookId}
                                onChange={(e) => setActivePlaybookId(e.target.value)}
                                className="bg-[#1f2937] text-white border border-[#374151] rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:border-cobalt-blue"
                            >
                                {playbooks.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* KPI Widgets Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Live Earnings */}
                        <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] border border-[#374151] rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                    Live Earnings (Today)
                                </h3>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> +$5 (Last Hr)
                                </span>
                            </div>
                            <div className="relative z-10">
                                <span className="text-4xl font-black text-white tracking-tighter">${todayEarnings.toLocaleString()}</span>
                                <p className="text-xs font-semibold text-slate-400 mt-1">
                                    <span className="text-emerald-400">${monthEarnings.toLocaleString()}</span> accumulated this month
                                </p>
                            </div>
                        </div>

                        {/* Pacing Dial (Mock) */}
                        <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] border border-[#374151] rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                                    Pacing Velocity ($Vi)
                                </h3>
                            </div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-white">108%</span>
                                    <span className="text-[10px] font-bold text-amber-400 uppercase">Ahead of Pace</span>
                                </div>
                                {/* Simple CSS Gauge */}
                                <div className="w-16 h-16 rounded-full border-4 border-[#374151] border-t-amber-400 border-r-amber-400 rotate-45 flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center -rotate-45">
                                        <Flame className="w-5 h-5 text-amber-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Target Progress */}
                        <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] border border-[#374151] rounded-2xl p-5 shadow-2xl relative overflow-hidden group col-span-1 md:col-span-1">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cobalt-blue/10 rounded-full blur-3xl group-hover:bg-cobalt-blue/20 transition-all" />
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5 text-cobalt-blue" />
                                    Playbook Completion
                                </h3>
                            </div>
                            <div className="mt-4 relative z-10">
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-slate-300">Daily Core Actions</span>
                                    <span className="text-cobalt-blue">4/5 Nodes</span>
                                </div>
                                <div className="w-full bg-[#374151] rounded-full h-2.5">
                                    <div className="bg-gradient-to-r from-cobalt-blue to-purple-500 h-2.5 rounded-full w-4/5" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* The Path to Victory (Execution Timeline) */}
                <div className="flex-1 p-6 relative">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-purple-400" />
                        The Path to Victory
                    </h3>

                    {!activePlaybook ? (
                        <div className="text-center py-20 bg-[#1f2937] rounded-2xl border border-dashed border-[#374151]">
                            <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No active playbooks assigned to you.</p>
                        </div>
                    ) : dailySteps.length === 0 ? (
                        <div className="text-center py-20 bg-[#1f2937] rounded-2xl border border-dashed border-[#374151]">
                            <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Playbook has no daily steps mapped.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative ml-4">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[#374151] z-0" />

                            {dailySteps.map((step, idx) => {
                                const progress = getProgress(step.id, step.target_count);
                                const isComplete = progress.isComplete;

                                return (
                                    <div key={step.id} className="relative z-10 flex gap-6 items-center">
                                        {/* State Node */}
                                        <div className={cn(
                                            "w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500",
                                            isComplete
                                                ? "bg-emerald-500 border-emerald-500 text-[#0b1121] shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                                : "bg-[#111827] border-[#374151] text-slate-500"
                                        )}>
                                            {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-black">{idx + 1}</span>}
                                        </div>

                                        {/* Action Card */}
                                        <div className={cn(
                                            "flex-1 border rounded-xl p-5 flex items-center justify-between transition-all duration-300",
                                            isComplete
                                                ? "bg-[#111827] border-emerald-500/30 opacity-80"
                                                : "bg-gradient-to-br from-[#1f2937] to-[#111827] border-[#374151] hover:border-cobalt-blue/50 shadow-lg"
                                        )}>
                                            <div>
                                                <h4 className={cn("text-lg font-bold mb-1", isComplete ? "text-emerald-400" : "text-white")}>
                                                    {step.title}
                                                </h4>
                                                <p className="text-sm text-slate-400 mb-3">{step.description}</p>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-300 bg-[#374151] px-2.5 py-1 rounded">
                                                        Goal: {step.target_count}
                                                    </span>
                                                    <div className="w-32 h-1.5 bg-[#374151] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 transition-all duration-500"
                                                            style={{ width: `${progress.pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-500">{progress.count} / {step.target_count}</span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => handleLogActivity(step.id)}
                                                disabled={isLogging === step.id}
                                                className={cn(
                                                    "shrink-0 px-6 py-3 rounded-lg font-black text-sm transition-all flex items-center gap-2",
                                                    isComplete
                                                        ? "bg-transparent border border-emerald-500/50 text-emerald-500"
                                                        : "bg-cobalt-blue hover:bg-navy-blue hover:text-white text-white shadow-[0_0_20px_rgba(0,102,255,0.3)] hover:shadow-[0_0_30px_rgba(0,102,255,0.5)]"
                                                )}
                                            >
                                                {isLogging === step.id ? "Logging..." : isComplete ? "Log Extra" : "Execute & Log"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Social Feed */}
            <div className="w-80 bg-[#111827] border-l border-[#1f2937] flex flex-col hidden lg:flex">
                <div className="p-5 border-b border-[#1f2937] shrink-0">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <Megaphone className="w-4 h-4 text-purple-400" />
                        Global Output
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {SOCIAL_FEED.map((feed) => (
                        <div key={feed.id} className="bg-[#1f2937] border border-[#374151] p-4 rounded-xl relative overflow-hidden group">
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                feed.type === "deal" ? "bg-emerald-500" : feed.type === "milestone" ? "bg-purple-500" : "bg-cobalt-blue"
                            )} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#374151] flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-slate-300" />
                                    </div>
                                    <span className="text-xs font-bold text-white">{feed.user}</span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500">{feed.time}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-300 mb-2">{feed.action}</p>
                            <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-500/20">
                                <Award className="w-3 h-3" /> {feed.amount} Earned
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};
