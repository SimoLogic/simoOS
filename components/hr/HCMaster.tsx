"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    Search, Download, Save, X, Lock, ChevronDown, ChevronUp, Filter,
    RefreshCw, CheckCircle2, AlertTriangle, Eye, FileText, Users,
    SlidersHorizontal, ArrowUpDown, Info, ShieldAlert, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FullEmployeeRecord, AREAS_EMPRESA, EPS_OPTIONS, ARL_OPTIONS, AFP_OPTIONS, CCF_OPTIONS, TIPOS_CONTRATO } from "@/lib/hr-types";
import { getEmployeesAction as getEmployees, saveEmployeesAction as saveEmployees } from "@/app/actions/hr-actions";
import { useTenant } from "@/lib/tenant-context";
import * as XLSX from "xlsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCKED_FIELDS = new Set([
    "maestro.numero_identificacion",
    "maestro.tipo_documento_id",
    "maestro.primer_nombre",
    "maestro.primer_apellido",
    "maestro.segundo_apellido",
    "maestro.fecha_nacimiento",
    "eid"
]);

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    "On Leave": "bg-amber-50 text-amber-700 border-amber-200",
    Terminated: "bg-red-50 text-red-600 border-red-200",
};

// ─── Column Definitions ───────────────────────────────────────────────────────

interface ColumnDef {
    key: string; // dot notation for nested fields
    label: string;
    locked?: boolean;
    width?: string;
    type?: "text" | "select" | "number" | "date" | "textarea";
    options?: { value: string | number; label: string }[];
    format?: (val: unknown) => string;
    badge?: boolean;
    group: "Identity" | "Professional" | "Benefits" | "Contact" | "SST" | "Payroll" | "Notes";
}

const COLUMNS: ColumnDef[] = [
    // Identity (locked)
    { key: "eid", label: "EID", locked: true, width: "w-28", group: "Identity" },
    { key: "maestro.primer_nombre", label: "First Name", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.primer_apellido", label: "Last Name", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.numero_identificacion", label: "ID (CC)", locked: true, width: "w-32", group: "Identity" },
    { key: "maestro.fecha_nacimiento", label: "DOB", locked: true, width: "w-32", type: "date", group: "Identity" },

    // Professional
    { key: "status", label: "Status", width: "w-32", type: "select", options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "On Leave", label: "On Leave" }, { value: "Terminated", label: "Terminated" }], badge: true, group: "Professional" },
    { key: "historialLaboral.area", label: "Area", width: "w-36", type: "select", options: AREAS_EMPRESA.map(a => ({ value: a, label: a })), group: "Professional" },
    { key: "historialLaboral.sub_area", label: "Sub-Area", width: "w-36", group: "Professional" },
    { key: "historialLaboral.centro_costo", label: "Cost Center", width: "w-32", group: "Professional" },
    { key: "historialLaboral.direct_leader", label: "Direct Leader", width: "w-40", group: "Professional" },
    { key: "direct_leader_id", label: "Leader EID", width: "w-32", group: "Professional" },
    { key: "historialLaboral.tipo_contrato", label: "Contract", width: "w-40", type: "select", options: TIPOS_CONTRATO.filter(t => t.value).map(t => ({ value: t.value, label: t.label })), group: "Professional" },
    { key: "historialLaboral.fecha_inicio", label: "Start Date", width: "w-32", type: "date", group: "Professional" },
    { key: "historialLaboral.job_title", label: "Job Title", width: "w-44", group: "Professional" },
    { key: "historialLaboral.role_title", label: "Role Title", width: "w-44", group: "Professional" },

    // Benefits
    { key: "afiliaciones.eps_nombre", label: "EPS", width: "w-40", type: "select", options: EPS_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.arl_nombre", label: "ARL", width: "w-40", type: "select", options: ARL_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.afp_nombre", label: "AFP", width: "w-40", type: "select", options: AFP_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },
    { key: "afiliaciones.ccf_nombre", label: "CCF", width: "w-40", type: "select", options: CCF_OPTIONS.map(o => ({ value: o.nombre, label: o.nombre })), group: "Benefits" },

    // SST
    { key: "sst.talla_camisa", label: "Shirt", width: "w-20", group: "SST" },
    { key: "sst.talla_pantalon", label: "Pants", width: "w-20", group: "SST" },
    { key: "sst.tipo_sangre", label: "Blood", width: "w-20", group: "SST" },

    // Contact & Geography
    { key: "maestro.email_personal", label: "Personal Email", width: "w-48", group: "Contact" },
    { key: "email_corporativo", label: "Corp Email", width: "w-48", group: "Contact" },
    { key: "continent_id", label: "Continent", width: "w-32", group: "Contact" },
    { key: "country_id", label: "Country", width: "w-32", group: "Contact" },
    { key: "city_id", label: "City", width: "w-32", group: "Contact" },

    // Payroll
    { key: "historialLaboral.salario_base", label: "Salary [Local Currency]", width: "w-44", type: "number", format: (v) => `$${Number(v).toLocaleString("es-CO")}`, group: "Payroll" },
    { key: "salary_currency", label: "Currency", width: "w-24", group: "Payroll" },
    // Salary [Reporting Currency] is a computed column — rendered separately in the table
];

