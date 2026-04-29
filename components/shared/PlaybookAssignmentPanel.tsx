"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X, Users, CalendarDays, ArrowRight, Plus, Trash2,
  Search, ChevronDown, Check, Loader2, CheckCircle2
} from "lucide-react";
import {
  getEligibleEmployeesForPlaybookAction,
  getPublishedPlaybooksAction,
} from "@/app/actions/playbook-assignment-actions";
import { assignPlaybookAction } from "@/app/actions/pmo-actions";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  eid: string;
  primer_nombre: string;
  primer_apellido: string;
  role_title: string;
  assigned_branch_code?: string;
}

interface PlaybookStep {
  scheduler_value?: number;
  name?: string;
  type_of_activity?: string;
}

interface Playbook {
  id: string;
  name: string;
  type?: string;
  family?: string;
  strategy?: string;
  bp_playbook_steps?: PlaybookStep[];
}

/** One assignment row: a set of employees + a start date */
interface AssignmentRow {
  id: string; // local UUID for React key
  selectedEids: string[];
  startDate: string;
  search: string;
}

export interface PlaybookAssignmentPanelProps {
  mode: "playbook-first" | "employee-first";
  playbook?: Playbook;
  onClose: () => void;
  orgId: string;
}

// ─── Workday Helper ────────────────────────────────────────────────────────────

