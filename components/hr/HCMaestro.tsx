"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    Search, Download, Save, Filter, ArrowUpDown,
    CheckCircle2, AlertTriangle, Lock, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    FullEmployeeRecord, LocalLegalEntity,
    AREAS_EMPRESA, EPS_OPTIONS, ARL_OPTIONS, AFP_OPTIONS, CCF_OPTIONS, TIPOS_CONTRATO, ENTIDADES_LEGALES
} from "@/lib/hr-types";
import { getLocalLegalEntitiesAction } from "@/app/actions/legal-entity-actions";
import {
    getEmployeesAction as getEmployees,
    saveEmployeesAction as saveEmployees,
    updateEmployeeAction as updateEmployee
} from "@/app/actions/hr-actions";
import { getTenants } from "@/lib/tenant-store";
import { useTenant } from "@/lib/tenant-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCKED_KEYS = new Set([
    "eid",
    "tenant_id",
    "maestro.identificationNumber",
    "maestro.documentTypeId",
    "maestro.firstName",
    "maestro.lastName",
    "maestro.secondLastName",
    "maestro.birthDate",
]);

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    "On Leave": "bg-amber-50 text-amber-700 border-amber-200",
    Terminated: "bg-red-50 text-red-600 border-red-200",
};

// ─── Column Definitions ───────────────────────────────────────────────────────

interface ColumnDef {
    key: string;
    label: string;
    locked?: boolean;
    width?: string;
    type?: "text" | "select" | "number" | "date";
    options?: { value: string | number; label: string }[];
    format?: (val: unknown) => string;
    badge?: boolean;
    group: "Identity" | "Professional" | "Benefits" | "Contact" | "Payroll";
}

