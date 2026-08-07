"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    Search, Download, Filter, ArrowUpDown, ChevronDown, ChevronRight,
    Info, ShieldAlert, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import {
    getActiveRosterAction,
    type ActiveRosterEmployee,
} from "@/app/actions/hr-active-roster-actions";

/**
 * HC MASTER — reconstruido sobre public.hr_active_roster (2026-08-07).
 *
 * ANTES: leía dim_employee vía getEmployeesAction (app/actions/hr-actions.ts),
 * un modelo distinto (identificación/EPS/ARL/AFP/historial laboral editables)
 * que hoy está VACÍO -- por eso la pantalla no mostraba a nadie aunque la
 * Carga Centralizada ya tuviera empleados reales cargados.
 *
 * AHORA: lee hr_active_roster, la tabla que alimenta el módulo de Carga
 * Centralizada (Excel -> BigQuery -> Supabase).
 *
 * QUÉ SE SIMPLIFICÓ Y POR QUÉ (para retomarlo si hace falta):
 *  - Edición inline + "Save All" + toasts de guardado: se quitaron. Escribían
 *    en dim_employee con updateEmployeeAction/saveEmployeesAction, que no
 *    corresponden a este dataset. hr_active_roster se reconstruye entera en
 *    cada carga del Excel, así que editar celda por celda aquí se perdería
 *    en la siguiente carga. Si se quiere edición, primero hay que decidir
 *    cómo conviven el Excel y los cambios manuales (¿override por campo?).
 *  - Columnas de afiliaciones editables (EPS/ARL/AFP/CCF), historial laboral
 *    (sub-área, centro de costo, entidad legal, cliente, proyecto, cargo/rol
 *    del catálogo de job titles), salario base y datos SST (tallas, tipo de
 *    sangre): no existen en hr_active_roster. EPS/pensión/cesantías/CCF sí
 *    llegan del Excel pero cifrados, así que se muestran en el panel de
 *    detalle, en solo lectura, no como columna filtrable.
 *  - Bloqueo/desbloqueo de fila (candado) y foto del empleado: sin sentido en
 *    una vista de solo lectura sin fotos en este dataset.
 *
 * Los campos sensibles se muestran completos porque la página entera está
 * detrás de AdminGate (rol admin) -- ver components/dashboard/DashboardContent.tsx.
 */

// ─── Column Definitions ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
};

interface ColumnDef {
    key: keyof ActiveRosterEmployee;
    label: string;
    width?: string;
    format?: (row: ActiveRosterEmployee) => string;
}

/** Formatea una fecha ISO como YYYY-MM-DD (sin hora, sin corrimiento de zona). */
function fmtDate(iso: string | null): string {
    return iso ? iso.slice(0, 10) : "";
}

