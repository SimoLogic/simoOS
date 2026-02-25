"use client";

import React from "react";
import { SalesEngineSetup } from "./growthify/SalesEngineSetup";
import { SalesHCApp } from "./growthify/SalesHCApp";
import { PlaybookDesigner } from "./growthify/PlaybookDesigner";
import { SellerActivityApp } from "./growthify/SellerActivityApp";

interface GrowthifyModuleProps {
    activeSubModule: string;
}

export const GrowthifyModule: React.FC<GrowthifyModuleProps> = ({ activeSubModule }) => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-4 shrink-0">
                <h2 className="text-2xl font-black text-navy-blue tracking-tight">Growthify</h2>
                <p className="text-sm text-slate-500 mt-1">
                    High-Stakes Sales Orchestration & Governance Engine
                </p>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeSubModule === "playbooks" && <PlaybookDesigner />}
                {activeSubModule === "seller-activity" && <SellerActivityApp />}
                {activeSubModule === "engine-setup" && <SalesEngineSetup />}
                {activeSubModule === "sales-hc" && <SalesHCApp />}
            </div>
        </div>
    );
};
