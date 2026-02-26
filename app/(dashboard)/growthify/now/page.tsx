"use client";

import React, { useMemo } from "react";
import { RacerCard, RacerData } from "@/components/growthify/RacerCard";
import { RaceStats } from "@/components/growthify/RaceStats";
import { Medal, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data for the race demo
const mockRacers: RacerData[] = [
    {
        id: "1", name: "David S.", avatar: "👨‍💻", target: 100000, current: 110000, progress: 110,
        recentSales: [{ amount: 15000, date: "Today" }, { amount: 25000, date: "Yesterday" }]
    },
    {
        id: "2", name: "Sarah M.", avatar: "👩‍💼", target: 120000, current: 115000, progress: 95.8,
        recentSales: [{ amount: 40000, date: "2 days ago" }]
    },
    {
        id: "3", name: "Michael T.", avatar: "👨‍💼", target: 80000, current: 65000, progress: 81.25,
        recentSales: [{ amount: 10000, date: "Today" }]
    },
    {
        id: "4", name: "Jessica R.", avatar: "👩‍💻", target: 90000, current: 92000, progress: 102.2,
        recentSales: [{ amount: 5000, date: "Just now" }, { amount: 30000, date: "3 days ago" }]
    },
    {
        id: "5", name: "Kevin L.", avatar: "🧑‍🚀", target: 150000, current: 60000, progress: 40,
        recentSales: []
    }
];

export default function GrowthifyNowPage() {

    // Sort racers by progress descending to determine ranks
    const rankedRacers = useMemo(() => {
        return [...mockRacers].sort((a, b) => b.progress - a.progress);
    }, []);

    const totalTarget = mockRacers.reduce((acc, curr) => acc + curr.target, 0);
    const totalCurrent = mockRacers.reduce((acc, curr) => acc + curr.current, 0);
    const nitroCount = mockRacers.filter(r => r.progress >= 100).length;

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden p-6 lg:flex-row gap-6">

            {/* Main Race Track Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl">

                {/* Header Section */}
                <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                            <Flag className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                Growthify Now
                            </h1>
                            <p className="text-xs text-slate-400 font-medium">Live Month-to-Date Performance Race</p>
                        </div>
                    </div>

                    <div className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
                        Trading Floor Alpha
                    </div>
                </div>

                {/* Podium & Track */}
                <div className="flex-1 overflow-y-auto p-8 relative">

                    {/* Track Background Lines */}
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '100% 4rem' }} />

                    <div className="relative z-10 max-w-5xl mx-auto space-y-2">
                        {/* Render all racers */}
                        {rankedRacers.map((racer, index) => (
                            <RacerCard
                                key={racer.id}
                                racer={racer}
                                rank={index + 1}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar Stats */}
            <RaceStats
                totalTarget={totalTarget}
                totalCurrent={totalCurrent}
                topPerformersCount={nitroCount}
            />

        </div>
    );
}
