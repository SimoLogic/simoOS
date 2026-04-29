"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus, X, Save, CheckCircle2, Clock, Power, PowerOff,
    Briefcase, Users, ChevronDown, ChevronUp, AlertTriangle,
    BookOpen, Globe, Award, FlaskConical, Brain, FileText, Search, RefreshCw,
    Copy, Tag, Eye, EyeOff, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import {
    JobTitle, JobDescriptionData, JobTitleRef,
    blankJobTitle, blankJdfData, parseJdfData,
    EDUCATION_LEVELS, LANGUAGE_LEVELS, LANGUAGES_CATALOG,
    PSYCHOMETRIC_TESTS, SKILLS_TESTS, SOFT_SKILLS_OPTIONS,
    RoleTitleRef,
} from "@/lib/job-title-types";
import { AREAS_EMPRESA, SUB_AREAS } from "@/lib/hr-types";
import {
    getAllJobTitlesAction,
    saveJobTitleAction,
    approveJobTitleAction,
    toggleJobTitleStatusAction,
    duplicateJobTitleAction,
    toggleRoleTitleStatusAction,
} from "@/app/actions/job-title-actions";
import { getEmployeesAction, processJobDescriptionAudio } from "@/app/actions/hr-actions";
import { AudioRecorder } from "@/components/shared/AudioRecorder";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Draft: "bg-amber-100 text-amber-700 border-amber-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
};

const approvalColors: Record<string, string> = {
    Approved: "text-emerald-600",
    Rejected: "text-action-red",
    Pending: "text-slate-400",
};

// ─── Inline Role Title form row ───────────────────────────────────────────────

interface RoleTitleRow {
    id?: string;
    role_title: string;
    describe_role: string;
    _localId: string;   // stable UI key
    status?: "Active" | "Inactive";
}

const blankRoleTitleRow = (): RoleTitleRow => ({
    role_title: "",
    describe_role: "",
    _localId: Math.random().toString(36).slice(2),
    status: "Active",
});

// ─── Tag input component ──────────────────────────────────────────────────────

