"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus, Save, ToggleLeft, ToggleRight, Edit2, Search,
    MapPin, Building2, Users, ChevronDown, X, Check,
    AlertCircle, Globe, Home, Layers, GitBranch, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Branch, BranchLeaseData, HierarchyLevel, FieldOfficeType,
    US_STATES, LEASE_RENEWAL_OPTIONS, blankBranch, blankLeaseData, validParentLevel
} from "@/lib/branch-types";
import {
    getBranchesAction, saveBranchAction, toggleBranchStatusAction,
    getBranchManagersAction, checkCircularReferenceAction
} from "@/app/actions/branch-actions";
import { useTenant } from "@/lib/tenant-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type DirtyMap = Record<string, boolean>;
type SavedMap = Record<string, boolean>;
type ToastEntry = { id: string; message: string; type: "success" | "error" | "warning" };

// ─── State Licensing Popup ────────────────────────────────────────────────────

const StateLicensingPopup: React.FC<{
    selected: string[];
    onChange: (s: string[]) => void;
    onClose: () => void;
}> = ({ selected, onChange, onClose }) => {
    const [query, setQuery] = useState("");
    const [local, setLocal] = useState<string[]>([...selected]);

    const filtered = US_STATES.filter(s =>
        (s.code || "").toLowerCase().includes(query.toLowerCase()) ||
        (s.name || "").toLowerCase().includes(query.toLowerCase())
    );

    const toggle = (code: string) => {
        setLocal(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between px-6 py-4 bg-navy-blue text-white">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <h3 className="text-sm font-bold">State Licensing</h3>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{local.length} selected</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-4 pt-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search state..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 px-4 py-3 max-h-72 overflow-y-auto">
                    {filtered.map(s => (
                        <button
                            key={s.code}
                            onClick={() => toggle(s.code)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                                local.includes(s.code)
                                    ? "bg-cobalt-blue text-white border-cobalt-blue shadow-sm"
                                    : "bg-slate-50 text-slate-600 border-slate-100 hover:border-cobalt-blue/30 hover:bg-cobalt-blue/5"
                            )}
                        >
                            {local.includes(s.code) ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 shrink-0" />}
                            <span className="font-bold">{s.code}</span>
                            <span className="truncate hidden sm:block opacity-70">{s.name}</span>
                        </button>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                    <button onClick={() => setLocal([])} className="text-xs text-slate-400 hover:text-action-red transition-colors">Clear All</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                        <button
                            onClick={() => { onChange(local); onClose(); }}
                            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-lg transition-colors"
                        >
                            <Check className="w-3.5 h-3.5" /> Apply Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Lease Data Popup ─────────────────────────────────────────────────────────

const LeaseDataPopup: React.FC<{
    data: BranchLeaseData;
    currency: string;
    onChange: (d: BranchLeaseData) => void;
    onClose: () => void;
}> = ({ data, currency, onChange, onClose }) => {
    const [local, setLocal] = useState<BranchLeaseData>({ ...data });
    const set = <K extends keyof BranchLeaseData>(k: K, v: BranchLeaseData[K]) =>
        setLocal(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between px-6 py-4 bg-navy-blue text-white">
                    <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        <h3 className="text-sm font-bold">Lease Information</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Landlord Name</label>
                        <input type="text" value={local.landlord_name} onChange={e => set("landlord_name", e.target.value)}
                            placeholder="ABC Properties LLC"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Rent ({currency})</label>
                            <input type="number" min={0} value={local.monthly_rent || ""}
                                onChange={e => set("monthly_rent", parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Renewal Period</label>
                            <select value={local.renewal} onChange={e => set("renewal", e.target.value as any)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue bg-white">
                                {LEASE_RENEWAL_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div onClick={() => set("sub_lease", !local.sub_lease)}
                                className={cn("w-10 h-5 rounded-full transition-all relative", local.sub_lease ? "bg-cobalt-blue" : "bg-slate-200")}>
                                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow", local.sub_lease ? "left-5" : "left-0.5")} />
                            </div>
                            <span className="text-xs font-medium text-slate-600">Sub-Lease</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div onClick={() => set("utilities_included", !local.utilities_included)}
                                className={cn("w-10 h-5 rounded-full transition-all relative", local.utilities_included ? "bg-emerald-500" : "bg-slate-200")}>
                                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow", local.utilities_included ? "left-5" : "left-0.5")} />
                            </div>
                            <span className="text-xs font-medium text-slate-600">Utilities Included</span>
                        </label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={() => { onChange(local); onClose(); }}
                        className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-lg transition-colors">
                        <Check className="w-3.5 h-3.5" /> Save Lease Info
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Branch Form (Side Drawer) ────────────────────────────────────────────────

const BranchForm: React.FC<{
    branch: Partial<Branch>;
    allBranches: Branch[];
    managers: { eid: string; full_name: string; title: string }[];
    tenantId: string;
    currency: string;
    onClose: () => void;
    onSaved: () => void;
}> = ({ branch, allBranches, managers, tenantId, currency, onClose, onSaved }) => {
    const [data, setData] = useState<Partial<Branch>>({
        tenant_id: tenantId,
        branch_code: "",
        branch_name: null,
        branch_manager_eid: null,
        states_licensed: [],
        field_office_type: "Physical",
        office_address: null,
        has_lease: false,
        lease_data: blankLeaseData(currency),
        hierarchy_level: "Branch",
        parent_branch_id: null,
        is_active: true,
        ...branch,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showStates, setShowStates] = useState(false);
    const [showLease, setShowLease] = useState(false);
    const [circularAlert, setCircularAlert] = useState(false);

    const set = <K extends keyof Branch>(k: K, v: Branch[K]) => setData(p => ({ ...p, [k]: v }));

    // Filter valid parents based on hierarchy level + circular references
    const validParentLvl = validParentLevel(data.hierarchy_level as HierarchyLevel);
    const potentialParents = allBranches.filter(b =>
        b.hierarchy_level === validParentLvl &&
        b.is_active &&
        b.id !== data.id
    );

    const handleParentChange = async (parentId: string) => {
        setCircularAlert(false);
        if (data.id && parentId) {
            const { circular } = await checkCircularReferenceAction(data.id, parentId);
            if (circular) { setCircularAlert(true); return; }
        }
        set("parent_branch_id", parentId || null);
    };

    const handleSave = async () => {
        if (!data.branch_code?.trim()) { setError("Branch Code is required."); return; }
        if (!data.branch_manager_eid) { setError("Branch Manager is required."); return; }
        setSaving(true); setError(null);
        const result = await saveBranchAction(data as Branch);
        setSaving(false);
        if (result.success) onSaved();
        else setError(result.error || "Save failed.");
    };

    const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all bg-white";
    const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-widest";

    return (
        <>
            {showStates && <StateLicensingPopup selected={data.states_licensed || []} onChange={v => set("states_licensed", v)} onClose={() => setShowStates(false)} />}
            {showLease && <LeaseDataPopup data={data.lease_data || blankLeaseData(currency)} currency={currency} onChange={v => set("lease_data", v)} onClose={() => setShowLease(false)} />}

            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-6 py-4 bg-navy-blue text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <h3 className="text-sm font-bold">{branch.id ? "Edit Branch" : "New Branch"}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}

                    {/* Hierarchy Type */}
                    <div className="space-y-2">
                        <label className={labelCls}>Hierarchy Level</label>
                        <div className="flex gap-2">
                            {(["Division", "Region", "Branch"] as HierarchyLevel[]).map(lvl => (
                                <button key={lvl} onClick={() => { set("hierarchy_level", lvl); set("parent_branch_id", null); }}
                                    className={cn("flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                                        data.hierarchy_level === lvl
                                            ? "bg-navy-blue text-white border-navy-blue"
                                            : "bg-slate-50 text-slate-500 border-slate-200 hover:border-cobalt-blue/40")}>
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Branch Code + Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Branch Code *</label>
                            <input type="text" value={data.branch_code || ""} onChange={e => set("branch_code", e.target.value.toUpperCase())}
                                placeholder="e.g. BR-001" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Branch Name</label>
                            <input type="text" value={data.branch_name || ""} onChange={e => set("branch_name", e.target.value || null)}
                                placeholder="Optional" className={inputCls} />
                        </div>
                    </div>

                    {/* Branch Manager */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Branch Manager *</label>
                        <select value={data.branch_manager_eid || ""} onChange={e => set("branch_manager_eid", e.target.value || null)} className={inputCls}>
                            <option value="">— Select Manager —</option>
                            {managers.map(m => (
                                <option key={m.eid} value={m.eid}>{m.full_name} ({m.title})</option>
                            ))}
                            {managers.length === 0 && <option disabled>No eligible managers found in HC Master</option>}
                        </select>
                        <p className="text-[10px] text-slate-400 pl-1">Showing employees with BM / NPPM / Producing BM roles</p>
                    </div>

                    {/* Parent Branch */}
                    {data.hierarchy_level !== "Division" && (
                        <div className="space-y-1.5">
                            <label className={labelCls}>Parent {validParentLvl}</label>
                            {circularAlert && (
                                <div className="flex items-center gap-1.5 text-[11px] text-action-red bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                    <AlertCircle className="w-3.5 h-3.5" /> Circular reference detected — this assignment is not allowed.
                                </div>
                            )}
                            <select value={data.parent_branch_id || ""} onChange={e => handleParentChange(e.target.value)} className={inputCls}>
                                <option value="">— No Parent —</option>
                                {potentialParents.map(b => (
                                    <option key={b.id} value={b.id}>{b.branch_code}{b.branch_name ? ` — ${b.branch_name}` : ""}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Office Type */}
                    <div className="space-y-2">
                        <label className={labelCls}>Field Office Type</label>
                        <div className="flex gap-2">
                            {(["Physical", "Virtual"] as FieldOfficeType[]).map(t => (
                                <button key={t} onClick={() => set("field_office_type", t)}
                                    className={cn("flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                                        data.field_office_type === t
                                            ? "bg-cobalt-blue text-white border-cobalt-blue"
                                            : "bg-slate-50 text-slate-500 border-slate-200 hover:border-cobalt-blue/40")}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Office Address</label>
                        <textarea value={data.office_address || ""} onChange={e => set("office_address", e.target.value || null)}
                            placeholder="123 Main St, Suite 200, Miami, FL 33101"
                            className={cn(inputCls, "resize-none h-16")} />
                    </div>

                    {/* State Licensing */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>States Licensed</label>
                        <button onClick={() => setShowStates(true)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-200 rounded-xl hover:border-cobalt-blue/40 transition-all text-left bg-white">
                            <div className="flex flex-wrap gap-1">
                                {(data.states_licensed || []).length > 0
                                    ? (data.states_licensed || []).map(c => (
                                        <span key={c} className="text-[10px] font-bold bg-cobalt-blue/10 text-cobalt-blue px-1.5 py-0.5 rounded">{c}</span>
                                    ))
                                    : <span className="text-slate-400 text-xs">Click to select licensed states...</span>
                                }
                            </div>
                            <Globe className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                        </button>
                    </div>

                    {/* Lease */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className={labelCls}>Lease Agreement</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{data.has_lease ? "Yes" : "No"}</span>
                                <div onClick={() => set("has_lease", !data.has_lease)}
                                    className={cn("w-10 h-5 rounded-full transition-all relative cursor-pointer", data.has_lease ? "bg-cobalt-blue" : "bg-slate-200")}>
                                    <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow", data.has_lease ? "left-5" : "left-0.5")} />
                                </div>
                            </div>
                        </div>
                        {data.has_lease && (
                            <button onClick={() => setShowLease(true)}
                                className="w-full flex items-center justify-between px-4 py-3 border border-dashed border-cobalt-blue/30 rounded-xl bg-cobalt-blue/5 hover:bg-cobalt-blue/10 transition-all">
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-navy-blue">
                                        {data.lease_data?.landlord_name || "No landlord set"}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {data.lease_data?.monthly_rent
                                            ? `${currency} ${data.lease_data.monthly_rent.toLocaleString()} / ${data.lease_data.renewal}`
                                            : "Click to enter lease details"}
                                    </p>
                                </div>
                                <Edit2 className="w-3.5 h-3.5 text-cobalt-blue" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-xl shadow transition-all disabled:opacity-50">
                        <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Branch"}
                    </button>
                </div>
            </div>
        </>
    );
};

// ─── Level Badge ──────────────────────────────────────────────────────────────

const LevelBadge: React.FC<{ level: HierarchyLevel }> = ({ level }) => {
    const styles: Record<HierarchyLevel, string> = {
        Division: "bg-purple-50 text-purple-700 border-purple-200",
        Region: "bg-cobalt-blue/10 text-cobalt-blue border-cobalt-blue/20",
        Branch: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    const icons: Record<HierarchyLevel, React.ElementType> = { Division: Layers, Region: Globe, Branch: GitBranch };
    const Icon = icons[level];
    return (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", styles[level])}>
            <Icon className="w-2.5 h-2.5" />{level}
        </span>
    );
};

// ─── Branch Row ───────────────────────────────────────────────────────────────

const BranchRow: React.FC<{
    branch: Branch;
    onEdit: (b: Branch) => void;
    onToggle: (id: string, active: boolean) => void;
    allBranches: Branch[];
}> = ({ branch, onEdit, onToggle, allBranches }) => {
    const parent = branch.parent_branch_id ? allBranches.find(b => b.id === branch.parent_branch_id) : null;

    return (
        <tr className={cn("border-b border-slate-50 transition-colors hover:bg-slate-50/50 group", !branch.is_active && "opacity-50")}>
            {/* Active Toggle */}
            <td className="px-3 py-3">
                <button onClick={() => onToggle(branch.id, !branch.is_active)} title={branch.is_active ? "Deactivate" : "Activate"}
                    className="flex items-center justify-center">
                    {branch.is_active
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                </button>
            </td>
            {/* Branch Code */}
            <td className="px-4 py-3">
                <span className="font-mono text-xs font-bold text-cobalt-blue bg-cobalt-blue/8 px-2 py-0.5 rounded">
                    {branch.branch_code}
                </span>
            </td>
            {/* Branch Name */}
            <td className="px-4 py-3 text-sm text-slate-700">{branch.branch_name || <span className="text-slate-300">—</span>}</td>
            {/* Level */}
            <td className="px-4 py-3"><LevelBadge level={branch.hierarchy_level} /></td>
            {/* Parent */}
            <td className="px-4 py-3 text-xs text-slate-500">
                {parent ? <span className="font-mono font-bold text-slate-600">{parent.branch_code}</span> : <span className="text-slate-300">—</span>}
            </td>
            {/* Manager */}
            <td className="px-4 py-3 text-xs text-slate-600">{branch.branch_manager_name || branch.branch_manager_eid || "—"}</td>
            {/* States */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 flex-wrap">
                    {branch.states_licensed.slice(0, 4).map(s => (
                        <span key={s} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                    {branch.states_licensed.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{branch.states_licensed.length - 4}</span>
                    )}
                    {branch.states_licensed.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                </div>
            </td>
            {/* Office Type */}
            <td className="px-4 py-3">
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    branch.field_office_type === "Physical"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-sky-50 text-sky-700")}>
                    {branch.field_office_type}
                </span>
            </td>
            {/* Lease */}
            <td className="px-4 py-3">
                {branch.has_lease
                    ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Leased</span>
                    : <span className="text-slate-300 text-xs">—</span>}
            </td>
            {/* Edit */}
            <td className="px-4 py-3">
                <button onClick={() => onEdit(branch)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cobalt-blue hover:bg-cobalt-blue/8 transition-all opacity-0 group-hover:opacity-100">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
            </td>
        </tr>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const BranchMasterApp: React.FC = () => {
    const { currentTenant } = useTenant();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [managers, setManagers] = useState<{ eid: string; full_name: string; title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState<HierarchyLevel | "All">("All");
    const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive" | "All">("Active");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
    const [toasts, setToasts] = useState<ToastEntry[]>([]);

    const tenantId = currentTenant?.tenant_id || "";
    const currency = currentTenant?.reporting_currency || "USD";

    const addToast = (message: string, type: ToastEntry["type"] = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };

    const load = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const [bData, mData] = await Promise.all([
            getBranchesAction(tenantId),
            getBranchManagersAction(tenantId),
        ]);
        setBranches(bData);
        setManagers(mData);
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { load(); }, [load]);

    const handleToggle = async (id: string, active: boolean) => {
        await toggleBranchStatusAction(id, active);
        await load();
        addToast(`Branch ${active ? "activated" : "deactivated"} successfully.`);
    };

    const handleEdit = (b: Branch) => {
        setEditingBranch(b);
        setDrawerOpen(true);
    };

    const handleSaved = async () => {
        setDrawerOpen(false);
        setEditingBranch(null);
        await load();
        addToast("Branch saved successfully.");
    };

    const displayed = branches.filter(b => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (b.branch_code || "").toLowerCase().includes(q) ||
            (b.branch_name || "").toLowerCase().includes(q) ||
            (b.branch_manager_name || "").toLowerCase().includes(q);
        const matchLevel = levelFilter === "All" || b.hierarchy_level === levelFilter;
        const matchStatus = statusFilter === "All" || (statusFilter === "Active" ? b.is_active : !b.is_active);
        return matchSearch && matchLevel && matchStatus;
    });

    if (!currentTenant) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <Building2 className="w-12 h-12 text-slate-200" />
                <p className="text-sm font-medium">Select a tenant to manage branches</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Toasts */}
            <div className="fixed top-20 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={cn(
                        "px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2",
                        t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            t.type === "error" ? "bg-red-50 border-red-200 text-red-700" :
                                "bg-amber-50 border-amber-200 text-amber-700"
                    )}>
                        {t.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="px-8 pt-6 pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operations</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Branches</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy-blue">Branch Master</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {branches.filter(b => b.is_active).length} active ·{" "}
                            {branches.filter(b => !b.is_active).length} inactive ·{" "}
                            {branches.length} total registered branches
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingBranch(blankBranch(tenantId)); setDrawerOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-xl shadow-md shadow-navy-blue/20 transition-all"
                    >
                        <Plus className="w-4 h-4" /> New Branch
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="px-8 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-4 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Search code, name, manager..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white w-56 focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue" />
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    {(["All", "Division", "Region", "Branch"] as const).map(l => (
                        <button key={l} onClick={() => setLevelFilter(l as any)}
                            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                levelFilter === l ? "bg-white text-navy-blue shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                            {l}
                        </button>
                    ))}
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    {(["Active", "All", "Inactive"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                statusFilter === s ? "bg-white text-navy-blue shadow-sm" : "text-slate-500")}>
                            {s}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-xs text-slate-400 font-medium">{displayed.length} records</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse min-w-max">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr>
                            {["Status", "Code", "Name", "Level", "Parent", "Manager", "Licensed States", "Office", "Lease", ""].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="py-20 text-center text-slate-400 text-sm animate-pulse">Loading branches...</td></tr>
                        ) : displayed.length === 0 ? (
                            <tr><td colSpan={10} className="py-20 text-center">
                                <GitBranch className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">No branches found. Create your first Branch, Region, or Division.</p>
                            </td></tr>
                        ) : displayed.map(b => (
                            <BranchRow key={b.id} branch={b} allBranches={branches} onEdit={handleEdit} onToggle={handleToggle} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Branches cannot be deleted — only deactivated. Full history is preserved in all modules and reports.
                </p>
            </div>

            {/* Side Drawer */}
            {drawerOpen && editingBranch && (
                <div className="absolute inset-0 z-30 flex justify-end">
                    <div className="absolute inset-0 bg-navy-blue/10 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-white shadow-2xl h-full border-l border-slate-100 animate-slideInRight">
                        <BranchForm
                            branch={editingBranch}
                            allBranches={branches}
                            managers={managers}
                            tenantId={tenantId}
                            currency={currency}
                            onClose={() => setDrawerOpen(false)}
                            onSaved={handleSaved}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