// ─── Computed: Salary [Reporting Currency] ────────────────────────────────────
// Reads from dim_fx_rates: from_currency = employee.salary_currency, to_currency = USD
// Falls back to — if no rate is found
const computeReportingSalary = (
    salario_base: number | undefined,
    salary_currency: string | undefined,
    fxRates: Record<string, number>
): string => {
    if (!salario_base || !salary_currency) return "—";
    if (salary_currency === "USD") return `$${Number(salario_base).toFixed(2)}`;
    const rate = fxRates[salary_currency];
    if (!rate) return "—";
    return `$${(salario_base * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

const setValue = (obj: any, path: string, value: any) => {
    const parts = path.split('.');
    const last = parts.pop()!;
    const target = parts.reduce((acc, part) => acc[part], obj);
    target[last] = value;
};

function exportToExcel(employees: FullEmployeeRecord[], fxRates: Record<string, number>) {
    const data = employees.map((emp) => {
        const row: any = {};
        COLUMNS.forEach((col) => {
            const val = getValue(emp, col.key);
            row[col.label] = col.format ? col.format(val) : val;
        });
        // Computed column
        row["Salary [Reporting Currency] (USD)"] = computeReportingSalary(
            emp.historialLaboral?.salario_base,
            emp.salary_currency ?? undefined,
            fxRates
        );
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HC Master");

    // Export via Blob for reliable browser download
    const wbOut = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `HC_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1000);
}

// ─── Components ───────────────────────────────────────────────────────────────

interface CellProps {
    col: ColumnDef;
    record: FullEmployeeRecord;
    onChange: (val: unknown) => void;
    isEditing: boolean;
    onStartEdit: () => void;
}