const TagInput: React.FC<{
    tags: string[];
    catalog: string[];
    placeholder: string;
    onChange: (tags: string[]) => void;
}> = ({ tags, catalog, placeholder, onChange }) => {
    const [input, setInput] = useState("");
    const filtered = catalog.filter(c => c.toLowerCase().includes(input.toLowerCase()) && !tags.includes(c));

    const addTag = (tag: string) => {
        if (tag && !tags.includes(tag)) onChange([...tags, tag]);
        setInput("");
    };
    const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

    return (
        <div className="flex flex-col gap-2">
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => (
                        <span key={t} className="flex items-center gap-1 bg-cobalt-blue/10 text-cobalt-blue text-xs font-semibold px-2.5 py-1 rounded-full border border-cobalt-blue/20">
                            {t}
                            <button onClick={() => removeTag(t)} className="hover:text-action-red ml-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); addTag(input.trim()); } }}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cobalt-blue/25 focus:border-cobalt-blue"
                />
                {input && filtered.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                        {filtered.slice(0, 8).map(c => (
                            <button key={c} onClick={() => addTag(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-cobalt-blue/5 hover:text-cobalt-blue transition-colors">
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── JDF Section Accordion ────────────────────────────────────────────────────

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ icon: Icon, title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="flex items-center gap-2 text-sm font-bold text-navy-blue">
                    <Icon className="w-4 h-4 text-cobalt-blue" />
                    {title}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {open && <div className="p-5 grid grid-cols-1 gap-4">{children}</div>}
        </div>
    );
};

// ─── Input + Label helper ─────────────────────────────────────────────────────

const F: React.FC<{ label: string; required?: boolean; children: React.ReactNode; cols?: string }> = ({ label, required, children, cols }) => (
    <div className={cn("flex flex-col gap-1", cols)}>
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {label}{required && <span className="text-action-red text-[10px]">*</span>}
        </label>
        {children}
    </div>
);

const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cobalt-blue/25 focus:border-cobalt-blue bg-white";

// ─── Role Titles Section ──────────────────────────────────────────────────────

const RoleTitlesSection: React.FC<{
    rows: RoleTitleRow[];
    onChange: (rows: RoleTitleRow[]) => void;
    onToggleStatus?: (row: RoleTitleRow) => void;
}> = ({ rows, onChange, onToggleStatus }) => {
    const [open, setOpen] = useState(true);

    const addRow = () => onChange([...rows, blankRoleTitleRow()]);
    const removeRow = (localId: string) => onChange(rows.filter(r => r._localId !== localId));
    const updateRow = (localId: string, field: keyof RoleTitleRow, val: string) =>
        onChange(rows.map(r => r._localId === localId ? { ...r, [field]: val } : r));

    return (
        <div className="border border-cobalt-blue/20 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-cobalt-blue/5 hover:bg-cobalt-blue/10 transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-navy-blue">
                    <Tag className="w-4 h-4 text-cobalt-blue" />
                    Role Titles
                    <span className="text-[10px] bg-cobalt-blue text-white font-bold px-1.5 py-0.5 rounded-full">
                        {rows.filter(r => r.status !== "Inactive").length}
                    </span>
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cobalt-blue font-semibold">Click + to add</span>
                    {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>
            {open && (
                <div className="p-4 space-y-3">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Role Titles let you assign an operational label to an employee without changing their contractual Job Title.
                        Example: <em>&ldquo;Loan Officer Assistant&rdquo;</em> → Role Title <em>&ldquo;LOA for Documents&rdquo;</em>.
                    </p>
                    {rows.length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-3">No Role Titles yet. Click + Add Role Title below.</p>
                    )}
                    {rows.map((row) => (
                        <div
                            key={row._localId}
                            className={cn(
                                "rounded-xl border p-4 space-y-3 transition-colors",
                                row.status === "Inactive" ? "border-slate-100 bg-slate-50 opacity-60" : "border-cobalt-blue/15 bg-white"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Role Title <span className="text-slate-400 font-normal">(max 60 chars)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={row.role_title}
                                        onChange={e => updateRow(row._localId, "role_title", e.target.value)}
                                        placeholder="e.g. LOA for Documents"
                                        maxLength={60}
                                        disabled={row.status === "Inactive"}
                                        className={cn(inp, "text-sm")}
                                    />
                                </div>
                                <div className="flex items-center gap-1 mt-5 shrink-0">
                                    {row.id && onToggleStatus && (
                                        <button
                                            onClick={() => onToggleStatus(row)}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-colors",
                                                row.status === "Active"
                                                    ? "text-action-red hover:bg-red-50"
                                                    : "text-emerald-600 hover:bg-emerald-50"
                                            )}
                                            title={row.status === "Active" ? "Deactivate" : "Activate"}
                                        >
                                            {row.status === "Active"
                                                ? <EyeOff className="w-3.5 h-3.5" />
                                                : <Eye className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    )}
                                    {!row.id && (
                                        <button
                                            onClick={() => removeRow(row._localId)}
                                            className="p-1.5 text-slate-300 hover:text-action-red hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Describe the Role <span className="text-slate-400 font-normal">(max 500 chars)</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={row.describe_role}
                                    onChange={e => updateRow(row._localId, "describe_role", e.target.value)}
                                    placeholder="Describe what this role entails operationally..."
                                    maxLength={500}
                                    disabled={row.status === "Inactive"}
                                    className={cn(inp, "resize-none text-sm")}
                                />
                                <div className="text-right text-[10px] text-slate-300 mt-0.5">
                                    {row.describe_role.length}/500
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addRow}
                        className="w-full py-2.5 border-2 border-dashed border-cobalt-blue/30 text-cobalt-blue text-xs font-bold rounded-xl hover:border-cobalt-blue hover:bg-cobalt-blue/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Role Title
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const JobTitleApp: React.FC = () => {
    const { currentTenant } = useTenant();

    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [employees, setEmployees] = useState<{ eid: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState(blankJobTitle(currentTenant?.tenant_id ?? ""));
    const [jdf, setJdf] = useState<JobDescriptionData>(blankJdfData());
    const [roleTitleRows, setRoleTitleRows] = useState<RoleTitleRow[]>([]);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "warning" } | null>(null);
    const [saving, setSaving] = useState(false);
    const [duplicating, setDuplicating] = useState<string | null>(null);
    const [processingAudio, setProcessingAudio] = useState(false);

    // Search / filter
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive" | "Draft">("all");

    const showToast = useCallback((msg: string, type: "success" | "error" | "warning" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const load = useCallback(async () => {
        if (!currentTenant) return;
        setLoading(true);
        const [jts, emps] = await Promise.all([
            getAllJobTitlesAction(currentTenant.tenant_id),
            getEmployeesAction(currentTenant.tenant_id),
        ]);
        setJobTitles(jts);
        setEmployees(emps.map(e => ({ eid: e.eid, name: `${e.maestro.firstName} ${e.maestro.lastName}` })));
        setLoading(false);
    }, [currentTenant]);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setEditId(null);
        setForm(blankJobTitle(currentTenant?.tenant_id ?? ""));
        setJdf(blankJdfData());
        setRoleTitleRows([]);
        setDrawerOpen(true);
    };

    const openEdit = (jt: JobTitle) => {
        setEditId(jt.id);
        setForm({ ...jt });
        setJdf(parseJdfData(jt.jdf_data));
        // Map existing role titles to rows
        setRoleTitleRows((jt.role_titles ?? []).map(rt => ({
            _localId: rt.id,
            id: rt.id,
            role_title: rt.role_title,
            describe_role: rt.describe_role ?? "",
            status: "Active",
        })));
        setDrawerOpen(true);
    };

    const openDuplicate = (jt: JobTitle) => {
        // Pre-fill the drawer as if creating a new record from this one
        setEditId(null);
        setForm({ ...jt, title: `${jt.title} (Copy)`, status: "Draft", approver1_status: "Pending", approver2_status: "Pending" });
        setJdf(parseJdfData(jt.jdf_data));
        setRoleTitleRows((jt.role_titles ?? []).map(rt => ({
            _localId: Math.random().toString(36).slice(2),
            role_title: rt.role_title,
            describe_role: rt.describe_role ?? "",
            status: "Active",
        })));
        setDrawerOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { showToast("Job Title name is required.", "error"); return; }
        setSaving(true);
        const res = await saveJobTitleAction({
            ...form,
            id: editId ?? undefined,
            jdf_data: jdf,
            role_titles: roleTitleRows.map(r => ({
                id: r.id,
                role_title: r.role_title,
                describe_role: r.describe_role,
            })),
        });
        setSaving(false);
        if (res.success) {
            showToast("Job Title saved successfully.", "success");
            setDrawerOpen(false);
            load();
        } else {
            showToast(res.message ?? "Save failed.", "error");
        }
    };

    const handleDuplicate = async (jt: JobTitle) => {
        setDuplicating(jt.id);
        const res = await duplicateJobTitleAction(jt.id, jt.tenant_id);
        setDuplicating(null);
        if (res.success) {
            showToast("Job Title duplicated as Draft.", "success");
            load();
        } else {
            showToast(res.message ?? "Duplication failed.", "error");
        }
    };

    const handleAudioRecorded = async (base64Audio: string) => {
        setProcessingAudio(true);
        try {
            const res = await processJobDescriptionAudio(base64Audio);
            if (res.success && res.data) {
                setJdf(prev => ({ ...prev, ...res.data }));
                showToast("AI successfully extracted job details from audio!", "success");
            } else {
                showToast(res.message || "Could not process audio.", "error");
            }
        } catch {
            showToast("Error communicating with AI service.", "error");
        } finally {
            setProcessingAudio(false);
        }
    };

    const handleApprove = async (id: string, approverNum: 1 | 2, decision: "Approved" | "Rejected") => {
        const res = await approveJobTitleAction(id, approverNum, decision);
        if (res.success) { showToast("Decision recorded.", "success"); load(); }
        else showToast(res.message ?? "Error", "error");
    };

    const handleToggle = async (jt: JobTitle) => {
        const res = await toggleJobTitleStatusAction(jt.id, jt.status);
        if (res.success) { showToast(`Moved to ${jt.status === "Active" ? "Inactive" : "Active"}.`); load(); }
        else showToast(res.message ?? "Error", "error");
    };

    const handleToggleRoleTitle = async (row: RoleTitleRow) => {
        if (!row.id) return;
        const newStatus = row.status === "Active" ? "Inactive" : "Active";
        const res = await toggleRoleTitleStatusAction(row.id, row.status === "Active" ? "Active" : "Inactive");
        if (res.success) {
            setRoleTitleRows(prev => prev.map(r => r._localId === row._localId ? { ...r, status: newStatus as "Active" | "Inactive" } : r));
            showToast(`Role Title ${newStatus === "Active" ? "activated" : "deactivated"}.`);
        } else {
            showToast(res.message ?? "Error", "error");
        }
    };

    const setF = (key: keyof typeof form, val: any) => setForm(prev => ({ ...prev, [key]: val }));
    const setJ = (key: keyof JobDescriptionData, val: any) => setJdf(prev => ({ ...prev, [key]: val }));

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return jobTitles.filter(jt => {
            const matchSearch = (jt.title || "").toLowerCase().includes(q) || (jt.area || "").toLowerCase().includes(q);
            const matchStatus = statusFilter === "all" || jt.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [jobTitles, search, statusFilter]);

    const subAreas = form.area ? (SUB_AREAS[form.area] ?? []) : [];
    const approver1Options = employees.filter(e => e.eid !== form.requester_id && e.eid !== form.approver2_id);
    const approver2Options = employees.filter(e => e.eid !== form.requester_id && e.eid !== form.approver1_id);

    if (!currentTenant) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Select a tenant to manage Job Titles.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* ── Toast ── */}
            {toast && (
                <div className={cn(
                    "fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold animate-fade-in",
                    toast.type === "success" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                    toast.type === "error" && "bg-red-50 text-action-red border-red-200",
                    toast.type === "warning" && "bg-amber-50 text-amber-700 border-amber-200",
                )}>
                    {toast.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                    {toast.type === "error" && <AlertTriangle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* ── Header ── */}
            <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <Briefcase className="w-5 h-5 text-cobalt-blue" />
                        <h2 className="text-xl font-black text-navy-blue">Job Title Library</h2>
                    </div>
                    <p className="text-sm text-slate-500">Manage your organization's Job Titles and associated Role Titles. Role Titles allow operational flexibility without contract changes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={load} className="p-2 text-slate-400 hover:text-cobalt-blue hover:bg-slate-50 rounded-lg transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={openNew} className="flex items-center gap-2 bg-cobalt-blue hover:bg-navy-blue text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                        <Plus className="w-4 h-4" /> New Job Title
                    </button>
                </div>
            </div>

            {/* ── Search + Stats Bar ── */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-4 shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" placeholder="Search by title or area..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cobalt-blue/25 focus:border-cobalt-blue bg-white"
                    />
                </div>
                {/* Status filter chips */}
                <div className="flex items-center gap-2">
                    {(["all", "Active", "Draft", "Inactive"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors",
                                statusFilter === s
                                    ? s === "Active" ? "bg-emerald-500 text-white border-emerald-500"
                                        : s === "Inactive" ? "bg-slate-500 text-white border-slate-500"
                                            : s === "Draft" ? "bg-amber-500 text-white border-amber-500"
                                                : "bg-cobalt-blue text-white border-cobalt-blue"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {s === "all" ? `All (${jobTitles.length})` : `${s} (${jobTitles.filter(j => j.status === s).length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-cobalt-blue/30 border-t-cobalt-blue rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium text-sm">{search ? "No Job Titles match your search." : "No Job Titles yet. Create your first one."}</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="px-5 py-3">Job Title</th>
                                <th className="px-5 py-3">Area / Sub-Area</th>
                                <th className="px-5 py-3">Role Titles</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Approvals</th>
                                <th className="px-5 py-3">Requester</th>
                                <th className="px-5 py-3">Created</th>
                                <th className="px-5 py-3">Updated</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(jt => (
                                <tr key={jt.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="font-bold text-navy-blue text-sm">{jt.title}</div>
                                        {jt.direct_supervisor && <div className="text-xs text-slate-400 mt-0.5">Reports to: {jt.direct_supervisor}</div>}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-sm text-slate-700">{jt.area || "—"}</div>
                                        {jt.sub_area && <div className="text-xs text-slate-400">{jt.sub_area}</div>}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {(jt.role_titles ?? []).length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {(jt.role_titles ?? []).slice(0, 2).map(rt => (
                                                    <span key={rt.id} className="text-[10px] bg-cobalt-blue/10 text-cobalt-blue font-semibold px-1.5 py-0.5 rounded-full">
                                                        {rt.role_title}
                                                    </span>
                                                ))}
                                                {(jt.role_titles ?? []).length > 2 && (
                                                    <span className="text-[10px] text-slate-400 font-semibold">+{(jt.role_titles ?? []).length - 2} more</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border", statusColors[jt.status] ?? statusColors["Draft"])}>
                                            {jt.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400 w-16">Appr. 1:</span>
                                                <span className={cn("font-bold", approvalColors[jt.approver1_status])}>{jt.approver1_status}</span>
                                                {jt.status === "Draft" && jt.approver1_status === "Pending" && jt.approver1_id && (
                                                    <div className="flex gap-1 ml-2">
                                                        <button onClick={() => handleApprove(jt.id, 1, "Approved")} className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors">✓</button>
                                                        <button onClick={() => handleApprove(jt.id, 1, "Rejected")} className="text-[10px] bg-red-50 text-action-red border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors">✕</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400 w-16">Appr. 2:</span>
                                                <span className={cn("font-bold", approvalColors[jt.approver2_status])}>{jt.approver2_status}</span>
                                                {jt.status === "Draft" && jt.approver2_status === "Pending" && jt.approver2_id && (
                                                    <div className="flex gap-1 ml-2">
                                                        <button onClick={() => handleApprove(jt.id, 2, "Approved")} className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors">✓</button>
                                                        <button onClick={() => handleApprove(jt.id, 2, "Rejected")} className="text-[10px] bg-red-50 text-action-red border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors">✕</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-xs text-slate-600">
                                            {jt.requester_id
                                                ? employees.find(e => e.eid === jt.requester_id)?.name ?? jt.requester_id
                                                : <span className="text-slate-300">—</span>
                                            }
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                        {jt.created_at ? new Date(jt.created_at).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                        {jt.updated_at ? new Date(jt.updated_at).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <button
                                                onClick={() => openEdit(jt)}
                                                className="p-1.5 text-cobalt-blue hover:text-navy-blue hover:bg-cobalt-blue/10 rounded-lg transition-colors"
                                                title="Edit JDF"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(jt)}
                                                disabled={duplicating === jt.id}
                                                className="p-1.5 text-slate-400 hover:text-cobalt-blue hover:bg-cobalt-blue/5 rounded-lg transition-colors"
                                                title="Duplicate as Draft"
                                            >
                                                {duplicating === jt.id
                                                    ? <div className="w-3.5 h-3.5 border border-cobalt-blue/30 border-t-cobalt-blue rounded-full animate-spin" />
                                                    : <Copy className="w-3.5 h-3.5" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => handleToggle(jt)}
                                                disabled={jt.status === "Draft"}
                                                className={cn("p-1.5 rounded-lg transition-colors", jt.status === "Active" ? "text-action-red hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50", jt.status === "Draft" && "opacity-30 cursor-not-allowed")}
                                                title={jt.status === "Active" ? "Deactivate" : "Activate"}
                                            >
                                                {jt.status === "Active" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── JDF Drawer ── */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div className="flex-1 bg-navy-blue/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    {/* Drawer panel */}
                    <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
                        {/* Drawer Header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-black text-navy-blue text-lg">{editId ? "Edit Job Title" : "New Job Title"}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Complete the JDF · Once approved, this title becomes available across all HR modules.</p>
                            </div>
                            <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* AI Audio Input */}
                            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-xl p-4 border border-indigo-100 flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-bold text-navy-blue text-sm flex items-center gap-1.5">
                                        <Brain className="w-4 h-4 text-purple-600" /> AI Auto-Fill via Dictation
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                        Dictate the role requirements and our AI will extract the data.
                                    </p>
                                </div>
                                <AudioRecorder onAudioRecorded={handleAudioRecorded} isProcessing={processingAudio} />
                            </div>

                            {/* Section 1: Requisition */}
                            <Section icon={Users} title="Requisition" defaultOpen={true}>
                                <div className="grid grid-cols-1 gap-4">
                                    <F label="Requester (Opening this position)" required>
                                        <select className={inp} value={form.requester_id} onChange={e => setF("requester_id", e.target.value)}>
                                            <option value="">Select requester...</option>
                                            {employees.map(e => <option key={e.eid} value={e.eid}>{e.name} ({e.eid})</option>)}
                                        </select>
                                    </F>
                                    <div className="grid grid-cols-2 gap-4">
                                        <F label="Approver 1" required>
                                            <select className={inp} value={form.approver1_id} onChange={e => setF("approver1_id", e.target.value)}>
                                                <option value="">Select approver...</option>
                                                {approver1Options.map(e => <option key={e.eid} value={e.eid}>{e.name}</option>)}
                                            </select>
                                        </F>
                                        <F label="Approver 2" required>
                                            <select className={inp} value={form.approver2_id} onChange={e => setF("approver2_id", e.target.value)}>
                                                <option value="">Select approver...</option>
                                                {approver2Options.map(e => <option key={e.eid} value={e.eid}>{e.name}</option>)}
                                            </select>
                                        </F>
                                    </div>
                                </div>
                            </Section>

                            {/* Section 2: Role Identity */}
                            <Section icon={Briefcase} title="Role Identity" defaultOpen={true}>
                                <F label="Job Title Name" required>
                                    <input type="text" className={inp} placeholder="e.g. Branch Manager, Loan Officer..." value={form.title} onChange={e => setF("title", e.target.value)} />
                                </F>
                                <div className="grid grid-cols-2 gap-4">
                                    <F label="Area" required>
                                        <select className={inp} value={form.area} onChange={e => { setF("area", e.target.value); setF("sub_area", ""); }}>
                                            <option value="">Select area...</option>
                                            {AREAS_EMPRESA.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </F>
                                    <F label="Sub-Area">
                                        <select className={inp} value={form.sub_area} onChange={e => setF("sub_area", e.target.value)} disabled={!form.area}>
                                            <option value="">Select sub-area...</option>
                                            {subAreas.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </F>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <F label="Cost Center">
                                        <input type="text" className={inp} placeholder="e.g. CC-001" value={form.cost_center} onChange={e => setF("cost_center", e.target.value)} />
                                    </F>
                                    <F label="Sub Cost Center">
                                        <input type="text" className={inp} placeholder="e.g. SCC-001" value={form.sub_cost_center} onChange={e => setF("sub_cost_center", e.target.value)} />
                                    </F>
                                </div>
                                <F label="Direct Supervisor / Reports To">
                                    <input type="text" className={inp} placeholder="e.g. Regional Director" value={form.direct_supervisor} onChange={e => setF("direct_supervisor", e.target.value)} />
                                </F>
                            </Section>

                            {/* ── Role Titles Section ── */}
                            <RoleTitlesSection
                                rows={roleTitleRows}
                                onChange={setRoleTitleRows}
                                onToggleStatus={handleToggleRoleTitle}
                            />

                            {/* Section 3: Requirements */}
                            <Section icon={BookOpen} title="Academic & Experience Requirements">
                                <div className="grid grid-cols-2 gap-4">
                                    <F label="Minimum Education Level">
                                        <select className={inp} value={jdf.education_level} onChange={e => setJ("education_level", e.target.value)}>
                                            <option value="">Select level...</option>
                                            {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </F>
                                    <F label="Specific Profession">
                                        <input type="text" className={inp} placeholder="e.g. Industrial Engineer" value={jdf.specific_profession} onChange={e => setJ("specific_profession", e.target.value)} />
                                    </F>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <F label="Total Years Experience">
                                        <input type="number" min={0} className={inp} value={jdf.years_experience} onChange={e => setJ("years_experience", Number(e.target.value))} />
                                    </F>
                                    <F label="Yrs in National Companies">
                                        <input type="number" min={0} className={inp} value={jdf.exp_national_companies} onChange={e => setJ("exp_national_companies", Number(e.target.value))} />
                                    </F>
                                    <F label="Yrs in Multinationals">
                                        <input type="number" min={0} className={inp} value={jdf.exp_multinationals} onChange={e => setJ("exp_multinationals", Number(e.target.value))} />
                                    </F>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="exp-sector" checked={jdf.exp_specific_sector} onChange={e => setJ("exp_specific_sector", e.target.checked)} className="w-4 h-4 text-cobalt-blue rounded border-slate-300" />
                                    <label htmlFor="exp-sector" className="text-sm text-slate-600">Requires experience in a specific sector</label>
                                </div>
                                {jdf.exp_specific_sector && (
                                    <F label="Specific Sector Name">
                                        <input type="text" className={inp} placeholder="e.g. Mortgage, BPO, FinTech..." value={jdf.specific_sector_name} onChange={e => setJ("specific_sector_name", e.target.value)} />
                                    </F>
                                )}
                            </Section>

                            {/* Section 4: Skills */}
                            <Section icon={Brain} title="Skills & Knowledge">
                                <F label="Soft Skills">
                                    <TagInput tags={jdf.soft_skills} catalog={SOFT_SKILLS_OPTIONS} placeholder="Type or select a soft skill..." onChange={v => setJ("soft_skills", v)} />
                                </F>
                                <F label="Specific Knowledge / Technical Skills">
                                    <TagInput tags={jdf.specific_knowledge} catalog={[]} placeholder="Type a technical skill and press Enter..." onChange={v => setJ("specific_knowledge", v)} />
                                </F>
                            </Section>

                            {/* Section 5: Languages */}
                            <Section icon={Globe} title="Language Requirements">
                                <div className="space-y-2">
                                    {jdf.languages.map((lang, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select className={cn(inp, "flex-1")} value={lang.language} onChange={e => { const next = [...jdf.languages]; next[idx] = { ...next[idx], language: e.target.value }; setJ("languages", next); }}>
                                                <option value="">Language...</option>
                                                {LANGUAGES_CATALOG.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                            <select className={cn(inp, "w-32")} value={lang.level} onChange={e => { const next = [...jdf.languages]; next[idx] = { ...next[idx], level: e.target.value as any }; setJ("languages", next); }}>
                                                <option value="">Level...</option>
                                                {LANGUAGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                            <button onClick={() => setJ("languages", jdf.languages.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-action-red hover:bg-red-50 rounded transition-colors"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setJ("languages", [...jdf.languages, { language: "", level: "B1" }])} className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold rounded-lg hover:border-cobalt-blue hover:text-cobalt-blue transition-colors flex items-center justify-center gap-1">
                                        <Plus className="w-3 h-3" /> Add Language
                                    </button>
                                </div>
                            </Section>

                            {/* Section 6: Certifications */}
                            <Section icon={Award} title="Certifications Required">
                                <TagInput tags={jdf.certifications} catalog={[]} placeholder="Type certification name and press Enter..." onChange={v => setJ("certifications", v)} />
                            </Section>

                            {/* Section 7: Tests */}
                            <Section icon={FlaskConical} title="Assessment Tests">
                                <F label="Psychometric Tests">
                                    <TagInput tags={jdf.psychometric_tests} catalog={PSYCHOMETRIC_TESTS} placeholder="Select or type a test..." onChange={v => setJ("psychometric_tests", v)} />
                                </F>
                                <F label="Skills Tests">
                                    <TagInput tags={jdf.skills_tests} catalog={SKILLS_TESTS} placeholder="Select or type a test..." onChange={v => setJ("skills_tests", v)} />
                                </F>
                            </Section>

                            {/* Section 8: Job Description */}
                            <Section icon={FileText} title="Job Description Narrative">
                                <F label="Full Job Description">
                                    <textarea
                                        rows={6}
                                        className={cn(inp, "resize-y")}
                                        placeholder="Describe the role's purpose, key responsibilities, and what success looks like in this position..."
                                        value={jdf.job_description}
                                        onChange={e => setJ("job_description", e.target.value)}
                                    />
                                </F>
                            </Section>
                        </div>

                        {/* Drawer Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                            <button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Saves as Draft · Submit approval from the list</span>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !form.title.trim()}
                                    className="flex items-center gap-2 bg-cobalt-blue hover:bg-navy-blue text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? "Saving..." : "Save Job Title"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
