
"use client";

import React from "react";
import { BPWorkflowApp } from "./bp-assigner/BPWorkflowApp";

interface BPAssignerModuleProps {
    activeApp?: string; // If we want to support multiple apps within this sub-module
}

export const BPAssignerModule: React.FC<BPAssignerModuleProps> = ({ activeApp = "workflow" }) => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header if needed, or delegated to individual apps */}
            <div className="flex-1 overflow-hidden">
                {activeApp === "workflow" && <BPWorkflowApp />}
                {/* Future apps could go here */}
            </div>
        </div>
    );
};
