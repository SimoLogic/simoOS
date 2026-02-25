"use client";

import React, { useState } from "react";
import { X, Building2, LayoutList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TenantSetupForm } from "./tenants/TenantSetupForm";
import { ActiveTenantApp } from "./tenants/ActiveTenantApp";
import { LegalEntityApp } from "./legal-entities/LegalEntityApp";

import { useTenant } from "@/lib/tenant-context";

// ─── Admin Apps Registry ──────────────────────────────────────────────────────

type AdminApp = "multi-tenant-setup" | "active-tenant" | "local-entities";

const ADMIN_APPS: { id: AdminApp; label: string; icon: React.ElementType; description: string }[] = [
    {
        id: "multi-tenant-setup",
        label: "Multi-Tenant Set Up",
        icon: Plus,
        description: "Create a new client tenant",
    },
    {
        id: "active-tenant",
        label: "Active Tenants",
        icon: LayoutList,
        description: "Manage existing tenants",
    },
    {
        id: "local-entities",
        label: "Local Legal Entities",
        icon: Building2,
        description: "Manage legal entities for your payroll",
    },
];

// ─── Main Component ───────────────────────────────────────────────────────────

interface AdminPanelProps {
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const { refreshTenants } = useTenant();
    const [activeApp, setActiveApp] = useState<AdminApp>("active-tenant");
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = () => setRefreshKey((k) => k + 1);

    const handleTenantSaved = async () => {
        // After saving a new tenant, jump to the Active Tenant list
        setActiveApp("active-tenant");
        await refreshTenants();
        refresh();
    };

    const handleNewTenant = () => {
        setActiveApp("multi-tenant-setup");
    };

    return (
        <div className="fixed inset-0 z-[100] flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel — slides in from the right */}
            <div className="relative ml-auto w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col animate-slideInRight">

                {/* ── Panel Header ── */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#001e42] text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cobalt-blue/30 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wide">Administrator</h2>
                            <p className="text-[11px] text-white/40">System configuration & tenant management</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Sub-App Navigation (horizontal tabs) ── */}
                <div className="flex items-center gap-0 px-4 border-b border-slate-100 bg-white shrink-0">
                    {ADMIN_APPS.map((app) => {
                        const Icon = app.icon;
                        const isActive = activeApp === app.id;
                        return (
                            <button
                                key={app.id}
                                onClick={() => setActiveApp(app.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-px",
                                    isActive
                                        ? "border-cobalt-blue text-cobalt-blue"
                                        : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {app.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── App Content ── */}
                <div className="flex-1 overflow-hidden">
                    {activeApp === "multi-tenant-setup" && (
                        <TenantSetupForm
                            onClose={onClose}
                            onSaved={handleTenantSaved}
                        />
                    )}
                    {activeApp === "active-tenant" && (
                        <ActiveTenantApp
                            onNewTenant={handleNewTenant}
                            refreshKey={refreshKey}
                            onRefreshDone={() => { }}
                        />
                    )}
                    {activeApp === "local-entities" && (
                        <LegalEntityApp />
                    )}
                </div>
            </div>
        </div>
    );
};
