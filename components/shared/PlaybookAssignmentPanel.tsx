"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X, Users, CalendarDays, ArrowRight, CheckSquare, Square,
  Search, ChevronRight, BookOpen, Check, Loader2
} from "lucide-react";
import {
  getEligibleEmployeesForPlaybookAction,
  getPublishedPlaybooksAction,
} from "@/app/actions/playbook-assignment-actions";
import { assignPlaybookAction } from "@/app/actions/pmo-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface PlaybookAssignmentPanelProps {
  /** "playbook-first": comes from BP Marketplace (playbook pre-selected).
   *  "employee-first": comes from PMO My Plan (user picks employees then playbook). */
  mode: "playbook-first" | "employee-first";
  /** Only required when mode = "playbook-first" */
  playbook?: Playbook;
  onClose: () => void;
  orgId: string;
}

// ─── Workday Helper ───────────────────────────────────────────────────────────

function nextWorkday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2); // Saturday → Monday
  else if (day === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
  return d;
}

function addWorkdays(start: Date, workdays: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < workdays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-CO", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PlaybookAssignmentPanel: React.FC<PlaybookAssignmentPanelProps> = ({
  mode,
  playbook: initialPlaybook,
  onClose,
  orgId,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availablePlaybooks, setAvailablePlaybooks] = useState<Playbook[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(
    initialPlaybook ?? null
  );
  const [selectedEids, setSelectedEids] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [playbookSearch, setPlaybookSearch] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [tasksCreatedCount, setTasksCreatedCount] = useState(0);

  // PMO mode: step tracking (0 = select employees, 1 = select playbook, 2 = date)
  const [pmoStep, setPmoStep] = useState<0 | 1 | 2>(0);

  // ── Load employees when playbook is selected ──
  useEffect(() => {
    if (!selectedPlaybook || !orgId) return;
    setLoadingEmployees(true);
    setSelectedEids(new Set());
    getEligibleEmployeesForPlaybookAction(selectedPlaybook.id, orgId)
      .then((data: Employee[]) => setEmployees(data))
      .finally(() => setLoadingEmployees(false));
  }, [selectedPlaybook, orgId]);

  // ── Load published playbooks for employee-first mode ──
  useEffect(() => {
    if (mode !== "employee-first" || !orgId) return;
    setLoadingPlaybooks(true);
    getPublishedPlaybooksAction(orgId)
      .then((data) => setAvailablePlaybooks(data as Playbook[]))
      .finally(() => setLoadingPlaybooks(false));
  }, [mode, orgId]);

  // ── Derived state ──
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.eid.toLowerCase().includes(q) ||
        e.primer_nombre.toLowerCase().includes(q) ||
        e.primer_apellido.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  const filteredPlaybooks = useMemo(() => {
    const q = playbookSearch.toLowerCase();
    if (!q) return availablePlaybooks;
    return availablePlaybooks.filter((pb) => pb.name.toLowerCase().includes(q));
  }, [availablePlaybooks, playbookSearch]);

  const startDateObj = startDate ? nextWorkday(new Date(startDate)) : null;
  const keyDates: Date[] = useMemo(() => {
    if (!startDateObj || !selectedPlaybook?.bp_playbook_steps?.length) return [];
    const values = selectedPlaybook.bp_playbook_steps!
      .map((s) => s.scheduler_value ?? 0)
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
      .slice(0, 3);
    return values.map((v) => addWorkdays(startDateObj, v));
  }, [startDateObj, selectedPlaybook]);

  const canConfirm =
    selectedEids.size > 0 && !!startDateObj && !!selectedPlaybook;

  const toggleEmployee = (eid: string) => {
    setSelectedEids((prev) => {
      const next = new Set(prev);
      next.has(eid) ? next.delete(eid) : next.add(eid);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      const result = await assignPlaybookAction({
        playbookId: selectedPlaybook.id,
        employeeEids: Array.from(selectedEids),
        startDate: startDateObj!,
        orgId,
        assignedByEid: "SYS-001" // To be replaced by auth session EID
      });
      if (result.success) {
        setTasksCreatedCount(result.tasksCreated || 0);
        setConfirmed(true);
        setTimeout(onClose, 2500);
      }
    } catch (error) {
      console.error("Error assigning playbook:", error);
      alert("Hubo un error al registrar la asignación. Ver consola.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render helpers ──
  const StepBadge = ({ active, done, label }: { active: boolean; done: boolean; label: string }) => (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
        done
          ? "bg-emerald-100 text-emerald-700"
          : active
          ? "bg-[#002B5B] text-white"
          : "bg-slate-100 text-slate-400"
      }`}
    >
      {label}
    </span>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-[60] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-[#002B5B] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">
                {mode === "playbook-first" ? "Asignar Playbook" : "Nueva Asignación — PMO"}
              </p>
              <h2 className="text-white text-xl font-black leading-tight truncate max-w-xs">
                {selectedPlaybook?.name ?? "Selecciona un Playbook"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* PMO step indicator */}
          {mode === "employee-first" && (
            <div className="flex items-center gap-2 mt-4">
              <StepBadge active={pmoStep === 0} done={pmoStep > 0} label="1. Empleados" />
              <ChevronRight size={12} className="text-blue-300" />
              <StepBadge active={pmoStep === 1} done={pmoStep > 1} label="2. Playbook" />
              <ChevronRight size={12} className="text-blue-300" />
              <StepBadge active={pmoStep === 2} done={false} label="3. Fecha" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ MODE: PLAYBOOK-FIRST ══ */}
          {mode === "playbook-first" && (
            <>
              {/* Section A — Employee Selection */}
              <SectionHeader icon={<Users size={14} />} title="Sección A — Empleados Elegibles" />
              <div className="px-6 pb-4">
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o EID..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  />
                </div>

                {loadingEmployees ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-slate-300" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-medium">
                    No hay empleados elegibles para este playbook.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {filteredEmployees.map((emp) => {
                      const isSelected = selectedEids.has(emp.eid);
                      return (
                        <button
                          key={emp.eid}
                          onClick={() => toggleEmployee(emp.eid)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                            isSelected
                              ? "bg-blue-50 border-blue-200 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`shrink-0 ${isSelected ? "text-blue-600" : "text-slate-300"}`}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              [{emp.eid}] {emp.primer_nombre} {emp.primer_apellido}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              {emp.role_title}{emp.assigned_branch_code ? ` — ${emp.assigned_branch_code}` : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedEids.size > 0 && (
                  <p className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {selectedEids.size} empleado{selectedEids.size > 1 ? "s" : ""} seleccionado{selectedEids.size > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Section B — Date Config */}
              <DateSection
                startDate={startDate}
                onDateChange={setStartDate}
                startDateObj={startDateObj}
                keyDates={keyDates}
                playbook={selectedPlaybook}
              />
            </>
          )}

          {/* ══ MODE: EMPLOYEE-FIRST (PMO) — Step 0: Employees ══ */}
          {mode === "employee-first" && pmoStep === 0 && (
            <>
              <SectionHeader icon={<Users size={14} />} title="Paso 1 — Selecciona Empleados" />
              <div className="px-6 pb-4">
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  Selecciona uno o más empleados. El siguiente paso filtrará los playbooks compatibles con sus roles.
                </p>
                {loadingPlaybooks ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
                ) : (
                  <>
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar empleado..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <AllEmployeesList orgId={orgId} search={employeeSearch} selectedEids={selectedEids} onToggle={toggleEmployee} />
                  </>
                )}
                <button
                  disabled={selectedEids.size === 0}
                  onClick={() => setPmoStep(1)}
                  className="mt-4 w-full py-2.5 bg-[#002B5B] disabled:opacity-40 hover:bg-blue-900 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  Siguiente — Seleccionar Playbook <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}

          {/* ══ MODE: EMPLOYEE-FIRST — Step 1: Playbook ══ */}
          {mode === "employee-first" && pmoStep === 1 && (
            <>
              <SectionHeader icon={<BookOpen size={14} />} title="Paso 2 — Selecciona Playbook" />
              <div className="px-6 pb-4">
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar playbook..."
                    value={playbookSearch}
                    onChange={(e) => setPlaybookSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                {loadingPlaybooks ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {filteredPlaybooks.map((pb) => {
                      const isSelected = selectedPlaybook?.id === pb.id;
                      return (
                        <button
                          key={pb.id}
                          onClick={() => setSelectedPlaybook(pb)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? "bg-blue-50 border-blue-200 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <span className={`shrink-0 ${isSelected ? "text-blue-600" : "text-slate-300"}`}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{pb.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase">
                              {pb.type} · {pb.family} · {pb.strategy}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setPmoStep(0)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                  >
                    Atrás
                  </button>
                  <button
                    disabled={!selectedPlaybook}
                    onClick={() => setPmoStep(2)}
                    className="flex-1 py-2.5 bg-[#002B5B] disabled:opacity-40 hover:bg-blue-900 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══ MODE: EMPLOYEE-FIRST — Step 2: Date ══ */}
          {mode === "employee-first" && pmoStep === 2 && (
            <>
              <div className="px-6 pt-4">
                <button onClick={() => setPmoStep(1)} className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 mb-2 transition-colors">
                  ← Atrás
                </button>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Playbook seleccionado</p>
                  <p className="text-sm font-bold text-[#002B5B]">{selectedPlaybook?.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{selectedEids.size} empleado{selectedEids.size > 1 ? "s" : ""} seleccionado{selectedEids.size > 1 ? "s" : ""}</p>
                </div>
              </div>
              <DateSection
                startDate={startDate}
                onDateChange={setStartDate}
                startDateObj={startDateObj}
                keyDates={keyDates}
                playbook={selectedPlaybook}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white shrink-0">
          {confirmed ? (
            <div className="flex flex-col items-center justify-center gap-1 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" />
                <span className="text-sm font-black text-emerald-700 uppercase tracking-widest">¡Asignación registrada!</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold">{tasksCreatedCount} tareas y dependencias creadas</p>
            </div>
          ) : (
            <button
              disabled={!canConfirm || isSubmitting}
              onClick={handleConfirm}
              className="w-full py-3.5 bg-[var(--cobalt-blue)] disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" /> Generando Master Plan...</>
              ) : (
                <>Confirmar Asignación <ArrowRight size={16} /></>
              )}
            </button>
          )}
          {!canConfirm && !confirmed && (
            <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
              Selecciona al menos un empleado y una fecha de inicio.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-y border-slate-100">
    <span className="text-[#0056C0]">{icon}</span>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
  </div>
);

interface DateSectionProps {
  startDate: string;
  onDateChange: (v: string) => void;
  startDateObj: Date | null;
  keyDates: Date[];
  playbook: Playbook | null;
}

const DateSection: React.FC<DateSectionProps> = ({
  startDate, onDateChange, startDateObj, keyDates, playbook,
}) => (
  <>
    <SectionHeader icon={<CalendarDays size={14} />} title="Sección B — Fecha de Inicio" />
    <div className="px-6 py-4 space-y-4">
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
          Fecha de inicio deseada
        </label>
        <input
          type="date"
          value={startDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
        />
        {startDateObj && (
          <p className="mt-2 text-xs font-semibold text-[#0056C0]">
            El playbook iniciará el <strong>{formatShortDate(startDateObj)}</strong> (próximo día hábil).
          </p>
        )}
      </div>

      {keyDates.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Preview — Primeras 3 fechas clave
          </p>
          <div className="space-y-1.5">
            {keyDates.map((d, i) => {
              const step = playbook?.bp_playbook_steps?.sort(
                (a, b) => (a.scheduler_value ?? 0) - (b.scheduler_value ?? 0)
              )[i];
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-[#002B5B] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-700 truncate">
                      {step?.name ?? `Hito ${i + 1}`}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">{step?.type_of_activity}</p>
                  </div>
                  <span className="text-[10px] font-black text-[#0056C0] shrink-0">{formatShortDate(d)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </>
);

// Sub-component: loads ALL active employees for employee-first mode step 0
const AllEmployeesList: React.FC<{
  orgId: string;
  search: string;
  selectedEids: Set<string>;
  onToggle: (eid: string) => void;
}> = ({ orgId: _orgId, search, selectedEids, onToggle }) => {
  // In employee-first mode, we use a placeholder until a playbook is selected.
  // This slot is intentionally left for future integration with an HR-wide employee list action.
  const mockNote = "En modo PMO, los empleados se cargan desde dim_employee al seleccionar el playbook en el paso 2.";

  return (
    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
      <Users size={20} className="mx-auto text-amber-400 mb-2" />
      <p className="text-xs text-amber-700 font-medium">{mockNote}</p>
      <p className="text-[10px] text-amber-500 mt-1">Buscar: <strong>{search || "—"}</strong></p>
      <p className="text-[10px] text-amber-500">Seleccionados: <strong>{selectedEids.size}</strong></p>
    </div>
  );
};

export default PlaybookAssignmentPanel;