const COLUMNS: ColumnDef[] = [
    // Identity
    { key: "eid", label: "EID", locked: true, width: "w-28", group: "Identity" },
    { key: "tenant_id", label: "Tenant ID", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.firstName", label: "First Name", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.lastName", label: "Last Name", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.identificationNumber", label: "ID (CC)", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.birthDate", label: "DOB", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.documentTypeId", label: "Doc Type", locked: true, width: "w-28", group: "Identity" },
    { key: "maestro.gender", label: "Gender", width: "w-24", type: "select", options: [{ value: "M", label: "M" }, { value: "F", label: "F" }, { value: "X", label: "X" }], group: "Identity" },

    // Professional
    {
        key: "status", label: "Status", width: "w-32", badge: true, type: "select",
        options: ["Active", "Inactive", "On Leave", "Terminated"].map(s => ({ value: s, label: s })),
        group: "Professional"
    },
    {
        key: "historialLaboral.area", label: "Area", width: "w-36", type: "select",
        options: AREAS_EMPRESA.map(a => ({ value: a, label: a })), group: "Professional"
    },
    { key: "historialLaboral.subArea", label: "Sub-Area", width: "w-36", group: "Professional" },
    // entidad_legal options injected dynamically — set below after DB load
    { key: "historialLaboral.legalEntity", label: "Local Entity", width: "w-40", type: "select", options: [], group: "Professional" },
    { key: "historialLaboral.costCenter", label: "Cost Center", width: "w-32", group: "Professional" },
    { key: "historialLaboral.directLeader", label: "Direct Leader", width: "w-40", group: "Professional" },
    { key: "historialLaboral.job_title", label: "Job Title", width: "w-44", group: "Professional" },
    { key: "historialLaboral.roleTitleName", label: "Role Title", locked: true, width: "w-44", group: "Professional" },
    {
        key: "historialLaboral.contractType", label: "Contract", width: "w-44", type: "select",
        options: TIPOS_CONTRATO.filter(t => t.value).map(t => ({ value: t.value || "", label: t.label })),
        group: "Professional"
    },
    { key: "historialLaboral.startDate", label: "Start Date", width: "w-32", type: "date", group: "Professional" },
    { key: "historialLaboral.branch", label: "Branch", width: "w-32", group: "Professional" },
    { key: "historialLaboral.cliente", label: "Client", width: "w-32", group: "Professional" },
    { key: "historialLaboral.project", label: "Project", width: "w-32", group: "Professional" },

    // Benefits
    { key: "afiliaciones.epsName", label: "EPS", width: "w-40", type: "select", options: EPS_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.arlName", label: "ARL", width: "w-40", type: "select", options: ARL_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.afpName", label: "AFP", width: "w-40", type: "select", options: AFP_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.ccfName", label: "CCF", width: "w-40", type: "select", options: CCF_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.contributorSubtype", label: "PILA Subtype", width: "w-40", group: "Benefits" },

    // Contact
    { key: "maestro.personalEmail", label: "Personal Email", width: "w-48", group: "Contact" },
    { key: "email_corporativo", label: "Corp Email", width: "w-48", group: "Contact" },
    { key: "maestro.residenceAddress", label: "Address", width: "w-64", group: "Contact" },

    // Payroll
    {
        key: "historialLaboral.baseSalary", label: "Base Salary", width: "w-44", type: "number",
        format: (v) => `$ ${Number(v).toLocaleString("en-US")}`, group: "Payroll"
    },
    { key: "historialLaboral.salaryType", label: "Salary Type", width: "w-32", group: "Payroll" },

    // SST
    { key: "sst.shirtSize", label: "Shirt Size", width: "w-24", group: "Contact" },
    { key: "sst.pantsSize", label: "Pants Size", width: "w-24", group: "Contact" },
    { key: "sst.shoeSize", label: "Shoe Size", width: "w-24", group: "Contact" },
    { key: "sst.bloodType", label: "Blood Type", width: "w-24", group: "Contact" },
];

const ESSENTIAL_KEYS = new Set([
    "eid",
    "tenant_id",
    "maestro.firstName",
    "maestro.lastName",
    "maestro.identificationNumber",
    "status",
    "historialLaboral.area",
    "historialLaboral.job_title",
    "historialLaboral.roleTitleName",
    "historialLaboral.legalEntity",
    "historialLaboral.directLeader",
    "historialLaboral.baseSalary",
    "email_corporativo"
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getValue = (obj: any, path: string): unknown =>
    path.split(".").reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setValue = (obj: any, path: string, value: unknown): void => {
    const parts = path.split(".");
    const last = parts.pop()!;
    const target = parts.reduce((acc, part) => acc[part], obj);
    if (target) target[last] = value;
};

function exportToCSV(employees: FullEmployeeRecord[], activeColumns: ColumnDef[]) {
    const headers = activeColumns.map((c) => c.label);
    const rows = employees.map((emp) =>
        activeColumns.map((col) => {
            const val = getValue(emp, col.key);
            if (typeof val === "number") return val;
            return `"${String(val ?? "").replace(/"/g, '""')}"`;
        }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `HC_Master_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ─── Inline Cell ─────────────────────────────────────────────────────────────

interface CellProps {
    col: ColumnDef;
    record: FullEmployeeRecord;
    onChange: (val: unknown) => void;
    isEditing: boolean;
    onStartEdit: () => void;
}

const InlineCell: React.FC<CellProps> = ({ col, record, onChange, isEditing, onStartEdit }) => {
    const value = getValue(record, col.key);
    const isLocked = col.locked || LOCKED_KEYS.has(col.key);

    if (!isEditing || isLocked) {
        const displayVal = col.format ? col.format(value) : String(value ?? "");
        return (
            <div
                onClick={!isLocked ? onStartEdit : undefined}
                className={cn(
                    "flex items-center gap-1.5 min-h-[32px] px-2 py-1 rounded transition-all",
                    isLocked ? "cursor-default" : "cursor-pointer hover:bg-cobalt-blue/5 hover:ring-1 hover:ring-cobalt-blue/20"
                )}
            >
                {isLocked && <Lock className="w-2.5 h-2.5 text-slate-300 shrink-0" />}
                {col.badge && value ? (
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", STATUS_STYLES[String(value)] ?? "")}>
                        {String(value)}
                    </span>
                ) : (
                    <span className={cn(
                        "text-xs truncate",
                        isLocked ? "text-slate-500 font-medium" : "text-slate-700",
                        col.key === "eid" && "font-mono font-semibold text-cobalt-blue",
                        !value && "text-slate-300 italic"
                    )}>
                        {displayVal || "—"}
                    </span>
                )}
            </div>
        );
    }

    const commonClass =
        "w-full text-xs border border-cobalt-blue/40 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue transition-all shadow-sm";

    if (col.type === "select" && col.options) {
        return (
            <select autoFocus value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={commonClass}>
                <option value="">— Select —</option>
                {col.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    }

    return (
        <input
            autoFocus
            type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
            value={String(value ?? "")}
            onChange={(e) => onChange(col.type === "number" ? Number(e.target.value) : e.target.value)}
            className={commonClass}
        />
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const HCMaestro: React.FC = () => {
    const { currentTenant } = useTenant();
    const [employees, setEmployees] = useState<FullEmployeeRecord[]>([]);
    const [allTenants, setAllTenants] = useState<{ tenant_id: string; dba_name: string }[]>([]);

    const [localEntities, setLocalEntities] = useState<LocalLegalEntity[]>([]);

    useEffect(() => {
        getTenants().then(list =>
            setAllTenants(list.map((t: any) => ({ tenant_id: t.tenant_id, dba_name: t.dba_name })))
        );
        getLocalLegalEntitiesAction().then(entities => setLocalEntities(entities));
    }, []);


    const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
    const [editingCell, setEditingCell] = useState<{ eid: string; key: string } | null>(null);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "warning" | "error" }[]>([]);

    const [isEssentialView, setIsEssentialView] = useState(true);
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // Unified filters grouped by Intake Module
    const [filters, setFilters] = useState({
        // Maestro (Personal)
        tenant_id: "",
        gender: "",
        documentType: "",

        // Laboral (Professional)
        status: "",
        legalEntity: "",
        area: "",
        subArea: "",
        leader: "",
        costCenter: "",
        contract: "",
        salaryType: "",
        branch: "",
        client: "",
        project: "",

        // Afiliaciones (Benefits)
        eps: "",
        afp: "",
        arl: "",
        ccf: "",

        // SST (Safety)
        bloodType: "",
        shirtSize: ""
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!currentTenant) return;
            const data = await getEmployees(currentTenant.tenant_id);
            setEmployees(data);
        };
        fetchEmployees();
    }, [currentTenant]);

    const addToast = (message: string, type: "success" | "warning" | "error" = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    const handleCellChange = (eid: string, key: string, val: unknown) => {
        setEmployees((prev) =>
            prev.map((e) => {
                if (e.eid !== eid) return e;
                const clone = JSON.parse(JSON.stringify(e)) as FullEmployeeRecord;
                setValue(clone, key, val);
                return clone;
            })
        );
        setDirtyRows((prev) => new Set(prev).add(eid));
        setSavedRows((prev) => { const s = new Set(prev); s.delete(eid); return s; });
    };

    const handleRowSave = async (eid: string) => {
        const row = employees.find((e) => e.eid === eid);
        if (!row || !currentTenant) return;

        // This will update the DB
        await updateEmployee(row, currentTenant.tenant_id);

        setDirtyRows((prev) => { const s = new Set(prev); s.delete(eid); return s; });
        setSavedRows((prev) => new Set(prev).add(eid));
        addToast(`Employee ${eid} saved.`, "success");
        setTimeout(() => setSavedRows((prev) => { const s = new Set(prev); s.delete(eid); return s; }), 2500);
    };

    const handleSaveAll = async () => {
        if (!currentTenant) return;
        if (dirtyRows.size === 0) { addToast("No pending changes to save.", "warning"); return; }
        await saveEmployees(employees, currentTenant.tenant_id);
        setDirtyRows(new Set());
        addToast("All changes saved successfully.", "success");
    };

    const activeColumns = useMemo(() => {
        if (isEssentialView) {
            return COLUMNS.filter(c => ESSENTIAL_KEYS.has(c.key));
        }
        return COLUMNS;
    }, [isEssentialView]);

    const entityOptions = useMemo(() => {
        return localEntities.length > 0
            ? localEntities.map(e => ({ value: e.entity_name, label: e.entity_name }))
            : ENTIDADES_LEGALES.map(e => ({ value: e, label: e }));
    }, [localEntities]);

    const activeColumnsWithEntities = useMemo(() => {
        return activeColumns.map(col =>
            col.key === "historialLaboral.legalEntity" ? { ...col, options: entityOptions } : col
        );
    }, [activeColumns, entityOptions]);

    const displayed = useMemo(() => {
        let list = [...employees];
        const q = search.toLowerCase();

        if (q) {
            list = list.filter(
                (e) =>
                    (e.eid ?? "").toLowerCase().includes(q) ||
                    (e.maestro?.firstName ?? "").toLowerCase().includes(q) ||
                    (e.maestro?.lastName ?? "").toLowerCase().includes(q) ||
                    String(e.maestro?.identificationNumber ?? "").includes(q)
            );
        }

        // Maestro Filters
        if (filters.tenant_id) list = list.filter(e => e.tenant_id === filters.tenant_id);
        if (filters.gender) list = list.filter(e => e.maestro.gender === filters.gender);
        if (filters.documentType) list = list.filter(e => e.maestro.documentTypeId === filters.documentType);

        // Laboral Filters
        if (filters.status) list = list.filter(e => e.status === filters.status);
        if (filters.legalEntity) list = list.filter(e => e.historialLaboral.legalEntity === filters.legalEntity);
        if (filters.area) list = list.filter(e => e.historialLaboral.area === filters.area);
        if (filters.subArea) list = list.filter(e => (e.historialLaboral.subArea || "").toLowerCase().includes(filters.subArea.toLowerCase()));
        if (filters.leader) list = list.filter(e => (e.historialLaboral.directLeader || "").toLowerCase().includes(filters.leader.toLowerCase()));
        if (filters.costCenter) list = list.filter(e => e.historialLaboral.costCenter?.includes(filters.costCenter));
        if (filters.contract) list = list.filter(e => e.historialLaboral.contractType === filters.contract);
        if (filters.salaryType) list = list.filter(e => e.historialLaboral.salaryType === filters.salaryType);
        if (filters.branch) list = list.filter(e => e.historialLaboral.branch === filters.branch);
        if (filters.client) list = list.filter(e => e.historialLaboral.client === filters.client);
        if (filters.project) list = list.filter(e => e.historialLaboral.project === filters.project);

        // Afiliaciones Filters
        if (filters.eps) list = list.filter(e => e.afiliaciones.epsName === filters.eps);
        if (filters.afp) list = list.filter(e => e.afiliaciones.afpName === filters.afp);
        if (filters.arl) list = list.filter(e => e.afiliaciones.arlName === filters.arl);
        if (filters.ccf) list = list.filter(e => e.afiliaciones.ccfName === filters.ccf);

        // SST Filters
        if (filters.bloodType) list = list.filter(e => e.sst.bloodType === filters.bloodType);
        if (filters.shirtSize) list = list.filter(e => e.sst.shirtSize === filters.shirtSize);

        if (sortField) {
            list.sort((a, b) => {
                const av = getValue(a, sortField);
                const bv = getValue(b, sortField);
                const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
                return sortDir === "asc" ? cmp : -cmp;
            });
        }
        return list;
    }, [employees, search, filters, sortField, sortDir]);

    const handleSort = (key: string) => {
        if (sortField === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(key); setSortDir("asc"); }
    };

    return (
        <div
            className="flex flex-col h-full bg-white relative overflow-hidden"
            onClick={(e) => { if (!(e.target as HTMLElement).closest("[data-cell]")) setEditingCell(null); }}
        >
            {/* Toasts */}
            <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div key={t.id} className={cn(
                        "px-4 py-2 rounded-lg shadow-lg border text-sm flex items-center gap-2",
                        t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            t.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                "bg-red-50 border-red-200 text-red-700"
                    )}>
                        {t.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="px-8 pt-7 pb-5 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HR Module</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">HC Master</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy-blue">HC Master</h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Report and Export. Identity fields are locked. Filtering follows <strong>Intake Modules</strong>.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setIsEssentialView(true)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                    isEssentialView ? "bg-white text-cobalt-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Essential Mode
                            </button>
                            <button
                                onClick={() => setIsEssentialView(false)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                    !isEssentialView ? "bg-white text-cobalt-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Technical Roster (All Fields)
                            </button>
                        </div>

                        {/* Export CSV */}
                        <button
                            onClick={() => exportToCSV(displayed, activeColumns)}
                            className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-slate-600"
                        >
                            <Download className="w-4 h-4" /> Export Report
                        </button>
                        {/* Save All */}
                        <button
                            onClick={handleSaveAll}
                            className={cn(
                                "px-4 py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all",
                                dirtyRows.size > 0
                                    ? "bg-navy-blue text-white hover:bg-navy-blue/90"
                                    : "bg-slate-100 text-slate-400 cursor-default"
                            )}
                        >
                            <Save className="w-4 h-4" />
                            Save All {dirtyRows.size > 0 && `(${dirtyRows.size})`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-8 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0 flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, EID, ID number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white w-64 focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "px-3 py-2 text-xs font-medium rounded-lg border flex items-center gap-2 transition-all shadow-sm",
                        showFilters || Object.values(filters).some(Boolean)
                            ? "bg-cobalt-blue text-white border-cobalt-blue"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Filter className="w-3.5 h-3.5" />
                    {Object.values(filters).filter(Boolean).length > 0
                        ? `${Object.values(filters).filter(Boolean).length} Filters Active`
                        : "Filter by Intake Form"}
                </button>
                <span className="ml-auto text-xs text-slate-400 font-medium">
                    {displayed.length} records in current view
                </span>
            </div>

            {/* NEW: Filter by Intake Form - Sectioned Expandable Panel */}
            {showFilters && (
                <div className="px-8 py-6 border-b border-slate-100 bg-white shadow-inner overflow-y-auto max-h-[450px]">
                    <div className="flex flex-col gap-10">

                        {/* 1. MAESTRO MODULE */}
                        <section className="relative">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="flex items-center justify-center w-6 h-6 rounded bg-navy-blue text-white text-[10px] font-bold">01</span>
                                <h3 className="text-xs font-bold text-navy-blue uppercase tracking-widest">Maestro Module: Identity & Personal</h3>
                                <div className="flex-1 h-[1px] bg-slate-100 min-w-[20px]" />
                            </div>
                            <div className="grid grid-cols-5 gap-x-6 gap-y-4 ml-9">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tenant ID</label>
                                    <select value={filters.tenant_id} onChange={e => setFilters(p => ({ ...p, tenant_id: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Tenants</option>
                                        {allTenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_id} - {t.dba_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gender</label>
                                    <select value={filters.gender} onChange={e => setFilters(p => ({ ...p, gender: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Genders</option>
                                        <option value="M">Male (M)</option>
                                        <option value="F">Female (F)</option>
                                        <option value="X">Other (X)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Document Type</label>
                                    <select value={filters.documentType} onChange={e => setFilters(p => ({ ...p, documentType: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Types</option>
                                        <option value="ID">National ID (CC/CE)</option>
                                        <option value="PPT">PPT</option>
                                        <option value="SSN">SSN</option>
                                        <option value="PA">Passport</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* 2. LABORAL MODULE */}
                        <section className="relative">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="flex items-center justify-center w-6 h-6 rounded bg-cobalt-blue text-white text-[10px] font-bold">02</span>
                                <h3 className="text-xs font-bold text-navy-blue uppercase tracking-widest">Laboral Module: Job & Contract</h3>
                                <div className="flex-1 h-[1px] bg-slate-100 min-w-[20px]" />
                            </div>
                            <div className="grid grid-cols-5 gap-x-6 gap-y-4 ml-9">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</label>
                                    <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Statuses</option>
                                        {["Active", "Inactive", "On Leave", "Terminated"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Local Entity</label>
                                    <select value={filters.legalEntity} onChange={e => setFilters(p => ({ ...p, legalEntity: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Entities</option>
                                        {entityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Area / Department</label>
                                    <select value={filters.area} onChange={e => setFilters(p => ({ ...p, area: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Areas</option>
                                        {AREAS_EMPRESA.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Leader / Supervisor</label>
                                    <input type="text" placeholder="Search leader..." value={filters.leader} onChange={e => setFilters(p => ({ ...p, leader: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cost Center</label>
                                    <input type="text" placeholder="Search CC..." value={filters.costCenter} onChange={e => setFilters(p => ({ ...p, costCenter: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Contract Type</label>
                                    <select value={filters.contract} onChange={e => setFilters(p => ({ ...p, contract: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All Contracts</option>
                                        {TIPOS_CONTRATO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Salary Type</label>
                                    <select value={filters.salaryType} onChange={e => setFilters(p => ({ ...p, salaryType: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30">
                                        <option value="">All Types</option>
                                        <option value="Fixed">Fixed Salary</option>
                                        <option value="Variable">Variable Salary</option>
                                        <option value="Comprehensive">Comprehensive</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Client / Project</label>
                                    <input type="text" placeholder="Client or Project..." value={filters.client} onChange={e => setFilters(p => {
                                        const val = e.target.value;
                                        return { ...p, client: val, project: val };
                                    })} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30" />
                                </div>
                            </div>
                        </section>

                        {/* 3. BENEFITS MODULE */}
                        <section className="relative">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-600 text-white text-[10px] font-bold">03</span>
                                <h3 className="text-xs font-bold text-navy-blue uppercase tracking-widest">Benefits Module: Affiliations</h3>
                                <div className="flex-1 h-[1px] bg-slate-100 min-w-[20px]" />
                            </div>
                            <div className="grid grid-cols-5 gap-x-6 gap-y-4 ml-9">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">EPS</label>
                                    <select value={filters.eps} onChange={e => setFilters(p => ({ ...p, eps: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All EPS</option>
                                        {EPS_OPTIONS.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">AFP (Pension)</label>
                                    <select value={filters.afp} onChange={e => setFilters(p => ({ ...p, afp: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All AFP</option>
                                        {AFP_OPTIONS.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ARL (Risk)</label>
                                    <select value={filters.arl} onChange={e => setFilters(p => ({ ...p, arl: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All ARL</option>
                                        {ARL_OPTIONS.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CCF (Caja)</label>
                                    <select value={filters.ccf} onChange={e => setFilters(p => ({ ...p, ccf: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors">
                                        <option value="">All CCF</option>
                                        {CCF_OPTIONS.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* 4. SST MODULE */}
                        <section className="relative">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="flex items-center justify-center w-6 h-6 rounded bg-action-red text-white text-[10px] font-bold">04</span>
                                <h3 className="text-xs font-bold text-navy-blue uppercase tracking-widest">Safety Module: SST</h3>
                                <div className="flex-1 h-[1px] bg-slate-100 min-w-[20px]" />
                            </div>
                            <div className="grid grid-cols-5 gap-x-6 gap-y-4 ml-9">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Blood Type</label>
                                    <input type="text" placeholder="O+, A-, etc..." value={filters.bloodType} onChange={e => setFilters(p => ({ ...p, bloodType: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Shirt Size</label>
                                    <select value={filters.shirtSize} onChange={e => setFilters(p => ({ ...p, shirtSize: e.target.value }))} className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30">
                                        <option value="">All Sizes</option>
                                        {["XS", "S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="col-start-5 flex items-end">
                                    <button
                                        onClick={() => setFilters({
                                            tenant_id: "", gender: "", documentType: "", status: "", legalEntity: "", area: "", subArea: "", leader: "", costCenter: "", contract: "",
                                            salaryType: "", branch: "", client: "", project: "", eps: "", afp: "", arl: "", ccf: "", bloodType: "", shirtSize: ""
                                        })}
                                        className="w-full py-2.5 text-[10px] font-bold text-action-red border border-action-red/20 rounded hover:bg-action-red/5 transition-all uppercase tracking-[0.1em]"
                                    >
                                        Clear All Intake Modules
                                    </button>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            ) || <div></div>}

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse min-w-max">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2.5 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 w-14 text-[10px] font-bold text-slate-400 uppercase">
                                Save
                            </th>
                            <th className="px-3 py-2.5 w-10 bg-slate-50 border-l border-slate-100" />
                            {activeColumnsWithEntities.map((col) => (
                                <th key={col.key} className={cn("px-3 py-2.5 text-left border-l border-slate-100 whitespace-nowrap", col.width)}>
                                    <button
                                        onClick={() => handleSort(col.key)}
                                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-navy-blue transition-colors"
                                    >
                                        {col.locked && <Lock className="w-2.5 h-2.5 text-slate-300" />}
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map((emp, idx) => (
                            <tr
                                key={emp.eid}
                                className={cn(
                                    "border-b border-slate-50 transition-colors hover:bg-cobalt-blue/5",
                                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                                    dirtyRows.has(emp.eid) && "bg-amber-50/40",
                                    savedRows.has(emp.eid) && "bg-emerald-50/30"
                                )}
                            >
                                <td className="px-3 py-1.5 sticky left-0 z-10 border-r border-slate-100 bg-inherit">
                                    <button
                                        onClick={() => handleRowSave(emp.eid)}
                                        disabled={!dirtyRows.has(emp.eid)}
                                        title={dirtyRows.has(emp.eid) ? "Save this row" : "No changes"}
                                        className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                            dirtyRows.has(emp.eid)
                                                ? "bg-cobalt-blue text-white shadow-md shadow-cobalt-blue/20 hover:scale-105"
                                                : savedRows.has(emp.eid)
                                                    ? "text-emerald-500"
                                                    : "text-slate-200 cursor-default"
                                        )}
                                    >
                                        {savedRows.has(emp.eid) ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    </button>
                                </td>
                                {/* Avatar thumbnail */}
                                <td className="px-2 py-1 w-10 border-l border-slate-50">
                                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                        {emp.foto_url ? (
                                            <img src={emp.foto_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-400">
                                                {(emp.maestro.firstName?.[0] || "") + (emp.maestro.lastName?.[0] || "")}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                {activeColumnsWithEntities.map((col) => (
                                    <td
                                        key={col.key}
                                        data-cell="true"
                                        className={cn("px-2 py-1 align-middle border-l border-slate-50", col.width, col.locked && "bg-slate-50/40")}
                                    >
                                        <InlineCell
                                            col={col}
                                            record={emp}
                                            isEditing={editingCell?.eid === emp.eid && editingCell?.key === col.key}
                                            onStartEdit={() => setEditingCell({ eid: emp.eid, key: col.key })}
                                            onChange={(val) => handleCellChange(emp.eid, col.key, val)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {displayed.length === 0 && (
                            <tr>
                                <td colSpan={activeColumns.length + 1} className="px-8 py-16 text-center text-sm text-slate-400">
                                    No records match your current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Identity fields (EID, Name, ID, DOB) are <Lock className="w-3 h-3 inline mx-0.5" /> locked.
                    Mode: <strong>{isEssentialView ? "Essential Report" : "Technical Roster (All Modules)"}</strong>.
                </p>
                {dirtyRows.size > 0 && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-[11px] text-slate-500">{dirtyRows.size} row{dirtyRows.size !== 1 ? "s" : ""} with unsaved changes</span>
                    </div>
                )}
            </div>
        </div>
    );
};