const InlineCell: React.FC<CellProps> = ({ col, record, onChange, isEditing, onStartEdit }) => {
    const value = getValue(record, col.key);
    const isLocked = col.locked || LOCKED_FIELDS.has(col.key);

    if (!isEditing || isLocked) {
        const displayVal = col.format ? col.format(value) : String(value ?? "—");
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
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", STATUS_STYLES[String(value)] || "")}>
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

    const commonClass = "w-full text-xs border border-cobalt-blue/40 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue transition-all shadow-sm";

    if (col.type === "select" && col.options) {
        return (
            <select
                autoFocus
                value={String(value ?? "")}
                onChange={(e) => onChange(e.target.value)}
                className={commonClass}
            >
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
    const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
    const [editingCell, setEditingCell] = useState<{ eid: string; key: string } | null>(null);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

    const [search, setSearch] = useState("");
    const [filterArea, setFilterArea] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // FX rates: key = from_currency, value = rate to USD
    const [fxRates, setFxRates] = useState<Record<string, number>>({ COP: 0.000245, EUR: 1.09, PEN: 0.27 });

    useEffect(() => {
        // Try to pull live FX rates from Supabase dim_fx_rates table
        import("@/lib/database").then(({ supabase }) => {
            supabase.from("dim_fx_rates")
                .select("from_currency, rate")
                .eq("to_currency", "USD")
                .then(({ data }) => {
                    if (data && data.length > 0) {
                        const rateMap: Record<string, number> = {};
                        data.forEach((r: any) => { rateMap[r.from_currency] = r.rate; });
                        setFxRates(rateMap);
                    }
                });
        }).catch(() => { /* DB not available, use fallback rates */ });
    }, []);

    useEffect(() => {
        const fetch = async () => {
            if (!currentTenant) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const data = await getEmployees(currentTenant.tenant_id);
                setEmployees(data);
            } catch (err: any) {
                console.error("Failed to fetch employees:", err);
                setError(err.message || "Error Desconocido de Conexión a Base de Datos");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [currentTenant]);

    const addToast = (message: string, type: "success" | "warning" = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    const handleCellChange = (eid: string, key: string, val: unknown) => {
        setEmployees((prev) => prev.map((e) => {
            if (e.eid === eid) {
                const clone = JSON.parse(JSON.stringify(e));
                setValue(clone, key, val);
                return clone;
            }
            return e;
        }));
        setDirtyRows((prev) => new Set(prev).add(eid));
        setSavedRows((prev) => { const s = new Set(prev); s.delete(eid); return s; });
    };

    const handleRowSave = async (eid: string) => {
        const row = employees.find(e => e.eid === eid);
        if (row && currentTenant) {
            const currentStore = await getEmployees(currentTenant.tenant_id);
            const updatedStore = currentStore.map(e => e.eid === eid ? row : e);
            await saveEmployees(updatedStore, currentTenant.tenant_id);
            setDirtyRows((prev) => { const s = new Set(prev); s.delete(eid); return s; });
            setSavedRows((prev) => new Set(prev).add(eid));
            addToast(`Employee ${eid} saved.`, "success");
            setTimeout(() => setSavedRows((prev) => { const s = new Set(prev); s.delete(eid); return s; }), 2000);
        }
    };

    const handleSaveAll = async () => {
        if (dirtyRows.size === 0 || !currentTenant) return;
        await saveEmployees(employees, currentTenant.tenant_id);
        setDirtyRows(new Set());
        addToast("All changes saved successfully.", "success");
    };

    const displayed = useMemo(() => {
        let list = [...employees];
        const q = search.toLowerCase();
        if (q) {
            list = list.filter(e =>
                (e.eid ?? "").toLowerCase().includes(q) ||
                (e.maestro?.primer_nombre ?? "").toLowerCase().includes(q) ||
                (e.maestro?.primer_apellido ?? "").toLowerCase().includes(q) ||
                String(e.maestro?.numero_identificacion ?? "").includes(q)
            );
        }
        if (filterArea) list = list.filter(e => e.historialLaboral.area === filterArea);
        if (filterStatus) list = list.filter(e => e.status === filterStatus);

        if (sortField) {
            list.sort((a, b) => {
                const av = getValue(a, sortField);
                const bv = getValue(b, sortField);
                const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
                return sortDir === "asc" ? cmp : -cmp;
            });
        }
        return list;
    }, [employees, search, filterArea, filterStatus, sortField, sortDir]);

    const handleSort = (key: string) => {
        if (sortField === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(key); setSortDir("asc"); }
    };

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Toasts */}
            <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className={cn("px-4 py-2 rounded-lg shadow-lg border text-sm flex items-center gap-2 animate-fade-in",
                        t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700")}>
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
                        <p className="text-sm text-slate-400 mt-0.5">Unified master record populated via Employee Intake. Identity fields are protected.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportToExcel(displayed, fxRates)} className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export Excel
                        </button>
                        <button onClick={handleSaveAll} className="px-4 py-2 bg-navy-blue text-white text-sm font-semibold rounded-lg hover:bg-navy-blue/90 transition-all shadow-sm flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save & Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-8 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0 flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Search name, EID, ID..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white w-64 focus:ring-2 focus:ring-cobalt-blue/20 outline-none" />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={cn("px-3 py-2 text-xs font-medium rounded-lg border flex items-center gap-2",
                    showFilters || filterArea || filterStatus ? "bg-cobalt-blue/10 border-cobalt-blue/30 text-cobalt-blue" : "bg-white border-slate-200 text-slate-600")}>
                    <Filter className="w-3.5 h-3.5" /> Filters
                </button>
            </div>

            {/* Filters Row */}
            {showFilters && (
                <div className="px-8 py-3 border-b border-slate-100 bg-white shrink-0 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5 outline-none">
                            <option value="">All</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="On Leave">On Leave</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Area</label>
                        <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5 outline-none">
                            <option value="">All</option>
                            {AREAS_EMPRESA.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto" onClick={(e) => { if (!(e.target as HTMLElement).closest("[data-cell]")) setEditingCell(null); }}>
                <table className="w-full text-sm border-collapse min-w-max">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 w-16 text-[10px] font-bold text-slate-400 uppercase">Actions</th>
                            {COLUMNS.map(col => (
                                <th key={col.key} className={cn("px-3 py-2.5 text-left border-l border-slate-100 whitespace-nowrap", col.width)}>
                                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase hover:text-navy-blue">
                                        {col.locked && <Lock className="w-2.5 h-2.5 text-slate-300" />}
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </button>
                                </th>
                            ))}
                            <th className="px-3 py-2.5 text-left border-l border-slate-100 whitespace-nowrap w-48">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Salary [Reporting Currency] USD</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse border-b border-slate-50">
                                    <td className="px-3 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                                    {COLUMNS.map(c => <td key={c.key} className="px-3 py-4"><div className="h-3 bg-slate-50 rounded w-full" /></td>)}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={COLUMNS.length + 1} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                            <ShieldAlert className="w-6 h-6 text-action-red" />
                                        </div>
                                        <div className="max-w-md mx-auto">
                                            <h3 className="text-sm font-bold text-navy-blue uppercase tracking-widest">Error de Conexión a Base de Datos</h3>
                                            <p className="text-xs text-action-red/80 font-medium mt-1 leading-relaxed">
                                                {error}
                                            </p>
                                        </div>
                                        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-1.5 text-xs font-bold text-white bg-action-red rounded-lg hover:bg-action-red/90 transition-all shadow-lg shadow-action-red/10">
                                            Reintentar Conexión
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : displayed.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMNS.length + 1} className="py-20 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Database className="w-8 h-8 opacity-20" />
                                        <p className="text-sm font-medium">No records match your current filters.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : displayed.map((emp, idx) => (
                            <tr key={emp.eid} className={cn("border-b border-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                                dirtyRows.has(emp.eid) && "bg-amber-50/30", savedRows.has(emp.eid) && "bg-emerald-50/20", "hover:bg-cobalt-blue/5")}>
                                <td className="px-3 py-2 sticky left-0 z-10 border-r border-slate-100 bg-inherit">
                                    <button onClick={() => handleRowSave(emp.eid)} disabled={!dirtyRows.has(emp.eid)}
                                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                            dirtyRows.has(emp.eid) ? "bg-cobalt-blue text-white shadow-md shadow-cobalt-blue/20 hover:scale-105" : "text-slate-300")}>
                                        {savedRows.has(emp.eid) ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    </button>
                                </td>
                                {COLUMNS.map(col => (
                                    <td key={col.key} data-cell="true" className={cn("px-2 py-1 align-middle border-l border-slate-50", col.width, col.locked && "bg-slate-50/40")}>
                                        <InlineCell col={col} record={emp} isEditing={editingCell?.eid === emp.eid && editingCell?.key === col.key}
                                            onStartEdit={() => setEditingCell({ eid: emp.eid, key: col.key })} onChange={val => handleCellChange(emp.eid, col.key, val)} />
                                    </td>
                                ))}
                                {/* Computed Salary [Reporting Currency] — read-only */}
                                <td className="px-2 py-1 align-middle border-l border-slate-50 w-48">
                                    <span className="text-xs font-mono text-emerald-700 font-semibold">
                                        {computeReportingSalary(
                                            emp.historialLaboral?.salario_base,
                                            emp.salary_currency ?? undefined,
                                            fxRates
                                        )}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Info Banner */}
            <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Identity fields (First Name, Last Name, ID, DOB) are restricted from editing in the Master.
                </p>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[11px] text-slate-500">Unsaved changes in this row</span>
                </div>
            </div>
        </div>
    );
};
