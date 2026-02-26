"use client";

import React, { useState, useEffect } from "react";
import { Timer, TrendingUp, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RaceStatsProps {
    totalTarget: number;
    totalCurrent: number;
    topPerformersCount: number;
}

export const RaceStats: React.FC<RaceStatsProps> = ({ totalTarget, totalCurrent, topPerformersCount }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number }>({ d: 0, h: 0, m: 0, s: 0 });

    const globalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    useEffect(() => {
        // Calculate time left to end of current month
        const updateTimer = () => {
            const now = new Date();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const diff = endOfMonth.getTime() - now.getTime();

            if (diff > 0) {
                setTimeLeft({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    h: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    m: Math.floor((diff / 1000 / 60) % 60),
                    s: Math.floor((diff / 1000) % 60),
                });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full lg:w-72 bg-slate-900 border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden shrink-0">
            {/* Background glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

            <div>
                <h3 className="text-white font-black text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Team Race Stats
                </h3>
                <p className="text-xs text-slate-400 mt-1">Live performance tracking</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Month Close In</span>
                </div>
                <div className="flex gap-2">
                    {[
                        { label: 'D', value: timeLeft.d },
                        { label: 'H', value: timeLeft.h },
                        { label: 'M', value: timeLeft.m },
                        { label: 'S', value: timeLeft.s },
                    ].map((t) => (
                        <div key={t.label} className="flex-1 bg-slate-950 rounded-lg p-2 text-center border border-slate-800">
                            <div className="text-lg font-mono font-bold text-white">{t.value.toString().padStart(2, '0')}</div>
                            <div className="text-[9px] text-slate-500">{t.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-slate-400">Global Target</span>
                        <span className="text-sm font-bold text-white">${totalTarget.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-600 w-full" />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-slate-400">Current Volume</span>
                        <span className="text-sm font-bold text-emerald-400">${totalCurrent.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${Math.min(globalProgress, 100)}%` }}
                        />
                    </div>
                    <div className="text-right mt-1 text-[10px] text-slate-500 font-mono">
                        {globalProgress.toFixed(1)}% to goal
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-orange-400" />
                        In Nitro Zone
                    </span>
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                        {topPerformersCount}
                    </span>
                </div>
            </div>
        </div>
    );
};
