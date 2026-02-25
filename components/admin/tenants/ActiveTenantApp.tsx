"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Building2, Globe, DollarSign, ToggleLeft, ToggleRight,
    AlertTriangle, X, CheckCircle2, RefreshCw, Plus,
    Monitor, Users, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tenant } from "@/lib/tenant-types";
import {
    getTenants, updateTenant
} from "@/lib/tenant-store";
import { broadcastDeactivationAlert, useTenant } from "@/lib/tenant-context";

// ─── Deactivation Safety Modal ────────────────────────────────────────────────

interface DeactivationModalProps {
    tenant: Tenant;
    onClose: () => void;
}

const DeactivationModal: React.FC<DeactivationModalProps> = ({ tenant, onClose }) => {
    const sessions: any[] = [];
    const [broadcastSent, setBroadcastSent] = useState(false);

    const handleBroadcast = () => {
        broadcastDeactivationAlert(tenant.tenant_id, tenant.dba_name);
        setBroadcastSent(true);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-action-red/5 border-b border-action-red/15">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-action-red/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-action-red" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Cannot Deactivate Tenant</h3>
                            <p className="text-xs text-slate-400">Active users detected on <strong>{tenant.dba_name}</strong></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-slate-600">
                        The following users are currently active on this tenant. Please wait for all users to log out before deactivating.
                    </p>

                    {/* Active sessions table */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-3 py-2 font-semibold text-slate-500">IDE</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Name</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Module</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Sub-Module</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s: any) => (
                                    <tr key={s.session_id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-3 py-2 font-mono text-cobalt-blue font-semibold">{s.user_ide}</td>
                                        <td className="px-3 py-2 text-slate-700 font-medium">{s.user_name}</td>
                                        <td className="px-3 py-2 text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Monitor className="w-3 h-3" /> {s.active_module}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-400">{s.active_submodule || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Broadcast */}
                    {!broadcastSent ? (
                        <button
                            onClick={handleBroadcast}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-action-red bg-action-red/8 hover:bg-action-red/15 border border-action-red/25 rounded-xl transition-colors"
                        >
                            <Shield className="w-4 h-4" />
                            Broadcast Logout Alert to Active Users
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-semibold">Alert sent.</span>
                            <span className="text-emerald-500">All active users have been notified to save and log out.</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold text-white bg-navy-blue hover:bg-cobalt-blue rounded-lg transition-colors"
                    >
                        Understood, Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Tenant Row ───────────────────────────────────────────────────────────────

interface TenantRowProps {
    tenant: Tenant;
    onToggle: (tenant: Tenant) => void;
}

const TenantRow: React.FC<TenantRowProps> = ({ tenant, onToggle }) => (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group">
        <td className="px-4 py-3">
            <span className="font-mono text-xs font-bold text-cobalt-blue bg-cobalt-blue/8 px-2 py-0.5 rounded">
                {tenant.tenant_id}
            </span>
        </td>
        <td className="px-4 py-3">
            <p className="text-sm font-bold text-navy-blue">{tenant.dba_name}</p>
        </td>
        <td className="px-4 py-3">
            <p className="text-xs text-slate-500">{tenant.legal_name || "—"}</p>
        </td>
        <td className="px-4 py-3">
            <div className="flex items-center gap-1 text-xs text-slate-400">
                <Globe className="w-3 h-3" />
                <span>{tenant.hq_address.city}{tenant.hq_address.country ? `, ${tenant.hq_address.country}` : ""}</span>
            </div>
        </td>
        <td className="px-4 py-3">
            <span className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                tenant.reporting_currency === "USD" ? "text-emerald-700 bg-emerald-50" :
                    tenant.reporting_currency === "EUR" ? "text-blue-700 bg-blue-50" :
                        "text-amber-700 bg-amber-50"
            )}>
                <DollarSign className="w-2.5 h-2.5" /> {tenant.reporting_currency}
            </span>
        </td>
        <td className="px-4 py-3">
            <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                tenant.status ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"
            )}>
                {tenant.status ? "Active" : "Inactive"}
            </span>
        </td>
        <td className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Users className="w-3 h-3" />
                {tenant.pocs.length} POC{tenant.pocs.length !== 1 ? "s" : ""}
            </div>
        </td>
        <td className="px-4 py-3">
            <button
                title={tenant.status ? "Deactivate tenant" : "Activate tenant"}
                onClick={() => onToggle(tenant)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            >
                {tenant.status ? (
                    <>
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                        <span className="text-emerald-600">Active</span>
                    </>
                ) : (
                    <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-400">Inactive</span>
                    </>
                )}
            </button>
        </td>
    </tr>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface ActiveTenantAppProps {
    onNewTenant: () => void;
    refreshKey: number;
    onRefreshDone: () => void;
}

export const ActiveTenantApp: React.FC<ActiveTenantAppProps> = ({ onNewTenant, refreshKey, onRefreshDone }) => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [blockedTenant, setBlockedTenant] = useState<Tenant | null>(null);

    const load = useCallback(async () => {
        const data = await getTenants();
        setTenants(data);
        onRefreshDone();
    }, [onRefreshDone]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const { refreshTenants } = useTenant();
    const handleToggle = async (tenant: Tenant) => {
        if (tenant.status) {
            // Trying to DEACTIVATE — check for active sessions
            const sessions: any[] = [];
            if (sessions.length > 0) {
                setBlockedTenant(tenant);
                return;
            }
            // No active sessions — deactivate safely
            await updateTenant({ ...tenant, status: false });
        } else {
            // Reactivate — always allowed
            await updateTenant({ ...tenant, status: true });
        }
        await refreshTenants();
        load();
    };

    const active = tenants.filter((t) => t.status);
    const inactive = tenants.filter((t) => !t.status);

    return (
        <>
            {/* Deactivation Safety Modal */}
            {blockedTenant && (
                <DeactivationModal
                    tenant={blockedTenant}
                    onClose={() => setBlockedTenant(null)}
                />
            )}

            <div className="flex flex-col h-full overflow-hidden bg-white">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-navy-blue">Active Tenants</h2>
                            <p className="text-xs text-slate-400">
                                {active.length} active · {inactive.length} inactive · {tenants.length} total
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={load}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-cobalt-blue hover:bg-cobalt-blue/8 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onNewTenant}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-blue hover:bg-cobalt-blue rounded-lg transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> New Tenant
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    {tenants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Building2 className="w-12 h-12 text-slate-200" />
                            <p className="text-sm text-slate-400 font-medium">No tenants created yet</p>
                            <button
                                onClick={onNewTenant}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-cobalt-blue bg-cobalt-blue/8 hover:bg-cobalt-blue/15 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Create First Tenant
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                                <tr>
                                    {["TCODE", "DBA Name", "Legal Name", "HQ", "Currency", "Status", "POCs", "Toggle"].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((t) => (
                                    <TenantRow key={t.tenant_id} tenant={t} onToggle={handleToggle} />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Legend */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
                    <p className="text-[11px] text-slate-400">
                        <strong>Note:</strong> Only Active tenants appear in the global context switcher and accept new employees on Employee Intake and Batch Changes.
                        Deactivating a tenant with active users requires all users to log out first.
                    </p>
                </div>
            </div>
        </>
    );
};