function nextWorkday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  else if (day === 0) d.setDate(d.getDate() + 1);
  return d;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const PlaybookAssignmentPanel: React.FC<PlaybookAssignmentPanelProps> = ({
  mode,
  playbook: initialPlaybook,
  onClose,
  orgId,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(initialPlaybook ?? null);
  const [availablePlaybooks, setAvailablePlaybooks] = useState<Playbook[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [totalAssigned, setTotalAssigned] = useState(0);

  // Multi-row assignment state — starts with 1 empty row
  const [rows, setRows] = useState<AssignmentRow[]>([
    { id: uid(), selectedEids: [], startDate: "", search: "" },
  ]);

  // ── Load eligible employees when playbook is selected ──
  useEffect(() => {
    if (!selectedPlaybook || !orgId) return;
    setLoadingEmployees(true);
    setRows([{ id: uid(), selectedEids: [], startDate: "", search: "" }]);
    getEligibleEmployeesForPlaybookAction(selectedPlaybook.id, orgId)
      .then((data) => setEmployees(data as Employee[]))
      .finally(() => setLoadingEmployees(false));
  }, [selectedPlaybook, orgId]);

  // ── Load playbooks for employee-first mode ──
  useEffect(() => {
    if (mode !== "employee-first" || !orgId) return;
    getPublishedPlaybooksAction(orgId)
      .then((data) => setAvailablePlaybooks(data as Playbook[]));
  }, [mode, orgId]);

  // ── Group employees by role title ──
  const employeesByRole = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    employees.forEach((e) => {
      const role = e.role_title || "Other";
      if (!groups[role]) groups[role] = [];
      groups[role].push(e);
    });
    return groups;
  }, [employees]);

  // ── Row helpers ──
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: uid(), selectedEids: [], startDate: "", search: "" },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<AssignmentRow>) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const toggleEmployee = (rowId: string, eid: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const has = r.selectedEids.includes(eid);
      return { ...r, selectedEids: has ? r.selectedEids.filter(e => e !== eid) : [...r.selectedEids, eid] };
    }));
  };

  const getFilteredEmployees = (row: AssignmentRow): Employee[] => {
    if (!row.search) return employees;
    const q = row.search.toLowerCase();
    return employees.filter(
      (e) =>
        e.primer_nombre.toLowerCase().includes(q) ||
        e.primer_apellido.toLowerCase().includes(q) ||
        e.role_title.toLowerCase().includes(q) ||
        e.eid.toLowerCase().includes(q)
    );
  };

  const getEmployeeName = (eid: string) => {
    const e = employees.find((emp) => emp.eid === eid);
    if (!e) return eid;
    return `${e.primer_nombre} ${e.primer_apellido}`;
  };

  // ── Validation ──
  const canConfirm =
    !!selectedPlaybook &&
    rows.length > 0 &&
    rows.every((r) => r.selectedEids.length > 0 && !!r.startDate);

  // ── Submit all rows ──
  const handleConfirm = async () => {
    if (!canConfirm || !selectedPlaybook) return;
    setIsSubmitting(true);
    let total = 0;
    try {
      for (const row of rows) {
        const startDateObj = nextWorkday(new Date(row.startDate));
        const result = await assignPlaybookAction({
          playbookId: selectedPlaybook.id,
          employeeEids: row.selectedEids,
          startDate: startDateObj,
          orgId,
          assignedByEid: "SYS-001",
        });
        if (result.success) total += result.tasksCreated || 0;
      }
      setTotalAssigned(total);
      setConfirmed(true);
      setTimeout(onClose, 3000);
    } catch (err) {
      console.error("Error assigning playbook:", err);
      alert("Error creating assignments. See console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ──
  if (confirmed) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-600" size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800">Assignments Created</h3>
        <p className="text-sm text-slate-500">
          <span className="font-bold text-emerald-600">{totalAssigned} tasks</span> created across {rows.length} assignment group{rows.length !== 1 ? "s" : ""}.
        </p>
        <p className="text-xs text-slate-400">Closing automatically…</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#001E4C] text-white px-5 py-4 flex items-start justify-between shrink-0">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-0.5">ASSIGN PLAYBOOK</p>
          <h2 className="text-base font-black leading-tight">{selectedPlaybook?.name ?? "Select a Playbook"}</h2>
          {selectedPlaybook && (
            <p className="text-[10px] text-blue-200 mt-0.5">
              {selectedPlaybook.bp_playbook_steps?.length ?? 0} steps · {employees.length} eligible employees
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors mt-0.5">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Loading employees */}
        {loadingEmployees && (
          <div className="flex items-center gap-2 justify-center py-8 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-bold">Loading eligible employees…</span>
          </div>
        )}

        {/* No employees found */}
        {!loadingEmployees && selectedPlaybook && employees.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
            <Users size={24} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-400">No eligible employees found</p>
            <p className="text-xs text-slate-300 mt-1">
              Ensure HC Master has active employees with matching role titles defined in this playbook&apos;s Responsible field.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ASSIGNMENT GROUPS — Table-style with inline checkboxes             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!loadingEmployees && employees.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-[#0056C0]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Assignment Groups
                </span>
              </div>
              <button
                onClick={addRow}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
              >
                <Plus size={11} /> Add Group
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row, idx) => (
                <div key={row.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Group header — date picker inline */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Group {idx + 1}
                      {row.selectedEids.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px]">
                          {row.selectedEids.length} selected
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={10} className="text-slate-400" />
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(e) => updateRow(row.id, { startDate: e.target.value })}
                          min={new Date().toISOString().split("T")[0]}
                          className="border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400 bg-white w-[130px]"
                        />
                      </div>
                      {rows.length > 1 && (
                        <button onClick={() => removeRow(row.id)} className="p-0.5 text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[28px_1fr_1fr] px-3 py-1.5 bg-slate-50/60 border-b border-slate-100">
                    <span></span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Employee</span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Role Title</span>
                  </div>

                  {/* Search bar */}
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
                      <Search size={11} className="text-slate-400" />
                      <input
                        value={row.search}
                        onChange={(e) => updateRow(row.id, { search: e.target.value })}
                        placeholder="Search by name or role…"
                        className="flex-1 bg-transparent text-xs outline-none text-slate-700 placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Employee rows — table grid with checkboxes */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {Object.entries(
                      getFilteredEmployees(row).reduce<Record<string, Employee[]>>((acc, e) => {
                        const r = e.role_title || "Other";
                        if (!acc[r]) acc[r] = [];
                        acc[r].push(e);
                        return acc;
                      }, {})
                    ).map(([role, emps]) => (
                      <div key={role}>
                        {/* Role group header */}
                        <div className="px-3 py-1.5 bg-blue-50/50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">
                            {role.replace(/_/g, " ")}
                          </span>
                          <span className="text-[8px] font-bold text-blue-400">
                            {emps.length} {emps.length === 1 ? "employee" : "employees"}
                          </span>
                        </div>
                        {/* Employee rows */}
                        {emps.map((emp) => {
                          const selected = row.selectedEids.includes(emp.eid);
                          return (
                            <button
                              key={emp.eid}
                              type="button"
                              onClick={() => toggleEmployee(row.id, emp.eid)}
                              className={`w-full grid grid-cols-[28px_1fr_1fr] items-center px-3 py-2.5 text-left transition-all ${
                                selected
                                  ? "bg-blue-50/80 border-l-2 border-l-blue-500"
                                  : "hover:bg-slate-50 border-l-2 border-l-transparent"
                              }`}
                            >
                              {/* Checkbox */}
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                selected
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-slate-300 bg-white"
                              }`}>
                                {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                              </div>

                              {/* Name column */}
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {emp.primer_nombre} {emp.primer_apellido}
                                </p>
                                <p className="text-[9px] text-slate-400 truncate">
                                  {emp.eid}{emp.assigned_branch_code ? ` · ${emp.assigned_branch_code}` : ""}
                                </p>
                              </div>

                              {/* Role Title column */}
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full truncate inline-block max-w-full">
                                  {emp.role_title}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    {getFilteredEmployees(row).length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-4">No employees match your search.</p>
                    )}
                  </div>

                  {/* Selected summary at bottom */}
                  {row.selectedEids.length > 0 && (
                    <div className="px-3 py-2 bg-blue-50/40 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {row.selectedEids.map((eid) => (
                          <span key={eid} className="flex items-center gap-1 bg-white text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-sm">
                            {getEmployeeName(eid)}
                            <button onClick={() => toggleEmployee(row.id, eid)} className="hover:text-red-500 ml-0.5 text-blue-400">×</button>
                          </span>
                        ))}
                      </div>
                      {row.startDate && (
                        <p className="text-[9px] text-blue-500 mt-1.5 font-bold">
                          Start: {fmtDate(row.startDate)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 p-4 bg-white">
        <button
          onClick={handleConfirm}
          disabled={!canConfirm || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
            canConfirm && !isSubmitting
              ? "bg-[#002B5B] text-white hover:bg-[#001E4C] shadow-lg hover:shadow-xl active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <><Loader2 size={14} className="animate-spin" /> Creating…</>
          ) : (
            <><ArrowRight size={14} /> Confirm Assignment</>
          )}
        </button>
        {!canConfirm && (
          <p className="text-center text-[9px] text-slate-400 mt-2">
            Each group needs at least one employee and a start date.
          </p>
        )}
      </div>
    </div>
  );
};
