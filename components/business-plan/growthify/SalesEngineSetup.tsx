"use client";

import React, { useState } from "react";
import { StrategyCreator } from "./StrategyCreator";
import { RewardDesigner } from "./RewardDesigner";
import { cn } from "@/lib/utils";
import { Target, Calculator } from "lucide-react";

export const SalesEngineSetup: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"strategy" | "reward">("strategy");

    return (
        <div className="flex flex-col h-full w-full bg-slate-50">
            {/* Top Navigation Hub - Corporate Style */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0 shadow-sm z-10">
                <h1 className="text-2xl font-black text-navy-blue mb-1">Sales Engine Setup</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Define operational vectors and construct their compensation logic in a sequential engineering flow.
                </p>

                <div className="flex gap-8 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("strategy")}
                        className={cn(
                            "pb-3 text-sm font-bold transition-all relative",
                            activeTab === "strategy"
                                ? "text-cobalt-blue"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            1. Strategy Definitions
                        </div>
                        {activeTab === "strategy" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cobalt-blue rounded-t-full" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("reward")}
                        className={cn(
                            "pb-3 text-sm font-bold transition-all relative",
                            activeTab === "reward"
                                ? "text-cobalt-blue"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            2. Reward Structures
                        </div>
                        {activeTab === "reward" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cobalt-blue rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === "strategy" ? <StrategyCreator /> : <RewardDesigner />}
            </div>
        </div>
    );
};
