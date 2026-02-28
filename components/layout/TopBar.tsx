"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Home, Search, Bell, ChevronDown, Settings, LogOut, User,
    Building2, AlertCircle, CheckCircle2, X, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import { Tenant } from "@/lib/tenant-types";
import { ApprovalQueue } from "./ApprovalQueue";
import { getPendingRequisitions } from "@/lib/growthify-store";
import { ApprovalRequisition } from "@/lib/growthify-types";

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmSwitchModalProps {
    tenant: Tenant;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmSwitchModal: React.FC<ConfirmSwitchModalProps> = ({ tenant, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-cobalt-blue/10 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-5 h-5 text-cobalt-blue" />
                </div>
                <h3 className="text-base font-bold text-navy-blue text-center">Switch Tenant?</h3>
                <p className="text-sm text-slate-500 text-center mt-1">
                    Confirm that you want to switch to:
                </p>
                <p className="text-lg font-extrabold text-cobalt-blue text-center mt-2">
                    {tenant.dba_name}
                </p>
                <p className="text-xs text-slate-400 text-center">
                    {tenant.tenant_id} · {tenant.hq_address?.country || 'No Country'}
                </p>
            </div>
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-700 text-center">
                    All modules and data will switch to this tenant's context.
                </p>
            </div>
            <div className="px-6 py-4 flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-2 text-sm font-bold text-white bg-cobalt-blue hover:bg-navy-blue rounded-lg transition-colors"
                >
                    Confirm Switch
                </button>
            </div>
        </div>
    </div>
);

// ─── Broadcast Banner ─────────────────────────────────────────────────────────

interface BroadcastBannerProps {
    message: string;
    onDismiss: () => void;
}

const BroadcastBanner: React.FC<BroadcastBannerProps> = ({ message, onDismiss }) => (
    <div className="fixed top-14 left-0 w-full z-[250] bg-action-red text-white px-4 py-2.5 flex items-center gap-3 shadow-lg animate-in slide-in-from-top duration-300">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onDismiss} className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition-colors">
            <X className="w-3.5 h-3.5" />
        </button>
    </div>
);

// ─── Tenant Switcher ──────────────────────────────────────────────────────────

const TenantSwitcher: React.FC = () => {
    const { currentTenant, activeTenants, setCurrentTenantById } = useTenant();
    const [open, setOpen] = useState(false);
    const [pendingTenant, setPendingTenant] = useState<Tenant | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = (tenant: Tenant) => {
        setOpen(false);
        setPendingTenant(tenant);
    };

    const handleConfirm = async () => {
        if (pendingTenant) {
            await setCurrentTenantById(pendingTenant.tenant_id);
        }
        setPendingTenant(null);
    };

    const handleConfirmSwitch = async () => {
        if (pendingTenant) {
            await setCurrentTenantById(pendingTenant.tenant_id);
        }
        setPendingTenant(null);
    };

    return (
        <>
            {pendingTenant && (
                <ConfirmSwitchModal
                    tenant={pendingTenant}
                    onConfirm={handleConfirm}
                    onCancel={() => setPendingTenant(null)}
                />
            )}

            <div className="relative" ref={dropdownRef}>
                {/* Trigger button */}
                <button
                    onClick={() => setOpen(!open)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                        currentTenant
                            ? "bg-cobalt-blue text-white border-cobalt-blue/50 hover:bg-cobalt-blue/80"
                            : "bg-amber-500/15 text-amber-300 border-amber-400/30 hover:bg-amber-500/25 animate-pulse"
                    )}
                >
                    <Globe className="w-3 h-3 shrink-0" />
                    <span className="hidden md:block max-w-[120px] truncate">
                        {currentTenant ? currentTenant.dba_name : "Select Tenant"}
                    </span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform shrink-0", open && "rotate-180")} />
                </button>

                {/* Dropdown */}
                {open && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Tenants</p>
                        </div>
                        {activeTenants.length === 0 ? (
                            <div className="px-3 py-4 text-center">
                                <Building2 className="w-6 h-6 text-slate-200 mx-auto mb-1" />
                                <p className="text-xs text-slate-400">No active tenants.</p>
                                <p className="text-[11px] text-slate-300">Go to Administrator to create one.</p>
                            </div>
                        ) : (
                            activeTenants.map((t) => (
                                <button
                                    key={t.tenant_id}
                                    onClick={() => handleSelect(t)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors",
                                        currentTenant?.tenant_id === t.tenant_id && "bg-cobalt-blue/5"
                                    )}
                                >
                                    <div className="w-7 h-7 rounded-lg bg-cobalt-blue/10 flex items-center justify-center shrink-0">
                                        <Building2 className="w-3.5 h-3.5 text-cobalt-blue" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{t.dba_name}</p>
                                        <p className="text-[11px] text-slate-400 font-mono">{t.tenant_id} · {t.reporting_currency}</p>
                                    </div>
                                    {currentTenant?.tenant_id === t.tenant_id && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-cobalt-blue shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
    onHomeClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onHomeClick }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showApprovals, setShowApprovals] = useState(false);
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequisition[]>([]);
    const { currentTenant, broadcastMessage, dismissBroadcast } = useTenant();

    useEffect(() => {
        if (currentTenant) {
            getPendingRequisitions(currentTenant.tenant_id).then(setPendingApprovals);
        }
    }, [currentTenant, showApprovals]);

    return (
        <>
            {/* Broadcast Banner */}
            {broadcastMessage && (
                <BroadcastBanner message={broadcastMessage} onDismiss={dismissBroadcast} />
            )}

            <div className="fixed top-0 left-0 w-full h-14 bg-navy-blue text-white flex items-center px-4 z-50 shadow-lg border-b border-white/10">
                {/* Left: Brand */}
                <button
                    onClick={onHomeClick}
                    className="flex items-center gap-2.5 mr-6 group shrink-0"
                >
                    <div className="w-8 h-8 bg-cobalt-blue rounded-lg flex items-center justify-center shadow-md group-hover:bg-cobalt-blue/80 transition-colors">
                        <Home className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-base font-bold tracking-tight text-white">
                        SIMO Intellisense
                    </span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20 mr-6 shrink-0" />

                {/* Center: Global Search */}
                <div className="flex-1 max-w-xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search clients, loans, tasks..."
                            className="w-full bg-white/10 border border-white/15 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/15 focus:border-cobalt-blue/60 transition-all"
                        />
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-mono hidden md:block">
                            ⌘K
                        </kbd>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 ml-4">
                    {/* New Button */}
                    <button className="flex items-center gap-1.5 bg-cobalt-blue hover:bg-cobalt-blue/80 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                        <span className="text-lg leading-none">+</span>
                        <span>New</span>
                    </button>

                    {/* ── Tenant Switcher ── */}
                    <TenantSwitcher />

                    {/* Notifications / Approvals */}
                    <div className="relative">
                        <button
                            onClick={() => setShowApprovals(!showApprovals)}
                            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <Bell className="w-4.5 h-4.5 text-white/70" />
                            {pendingApprovals.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[9px] font-bold text-white bg-action-red rounded-full border border-navy-blue flex items-center justify-center">
                                    {pendingApprovals.length}
                                </span>
                            )}
                        </button>
                        {showApprovals && (
                            <ApprovalQueue
                                requisitions={pendingApprovals}
                                onClose={() => setShowApprovals(false)}
                            />
                        )}
                    </div>

                    {/* User Avatar */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <div className="w-7 h-7 bg-cobalt-blue/60 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/20">
                                AD
                            </div>
                            <span className="text-sm text-white/80 hidden md:block">Admin</span>
                            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <User className="w-4 h-4 text-slate-400" />
                                    My Profile
                                </button>
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    Settings
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-action-red hover:bg-red-50 transition-colors">
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
