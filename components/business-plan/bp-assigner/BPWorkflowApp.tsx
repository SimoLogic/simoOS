"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Save, Download, Info, CheckCircle2,
    AlertTriangle, Edit2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import { getEmployeesAction as getEmployees } from "@/app/actions/hr-actions";
import { Playbook, BPWorkflowEntry } from "@/lib/bp-types";
import { getPlaybooks, getBPWorkflowEntries, saveBPWorkflowEntry } from "@/lib/bp-store";
import { PlaybookSelector } from "./PlaybookSelector";
import { SupervisorSelector } from "./SupervisorSelector";
import { ColumnFilter } from "./ColumnFilter";

export const BPWorkflowApp: React.FC = () => {
    const { currentTenant } = useTenant();
    const [employees, setEmployees] = useState<any[]>([]);
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [entries, setEntries] = useState<BPWorkflowEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Multi-select Column Filters state
    const [colFilters, setColFilters] = useState<Record<string, string[]>>({
        eid: [],
        fullName: [],
        area: [],
        commercial: [],
        sv01: [], sv02: [], sv03: [],
        supporting: [],
        sv04: [], sv05: [], sv06: [],
        special: [],
        sv07: [], sv08: [], sv09: []
    });

    const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
    const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentTenant) return;
            setLoading(true);
            try {
                const [empData, pbData, wfData] = await Promise.all([
                    getEmployees(currentTenant.tenant_id),
                    getPlaybooks(),
                    getBPWorkflowEntries(currentTenant.tenant_id)
                ]);
                setEmployees(empData);
                setPlaybooks(pbData);
                setEntries(wfData);
            } catch (err) {
                console.error("Error loading BP data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentTenant]);

    const addToast = (message: string, type: "success" | "error" = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const getEntryForEmployee = (eid: string): BPWorkflowEntry => {
        const existing = entries.find(e => e.eid === eid);
        if (existing) return existing;

        const emp = employees.find(e => e.eid === eid);
        return {
            id: `entry-${eid}`,
            tenant_id: currentTenant?.tenant_id || "",
            eid,
            fullName: emp ? `${emp.maestro.primer_nombre} ${emp.maestro.primer_apellido}` : "",
            area: emp?.historialLaboral.area || "",
            directManager: emp?.historialLaboral.direct_leader || "",
            commercialPlaybooks: [],
            supervisors1: ["", "", ""],
            supportingPlaybooks: [],
            supervisors2: ["", "", ""],
            specialPlaybooks: [],
            supervisors3: ["", "", ""],
            lastModified: "",
            modifiedBy: "System"
        };
    };

    const handleUpdateEntry = (eid: string, field: keyof BPWorkflowEntry, value: any) => {
        const entry = getEntryForEmployee(eid);
        const updatedEntry = { ...entry, [field]: value };

        setEntries(prev => {
            const idx = prev.findIndex(e => e.eid === eid);
            if (idx >= 0) {
                const newEntries = [...prev];
                newEntries[idx] = updatedEntry;
                return newEntries;
            }
            return [...prev, updatedEntry];
        });
        setDirtyRows(prev => new Set(prev).add(eid));
    };

    const handleUpdateSupervisor = (eid: string, group: 1 | 2 | 3, index: number, supervisorEid: string) => {
        const entry = getEntryForEmployee(eid);
        const supervisorsField = group === 1 ? "supervisors1" : group === 2 ? "supervisors2" : "supervisors3";
        const newSupervisors = [...entry[supervisorsField]];
        newSupervisors[index] = supervisorEid;

        handleUpdateEntry(eid, supervisorsField, newSupervisors);
    };

    const handleSaveRow = async (eid: string) => {
        const entry = entries.find(e => e.eid === eid);
        if (!entry || !currentTenant) return;

        await saveBPWorkflowEntry(entry, currentTenant.tenant_id);
        setDirtyRows(prev => {
            const next = new Set(prev);
            next.delete(eid);
            return next;
        });
        addToast(`BP Workflow for ${eid} saved successfully.`);
    };

    const handleSaveAll = async () => {
        if (!currentTenant) return;
        const promises = Array.from(dirtyRows).map(eid => {
            const entry = entries.find(e => e.eid === eid);
            return entry ? saveBPWorkflowEntry(entry, currentTenant.tenant_id) : Promise.resolve();
        });

        await Promise.all(promises);
        setDirtyRows(new Set());
        addToast("All changes saved successfully.");
    };

    // --- Dynamic Options for Filters ---
    const filterOptions = useMemo(() => {
        const unique = (arr: string[]) => Array.from(new Set(arr)).filter(Boolean).sort();

        return {
            eid: unique(employees.map(e => e.eid)),
            fullName: unique(employees.map(e => `${e.maestro.primer_nombre} ${e.maestro.primer_apellido}`)),
            area: unique(employees.map(e => e.historialLaboral.area)),
            commercial: unique(playbooks.filter(p => p.category === "commercial").map(p => p.name)),
            supporting: unique(playbooks.filter(p => p.category === "supporting").map(p => p.name)),
            special: unique(playbooks.filter(p => p.category === "special").map(p => p.name)),
            managers: unique(employees.map(e => `${e.maestro.primer_nombre} ${e.maestro.primer_apellido}`))
        };
    }, [employees, playbooks]);

    const displayEmployees = useMemo(() => {
        return employees.filter(emp => {
            const entry = getEntryForEmployee(emp.eid);
            const employeeFullName = `${emp.maestro.primer_nombre} ${emp.maestro.primer_apellido}`;

            // Check each multi-select filter
            // Logic: If filter is empty, it means "All". Otherwise, value must be in filter array.

            if (colFilters.eid.length > 0 && !colFilters.eid.includes(emp.eid)) return false;
            if (colFilters.fullName.length > 0 && !colFilters.fullName.includes(employeeFullName)) return false;
            if (colFilters.area.length > 0 && !colFilters.area.includes(emp.historialLaboral.area)) return false;

            // Mapping for Playbook Names
            const checkPBs = (entryPBs: string[], filterPBs: string[]) => {
                if (filterPBs.length === 0) return true;
                const names = entryPBs.map(id => playbooks.find(p => p.id === id)?.name || "");
                return names.some(name => filterPBs.includes(name));
            };

            if (!checkPBs(entry.commercialPlaybooks, colFilters.commercial)) return false;
            if (!checkPBs(entry.supportingPlaybooks, colFilters.supporting)) return false;
            if (!checkPBs(entry.specialPlaybooks, colFilters.special)) return false;

            // Supervisor logic (01-09)
            const checkSV = (ids: string[], idx: number, filterNames: string[]) => {
                if (filterNames.length === 0) return true;
                const svEid = ids[idx];
                if (!svEid) return false;
                const sv = employees.find(e => e.eid === svEid);
                const svName = sv ? `${sv.maestro.primer_nombre} ${sv.maestro.primer_apellido}` : "";
                return filterNames.includes(svName);
            };

            if (!checkSV(entry.supervisors1, 0, colFilters.sv01)) return false;
            if (!checkSV(entry.supervisors1, 1, colFilters.sv02)) return false;
            if (!checkSV(entry.supervisors1, 2, colFilters.sv03)) return false;
            if (!checkSV(entry.supervisors2, 0, colFilters.sv04)) return false;
            if (!checkSV(entry.supervisors2, 1, colFilters.sv05)) return false;
            if (!checkSV(entry.supervisors2, 2, colFilters.sv06)) return false;
            if (!checkSV(entry.supervisors3, 0, colFilters.sv07)) return false;
            if (!checkSV(entry.supervisors3, 1, colFilters.sv08)) return false;
            if (!checkSV(entry.supervisors3, 2, colFilters.sv09)) return false;

            return true;
        });
    }, [employees, entries, colFilters, playbooks]);

    const handleExport = () => {
        const headers = ["EID", "Name", "Area", "Commercial", "SV1", "SV2", "SV3", "Supporting", "SV4", "SV5", "SV6", "Special", "SV7", "SV8", "SV9"];
        const rows = displayEmployees.map(emp => {
            const entry = getEntryForEmployee(emp.eid);
            return [
                emp.eid,
                `${emp.maestro.primer_nombre} ${emp.maestro.primer_apellido}`,
                emp.historialLaboral.area,
                entry.commercialPlaybooks.join(";"),
                entry.supervisors1[0], entry.supervisors1[1], entry.supervisors1[2],
                entry.supportingPlaybooks.join(";"),
                entry.supervisors2[0], entry.supervisors2[1], entry.supervisors2[2],
                entry.specialPlaybooks.join(";"),
                entry.supervisors3[0], entry.supervisors3[1], entry.supervisors3[2]
            ].join(",");
        });
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "BP_Workflow_Screening.csv";
        link.click();
    };

    if (!currentTenant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                <h3 className="text-lg font-bold text-navy-blue">Tenant selection required</h3>
                <p className="text-slate-500">Please select a tenant from the top bar to continue.</p>
            </div>
        );
    }

    const clearFilters = () => {
        setColFilters({
            eid: [], fullName: [], area: [], commercial: [],
            sv01: [], sv02: [], sv03: [], supporting: [],
            sv04: [], sv05: [], sv06: [], special: [],
            sv07: [], sv08: [], sv09: []
        });
    };

    const hasActiveFilters = Object.values(colFilters).some(v => v.length > 0);

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Toasts */}
            <div className="fixed top-24 right-8 z-[100] flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className={cn(
                        "px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 anima-slide-in-right",
                        t.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
                    )}>
                        {t.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                        <span className="text-sm font-medium">{t.message}</span>
                    </div>
                ))}
            </div>

            {/* Sub-Header */}
            <div className="px-8 pt-6 pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Plan</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[10px] font-bold text-cobalt-blue uppercase tracking-widest tracking-[0.15em]">BP Assigner</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy-blue flex items-center gap-2">
                            BP Workflow Screening
                            {loading && <div className="w-4 h-4 border-2 border-cobalt-blue border-t-transparent rounded-full animate-spin ml-2" />}
                        </h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Use Excel-style multi-select filters to screen your execution mesh.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Report
                        </button>
                        <button
                            onClick={handleSaveAll}
                            disabled={dirtyRows.size === 0}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm",
                                dirtyRows.size > 0
                                    ? "bg-navy-blue text-white hover:bg-navy-blue/90 hover:shadow-lg hover:-translate-y-0.5"
                                    : "bg-slate-100 text-slate-400 cursor-default"
                            )}
                        >
                            <Save className="w-4 h-4" />
                            {dirtyRows.size > 0 ? `Save ${dirtyRows.size} Changes` : "All Saved"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar for Global Filter Clear */}
            {hasActiveFilters && (
                <div className="px-8 py-2 bg-cobalt-blue/5 border-b border-cobalt-blue/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-cobalt-blue uppercase">Multiple Filters Active</span>
                        <div className="h-4 w-[1px] bg-cobalt-blue/20" />
                        <span className="text-[10px] font-medium text-slate-500 italic">Showing {displayEmployees.length} of {employees.length} team members</span>
                    </div>
                    <button onClick={clearFilters} className="text-[10px] font-black text-action-red uppercase flex items-center gap-1 hover:underline">
                        <X className="w-3 h-3" /> Clear All Filters
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white p-4">
                <div className="border border-slate-100 rounded-2xl overflow-visible shadow-sm min-w-max">
                    <table className="w-full text-sm border-collapse table-fixed">
                        <thead className="sticky top-0 z-40 bg-white">
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-4 py-3 text-center w-24 border-r border-slate-100 sticky left-0 z-50 bg-slate-50">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Action</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left w-24 border-r border-slate-100">
                                    <div className="flex flex-col gap-2">
                                        <ColumnFilter title="EID" options={filterOptions.eid} selected={colFilters.eid} onChange={v => setColFilters(p => ({ ...p, eid: v }))} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">EID</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left w-48 border-r border-slate-100">
                                    <div className="flex flex-col gap-2">
                                        <ColumnFilter title="Name" options={filterOptions.fullName} selected={colFilters.fullName} onChange={v => setColFilters(p => ({ ...p, fullName: v }))} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left w-48 border-r border-slate-100 font-bold bg-navy-blue/5">
                                    <div className="flex flex-col gap-2">
                                        <ColumnFilter title="Commercial" options={filterOptions.commercial} selected={colFilters.commercial} onChange={v => setColFilters(p => ({ ...p, commercial: v }))} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase font-black">Commercial PBs</span>
                                    </div>
                                </th>
                                {[1, 2, 3].map(i => (
                                    <th key={`sv${i}`} className="px-4 py-3 text-left w-40 border-r border-slate-100">
                                        <div className="flex flex-col gap-2">
                                            <ColumnFilter title={`SV 0${i}`} options={filterOptions.managers} selected={colFilters[`sv0${i}`]} onChange={v => setColFilters(p => ({ ...p, [`sv0${i}`]: v }))} />
                                            <span className="text-[10px] font-black text-cobalt-blue uppercase">SV 0{i}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-left w-48 border-r border-slate-100 font-bold bg-slate-100">
                                    <div className="flex flex-col gap-2">
                                        <ColumnFilter title="Support" options={filterOptions.supporting} selected={colFilters.supporting} onChange={v => setColFilters(p => ({ ...p, supporting: v }))} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase font-black">Supporting PBs</span>
                                    </div>
                                </th>
                                {[4, 5, 6].map(i => (
                                    <th key={`sv${i}`} className="px-4 py-3 text-left w-40 border-r border-slate-100">
                                        <div className="flex flex-col gap-2">
                                            <ColumnFilter title={`SV 0${i}`} options={filterOptions.managers} selected={colFilters[`sv0${i}`]} onChange={v => setColFilters(p => ({ ...p, [`sv0${i}`]: v }))} />
                                            <span className="text-[10px] font-black text-slate-400 uppercase">SV 0{i}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-left w-48 border-r border-slate-100 font-bold bg-action-red/5">
                                    <div className="flex flex-col gap-2">
                                        <ColumnFilter title="Special" options={filterOptions.special} selected={colFilters.special} onChange={v => setColFilters(p => ({ ...p, special: v }))} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase font-black">Special PBs</span>
                                    </div>
                                </th>
                                {[7, 8, 9].map(i => (
                                    <th key={`sv${i}`} className="px-4 py-3 text-left w-40 border-r border-slate-100 last:border-r-0">
                                        <div className="flex flex-col gap-2">
                                            <ColumnFilter title={`SV 0${i}`} options={filterOptions.managers} selected={colFilters[`sv0${i}`]} onChange={v => setColFilters(p => ({ ...p, [`sv0${i}`]: v }))} />
                                            <span className="text-[10px] font-black text-action-red uppercase">SV 0{i}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayEmployees.map(emp => {
                                const entry = getEntryForEmployee(emp.eid);
                                const isDirty = dirtyRows.has(emp.eid);

                                return (
                                    <tr
                                        key={emp.eid}
                                        className={cn(
                                            "transition-colors hover:bg-slate-50 group",
                                            isDirty && "bg-amber-50/30"
                                        )}
                                    >
                                        <td className="px-4 py-3 text-center border-r border-slate-100 bg-white sticky left-0 z-10 w-24 group-hover:bg-slate-50">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-cobalt-blue hover:bg-cobalt-blue/10 transition-all"
                                                    title="Edit Entry"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleSaveRow(emp.eid)}
                                                    disabled={!isDirty}
                                                    className={cn(
                                                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                        isDirty
                                                            ? "bg-cobalt-blue text-white shadow-lg shadow-cobalt-blue/30 hover:scale-110 active:scale-95"
                                                            : "text-slate-200"
                                                    )}
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100">
                                            <span className="text-xs font-mono font-bold text-slate-500">{emp.eid}</span>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                                    {emp.foto_url ? (
                                                        <img src={emp.foto_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-400">
                                                            {(emp.maestro.primer_nombre?.[0] || "") + (emp.maestro.primer_apellido?.[0] || "")}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-navy-blue truncate">{entry.fullName}</span>
                                                    {emp.historialLaboral?.job_title ? (
                                                        <span className="text-[9px] text-cobalt-blue font-semibold truncate">{emp.historialLaboral.job_title}</span>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{emp.historialLaboral.area}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Commercial Playbooks */}
                                        <td className="px-4 py-3 border-r border-slate-100 bg-navy-blue/5">
                                            <PlaybookSelector
                                                allPlaybooks={playbooks.filter(p => p.category === "commercial")}
                                                selectedIds={entry.commercialPlaybooks}
                                                onChange={(ids) => handleUpdateEntry(emp.eid, "commercialPlaybooks", ids)}
                                                placeholder="Commercial..."
                                            />
                                        </td>
                                        {[0, 1, 2].map(idx => (
                                            <td key={idx} className="px-4 py-3 border-r border-slate-100">
                                                <SupervisorSelector
                                                    allEmployees={employees}
                                                    selectedEid={entry.supervisors1[idx]}
                                                    onChange={(eid) => handleUpdateSupervisor(emp.eid, 1, idx, eid)}
                                                    excludeEid={emp.eid}
                                                />
                                            </td>
                                        ))}

                                        {/* Supporting Playbooks */}
                                        <td className="px-4 py-3 border-r border-slate-100 bg-slate-100">
                                            <PlaybookSelector
                                                allPlaybooks={playbooks.filter(p => p.category === "supporting")}
                                                selectedIds={entry.supportingPlaybooks}
                                                onChange={(ids) => handleUpdateEntry(emp.eid, "supportingPlaybooks", ids)}
                                                placeholder="Support..."
                                            />
                                        </td>
                                        {[0, 1, 2].map(idx => (
                                            <td key={idx} className="px-4 py-3 border-r border-slate-100">
                                                <SupervisorSelector
                                                    allEmployees={employees}
                                                    selectedEid={entry.supervisors2[idx]}
                                                    onChange={(eid) => handleUpdateSupervisor(emp.eid, 2, idx, eid)}
                                                    excludeEid={emp.eid}
                                                />
                                            </td>
                                        ))}

                                        {/* Special Playbooks */}
                                        <td className="px-4 py-3 border-r border-slate-100 bg-action-red/5">
                                            <PlaybookSelector
                                                allPlaybooks={playbooks.filter(p => p.category === "special")}
                                                selectedIds={entry.specialPlaybooks}
                                                onChange={(ids) => handleUpdateEntry(emp.eid, "specialPlaybooks", ids)}
                                                placeholder="Special..."
                                            />
                                        </td>
                                        {[0, 1, 2].map(idx => (
                                            <td key={idx} className="px-4 py-3 border-r border-slate-100 last:border-r-0">
                                                <SupervisorSelector
                                                    allEmployees={employees}
                                                    selectedEid={entry.supervisors3[idx]}
                                                    onChange={(eid) => handleUpdateSupervisor(emp.eid, 3, idx, eid)}
                                                    excludeEid={emp.eid}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Information */}
            <div className="px-8 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-cobalt-blue" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">SCREENING ENGINE VALIDATED</span>
                    </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                    H-OS • BP Workflow Engine v1.5 • Multi-Select Filtering Active
                </div>
            </div>
        </div>
    );
};
