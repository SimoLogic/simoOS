"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Medal, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RacerData {
    id: string;
    name: string;
    avatar: string;
    progress: number; // 0 to >100
    target: number;
    current: number;
    recentSales: { amount: number; date: string }[];
}

interface RacerCardProps {
    racer: RacerData;
    rank?: number | null;
}

export const RacerCard: React.FC<RacerCardProps> = ({ racer, rank }) => {
    const isNitro = racer.progress >= 100;
    const [showTooltip, setShowTooltip] = useState(false);

    // Clamp progress for the avatar position (cap at 100% visual width so they don't go off screen)
    const visualProgress = Math.min(Math.max(racer.progress, 0), 100);

    return (
        <div className="relative w-full h-24 bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-visible mb-4 flex items-center px-4">

            {/* Rank Indicator (if podium) */}
            {rank && rank <= 3 && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-20">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900",
                        rank === 1 ? "bg-yellow-400 text-yellow-900" :
                            rank === 2 ? "bg-slate-300 text-slate-800" :
                                "bg-amber-600 text-amber-100" // Bronze
                    )}>
                        <Medal className="w-4 h-4" />
                    </div>
                </div>
            )}

            {/* Track Background */}
            <div className="absolute left-12 right-12 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 w-full" />
            </div>

            {/* Finish Line */}
            <div className="absolute right-12 top-2 bottom-2 w-1 border-r-2 border-dashed border-white/20 z-0" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest z-0">
                100%
            </div>

            {/* Moving Avatar Container */}
            <motion.div
                initial={{ left: "3rem" }}
                animate={{ left: `calc(3rem + (100% - 9rem) * ${visualProgress / 100})` }}
                transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.2 }}
                className="absolute z-10 flex flex-col items-center -ml-6" // Offset by half width to center on the percentage
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {/* Tooltip */}
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full mb-2 w-48 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 pointer-events-none"
                    >
                        <p className="text-xs font-bold text-white mb-2 pb-2 border-b border-slate-700">Recent Sales</p>
                        {racer.recentSales.length > 0 ? (
                            racer.recentSales.map((sale, i) => (
                                <div key={i} className="flex justify-between items-center text-[10px] mb-1">
                                    <span className="text-emerald-400 font-mono">${sale.amount}</span>
                                    <span className="text-slate-500">{sale.date}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] text-slate-500">No recent sales</p>
                        )}
                        <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400">Total:</span>
                            <span className="text-xs font-bold text-white">${racer.current}</span>
                        </div>
                    </motion.div>
                )}

                {/* Avatar Badge */}
                <div className={cn(
                    "relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-xl cursor-pointer border-2 transition-all",
                    isNitro ? "bg-slate-900 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]" : "bg-slate-800 border-slate-600 text-slate-300"
                )}>
                    {isNitro && (
                        <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                    )}

                    {racer.avatar ? (
                        <span className="z-10 text-white">{racer.avatar}</span>
                    ) : (
                        <span className="z-10">{racer.name.charAt(0)}</span>
                    )}

                    {/* Nitro Flame */}
                    {isNitro && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-3 -right-2 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                        >
                            <Flame className="w-5 h-5 fill-orange-500" />
                        </motion.div>
                    )}
                </div>

                <div className="mt-2 text-center">
                    <p className={cn(
                        "text-[10px] font-bold whitespace-nowrap",
                        isNitro ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "text-white"
                    )}>
                        {racer.name}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400">{racer.progress.toFixed(1)}%</p>
                </div>
            </motion.div>

        </div>
    );
};