const COLUMNS: ColumnDef[] = [
    { key: "employeeNumber", label: "Employee #", width: "w-24", format: (r) => (r.employeeNumber != null ? String(r.employeeNumber) : "") },
    { key: "fullName", label: "Full Name", width: "w-56" },
    { key: "branchCode", label: "Branch", width: "w-24" },
    { key: "position", label: "Position", width: "w-52" },
    { key: "area", label: "Area", width: "w-40" },
    { key: "supervisorName", label: "Supervisor", width: "w-44" },
    { key: "corporateEmail", label: "Corporate Email", width: "w-60" },
    { key: "dateStarted", label: "Date Started", width: "w-32", format: (r) => fmtDate(r.dateStarted) },
    { key: "contractType", label: "Contract Type", width: "w-40" },
    { key: "englishLevel", label: "English Level", width: "w-32" },
    { key: "status", label: "Status", width: "w-28" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellText(row: ActiveRosterEmployee, col: ColumnDef): string {
    if (col.format) return col.format(row);
    const val = row[col.key];
    return val == null ? "" : String(val);
}

/**
 * Exporta SOLO las columnas de la tabla (no sensibles). Los campos del panel
 * de detalle (cédula, dirección, cuenta bancaria) se dejan fuera a propósito:
 * un CSV sale del navegador sin ningún control y ese dato vive cifrado.
 */
function exportToCSV(rows: ActiveRosterEmployee[]) {
    const headers = COLUMNS.map((c) => c.label);
    const body = rows.map((row) =>
        COLUMNS.map((col) => `"${cellText(row, col).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `HC_Master_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const DetailField: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
    <div className="space-y-0.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</div>
        <div className={cn("text-xs", value ? "text-slate-700" : "text-slate-300 italic")}>
            {value || "—"}
        </div>
    </div>
);

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section>
        <h4 className="text-[11px] font-bold text-navy-blue uppercase tracking-widest mb-3">{title}</h4>
        <div className="grid grid-cols-4 gap-x-6 gap-y-4">{children}</div>
    </section>
);

const EmployeeDetail: React.FC<{ employee: ActiveRosterEmployee }> = ({ employee: e }) => (
    <div className="px-8 py-6 bg-slate-50/80 border-y border-slate-200 flex flex-col gap-7">
        {e.sensitiveDataUnavailable && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Protected data for this employee could not be decrypted. Re-run the centralized upload
                to restore it.
            </div>
        )}

        <DetailSection title="Personal & Contact">
            <DetailField label="National ID" value={e.nationalId} />
            <DetailField label="Birth Date" value={e.birthDate} />
            <DetailField label="Gender" value={e.gender} />
            <DetailField label="Personal Email" value={e.personalEmail} />
            <DetailField label="Phone (Colombia)" value={e.phoneCo} />
            <DetailField label="Phone (USA)" value={e.phoneUsa} />
            <DetailField label="Address" value={e.homeAddress} />
            <DetailField label="Neighborhood" value={e.neighborhood} />
            <DetailField label="City" value={e.city} />
        </DetailSection>

        <DetailSection title="Emergency Contact">
            <DetailField label="Name" value={e.emergencyContactName} />
            <DetailField label="Phone" value={e.emergencyContactPhone} />
            <DetailField label="Relationship" value={e.emergencyContactRelation} />
        </DetailSection>

        <DetailSection title="Affiliations & Bank">
            <DetailField label="EPS (Health)" value={e.eps} />
            <DetailField label="Pension" value={e.pension} />
            <DetailField label="Severance (Cesantías)" value={e.cesantias} />
            <DetailField label="CCF" value={e.ccf} />
            <DetailField label="Bank" value={e.bankName} />
            <DetailField label="Bank Account" value={e.bankAccount} />
        </DetailSection>

        <DetailSection title="Employment & Profile">
            <DetailField label="Month Started" value={e.monthStarted} />
            <DetailField label="Indefinite Contract Date" value={fmtDate(e.indefiniteContractDate) || null} />
            <DetailField label="Seniority" value={e.antiquityLabel} />
            <DetailField label="University" value={e.university} />
            <DetailField label="Professional Profile" value={e.professionalProfile} />
            <DetailField label="Last Upload" value={fmtDate(e.uploadedAt)} />
        </DetailSection>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const HCMaestro: React.FC = () => {
    const { currentTenant } = useTenant();
    const [employees, setEmployees] = useState<ActiveRosterEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortField, setSortField] = useState<keyof ActiveRosterEmployee | null>("employeeNumber");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [filters, setFilters] = useState({
        status: "Active",
        branchCode: "",
        area: "",
        contractType: "",
        englishLevel: "",
    });
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        if (!currentTenant?.tenant_id) return;
        let cancelled = false;
        setIsLoading(true);
        setLoadError(null);

        getActiveRosterAction(currentTenant.tenant_id).then((result) => {
            if (cancelled) return;
            if (result.success) setEmployees(result.data);
            else {
                setEmployees([]);
                setLoadError(result.error);
            }
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [currentTenant?.tenant_id, reloadToken]);

    /** Valores presentes en los datos -- los dropdowns se arman del dataset real,
     *  no de catálogos fijos que no aplican a esta fuente. */
    const optionsFor = useMemo(() => {
        const uniqueSorted = (pick: (e: ActiveRosterEmployee) => string | null) =>
            Array.from(new Set(employees.map(pick).filter((v): v is string => !!v))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true })
            );
        return {
            branchCode: uniqueSorted((e) => e.branchCode),
            area: uniqueSorted((e) => e.area),
            contractType: uniqueSorted((e) => e.contractType),
            englishLevel: uniqueSorted((e) => e.englishLevel),
            status: uniqueSorted((e) => e.status),
        };
    }, [employees]);

    const displayed = useMemo(() => {
        let list = [...employees];
        const q = search.trim().toLowerCase();

        if (q) {
            list = list.filter(
                (e) =>
                    e.fullName.toLowerCase().includes(q) ||
                    String(e.employeeNumber ?? "").includes(q) ||
                    (e.position ?? "").toLowerCase().includes(q) ||
                    (e.area ?? "").toLowerCase().includes(q) ||
                    (e.supervisorName ?? "").toLowerCase().includes(q) ||
                    (e.corporateEmail ?? "").toLowerCase().includes(q)
            );
        }

        if (filters.status) list = list.filter((e) => e.status === filters.status);
        if (filters.branchCode) list = list.filter((e) => e.branchCode === filters.branchCode);
        if (filters.area) list = list.filter((e) => e.area === filters.area);
        if (filters.contractType) list = list.filter((e) => e.contractType === filters.contractType);
        if (filters.englishLevel) list = list.filter((e) => e.englishLevel === filters.englishLevel);

        if (sortField) {
            const field = sortField;
            list.sort((a, b) => {
                const cmp = String(a[field] ?? "").localeCompare(String(b[field] ?? ""), undefined, {
                    numeric: true,
                });
                return sortDir === "asc" ? cmp : -cmp;
            });
        }
        return list;
    }, [employees, search, filters, sortField, sortDir]);

    const activeCount = useMemo(() => employees.filter((e) => e.status === "Active").length, [employees]);

    const handleSort = (key: keyof ActiveRosterEmployee) => {
        if (sortField === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortField(key);
            setSortDir("asc");
        }
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
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
                            Read-only roster fed by <strong>Centralized Upload</strong>. Expand a row to see
                            protected data.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setReloadToken((t) => t + 1)}
                            className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-slate-600"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh
                        </button>
                        <button
                            onClick={() => exportToCSV(displayed)}
                            disabled={displayed.length === 0}
                            className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <Download className="w-4 h-4" /> Export Report
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
                        placeholder="Search name, employee #, position, area, supervisor, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white w-96 focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "px-3 py-2 text-xs font-medium rounded-lg border flex items-center gap-2 transition-all shadow-sm",
                        showFilters || activeFilterCount > 0
                            ? "bg-cobalt-blue text-white border-cobalt-blue"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Filter className="w-3.5 h-3.5" />
                    {activeFilterCount > 0 ? `${activeFilterCount} Filters Active` : "Filters"}
                </button>
                <span className="ml-auto text-xs text-slate-400 font-medium">
                    {displayed.length} records in current view · {activeCount} active of {employees.length} total
                </span>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="px-8 py-5 border-b border-slate-100 bg-white shadow-inner shrink-0">
                    <div className="grid grid-cols-6 gap-x-6 gap-y-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors"
                            >
                                <option value="">All Statuses</option>
                                {optionsFor.status.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Branch</label>
                            <select
                                value={filters.branchCode}
                                onChange={(e) => setFilters((p) => ({ ...p, branchCode: e.target.value }))}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors"
                            >
                                <option value="">All Branches</option>
                                {optionsFor.branchCode.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Area</label>
                            <select
                                value={filters.area}
                                onChange={(e) => setFilters((p) => ({ ...p, area: e.target.value }))}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors"
                            >
                                <option value="">All Areas</option>
                                {optionsFor.area.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Contract Type</label>
                            <select
                                value={filters.contractType}
                                onChange={(e) => setFilters((p) => ({ ...p, contractType: e.target.value }))}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors"
                            >
                                <option value="">All Contracts</option>
                                {optionsFor.contractType.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">English Level</label>
                            <select
                                value={filters.englishLevel}
                                onChange={(e) => setFilters((p) => ({ ...p, englishLevel: e.target.value }))}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-2 outline-none bg-slate-50/30 hover:bg-white transition-colors"
                            >
                                <option value="">All Levels</option>
                                {optionsFor.englishLevel.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={() => setFilters({ status: "", branchCode: "", area: "", contractType: "", englishLevel: "" })}
                            className="py-2.5 text-[10px] font-bold text-action-red border border-action-red/20 rounded hover:bg-action-red/5 transition-all uppercase tracking-[0.1em]"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse min-w-max">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2.5 w-10 bg-slate-50" />
                            {COLUMNS.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn("px-3 py-2.5 text-left border-l border-slate-100 whitespace-nowrap", col.width)}
                                >
                                    <button
                                        onClick={() => handleSort(col.key)}
                                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-navy-blue transition-colors"
                                    >
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map((emp, idx) => {
                            const isExpanded = expandedId === emp.id;
                            return (
                                <React.Fragment key={emp.id}>
                                    <tr
                                        onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                                        className={cn(
                                            "border-b border-slate-50 transition-colors hover:bg-cobalt-blue/5 cursor-pointer",
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                                            isExpanded && "bg-cobalt-blue/5",
                                            emp.status === "Inactive" && "opacity-60"
                                        )}
                                    >
                                        <td className="px-2 py-1.5 w-10 text-slate-400">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                        {COLUMNS.map((col) => {
                                            const text = cellText(emp, col);
                                            return (
                                                <td
                                                    key={col.key}
                                                    className={cn("px-3 py-2 align-middle border-l border-slate-50", col.width)}
                                                >
                                                    {col.key === "status" ? (
                                                        <span
                                                            className={cn(
                                                                "text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
                                                                STATUS_STYLES[text] ?? "bg-slate-100 text-slate-500 border-slate-200"
                                                            )}
                                                        >
                                                            {text}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={cn(
                                                                "text-xs truncate block",
                                                                col.key === "employeeNumber"
                                                                    ? "font-mono font-semibold text-cobalt-blue"
                                                                    : col.key === "fullName"
                                                                        ? "text-slate-800 font-medium"
                                                                        : "text-slate-700",
                                                                !text && "text-slate-300 italic"
                                                            )}
                                                        >
                                                            {text || "—"}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={COLUMNS.length + 1} className="p-0">
                                                <EmployeeDetail employee={emp} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {displayed.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length + 1} className="px-8 py-16 text-center text-sm text-slate-400">
                                    {isLoading
                                        ? "Loading employees…"
                                        : loadError
                                            ? loadError
                                            : employees.length === 0
                                                ? "No employees loaded yet. Use Centralized Upload to import the roster."
                                                : "No records match your current filters."}
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
                    Source: <strong>hr_active_roster</strong> (Centralized Upload). Employees missing from the
                    latest file are kept and marked <strong>Inactive</strong>.
                </p>
                <p className="text-[11px] text-slate-400">
                    Protected data is decrypted server-side and visible to administrators only.
                </p>
            </div>
        </div>
    );
};
