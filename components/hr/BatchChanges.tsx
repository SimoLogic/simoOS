"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
    X, Search, Download, Upload, ChevronLeft, ChevronRight,
    Users, Filter, CheckCircle2, Info, Building2,
    Pencil, Save, Camera, ChevronDown, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    FullEmployeeRecord, AREAS_EMPRESA, TIPOS_CONTRATO, TIPOS_SALARIO,
    EPS_OPTIONS, ARL_OPTIONS, AFP_OPTIONS, CCF_OPTIONS,
} from "@/lib/hr-types";
import {
    getEmployeesAction as getEmployees,
    updateEmployeeAction as updateEmployee,
} from "@/app/actions/hr-actions";
import {
    EXCEL_COLUMN_MAP, parseImportFile, ImportAuditResult,
} from "@/lib/excel-import";
import { ImportReviewModal } from "./ImportReviewModal";
import * as XLSX from "xlsx";
import { useTenant } from "@/lib/tenant-context";
import { getActiveTenants } from "@/lib/tenant-store";

// ─── Non-editable locked keys (identity / legal data) ────────────────────────

const LOCKED_KEYS = new Set([
    "eid",
    "tenant_id",
    "maestro.primer_nombre",
    "maestro.otros_nombres",
    "maestro.primer_apellido",
    "maestro.segundo_apellido",
    "maestro.fecha_nacimiento",
    "maestro.numero_identificacion",
    "maestro.tipo_documento_id",
]);

// ─── Column Definitions ───────────────────────────────────────────────────────
// Manually ordered to place job_title right after segundo_apellido (R3).
// foto_url is NOT included here — it renders as a separate fixed column.

