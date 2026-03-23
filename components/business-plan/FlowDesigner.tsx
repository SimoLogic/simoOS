"use client";

import React, { useState, useCallback } from "react";
import {
    Plus, Trash2, Save, FolderOpen, CheckCircle2,
    ChevronDown, GripVertical, X, FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessRow, TaskFrequency, TaskValue, SavedProcess } from "@/lib/process-designer-types";
import { AREAS_EMPRESA } from "@/lib/hr-types";
import { getSavedProcesses, saveProcess, deleteProcess, approveProcess, generateId } from "@/lib/process-designer-store";
import { getEmployeesAction as getEmployees } from "@/app/actions/hr-actions";
import { useTenant } from "@/lib/tenant-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: TaskFrequency[] = ["Daily", "Weekly", "Biweekly", "Monthly", "Quarterly", "Annual", "On-Demand"];
const VALUE_OPTIONS: TaskValue[] = ["Value-Added", "Necessary", "Wait", "Waste"];

const VALUE_COLORS: Record<TaskValue, string> = {
    "Value-Added": "bg-emerald-100 text-emerald-700",
    "Necessary": "bg-blue-100 text-blue-700",
    "Wait": "bg-amber-100 text-amber-700",
    "Waste": "bg-red-100 text-red-700",
};

function blankRow(process: string, subProcess: string): ProcessRow {
    return {
        id: generateId(),
        process,
        subProcess,
        stepNumber: 1,
        task: "",
        owner: "",
        ownerEid: "",
        deliverable: "",
        stakeholder: "",
        stakeholderEid: "",
        pt: 0,
        lt: 0,
        frequency: "Daily",
        value: "Value-Added",
        comments: "",
    };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FlowDesignerProps {
    onDesignsChange: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const FlowDesigner: React.FC<FlowDesignerProps> = ({ onDesignsChange }) => {
    const [area, setArea] = useState("");
    const [processName, setProcessName] = useState("");
    const [subProcessName, setSubProcessName] = useState("");
    const [rows, setRows] = useState<ProcessRow[]>([]);
    const [savedProcesses, setSavedProcesses] = useState<SavedProcess[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [designName, setDesignName] = useState("");
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [showSavedPanel, setShowSavedPanel] = useState(true);
    const { currentTenant } = useTenant();
    const [employees, setEmployees] = useState<{ eid: string, name: string }[]>([]);

    React.useEffect(() => {
        if (!area || !currentTenant) {
            setEmployees([]);
            return;
        }
        const fetchEmps = async () => {
            const emps = await getEmployees(currentTenant.tenant_id);
            const filtered = emps.filter((e) => e.historialLaboral.area === area);
            if (filtered.length === 0) {
                // Mock fallback
                setEmployees([
                    { eid: "mock-1", name: "Maria Ramirez" },
                    { eid: "mock-2", name: "John Carter" },
                    { eid: "mock-3", name: "Ana Gomez" },
                ]);
            } else {
                setEmployees(filtered.map((e) => ({
                    eid: e.eid,
                    name: `${e.maestro.firstName} ${e.maestro.lastName}`,
                })));
            }
        };
        fetchEmps();
    }, [area, currentTenant]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    const refreshSaved = useCallback(async () => {
        if (!currentTenant) return;
        const updated = await getSavedProcesses(currentTenant.tenant_id);
        setSavedProcesses(updated);
        onDesignsChange();
    }, [onDesignsChange, currentTenant]);

    React.useEffect(() => {
        refreshSaved();
    }, [refreshSaved]);

    // ── Row operations ──
    const addRow = () => {
        const lastStep = rows.length > 0 ? Math.max(...rows.map((r) => r.stepNumber)) : 0;
        setRows((prev) => [
            ...prev,
            { ...blankRow(processName, subProcessName), stepNumber: lastStep + 1 },
        ]);
    };

    const updateRow = (id: string, field: keyof ProcessRow, value: string | number) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== id) return r;
                if (field === "owner") {
                    const emp = employees.find((e) => e.name === value);
                    return { ...r, owner: emp?.name ?? String(value), ownerEid: emp?.eid ?? "" };
                }
                if (field === "stakeholder") {
                    const emp = employees.find((e) => e.name === value);
                    return { ...r, stakeholder: emp?.name ?? String(value), stakeholderEid: emp?.eid ?? "" };
                }
                return { ...r, [field]: value };
            })
        );
    };

    const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

    // ── Save ──
    const handleSave = async () => {
        if (!designName.trim() || !currentTenant) return;
        const p: SavedProcess = {
            id: editingId ?? generateId(),
            name: designName,
            area,
            rows: rows.map((r) => ({ ...r, process: processName, subProcess: subProcessName })),
            status: "Draft",
            createdAt: editingId
                ? savedProcesses.find((s) => s.id === editingId)?.createdAt ?? new Date().toISOString()
                : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await saveProcess(p, currentTenant.tenant_id);
        refreshSaved();
        setShowSaveModal(false);
        setEditingId(p.id);
        showToast(`Design "${p.name}" saved successfully`);
    };

    // ── Load ──
    const handleLoad = (p: SavedProcess) => {
        setArea(p.area);
        setProcessName(p.rows[0]?.process ?? "");
        setSubProcessName(p.rows[0]?.subProcess ?? "");
        setRows(p.rows);
        setDesignName(p.name);
        setEditingId(p.id);
        showToast(`Loaded: "${p.name}"`);
    };

    const handleDelete = async (id: string) => {
        if (!currentTenant) return;
        await deleteProcess(id, currentTenant.tenant_id);
        if (editingId === id) {
            setEditingId(null);
            setRows([]);
            setDesignName("");
        }
        refreshSaved();
        showToast("Design deleted");
    };

    const handleApprove = async (id: string) => {
        if (!currentTenant) return;
        await approveProcess(id, currentTenant.tenant_id);
        refreshSaved();
        showToast("Process approved");
    };

    return (
        <div className="flex h-full">
            {/* ── LEFT: Saved Designs Panel ── */}
            <div className={cn("shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col transition-all duration-300", showSavedPanel ? "w-64" : "w-0 overflow-hidden")}>
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saved Designs</span>
                    <span className="text-xs text-slate-400 font-medium">{savedProcesses.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {savedProcesses.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <FolderOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">No saved designs yet</p>
                        </div>
                    ) : (
                        savedProcesses.map((p) => (
                            <div
                                key={p.id}
                                className={cn(
                                    "mx-2 mb-1 rounded-lg border px-3 py-2.5 cursor-pointer transition-all group",
                                    editingId === p.id
                                        ? "border-cobalt-blue/40 bg-cobalt-blue/5"
                                        : "border-transparent hover:border-slate-200 hover:bg-white"
                                )}
                                onClick={() => handleLoad(p)}
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-navy-blue truncate">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{p.area}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={cn(
                                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                                                p.status === "Approved"
                                                    ? "bg-emerald-100 text-emerald-600"
                                                    : "bg-amber-100 text-amber-600"
                                            )}>{p.status}</span>
                                            <span className="text-[10px] text-slate-300">{p.rows.length} rows</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {p.status === "Draft" && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleApprove(p.id); }}
                                                title="Approve"
                                                className="w-5 h-5 rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-50"
                                            >
                                                <FileCheck className="w-3 h-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                            title="Delete"
                                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── RIGHT: Editor ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center gap-3 flex-wrap shrink-0">
                    <button
                        onClick={() => setShowSavedPanel((v) => !v)}
                        className="text-xs text-slate-400 hover:text-cobalt-blue flex items-center gap-1 transition-colors"
                    >
                        <FolderOpen className="w-3.5 h-3.5" />
                        {showSavedPanel ? "Hide" : "Designs"}
                    </button>
                    <div className="h-4 w-px bg-slate-200" />

                    {/* Area */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Area</label>
                        <select
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue"
                        >
                            <option value="">Select area...</option>
                            {AREAS_EMPRESA.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    {/* Process */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Process</label>
                        <input
                            value={processName}
                            onChange={(e) => setProcessName(e.target.value)}
                            placeholder="e.g. Loan Processing"
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue w-40"
                        />
                    </div>

                    {/* Sub-Process */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-Process</label>
                        <input
                            value={subProcessName}
                            onChange={(e) => setSubProcessName(e.target.value)}
                            placeholder="e.g. Document Collection"
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt-blue/20 focus:border-cobalt-blue w-44"
                        />
                    </div>

                    <div className="flex-1" />

                    {/* Toast */}
                    {toast && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {toast}
                        </span>
                    )}

                    {/* Add row */}
                    <button
                        onClick={addRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cobalt-blue bg-cobalt-blue/10 border border-cobalt-blue/20 rounded-lg hover:bg-cobalt-blue/15 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Row
                    </button>

                    {/* Save */}
                    <button
                        onClick={() => setShowSaveModal(true)}
                        disabled={rows.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-blue rounded-lg hover:bg-navy-blue/90 transition-all shadow-sm disabled:opacity-40"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save Design
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs border-collapse min-w-[1400px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#001e42] text-white">
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-8">#</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-12">Step</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-44">Task</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-36">Owner</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-44">Deliverable</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-36">Stakeholder</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center w-16">PT (min)</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center w-16">LT (min)</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-28">Frequency</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left w-28">Value</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left">Comments</th>
                                <th className="px-3 py-2.5 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <GripVertical className="w-10 h-10 text-slate-200" />
                                            <p className="text-sm font-medium">No tasks yet</p>
                                            <p className="text-xs">Select an area and click <span className="font-semibold text-cobalt-blue">Add Row</span> to start designing your process</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => (
                                    <tr
                                        key={row.id}
                                        className={cn(
                                            "border-b border-slate-100 hover:bg-cobalt-blue/3 transition-colors",
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                        )}
                                    >
                                        <td className="px-3 py-1.5 text-[11px] text-slate-300 font-mono">{idx + 1}</td>
                                        {/* Step # */}
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="number"
                                                value={row.stepNumber}
                                                onChange={(e) => updateRow(row.id, "stepNumber", Number(e.target.value))}
                                                className="w-12 text-xs border border-slate-200 rounded px-1.5 py-1 text-center focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue"
                                                min={1}
                                            />
                                        </td>
                                        {/* Task */}
                                        <td className="px-2 py-1.5">
                                            <input
                                                value={row.task}
                                                onChange={(e) => updateRow(row.id, "task", e.target.value)}
                                                placeholder="Describe the task..."
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue"
                                            />
                                        </td>
                                        {/* Owner */}
                                        <td className="px-2 py-1.5">
                                            <select
                                                value={row.owner}
                                                onChange={(e) => updateRow(row.id, "owner", e.target.value)}
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue bg-white"
                                            >
                                                <option value="">Select owner...</option>
                                                {employees.map((e) => (
                                                    <option key={e.eid} value={e.name}>{e.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        {/* Deliverable */}
                                        <td className="px-2 py-1.5">
                                            <input
                                                value={row.deliverable}
                                                onChange={(e) => updateRow(row.id, "deliverable", e.target.value)}
                                                placeholder="File, approval, report..."
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue"
                                            />
                                        </td>
                                        {/* Stakeholder */}
                                        <td className="px-2 py-1.5">
                                            <select
                                                value={row.stakeholder}
                                                onChange={(e) => updateRow(row.id, "stakeholder", e.target.value)}
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue bg-white"
                                            >
                                                <option value="">Select stakeholder...</option>
                                                {employees.map((e) => (
                                                    <option key={e.eid} value={e.name}>{e.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        {/* PT */}
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="number"
                                                value={row.pt}
                                                onChange={(e) => updateRow(row.id, "pt", Number(e.target.value))}
                                                className="w-16 text-xs border border-slate-200 rounded px-1.5 py-1 text-center focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue"
                                                min={0}
                                            />
                                        </td>
                                        {/* LT */}
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="number"
                                                value={row.lt}
                                                onChange={(e) => updateRow(row.id, "lt", Number(e.target.value))}
                                                className="w-16 text-xs border border-slate-200 rounded px-1.5 py-1 text-center focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue"
                                                min={0}
                                            />
                                        </td>
                                        {/* Frequency */}
                                        <td className="px-2 py-1.5">
                                            <select
                                                value={row.frequency}
                                                onChange={(e) => updateRow(row.id, "frequency", e.target.value as TaskFrequency)}
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue bg-white"
                                            >
                                                {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </td>
                                        {/* Value */}
                                        <td className="px-2 py-1.5">
                                            <select
                                                value={row.value}
                                                onChange={(e) => updateRow(row.id, "value", e.target.value as TaskValue)}
                                                className={cn(
                                                    "w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue",
                                                    "font-medium", VALUE_COLORS[row.value]
                                                )}
                                            >
                                                {VALUE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </td>
                                        {/* Comments */}
                                        <td className="px-2 py-1.5">
                                            <input
                                                value={row.comments}
                                                onChange={(e) => updateRow(row.id, "comments", e.target.value)}
                                                placeholder="Notes..."
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cobalt-blue/30 focus:border-cobalt-blue"
                                            />
                                        </td>
                                        {/* Delete */}
                                        <td className="px-2 py-1.5">
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-navy-blue">Save Design</h3>
                            <button onClick={() => setShowSaveModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Design Name</label>
                        <input
                            autoFocus
                            value={designName}
                            onChange={(e) => setDesignName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            placeholder="e.g. Loan Processing — v1"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={!designName.trim()}
                                className="px-4 py-2 text-xs font-semibold text-white bg-navy-blue rounded-lg hover:bg-navy-blue/90 flex items-center gap-1.5 disabled:opacity-40"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
