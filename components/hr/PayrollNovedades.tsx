"use client";

import React, { useState } from "react";
import {
    GitMerge,
    FileText,
    Send,
    X,
    Save,
    ChevronDown,
    Search,
    Users,
    CheckCircle2,
    AlertCircle,
    Info,
    UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeIntakeApp } from "./EmployeeIntake";
import { BatchChangesApp } from "./BatchChanges";
import { FullEmployeeRecord } from "@/lib/hr-types";
import { addEmployeeAction as addEmployee, getEmployeesAction } from "@/app/actions/hr-actions";
import { getApproverMap, saveApproverMap, EmployeeApproverMap } from "@/lib/approval-store";
import { useTenant } from "@/lib/tenant-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
    eid: string;
    tenant_id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    foto_url: string;
    position: string;
    area: string;
    subArea: string;
    costCenter: string;
    directLeader: string;
    approver1Id: string;
    approver2Id: string;
    approver3Id: string;
}

type AppId = "approval-flow" | "employee-intake" | "batch-changes" | "changes-form" | "payroll-dispatch" | null;

// ─── Approval Flow Application ────────────────────────────────────────────────

const ApprovalFlowApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentTenant } = useTenant();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [saved, setSaved] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<{ eid: string; col: number } | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({});

    React.useEffect(() => {
        const loadData = async () => {
            if (!currentTenant) return;
            const dbEmployees = await getEmployeesAction(currentTenant.tenant_id);
            const approverMap = await getApproverMap(currentTenant.tenant_id);

            const mapped: Employee[] = dbEmployees.map(emp => {
                const mapData = approverMap.find(m => m.eid === emp.eid);
                return {
                    eid: emp.eid,
                    tenant_id: emp.tenant_id || currentTenant.tenant_id,
                    firstName: emp.maestro?.primer_nombre || "",
                    lastName: emp.maestro?.primer_apellido || "",
                    jobTitle: emp.historialLaboral?.job_title || "",
                    foto_url: emp.foto_url || "",
                    position: emp.historialLaboral?.tipo_contrato || "Employee",
                    area: emp.historialLaboral?.area || "Unassigned",
                    subArea: emp.historialLaboral?.sub_area || "",
                    costCenter: emp.historialLaboral?.centro_costo || "",
                    directLeader: emp.historialLaboral?.direct_leader || "",
                    approver1Id: mapData?.approver1Id || "",
                    approver2Id: mapData?.approver2Id || "",
                    approver3Id: mapData?.approver3Id || ""
                };
            });
            setEmployees(mapped);
            setLoading(false);
        };
        loadData();
    }, [currentTenant]);

    const filtered = employees.filter((e) => {
        const q = search.toLowerCase();
        return (
            (e.eid || "").toLowerCase().includes(q) ||
            (e.firstName || "").toLowerCase().includes(q) ||
            (e.lastName || "").toLowerCase().includes(q) ||
            (e.position || "").toLowerCase().includes(q) ||
            (e.area || "").toLowerCase().includes(q) ||
            (e.tenant_id || "").toLowerCase().includes(q)
        );
    });

    const isApprover1 = (eid: string) => employees.some(e => e.approver1Id === eid);
    const isApprover2 = (eid: string) => employees.some(e => e.approver2Id === eid);

    const setApprover = (eid: string, col: number, approverId: string) => {
        setEmployees((prev) =>
            prev.map((e) => {
                if (e.eid === eid) {
                    if (col === 1) return { ...e, approver1Id: approverId };
                    if (col === 2) return { ...e, approver2Id: approverId };
                    if (col === 3) return { ...e, approver3Id: approverId };
                }
                return e;
            })
        );
        setOpenDropdown(null);
        setSaved(false);
        setValidationError(null);
        setRowErrors({});
    };

    const validateMap = () => {
        const errors: Record<string, string[]> = {};
        let totalErrors = 0;

        employees.forEach(e => {
            const currentErrors: string[] = [];

            // 1. 100% need Approver 1
            if (!e.approver1Id) {
                currentErrors.push("Missing Approver 1");
            }

            // 2. If you are an Approver 1 for someone, you need an Approver 2
            if (isApprover1(e.eid) && !e.approver2Id) {
                currentErrors.push("Role needs Approver 2");
            }

            // 3. If you are an Approver 2 for someone, you need an Approver 3
            if (isApprover2(e.eid) && !e.approver3Id) {
                currentErrors.push("Role needs Approver 3");
            }

            if (currentErrors.length > 0) {
                errors[e.eid] = currentErrors;
                totalErrors += currentErrors.length;
            }
        });

        if (totalErrors > 0) {
            setRowErrors(errors);
            setValidationError("Please finish configuring the approval system. All employees must have an approver, and all approvers must have their own designated level-up approver.");
            return false;
        }
        return true;
    };

    const handleSave = () => {
        if (!currentTenant) return false;

        if (validateMap()) {
            // Save to mapping store
            const mapsToSave: EmployeeApproverMap[] = employees.map(e => ({
                eid: e.eid,
                tenant_id: e.tenant_id,
                approver1Id: e.approver1Id,
                approver2Id: e.approver2Id,
                approver3Id: e.approver3Id
            }));
            saveApproverMap(currentTenant.tenant_id, mapsToSave);

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            return true;
        }
        return false;
    };

    const handleSaveAndClose = () => {
        if (handleSave()) {
            setTimeout(() => onClose(), 800);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cobalt-blue/10 flex items-center justify-center">
                            <GitMerge className="w-5 h-5 text-cobalt-blue" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-navy-blue leading-tight">Approval Flow</h2>
                            <p className="text-xs text-slate-400">Map the transitive approval chain for payroll changes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {saved && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 animate-fade-in">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Configuration validated and saved
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-cobalt-blue border border-cobalt-blue/20 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Info Banner ── */}
                <div className="px-6 py-3 bg-cobalt-blue/5 border-b border-cobalt-blue/10 shrink-0">
                    <div className="flex items-start gap-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-cobalt-blue mt-0.5 shrink-0" />
                            <p className="text-xs text-cobalt-blue/80 leading-relaxed max-w-2xl">
                                <span className="font-semibold text-cobalt-blue">Approval Transit Logic:</span> Every employee requires an <strong>Approver 1</strong>. Any employee designated as an Approver 1 must have an <strong>Approver 2</strong> assigned in their own row. Any Approver 2 must have an <strong>Approver 3</strong>.
                            </p>
                        </div>
                        {validationError && (
                            <div className="ml-auto flex items-center gap-2 bg-action-red/10 border border-action-red/20 px-3 py-1.5 rounded-lg animate-pulse">
                                <AlertCircle className="w-4 h-4 text-action-red" />
                                <span className="text-[11px] font-bold text-action-red">{validationError}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Stats & Search Row ── */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">{employees.length} employees total</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-cobalt-blue" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Approver 1 is Mandatory</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Approver 2 (transitive)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Approver 3 (final)</span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="ml-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, Eid or Tenant…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue w-64 transition-all"
                        />
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm border-collapse min-w-max">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm shadow-[inset_-1px_0_0_0_#e2e8f0]">Tenant Code</th>
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm">EID</th>
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm">Full Name</th>
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm">Area</th>
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm text-center border-l border-slate-200">
                                    <div className="flex items-center justify-center gap-1.5 text-cobalt-blue">
                                        <span className="w-2 h-2 rounded-full bg-cobalt-blue" />
                                        Approver 1
                                    </div>
                                </th>
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm text-center border-l border-slate-200">
                                    <div className="flex items-center justify-center gap-1.5 text-violet-600">
                                        <span className="w-2 h-2 rounded-full bg-violet-600" />
                                        Approver 2
                                    </div>
                                </th>
                                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/95 backdrop-blur-sm text-center border-l border-slate-200">
                                    <div className="flex items-center justify-center gap-1.5 text-amber-600">
                                        <span className="w-2 h-2 rounded-full bg-amber-600" />
                                        Approver 3
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((emp, idx) => {
                                const needsApprover2 = isApprover1(emp.eid);
                                const needsApprover3 = isApprover2(emp.eid);
                                const errors = rowErrors[emp.eid] || [];

                                return (
                                    <tr
                                        key={emp.eid}
                                        className={cn(
                                            "border-b border-slate-50 transition-colors group",
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                                            errors.length > 0 && "bg-red-50/40"
                                        )}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap shadow-[inset_-1px_0_0_0_#f1f5f9]">
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded tracking-tight">
                                                {emp.tenant_id}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-xs font-mono font-bold text-navy-blue opacity-70">
                                                {emp.eid}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                                    {emp.foto_url ? (
                                                        <img src={emp.foto_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {(emp.firstName?.[0] || "") + (emp.lastName?.[0] || "")}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-700">{emp.firstName} {emp.lastName}</span>
                                                    {emp.jobTitle ? (
                                                        <span className="text-[10px] text-cobalt-blue font-medium">{emp.jobTitle}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-medium">{emp.position}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-xs text-slate-500 font-medium">{emp.area}</span>
                                        </td>

                                        {/* Column 1: Mandatory Approver 1 */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center border-l border-slate-100/50">
                                            <ApproverSelector
                                                value={emp.approver1Id}
                                                currentEid={emp.eid}
                                                employees={employees}
                                                onSelect={(id) => setApprover(emp.eid, 1, id)}
                                                isOpen={openDropdown?.eid === emp.eid && openDropdown?.col === 1}
                                                onClick={() => setOpenDropdown(prev => prev?.eid === emp.eid && prev?.col === 1 ? null : { eid: emp.eid, col: 1 })}
                                                statusColor="bg-cobalt-blue"
                                                error={errors.includes("Missing Approver 1")}
                                            />
                                        </td>

                                        {/* Column 2: Transitive Approver 2 */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center border-l border-slate-100/50">
                                            {needsApprover2 ? (
                                                <ApproverSelector
                                                    value={emp.approver2Id}
                                                    currentEid={emp.eid}
                                                    employees={employees}
                                                    onSelect={(id) => setApprover(emp.eid, 2, id)}
                                                    isOpen={openDropdown?.eid === emp.eid && openDropdown?.col === 2}
                                                    onClick={() => setOpenDropdown(prev => prev?.eid === emp.eid && prev?.col === 2 ? null : { eid: emp.eid, col: 2 })}
                                                    statusColor="bg-violet-500"
                                                    error={errors.includes("Role needs Approver 2")}
                                                />
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight opacity-40 italic">— inactive —</span>
                                            )}
                                        </td>

                                        {/* Column 3: Final Approver 3 */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center border-l border-slate-100/50">
                                            {needsApprover3 ? (
                                                <ApproverSelector
                                                    value={emp.approver3Id}
                                                    currentEid={emp.eid}
                                                    employees={employees}
                                                    onSelect={(id) => setApprover(emp.eid, 3, id)}
                                                    isOpen={openDropdown?.eid === emp.eid && openDropdown?.col === 3}
                                                    onClick={() => setOpenDropdown(prev => prev?.eid === emp.eid && prev?.col === 3 ? null : { eid: emp.eid, col: 3 })}
                                                    statusColor="bg-amber-500"
                                                    error={errors.includes("Role needs Approver 3")}
                                                />
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight opacity-40 italic">— inactive —</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-[11px] font-bold text-slate-500 uppercase">System validated</p>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            All assignments MUST be complete before saving. Chained approvers are mandatory for transit roles.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveAndClose}
                            className="flex items-center gap-2 px-6 py-2 bg-cobalt-blue text-white text-sm font-bold rounded-lg hover:bg-navy-blue transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <Save className="w-4 h-4" />
                            Save & Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Click-outside to close dropdown */}
            {openDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenDropdown(null)}
                />
            )}
        </div>
    );
};

// ─── Selector Component ───────────────────────────────────────────────────────

interface SelectorProps {
    value: string;
    currentEid: string;
    employees: Employee[];
    onSelect: (id: string) => void;
    isOpen: boolean;
    onClick: () => void;
    statusColor: string;
    error?: boolean;
}

const ApproverSelector: React.FC<SelectorProps> = ({ value, currentEid, employees, onSelect, isOpen, onClick, statusColor, error }) => {
    const selected = employees.find(e => e.eid === value);

    // Filter available employees:
    // 1. Not the employee themselves (Self-approval)
    // 2. Not anyone who has currentEid as one of their approvers (Circularity - direct)
    const availableEmployees = employees.filter(e => {
        if (e.eid === currentEid) return false;
        if (e.approver1Id === currentEid || e.approver2Id === currentEid || e.approver3Id === currentEid) return false;
        return true;
    });

    return (
        <div className="relative inline-block text-left w-full max-w-[200px]">
            <button
                onClick={onClick}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all",
                    error
                        ? "border-action-red bg-red-50 text-action-red animate-shake"
                        : value
                            ? "border-slate-200 bg-white text-slate-700 hover:border-cobalt-blue/50 shadow-sm"
                            : "border-slate-100 bg-slate-50/50 text-slate-400"
                )}
            >
                <div className="flex items-center gap-2 truncate pr-2">
                    {value ? (
                        <>
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor)} />
                            <span className="truncate">{selected?.firstName} {selected?.lastName}</span>
                        </>
                    ) : (
                        <span>Select Approver</span>
                    )}
                </div>
                <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-1 w-full max-w-[220px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-hidden py-1 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 mb-1 sticky top-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Employees</span>
                    </div>
                    <button
                        onClick={() => onSelect("")}
                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 text-slate-400 italic"
                    >
                        — None —
                    </button>
                    {availableEmployees.map(e => (
                        <button
                            key={e.eid}
                            onClick={() => onSelect(e.eid)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-cobalt-blue/5 flex items-center justify-between",
                                e.eid === value && "bg-cobalt-blue/5 text-cobalt-blue"
                            )}
                        >
                            <div className="flex flex-col">
                                <span className="font-semibold">{e.firstName} {e.lastName}</span>
                                <span className="text-[9px] text-slate-400">{e.area}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-300">{e.eid}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Application Card ─────────────────────────────────────────────────────────

interface AppCardProps {
    id: AppId;
    icon: React.ElementType;
    title: string;
    description: string;
    badge?: string;
    badgeColor?: string;
    comingSoon?: boolean;
    onOpen: (id: AppId) => void;
}

const AppCard: React.FC<AppCardProps> = ({
    id, icon: Icon, title, description, badge, badgeColor, comingSoon, onOpen,
}) => (
    <div
        onDoubleClick={() => !comingSoon && onOpen(id)}
        className={cn(
            "group relative bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 transition-all duration-200 select-none",
            comingSoon
                ? "opacity-60 cursor-not-allowed"
                : "cursor-pointer hover:shadow-lg hover:shadow-cobalt-blue/8 hover:border-cobalt-blue/30 hover:-translate-y-0.5"
        )}
    >
        {/* Icon */}
        <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
            comingSoon ? "bg-slate-100" : "bg-cobalt-blue/10 group-hover:bg-cobalt-blue/15"
        )}>
            <Icon className={cn("w-6 h-6", comingSoon ? "text-slate-400" : "text-cobalt-blue")} />
        </div>

        {/* Content */}
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-navy-blue">{title}</h3>
                {badge && (
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", badgeColor)}>
                        {badge}
                    </span>
                )}
                {comingSoon && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-slate-100 text-slate-400">
                        Coming Soon
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>

        {/* Double-click hint */}
        {!comingSoon && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 group-hover:text-cobalt-blue/60 transition-colors">
                <span className="font-medium">Double-click to open</span>
            </div>
        )}

        {/* Active glow on hover */}
        {!comingSoon && (
            <div className="absolute inset-0 rounded-2xl ring-2 ring-cobalt-blue/0 group-hover:ring-cobalt-blue/20 transition-all pointer-events-none" />
        )}
    </div>
);

// ─── Main Payroll Novedades View ──────────────────────────────────────────────

export const PayrollNovedades: React.FC = () => {
    const [openApp, setOpenApp] = useState<AppId>(null);
    const [, setHCRecords] = useState<FullEmployeeRecord[]>([]);

    const handleSaveEmployee = async (record: FullEmployeeRecord) => {
        setHCRecords(prev => [...prev, record]);
        await addEmployee(record, record.tenant_id || "");
        console.log("[HC Maestro] New employee saved to store:", record);
    };

    const apps: AppCardProps[] = [
        {
            id: "approval-flow",
            icon: GitMerge,
            title: "Approval Flow",
            description:
                "Map the transitive approval chain. Assign mandatory Approver 1 for all employees, and chained level-up approvers for all designated leaders.",
            badge: "Active",
            badgeColor: "bg-emerald-50 text-emerald-600 border border-emerald-200",
            onOpen: setOpenApp,
        },
        {
            id: "employee-intake",
            icon: UserPlus,
            title: "Employee Intake",
            description:
                "Register a new employee through a guided 5-step wizard. Captures all 5 DB tables: identity, job history, social security, and SST data.",
            badge: "Active",
            badgeColor: "bg-cobalt-blue/10 text-cobalt-blue border border-cobalt-blue/20",
            onOpen: setOpenApp,
        },
        {
            id: "batch-changes",
            icon: Users,
            title: "Batch Changes",
            description:
                "Preview all employees with their full Intake data. Export a template, make bulk modifications in Excel, and re-import with automated audit and per-row approval.",
            badge: "Active",
            badgeColor: "bg-emerald-50 text-emerald-600 border border-emerald-200",
            onOpen: setOpenApp,
        },
        {
            id: "novedades-form" as AppId,
            icon: FileText,
            title: "Changes Form",
            description:
                "Submit payroll changes for your team. Entries are routed automatically through the configured approval chain.",
            comingSoon: true,
            onOpen: setOpenApp,
        },
        {
            id: "payroll-dispatch",
            icon: Send,
            title: "Payroll Dispatch",
            description:
                "Review all approved changes and authorize their dispatch to the Payroll sub-module for final processing.",
            comingSoon: true,
            onOpen: setOpenApp,
        },
    ];

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ── Sub-module Header ── */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HR Module</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">Payroll Changes</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy-blue">Payroll Changes</h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-xl">
                            Manage the end-to-end payroll novelty workflow — from submission by area leads, through multi-level approval, to final dispatch into Payroll.
                        </p>
                    </div>

                    {/* Flow Diagram Pill */}
                    <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-cobalt-blue" />
                            <span className="text-[11px] font-semibold text-cobalt-blue">Approver 1</span>
                        </div>
                        <span className="text-slate-300 text-xs">→</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            <span className="text-[11px] font-semibold text-violet-600">Approver 2</span>
                        </div>
                        <span className="text-slate-300 text-xs">→</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[11px] font-semibold text-amber-600">Approver 3</span>
                        </div>
                        <span className="text-slate-300 text-xs">→</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold text-emerald-600">Payroll</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── App Grid ── */}
            <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="mb-5">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Applications</h3>
                    <p className="text-xs text-slate-400">Double-click an application to open it.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl">
                    {apps.map((app) => (
                        <AppCard key={app.id} {...app} />
                    ))}
                </div>

                {/* Process Overview */}
                <div className="mt-10 max-w-4xl">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Process Overview</h3>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {[
                                { step: "01", title: "Configure Roles", desc: "Use Approval Flow to assign Approver 1, 2, and 3 roles to area leaders.", color: "bg-cobalt-blue" },
                                { step: "02", title: "Submit Changes", desc: "Area leaders submit payroll changes through the Changes Form.", color: "bg-violet-500" },
                                { step: "03", title: "Multi-level Approval", desc: "Each change is routed up the approval chain automatically.", color: "bg-amber-500" },
                                { step: "04", title: "Dispatch to Payroll", desc: "HR authorizes the final batch and sends it to the Payroll sub-module.", color: "bg-emerald-500" },
                            ].map((item) => (
                                <div key={item.step} className="flex-1 flex gap-3">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-[11px] font-bold", item.color)}>
                                        {item.step}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-navy-blue mb-0.5">{item.title}</p>
                                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── App Modals ── */}
            {openApp === "approval-flow" && (
                <ApprovalFlowApp onClose={() => setOpenApp(null)} />
            )}
            {openApp === "employee-intake" && (
                <EmployeeIntakeApp
                    onClose={() => setOpenApp(null)}
                    onSave={handleSaveEmployee}
                />
            )}
            {openApp === "batch-changes" && (
                <BatchChangesApp onClose={() => setOpenApp(null)} />
            )}
        </div>
    );
};