const TABLE_COLUMNS: { key: string; label: string; locked: boolean; type?: "text" | "select" | "number"; options?: string[] }[] = [
    // Identity (locked)
    { key: "eid", label: "EID", locked: true },
    { key: "tenant_id", label: "Tenant Code", locked: true },
    { key: "maestro.primer_nombre", label: "First Name", locked: true },
    { key: "maestro.otros_nombres", label: "Middle Name", locked: true },
    { key: "maestro.primer_apellido", label: "First Last Name", locked: true },
    { key: "maestro.segundo_apellido", label: "Second Last Name", locked: true },
    // Job Title immediately after names (R3)
    { key: "historialLaboral.job_title", label: "Job Title", locked: false, type: "text" },
    // Remaining identity (locked)
    { key: "maestro.tipo_documento_id", label: "Doc Type", locked: true },
    { key: "maestro.numero_identificacion", label: "ID Number", locked: true },
    { key: "maestro.fecha_nacimiento", label: "Date of Birth", locked: true },
    { key: "maestro.genero", label: "Gender", locked: false, type: "select", options: ["M", "F", "X"] },
    { key: "maestro.email_personal", label: "Personal Email", locked: false, type: "text" },
    { key: "maestro.municipio_dane", label: "Municipality", locked: false, type: "text" },
    { key: "maestro.direccion_residencia", label: "Address", locked: false, type: "text" },
    // Status
    { key: "status", label: "Status", locked: false, type: "select", options: ["Active", "Inactive", "On Leave", "Terminated"] },
    // Laboral (editable)
    { key: "historialLaboral.fecha_inicio", label: "Hire Date", locked: false, type: "text" },
    { key: "historialLaboral.tipo_contrato", label: "Contract Type", locked: false, type: "select", options: TIPOS_CONTRATO.map(t => t.label) },
    { key: "historialLaboral.entidad_legal", label: "Local Entity", locked: false, type: "text" },
    { key: "historialLaboral.tipo_salario", label: "Salary Type", locked: false, type: "select", options: TIPOS_SALARIO.map(t => t.label) },
    { key: "historialLaboral.salario_base", label: "Base Salary", locked: false, type: "number" },
    { key: "historialLaboral.procedimiento_renta", label: "Tax Procedure", locked: false, type: "select", options: ["1", "2"] },
    { key: "historialLaboral.area", label: "Area", locked: false, type: "select", options: AREAS_EMPRESA },
    { key: "historialLaboral.sub_area", label: "Sub-Area", locked: false, type: "text" },
    { key: "historialLaboral.centro_costo", label: "Cost Center", locked: false, type: "text" },
    { key: "historialLaboral.nombre_centro_costo", label: "Cost Center Name", locked: false, type: "text" },
    { key: "historialLaboral.branch", label: "Branch", locked: false, type: "text" },
    { key: "historialLaboral.cliente", label: "Client", locked: false, type: "text" },
    { key: "historialLaboral.project", label: "Project", locked: false, type: "text" },
    { key: "historialLaboral.digito_dedicacion", label: "Dedication %", locked: false, type: "number" },
    { key: "historialLaboral.direct_leader", label: "Direct Leader", locked: false, type: "text" },
    // Social Security (editable)
    { key: "afiliaciones.eps_nombre", label: "EPS", locked: false, type: "select", options: EPS_OPTIONS.map(o => o.nombre) },
    { key: "afiliaciones.afp_nombre", label: "AFP", locked: false, type: "select", options: AFP_OPTIONS.map(o => o.nombre) },
    { key: "afiliaciones.arl_nombre", label: "ARL", locked: false, type: "select", options: ARL_OPTIONS.map(o => o.nombre) },
    { key: "afiliaciones.ccf_nombre", label: "CCF", locked: false, type: "select", options: CCF_OPTIONS.map(o => o.nombre) },
    { key: "afiliaciones.nivel_riesgo_arl", label: "ARL Risk", locked: false, type: "select", options: ["1", "2", "3", "4", "5"] },
    { key: "afiliaciones.subtipo_cotizante", label: "PILA Subtype", locked: false, type: "text" },
    // SST
    { key: "sst.talla_camisa", label: "Shirt Size", locked: false, type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "sst.talla_pantalon", label: "Pants Size", locked: false, type: "select", options: ["28", "30", "32", "34", "36", "38", "40", "42"] },
    { key: "sst.talla_calzado", label: "Shoe Size", locked: false, type: "number" },
    { key: "sst.tipo_sangre", label: "Blood Type", locked: false, type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
    { key: "sst.contacto_emergencia", label: "Emergency Contact", locked: false, type: "text" },
    { key: "sst.telefono_emergencia", label: "Emergency Phone", locked: false, type: "text" },
    // Corporate
    { key: "email_corporativo", label: "Corporate Email", locked: false, type: "text" },
];

// Export columns = TABLE_COLUMNS minus foto_url (which isn't in the list anyway)
// We explicitly match to EXCEL_COLUMN_MAP to ensure export parity with import template.
const EXPORT_COLUMNS = Object.entries(EXCEL_COLUMN_MAP).map(([, { key, label }]) => ({ key, label }));

// ─── Value Extractor ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getVal = (obj: any, path: string): unknown =>
    path.split(".").reduce((a, p) => (a != null ? a[p] : undefined), obj);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setVal = (obj: any, path: string, value: unknown): any => {
    const parts = path.split(".");
    if (parts.length === 1) return { ...obj, [path]: value };
    const [head, ...rest] = parts;
    return { ...obj, [head]: setVal(obj[head] ?? {}, rest.join("."), value) };
};

const displayVal = (emp: FullEmployeeRecord, key: string): string => {
    const v = getVal(emp, key);
    if (v == null || v === "") return "—";
    if (typeof v === "number") return v.toLocaleString("en-US");
    return String(v);
};

// ─── Merge edit draft into FullEmployeeRecord ─────────────────────────────────

const applyEdits = (emp: FullEmployeeRecord, draft: Record<string, unknown>): FullEmployeeRecord => {
    let result: Record<string, unknown> = JSON.parse(JSON.stringify(emp)); // deep clone
    for (const [path, val] of Object.entries(draft)) {
        result = setVal(result, path, val);
    }
    return result as unknown as FullEmployeeRecord;
};

// ─── Multi-Select Filter Component ───────────────────────────────────────────

interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (vals: string[]) => void;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ label, options, selected, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggle = (val: string) => {
        if (selected.includes(val)) onChange(selected.filter(s => s !== val));
        else onChange([...selected, val]);
    };

    const clearable = selected.length > 0;

    return (
        <div ref={ref} className="relative flex items-center gap-1">
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all",
                    clearable
                        ? "bg-cobalt-blue text-white border-cobalt-blue shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-cobalt-blue/40"
                )}
            >
                <span className="uppercase tracking-wider">{label}</span>
                {clearable && (
                    <span className="bg-white/25 text-white text-[9px] font-bold px-1 rounded-full ml-0.5">
                        {selected.length}
                    </span>
                )}
                <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
            </button>

            {clearable && (
                <button
                    onClick={() => onChange([])}
                    className="text-cobalt-blue hover:text-action-red transition-colors"
                    title="Clear filter"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[180px] max-h-[260px] overflow-y-auto">
                    {options.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400 italic">No options</p>
                    ) : (
                        options.map(opt => (
                            <label
                                key={opt}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-cobalt-blue/5 transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={() => toggle(opt)}
                                    className="accent-cobalt-blue w-3.5 h-3.5 rounded"
                                />
                                <span className="text-slate-700 font-medium truncate">{opt}</span>
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Inline Editable Cell ─────────────────────────────────────────────────────

interface EditCellProps {
    col: (typeof TABLE_COLUMNS)[number];
    value: unknown;
    editing: boolean;
    onChange: (path: string, val: unknown) => void;
}

const EditCell: React.FC<EditCellProps> = ({ col, value, editing, onChange }) => {
    const display = value == null || value === "" ? "—" : String(value);

    if (!editing || col.locked) {
        return (
            <span
                className={cn(
                    "text-[11px] block truncate max-w-[180px]",
                    col.locked ? "text-slate-400" : "text-slate-700",
                    col.key === "eid" && "font-mono font-bold text-cobalt-blue",
                    col.key === "historialLaboral.salario_base" && "font-mono text-slate-600"
                )}
            >
                {col.key === "historialLaboral.salario_base" && value && value !== "—" ? `$${Number(value).toLocaleString("en-US")}` : display}
            </span>
        );
    }

    if (col.type === "select" && col.options) {
        return (
            <select
                value={String(value ?? "")}
                onChange={e => onChange(col.key, e.target.value)}
                className="text-[11px] border border-cobalt-blue/40 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-cobalt-blue w-full max-w-[180px]"
            >
                <option value="">—</option>
                {col.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }

    if (col.type === "number") {
        return (
            <input
                type="number"
                value={String(value ?? "")}
                onChange={e => onChange(col.key, e.target.value === "" ? 0 : Number(e.target.value))}
                className="text-[11px] border border-cobalt-blue/40 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-cobalt-blue w-full max-w-[120px]"
            />
        );
    }

    return (
        <input
            type="text"
            value={String(value ?? "")}
            onChange={e => onChange(col.key, e.target.value)}
            className="text-[11px] border border-cobalt-blue/40 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-cobalt-blue w-full max-w-[180px]"
        />
    );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Main Component ───────────────────────────────────────────────────────────

interface BatchChangesAppProps {
    onClose: () => void;
}

export const BatchChangesApp: React.FC<BatchChangesAppProps> = ({ onClose }) => {
    const { currentTenant } = useTenant();
    const hasActiveTenant = !!currentTenant;
    const [anyTenantExists, setAnyTenantExists] = useState(false);
    const [employees, setEmployees] = useState<FullEmployeeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const active = await getActiveTenants();
            setAnyTenantExists(active.length > 0);
            if (!currentTenant) {
                setEmployees([]);
            } else {
                const all = await getEmployees(currentTenant.tenant_id);
                setEmployees(all);
            }
            setIsLoading(false);
        };
        init();
    }, [currentTenant]);

    // ── Inline Edit State ─────────────────────────────────────────────────────
    // Key: eid → draft edits (partial field paths)
    const [editingRows, setEditingRows] = useState<Record<string, Record<string, unknown>>>({});
    const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());

    const isEditing = (eid: string) => eid in editingRows;

    const startEdit = (emp: FullEmployeeRecord) => {
        setEditingRows(prev => ({ ...prev, [emp.eid]: {} }));
        setSavedRows(prev => { const n = new Set(prev); n.delete(emp.eid); return n; });
    };

    const cancelEdit = (eid: string) => {
        setEditingRows(prev => { const n = { ...prev }; delete n[eid]; return n; });
    };

    const updateDraft = (eid: string, path: string, val: unknown) => {
        setEditingRows(prev => ({ ...prev, [eid]: { ...prev[eid], [path]: val } }));
    };

    const handleRowSave = useCallback(async (eid: string) => {
        if (!currentTenant) return;
        const emp = employees.find(e => e.eid === eid);
        if (!emp) return;

        const draft = editingRows[eid] ?? {};
        const updated = applyEdits(emp, draft);

        setSavingRows(prev => new Set(prev).add(eid));
        try {
            const result = await updateEmployee(updated, currentTenant.tenant_id);
            if (result.success && result.data) {
                setEmployees(result.data);
                showToast(`✓ ${emp.maestro.primer_nombre} saved successfully`);
            }
            setEditingRows(prev => { const n = { ...prev }; delete n[eid]; return n; });
            setSavedRows(prev => new Set(prev).add(eid));
            setTimeout(() => setSavedRows(prev => { const n = new Set(prev); n.delete(eid); return n; }), 3000);
        } catch (err: unknown) {
            showToast(`Error saving: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setSavingRows(prev => { const n = new Set(prev); n.delete(eid); return n; });
        }
    }, [currentTenant, employees, editingRows]);

    // ── Photo editing ─────────────────────────────────────────────────────────
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [photoTargetEid, setPhotoTargetEid] = useState<string | null>(null);

    const handlePhotoClick = (eid: string) => {
        if (!isEditing(eid)) return;
        setPhotoTargetEid(eid);
        photoInputRef.current?.click();
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !photoTargetEid) return;
        if (file.size > 5 * 1024 * 1024) { showToast("Photo exceeds 5MB limit"); return; }
        const reader = new FileReader();
        reader.onload = ev => {
            updateDraft(photoTargetEid, "foto_url", ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        setPhotoTargetEid(null);
    };

    // ── Filters ───────────────────────────────────────────────────────────────
    const [fStatus, setFStatus] = useState<string[]>([]);
    const [fArea, setFArea] = useState<string[]>([]);
    const [fSubArea, setFSubArea] = useState<string[]>([]);
    const [fCostCenter, setFCostCenter] = useState<string[]>([]);
    const [fCostCenterName, setFCostCenterName] = useState<string[]>([]);
    const [fDirectLeader, setFDirectLeader] = useState<string[]>([]);
    const [fJobTitle, setFJobTitle] = useState<string[]>([]);
    const [fEPS, setFEPS] = useState<string[]>([]);
    const [fARL, setFARL] = useState<string[]>([]);
    const [fCCF, setFCCF] = useState<string[]>([]);
    const [search, setSearch] = useState("");

    // ── Pagination ────────────────────────────────────────────────────────────
    const [page, setPage] = useState(1);

    // ── Toast ─────────────────────────────────────────────────────────────────
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // ── Derived filter options (dynamic from dataset) ─────────────────────────
    const distinctVals = useCallback((getter: (e: FullEmployeeRecord) => string) => {
        const s = new Set(employees.map(getter).filter(Boolean));
        return Array.from(s).sort();
    }, [employees]);

    const optStatus = ["Active", "Inactive", "On Leave", "Terminated"];
    const optArea = useMemo(() => distinctVals(e => e.historialLaboral.area), [distinctVals]);
    const optSubArea = useMemo(() => distinctVals(e => e.historialLaboral.sub_area), [distinctVals]);
    const optCC = useMemo(() => distinctVals(e => e.historialLaboral.centro_costo), [distinctVals]);
    const optCCName = useMemo(() => distinctVals(e => e.historialLaboral.nombre_centro_costo), [distinctVals]);
    const optLeader = useMemo(() => distinctVals(e => e.historialLaboral.direct_leader), [distinctVals]);
    const optJobTitle = useMemo(() => distinctVals(e => e.historialLaboral.job_title), [distinctVals]);
    const optEPS = useMemo(() => distinctVals(e => e.afiliaciones?.eps_nombre ?? ""), [distinctVals]);
    const optARL = useMemo(() => distinctVals(e => e.afiliaciones?.arl_nombre ?? ""), [distinctVals]);
    const optCCF = useMemo(() => distinctVals(e => e.afiliaciones?.ccf_nombre ?? ""), [distinctVals]);

    // ── Filtered data (combined multi-select AND/OR logic) ────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return employees.filter(emp => {
            if (fStatus.length > 0 && !fStatus.includes(emp.status)) return false;
            if (fArea.length > 0 && !fArea.includes(emp.historialLaboral.area)) return false;
            if (fSubArea.length > 0 && !fSubArea.includes(emp.historialLaboral.sub_area)) return false;
            if (fCostCenter.length > 0 && !fCostCenter.includes(emp.historialLaboral.centro_costo)) return false;
            if (fCostCenterName.length > 0 && !fCostCenterName.includes(emp.historialLaboral.nombre_centro_costo)) return false;
            if (fDirectLeader.length > 0 && !fDirectLeader.includes(emp.historialLaboral.direct_leader)) return false;
            if (fJobTitle.length > 0 && !fJobTitle.includes(emp.historialLaboral.job_title)) return false;
            if (fEPS.length > 0 && !fEPS.includes(emp.afiliaciones?.eps_nombre ?? "")) return false;
            if (fARL.length > 0 && !fARL.includes(emp.afiliaciones?.arl_nombre ?? "")) return false;
            if (fCCF.length > 0 && !fCCF.includes(emp.afiliaciones?.ccf_nombre ?? "")) return false;
            if (q) {
                const hay = [
                    emp.eid,
                    emp.maestro.primer_nombre,
                    emp.maestro.otros_nombres,
                    emp.maestro.primer_apellido,
                    emp.maestro.segundo_apellido,
                    emp.maestro.numero_identificacion,
                    emp.historialLaboral.area,
                    emp.historialLaboral.direct_leader,
                    emp.historialLaboral.job_title,
                    emp.email_corporativo ?? "",
                ].join(" ").toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [employees, fStatus, fArea, fSubArea, fCostCenter, fCostCenterName, fDirectLeader, fJobTitle, fEPS, fARL, fCCF, search]);

    const hasActiveFilters = fStatus.length + fArea.length + fSubArea.length + fCostCenter.length +
        fCostCenterName.length + fDirectLeader.length + fJobTitle.length + fEPS.length + fARL.length + fCCF.length > 0;

    const clearAllFilters = () => {
        setFStatus([]); setFArea([]); setFSubArea([]); setFCostCenter([]);
        setFCostCenterName([]); setFDirectLeader([]); setFJobTitle([]);
        setFEPS([]); setFARL([]); setFCCF([]); setSearch(""); setPage(1);
    };

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // ── Export (filtered rows only, no photo column) ──────────────────────────
    const handleExport = useCallback(() => {
        const headers = EXPORT_COLUMNS.map(c => c.label);
        const rows = filtered.map(emp =>
            EXPORT_COLUMNS.map(c => {
                const v = getVal(emp, c.key);
                return v != null ? String(v) : "";
            })
        );
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 2, 14) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Batch Template");
        const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `Batch_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        showToast(`Exported ${filtered.length} filtered rows · Photo column excluded`);
    }, [filtered, showToast]);

    // ── Import ────────────────────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [auditResult, setAuditResult] = useState<ImportAuditResult | null>(null);
    const [importing, setImporting] = useState(false);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setImporting(true);
        try {
            const result = await parseImportFile(file, currentTenant?.tenant_id);
            if (result.totalRows === 0) { showToast("The file contains no data rows.", "error"); setImporting(false); return; }
            setAuditResult(result);
        } catch (err) {
            console.error("Import parse error:", err);
            showToast("Failed to read file. Please use .xlsx format.", "error");
        }
        setImporting(false);
    }, [showToast, currentTenant]);

    const handleAuditClose = useCallback(async (committed: boolean) => {
        setAuditResult(null);
        if (committed && currentTenant) {
            const fresh = await getEmployees(currentTenant.tenant_id);
            setEmployees(fresh);
            showToast("Changes imported and saved successfully.");
        }
    }, [showToast, currentTenant]);

    // ── Tenant Blocker ────────────────────────────────────────────────────────
    if (!hasActiveTenant) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
                    <div className="px-6 py-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-7 h-7 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-navy-blue mb-2">No Active Tenant</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {anyTenantExists
                                ? "Please select an active tenant from the header before using Batch Changes."
                                : "You must create and select a Tenant before using Batch Changes. Go to Administrator → Multi-Tenant Set Up."}
                        </p>
                    </div>
                    <div className="px-6 pb-6">
                        <button onClick={onClose} className="w-full px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[99vw] max-w-[99vw] max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cobalt-blue/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-cobalt-blue" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HR</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Payroll Changes</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">Batch Changes</span>
                            </div>
                            <h2 className="text-base font-bold text-navy-blue leading-tight">Batch Changes</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {toast && (
                            <span className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border animate-fade-in",
                                toast.type === "error"
                                    ? "text-action-red bg-red-50 border-red-200"
                                    : "text-emerald-600 bg-emerald-50 border-emerald-200"
                            )}>
                                {toast.type === "error" ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                {toast.msg}
                            </span>
                        )}
                        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Info Banner ── */}
                <div className="px-6 py-2.5 bg-cobalt-blue/5 border-b border-cobalt-blue/10 shrink-0">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-cobalt-blue mt-0.5 shrink-0" />
                        <p className="text-xs text-cobalt-blue/80 leading-relaxed">
                            <span className="font-semibold">Click the pencil icon</span> on any row to edit it inline. <span className="font-semibold">Locked fields</span> (name, ID, DOB) are read-only and will be rejected on import if changed.
                            <span className="font-semibold ml-1">Download Template</span> exports only filtered rows (no photo). The same template is accepted for <span className="font-semibold">Batch Import</span>.
                        </p>
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                    <div className="flex items-start gap-2 flex-wrap">
                        <div className="flex items-center gap-1 mt-0.5">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filters</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            <MultiSelectFilter label="Status" options={optStatus} selected={fStatus} onChange={v => { setFStatus(v); setPage(1); }} />
                            <MultiSelectFilter label="Area" options={optArea} selected={fArea} onChange={v => { setFArea(v); setPage(1); }} />
                            <MultiSelectFilter label="Sub-Area" options={optSubArea} selected={fSubArea} onChange={v => { setFSubArea(v); setPage(1); }} />
                            <MultiSelectFilter label="Cost Center" options={optCC} selected={fCostCenter} onChange={v => { setFCostCenter(v); setPage(1); }} />
                            <MultiSelectFilter label="CC Name" options={optCCName} selected={fCostCenterName} onChange={v => { setFCostCenterName(v); setPage(1); }} />
                            <MultiSelectFilter label="Direct Leader" options={optLeader} selected={fDirectLeader} onChange={v => { setFDirectLeader(v); setPage(1); }} />
                            <MultiSelectFilter label="Job Title" options={optJobTitle} selected={fJobTitle} onChange={v => { setFJobTitle(v); setPage(1); }} />
                            <MultiSelectFilter label="EPS" options={optEPS} selected={fEPS} onChange={v => { setFEPS(v); setPage(1); }} />
                            <MultiSelectFilter label="ARL" options={optARL} selected={fARL} onChange={v => { setFARL(v); setPage(1); }} />
                            <MultiSelectFilter label="CCF" options={optCCF} selected={fCCF} onChange={v => { setFCCF(v); setPage(1); }} />
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            {hasActiveFilters && (
                                <button onClick={clearAllFilters} className="text-[11px] font-semibold text-action-red hover:underline flex items-center gap-1">
                                    <X className="w-3 h-3" /> Clear all
                                </button>
                            )}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search name, EID, ID..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue w-48 transition-all"
                                />
                            </div>
                            <div className="w-px h-5 bg-slate-200" />
                            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cobalt-blue bg-cobalt-blue/10 border border-cobalt-blue/20 rounded-lg hover:bg-cobalt-blue/15 transition-all">
                                <Download className="w-3.5 h-3.5" />
                                Download Template
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-blue rounded-lg hover:bg-navy-blue/90 transition-all shadow-sm disabled:opacity-50"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {importing ? "Reading..." : "Batch Import"}
                            </button>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} hidden />
                        </div>
                    </div>
                </div>

                {/* ── Row count ── */}
                <div className="px-6 py-1.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0">
                    <span>
                        <span className="font-semibold text-slate-600">{filtered.length}</span> employee{filtered.length !== 1 ? "s" : ""} match filters
                        {filtered.length !== employees.length && (
                            <span className="ml-1 text-slate-300">({employees.length} total)</span>
                        )}
                    </span>
                    <span>Page <span className="font-semibold text-slate-600">{safePage}</span> / <span className="font-semibold text-slate-600">{totalPages}</span> · {PAGE_SIZE} per page</span>
                </div>

                {/* ── Photo input (hidden, shared across row avatars) ── */}
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/svg+xml" onChange={handlePhotoSelect} hidden />

                {/* ── Data Table ── */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading employees...</div>
                    ) : (
                        <table className="w-full text-xs border-collapse" style={{ minWidth: `${(TABLE_COLUMNS.length * 150) + 220}px` }}>
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {/* Edit / Save */}
                                    <th className="px-2 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 border-r border-slate-100 w-10" />
                                    {/* Photo */}
                                    <th className="px-2 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 bg-slate-50">
                                        <Camera className="w-3 h-3 mx-auto" />
                                    </th>
                                    {/* Data columns */}
                                    {TABLE_COLUMNS.map(col => (
                                        <th
                                            key={col.key}
                                            className={cn(
                                                "px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left whitespace-nowrap",
                                                col.locked ? "text-slate-300" : "text-slate-500"
                                            )}
                                        >
                                            {col.label}
                                            {col.locked && <span className="ml-1 text-[8px] text-slate-300">🔒</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS.length + 3} className="px-6 py-16 text-center text-slate-400 text-sm">
                                            {employees.length === 0
                                                ? "No employees in database. Use Employee Intake or Batch Import."
                                                : "No employees match the active filters."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((emp, idx) => {
                                        const editing = isEditing(emp.eid);
                                        const saving = savingRows.has(emp.eid);
                                        const saved = savedRows.has(emp.eid);
                                        const draft = editingRows[emp.eid] ?? {};

                                        // Merge draft onto emp for display
                                        const display = editing ? applyEdits(emp, draft) : emp;
                                        const fotoDisplay = (draft["foto_url"] as string | undefined) ?? emp.foto_url;
                                        const initials = (emp.maestro.primer_nombre?.[0] ?? "") + (emp.maestro.primer_apellido?.[0] ?? "");

                                        return (
                                            <tr
                                                key={emp.eid}
                                                className={cn(
                                                    "border-b border-slate-50 transition-colors",
                                                    editing
                                                        ? "bg-cobalt-blue/5 shadow-[inset_2px_0_0_0_#3B82F6]"
                                                        : saved
                                                            ? "bg-emerald-50/50"
                                                            : idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                                )}
                                            >
                                                {/* Edit / Save button */}
                                                <td className="px-2 py-1.5 sticky left-0 bg-inherit z-10 border-r border-slate-100">
                                                    {editing ? (
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => handleRowSave(emp.eid)}
                                                                disabled={saving}
                                                                title="Save changes"
                                                                className="w-7 h-7 rounded-lg bg-cobalt-blue text-white flex items-center justify-center hover:bg-cobalt-blue/80 transition-all shadow-md shadow-cobalt-blue/20 disabled:opacity-60"
                                                            >
                                                                <Save className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => cancelEdit(emp.eid)}
                                                                title="Cancel edit"
                                                                className="w-7 h-7 rounded-lg text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : saved ? (
                                                        <div className="w-7 h-7 flex items-center justify-center">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEdit(emp)}
                                                            title="Edit this row"
                                                            className="w-7 h-7 rounded-lg text-slate-300 flex items-center justify-center hover:text-cobalt-blue hover:bg-cobalt-blue/10 transition-all"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Photo thumbnail */}
                                                <td className="px-2 py-1.5 w-10">
                                                    <div
                                                        onClick={() => handlePhotoClick(emp.eid)}
                                                        className={cn(
                                                            "w-7 h-7 rounded-full overflow-hidden border flex items-center justify-center bg-slate-100 flex-shrink-0 transition-all",
                                                            editing ? "border-cobalt-blue/40 cursor-pointer hover:ring-2 hover:ring-cobalt-blue/30" : "border-slate-200"
                                                        )}
                                                        title={editing ? "Click to change photo" : ""}
                                                    >
                                                        {fotoDisplay ? (
                                                            <img src={fotoDisplay} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-slate-400">{initials}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Data cells */}
                                                {TABLE_COLUMNS.map(col => (
                                                    <td
                                                        key={col.key}
                                                        className={cn(
                                                            "px-2 py-1.5 align-middle",
                                                            editing && !col.locked ? "min-w-[140px]" : ""
                                                        )}
                                                    >
                                                        <EditCell
                                                            col={col}
                                                            value={getVal(display, col.key)}
                                                            editing={editing}
                                                            onChange={(path, val) => updateDraft(emp.eid, path, val)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination Footer ── */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-400">
                        Showing rows <span className="font-semibold text-slate-600">{filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}</span>
                        –<span className="font-semibold text-slate-600">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>
                        {" "}of <span className="font-semibold text-slate-600">{filtered.length}</span>
                        {hasActiveFilters && <span className="text-cobalt-blue font-semibold ml-1">(filtered)</span>}
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 7) pageNum = i + 1;
                            else if (safePage <= 4) pageNum = i + 1;
                            else if (safePage >= totalPages - 3) pageNum = totalPages - 6 + i;
                            else pageNum = safePage - 3 + i;
                            return (
                                <button key={pageNum} onClick={() => setPage(pageNum)} className={cn("w-8 h-8 rounded-lg text-xs font-semibold transition-all", pageNum === safePage ? "bg-cobalt-blue text-white shadow-sm" : "text-slate-500 hover:bg-slate-200")}>
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Audit Modal ── */}
            {auditResult && (
                <ImportReviewModal
                    auditResult={auditResult}
                    onClose={handleAuditClose}
                />
            )}
        </div>
    );
};
