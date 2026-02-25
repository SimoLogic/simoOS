import React, { useState, useMemo } from "react";
import {
    X, Check, AlertTriangle, Save, ArrowRight, ShieldAlert, FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ImportAuditResult, AuditedExistingRow, AuditedNewRow,
    applyApprovedExisting, buildNewRecord, exportRejectionReport
} from "@/lib/excel-import";
import {
    getEmployeesAction as getEmployees,
    saveEmployeesAction as saveEmployees,
    updateEmployeeAction as updateEmployee,
    addEmployeeAction as addEmployee
} from "@/app/actions/hr-actions";

import { useTenant } from "@/lib/tenant-context";

interface Props {
    auditResult: ImportAuditResult;
    onClose: (committed: boolean) => void;
}

export const ImportReviewModal: React.FC<Props> = ({ auditResult, onClose }) => {
    const { currentTenant } = useTenant();
    const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
    const [saving, setSaving] = useState(false);

    // Track approvals locally
    const [approvedExisting, setApprovedExisting] = useState<Set<string>>(new Set());
    const [approvedNew, setApprovedNew] = useState<Set<number>>(new Set());

    // ── Derived Stats ─────────────────────────────────────────────────────────

    const validUpdates = auditResult.existingRows.filter(r => r.overallStatus !== "rejected");
    const rejectedUpdates = auditResult.existingRows.filter(r => r.overallStatus === "rejected");
    const validNewHires = auditResult.newRows.filter(r => r.overallStatus === "valid");
    const rejectedNewHires = auditResult.newRows.filter(r => r.overallStatus === "rejected");

    const stats = {
        updates: {
            total: auditResult.existingRows.length,
            valid: validUpdates.length,
            rejected: rejectedUpdates.length,
            approved: approvedExisting.size,
        },
        newHires: {
            total: auditResult.newRows.length,
            valid: validNewHires.length,
            rejected: rejectedNewHires.length,
            approved: approvedNew.size,
        }
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const toggleExisting = (eid: string) => {
        const next = new Set(approvedExisting);
        if (next.has(eid)) next.delete(eid);
        else next.add(eid);
        setApprovedExisting(next);
    };

    const toggleNew = (idx: number) => {
        const next = new Set(approvedNew);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setApprovedNew(next);
    };

    const handleSelectAllExisting = () => {
        if (approvedExisting.size === validUpdates.length) {
            setApprovedExisting(new Set());
        } else {
            setApprovedExisting(new Set(validUpdates.map(r => r.eid)));
        }
    };

    const handleSelectAllNew = () => {
        if (approvedNew.size === validNewHires.length) {
            setApprovedNew(new Set());
        } else {
            setApprovedNew(new Set(validNewHires.map(r => r.rowIndex)));
        }
    };

    const handleSaveAndClose = async () => {
        setSaving(true);
        try {
            if (!currentTenant) throw new Error("No active tenant");
            const currentStore = await getEmployees(currentTenant.tenant_id);
            let updatedStore = [...currentStore];

            // 1. Apply Existing Updates
            const updatesToApply = auditResult.existingRows.filter(r => approvedExisting.has(r.eid));
            for (const row of updatesToApply) {
                updatedStore = applyApprovedExisting(row, updatedStore);
            }

            // 2. Add New Hires
            const newToApply = auditResult.newRows.filter(r => approvedNew.has(r.rowIndex));
            for (const row of newToApply) {
                const newRec = buildNewRecord(row, currentTenant?.tenant_id);
                updatedStore.push(newRec);
            }

            // 3. Save to Store
            await saveEmployees(updatedStore, currentTenant.tenant_id);

            // 4. Export Rejections (if any rejected or unapproved valid rows)
            const unapprovedExisting = auditResult.existingRows.filter(r => !approvedExisting.has(r.eid));
            const unapprovedNew = auditResult.newRows.filter(r => !approvedNew.has(r.rowIndex));

            if (unapprovedExisting.length > 0 || unapprovedNew.length > 0) {
                exportRejectionReport(unapprovedExisting, unapprovedNew);
            }

            onClose(true);
        } catch (err) {
            console.error(err);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrinking-0">
                    <div>
                        <h2 className="text-xl font-bold text-navy-blue flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-cobalt-blue" />
                            Import Audit Report
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Review and approve changes before committing to the database.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => onClose(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveAndClose}
                            disabled={saving || (approvedExisting.size === 0 && approvedNew.size === 0)}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-cobalt-blue rounded-lg hover:bg-cobalt-blue/90 shadow-lg shadow-cobalt-blue/20 disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-0.5"
                        >
                            {saving ? "Saving..." : "Save Approved & Close"}
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Stats / Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => setActiveTab("existing")}
                        className={cn(
                            "flex-1 px-8 py-4 text-sm font-semibold text-left border-b-2 transition-colors flex items-center justify-between group",
                            activeTab === "existing"
                                ? "border-cobalt-blue bg-white text-navy-blue"
                                : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors",
                                activeTab === "existing" ? "bg-cobalt-blue text-white" : "bg-slate-200 text-slate-500"
                            )}>{stats.updates.total}</span>
                            <span>Existing Employees</span>
                        </div>
                        {stats.updates.rejected > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-action-red bg-action-red/10 px-2 py-1 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {stats.updates.rejected} rejected
                            </span>
                        )}
                    </button>
                    <div className="w-px bg-slate-200" />
                    <button
                        onClick={() => setActiveTab("new")}
                        className={cn(
                            "flex-1 px-8 py-4 text-sm font-semibold text-left border-b-2 transition-colors flex items-center justify-between group",
                            activeTab === "new"
                                ? "border-cobalt-blue bg-white text-navy-blue"
                                : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors",
                                activeTab === "new" ? "bg-cobalt-blue text-white" : "bg-slate-200 text-slate-500"
                            )}>{stats.newHires.total}</span>
                            <span>New Hires</span>
                        </div>
                        {stats.newHires.rejected > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-action-red bg-action-red/10 px-2 py-1 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {stats.newHires.rejected} rejected
                            </span>
                        )}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                    {activeTab === "existing" ? (
                        /* ─── Existing Updates Table ─── */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    Updates found ({stats.updates.valid} valid)
                                </h3>
                                <button
                                    onClick={handleSelectAllExisting}
                                    className="text-xs font-semibold text-cobalt-blue hover:text-navy-blue transition-colors"
                                >
                                    {approvedExisting.size === stats.updates.valid ? "Exempt All" : "Approve All Valid"}
                                </button>
                            </div>

                            {auditResult.existingRows.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                    No existing employees found in the uploaded file.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {auditResult.existingRows.map((row) => {
                                        const isRejected = row.overallStatus === "rejected";
                                        const isPartial = row.overallStatus === "partial";
                                        const isApproved = approvedExisting.has(row.eid);
                                        const changes = row.diffs;

                                        return (
                                            <div key={row.eid} className={cn(
                                                "bg-white rounded-xl border p-4 transition-all shadow-sm",
                                                isRejected ? "border-action-red/30 bg-action-red/5" :
                                                    isApproved ? "border-emerald-200 ring-1 ring-emerald-500/20" : "border-slate-200"
                                            )}>
                                                <div className="flex items-start gap-4">
                                                    <div className="pt-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={isApproved}
                                                            onChange={() => toggleExisting(row.eid)}
                                                            disabled={isRejected && !isPartial} // Partially valid can be approved (locked fields ignored)
                                                            className="w-5 h-5 rounded border-slate-300 text-cobalt-blue focus:ring-cobalt-blue cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.eid}</span>
                                                            <span className="text-sm font-semibold text-navy-blue">{row.firstName} {row.lastName}</span>
                                                            {isRejected && <span className="text-[10px] font-bold text-action-red bg-white border border-action-red/20 px-1.5 rounded uppercase">Rejected</span>}
                                                            {isPartial && <span className="text-[10px] font-bold text-amber-600 bg-white border border-amber-200 px-1.5 rounded uppercase">Partial</span>}
                                                        </div>

                                                        {/* Changes Grid */}
                                                        {changes.length === 0 ? (
                                                            <p className="text-xs text-slate-400 italic">No changes detected.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 gap-1.5">
                                                                {changes.map((diff) => (
                                                                    <div key={diff.key} className="flex items-center text-xs gap-3">
                                                                        <span className="w-32 font-medium text-slate-500 truncate">{diff.label}</span>
                                                                        <div className="flex-1 flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                                            <span className="line-through text-slate-400">{diff.oldValue || "—"}</span>
                                                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                                                            <span className="font-semibold text-navy-blue">{diff.newValue}</span>
                                                                        </div>
                                                                        {diff.isLocked && (
                                                                            <span className="flex items-center gap-1 text-action-red font-medium text-[11px] bg-white px-2 py-0.5 rounded border border-action-red/10">
                                                                                <ShieldAlert className="w-3 h-3" /> Locked
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ─── New Hires Table ─── */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    New Hires found ({stats.newHires.valid} valid)
                                </h3>
                                <button
                                    onClick={handleSelectAllNew}
                                    className="text-xs font-semibold text-cobalt-blue hover:text-navy-blue transition-colors"
                                >
                                    {approvedNew.size === stats.newHires.valid ? "Exempt All" : "Approve All Valid"}
                                </button>
                            </div>

                            {auditResult.newRows.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                    No new hire rows found.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {auditResult.newRows.map((row) => {
                                        const isRejected = row.overallStatus === "rejected";
                                        const isApproved = approvedNew.has(row.rowIndex);

                                        return (
                                            <div key={row.rowIndex} className={cn(
                                                "bg-white rounded-xl border p-4 transition-all shadow-sm",
                                                isRejected ? "border-action-red/30 bg-action-red/5" :
                                                    isApproved ? "border-emerald-200 ring-1 ring-emerald-500/20" : "border-slate-200"
                                            )}>
                                                <div className="flex items-start gap-4">
                                                    <div className="pt-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={isApproved}
                                                            onChange={() => toggleNew(row.rowIndex)}
                                                            disabled={isRejected}
                                                            className="w-5 h-5 rounded border-slate-300 text-cobalt-blue focus:ring-cobalt-blue cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-slate-400 text-xs">Row {row.rowIndex}</span>
                                                                <span className="text-sm font-semibold text-navy-blue">
                                                                    {row.raw["First Name"]} {row.raw["First Last Name"]}
                                                                </span>
                                                                {isRejected ? (
                                                                    <span className="text-[10px] font-bold text-action-red bg-white border border-action-red/20 px-1.5 rounded uppercase">Rejected</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 rounded uppercase">Valid</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isRejected ? (
                                                            <div className="grid grid-cols-1 gap-1.5 mt-2">
                                                                {row.errors.map((err, i) => (
                                                                    <div key={i} className="flex items-center gap-2 text-xs text-action-red bg-white px-2 py-1.5 rounded border border-action-red/10">
                                                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                                        <span className="font-semibold">{err.field}:</span>
                                                                        <span>{err.reason}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-500 grid grid-cols-2 gap-x-4 gap-y-1">
                                                                <p>ID: <span className="text-slate-700">{row.raw["ID Number"]}</span></p>
                                                                <p>Email: <span className="text-slate-700">{row.raw["Personal Email"]}</span></p>
                                                                <p>Role: <span className="text-slate-700">{row.raw["Job Description"]}</span></p>
                                                                <p>Salary: <span className="text-slate-700">{row.raw["Base Salary"]}</span></p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                        <p>Any rejected rows or unapproved valid rows will be exported to an Excel rejection report automatically upon save.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
