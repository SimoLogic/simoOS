"use client";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — EDITOR AREA
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * US-002: As a Designer, I can add operational nodes (steps) with full metadata.
 * US-003: As a Designer, I can lock/save a step after editing.
 * US-004: As a Designer, I can mark a step as Repeatable for the library.
 * US-005: As a Designer, I can drag-and-drop roles onto steps.
 * US-007: As a Designer, I can reorder steps via drag-and-drop (unlocked steps only).
 *
 * Atomic Fidelity:
 * - Activity Type Square: bg-slate-900 (editing) / bg-slate-400 (locked/saved)
 * - Activity Detail Text: text-slate-800 (editing) / text-amber-600 (locked/saved)
 * - Reordering only allowed on unlocked steps (draggable={!step.isLocked})
 * - Drop target accepts: "repeatableActivity" JSON, "activityType" string, "roleName" string
 * ============================================================================
 */

import React, { RefObject } from 'react';
import {
  Plus, GripVertical, Edit2, Save, CheckCircle2, FileText,
  Users, ArrowRight, Clock, Target, ChevronUp, ChevronDown, Eye, CalendarDays,
} from 'lucide-react';
import { PlaybookState, PlaybookStep, ActivityLibraryItem, EmployeeRef, PlaybookOwner } from './types';
import { DropArea } from './SubComponents';
import type { StepSchedule } from './usePlaybookSchedule';

// ─── CSS injection for micro font sizes ──────────────────────────────────────

export const injectedStyles = `
  .pb-text-4 { font-size: 4px !important; line-height: 1 !important; }
  .pb-text-5 { font-size: 5px !important; line-height: 1 !important; }
  .pb-text-6 { font-size: 6px !important; line-height: 1 !important; }
  .pb-text-7 { font-size: 7px !important; line-height: 1 !important; }
  .pb-text-8 { font-size: 8px !important; line-height: 1 !important; }
  .pb-text-9 { font-size: 9px !important; line-height: 1 !important; }
  .pb-text-10 { font-size: 10px !important; line-height: 1.2 !important; }
  .pb-grid-5 { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
  .pb-scrollbar::-webkit-scrollbar { width: 6px; }
  .pb-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .pb-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditorAreaProps {
  playbook: PlaybookState;
  onUpdate: (stepId: number, field: keyof PlaybookStep, value: PlaybookStep[keyof PlaybookStep]) => void;
  onLock: (stepId: number) => void;
  onRepeat: (step: PlaybookStep) => void;
  onReplace: (targetId: number, sourceData: PlaybookStep) => void;
  onAddOwner: (role: PlaybookOwner) => void;
  onRemoveOwner: (roleId: string) => void;
  onOpenDesc: (step: PlaybookStep, field: string, title: string) => void;
  onOpenFlow: (step: PlaybookStep) => void;
  dragItemIdx: RefObject<number | null>;
  dragOverItemIdx: RefObject<number | null>;
  handleReorderSteps: () => void;
  freqOptions: string[];
  roles: PlaybookOwner[]; // Combined internal+external roles for dropdowns
  empList: EmployeeRef[];
  lib: ActivityLibraryItem[];
  onAdd: () => void;
  /** WorkdayHelper projected dates: stepUid → { projectedDate, isoDate } */
  stepSchedule: Map<string, StepSchedule>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EditorArea: React.FC<EditorAreaProps> = ({
  playbook,
  onUpdate,
  onLock,
  onRepeat,
  onReplace,
  onAddOwner,
  onRemoveOwner,
  onOpenDesc,
  onOpenFlow,
  dragItemIdx,
  dragOverItemIdx,
  handleReorderSteps,
  freqOptions,
  roles,
  empList,
  lib,
  onAdd,
  stepSchedule,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {playbook.steps.map((step, idx) => (
        <div
          key={step.id}
          draggable={!step.isLocked}
          onDragStart={() => { if (dragItemIdx) (dragItemIdx as React.MutableRefObject<number | null>).current = idx; }}
          onDragEnter={() => { if (dragOverItemIdx) (dragOverItemIdx as React.MutableRefObject<number | null>).current = idx; }}
          onDragEnd={handleReorderSteps}
          onDragOver={(e) => e.preventDefault()}
          className={`bg-white rounded-xl border border-slate-100 shadow-md flex flex-col md:flex-row relative group overflow-hidden transition-all hover:shadow-lg ${!step.isLocked ? 'cursor-move' : ''}`}
        >
          {/* CONTROL COLUMN (LEFT) */}
          <div
            onDrop={e => {
              e.preventDefault();
              if (!step.isLocked) {
                const data = e.dataTransfer.getData("repeatableActivity");
                if (data) onReplace(step.id, JSON.parse(data));
              }
            }}
            onDragOver={e => e.preventDefault()}
            className="flex-1 p-4 border-r border-slate-50 relative group-hover:bg-slate-50/10 transition-colors"
          >
            {/* Left control column */}
            <div className="absolute top-4 left-2 flex flex-col items-center w-12 gap-1.5">
              <GripVertical size={14} className={`text-slate-100 transition-colors ${!step.isLocked && 'group-hover:text-indigo-400'}`} />
              <div className="w-6 h-6 rounded bg-indigo-600 text-white font-black pb-text-10 flex items-center justify-center shadow-md">{step.stepNum}</div>
              <div className="mt-1 border-t border-slate-100 w-full pt-1 flex flex-col items-center gap-2">
                <span className="pb-text-5 font-black text-slate-400 uppercase tracking-tighter">UID: {step.uid}</span>

                {/* REPEATABLE CHECKBOX */}
                <div onClick={() => onRepeat(step)} className="flex flex-col items-center cursor-pointer group/repeat">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${step.isRepeatable ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-white border-slate-300 group-hover/repeat:border-indigo-500'}`}>
                    {step.isRepeatable && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className={`pb-text-4 font-black uppercase text-center leading-tight mt-1 ${step.isRepeatable ? 'text-indigo-600' : 'text-slate-400'}`}>REPEATABLE</span>
                </div>

                {/* LOCK / SAVE TOGGLE */}
                <button
                  onClick={() => onLock(step.id)}
                  className={`p-1.5 rounded shadow-sm transition-all ${step.isLocked ? 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600' : 'bg-indigo-50 border border-indigo-200 text-indigo-600 animate-pulse'}`}
                >
                  {step.isLocked ? <Edit2 size={10} /> : <Save size={10} />}
                </button>
                <span className="pb-text-4 font-black text-slate-300 uppercase tracking-widest leading-none mt-1">{step.isLocked ? 'EDIT' : 'SAVE'}</span>
              </div>
            </div>

            <div className="pl-14">
              <div className="flex items-center gap-6 mb-4 text-slate-900">

                {/* ACTIVITY TYPE ZONE — drag target */}
                <div
                  onDrop={e => {
                    e.preventDefault();
                    if (!step.isLocked) {
                      const type = e.dataTransfer.getData("activityType");
                      if (type) onUpdate(step.id, 'typeOfActivity', type);
                    }
                  }}
                  onDragOver={e => e.preventDefault()}
                  className={`w-20 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${step.typeOfActivity ? (step.isLocked ? 'bg-slate-400 border-slate-400' : 'bg-slate-900 border-slate-900') : 'bg-slate-50 border-slate-200 text-slate-300 border-dashed'} text-white shadow-lg`}
                >
                  {step.typeOfActivity
                    ? <span className="pb-text-10 font-black uppercase">{step.typeOfActivity}</span>
                    : <span className="pb-text-6 font-black text-slate-300 italic uppercase text-center leading-tight">DRAG<br />TYPE</span>
                  }
                </div>

                {/* ACTIVITY DETAIL */}
                <div className="flex-1 flex flex-col justify-start">
                  <label className="pb-text-7 font-black text-slate-300 uppercase block mb-1 tracking-widest text-left leading-none">ACTIVITY DETAIL</label>
                  <div className="flex flex-col">
                    <select
                      value={step.name}
                      disabled={step.isLocked}
                      onChange={e => onUpdate(step.id, 'name', e.target.value)}
                      className={`w-full text-sm font-black uppercase outline-none bg-transparent border-b-2 border-slate-50 focus:border-indigo-400 truncate transition-colors ${step.isLocked ? 'text-amber-600 font-bold' : 'text-slate-800'}`}
                    >
                      <option disabled value="">SELECT ACTIVITY</option>
                      {lib.find(l => l.type === step.typeOfActivity)?.options.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => onOpenDesc(step, 'activityDescription', 'DESCRIBE THE ACTIVITY')}
                      className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-1.5 h-[10px]"
                    >
                      <FileText size={10} />
                      <span className="pb-text-6 font-black uppercase tracking-tighter">DESCRIBE THE ACTIVITY</span>
                    </button>
                  </div>
                </div>

                {/* TIMELINE CONTROLLER (WorkdayHelper: schedulerValue = workday offset) */}
                <div className="flex flex-col items-end gap-1 pl-4 border-l border-slate-50 shrink-0">
                  <label className="pb-text-7 font-black text-slate-400 uppercase tracking-widest leading-none">TIMELINE</label>
                  <div className={`flex items-center gap-1 p-1 border rounded-lg transition-all ${step.isLocked ? 'bg-slate-50 border-slate-100' : 'bg-indigo-50/30 border-indigo-100 shadow-inner'}`}>
                    <div className="flex flex-col">
                      <button
                        disabled={idx === 0 || step.isLocked}
                        onClick={() => onUpdate(step.id, 'schedulerValue', step.schedulerValue + 1)}
                        className="p-0.5 hover:text-indigo-600 disabled:opacity-0 text-slate-400"
                      >
                        <ChevronUp size={10} />
                      </button>
                      <button
                        disabled={idx === 0 || step.isLocked || step.schedulerValue <= 0}
                        onClick={() => onUpdate(step.id, 'schedulerValue', Math.max(0, step.schedulerValue - 1))}
                        className="p-0.5 hover:text-indigo-600 disabled:opacity-0 text-slate-400"
                      >
                        <ChevronDown size={10} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 px-1">
                      {idx !== 0 && <span className="pb-text-10 font-black text-indigo-400">+</span>}
                      <input
                        type="number"
                        value={step.schedulerValue}
                        disabled={idx === 0 || step.isLocked}
                        onChange={e => onUpdate(step.id, 'schedulerValue', parseInt(e.target.value) || 0)}
                        className="w-8 bg-transparent text-[11px] font-black text-indigo-700 outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                      />
                      <span className="pb-text-8 font-black text-indigo-400 uppercase tracking-tighter">DAYS</span>
                    </div>
                  </div>
                  {/* WorkdayHelper Projected Date Badge (US+CO holidays) */}
                  {stepSchedule.get(step.uid) && (
                    <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-teal-50 border border-teal-100 rounded-full">
                      <CalendarDays size={8} className="text-teal-500" />
                      <span className="pb-text-6 font-black text-teal-600 tracking-tight">
                        {stepSchedule.get(step.uid)!.isoDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ALIGNED ATTRIBUTE GRID (5 columns) */}
              <div className="pb-grid-5 gap-4 pt-4 border-t border-slate-100 text-slate-800">

                {/* COL 1: RESPONSIBLES */}
                <div className="flex flex-col h-[80px]">
                  <label className="pb-text-7 text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0">
                    <Users size={10} /> RESPONSIBLES
                  </label>
                  <div className="mt-2 flex-1">
                    <DropArea
                      value={playbook.globalOwners}
                      isMultiple={true}
                      disabled={step.isLocked}
                      onDrop={onAddOwner}
                      onRemove={onRemoveOwner}
                      hideLabel={true}
                    />
                  </div>
                </div>

                {/* COL 2: DELIVERABLE */}
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4">
                  <label className="pb-text-7 text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0">
                    <CheckCircle2 size={10} /> DELIVERABLE
                  </label>
                  <div className="mt-2 flex-1">
                    <input
                      value={step.deliverable}
                      disabled={step.isLocked}
                      onChange={e => onUpdate(step.id, 'deliverable', e.target.value.toUpperCase())}
                      className="w-full pb-text-9 font-black uppercase outline-none bg-transparent placeholder-slate-200"
                      placeholder="TASK GOAL"
                    />
                  </div>
                  <button
                    onClick={() => onOpenDesc(step, 'deliverableDescription', 'DESCRIBE DELIVERY')}
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-auto shrink-0 h-[10px]"
                  >
                    <FileText size={10} />
                    <span className="pb-text-6 font-black uppercase tracking-tighter">DESCRIBE DELIVERY</span>
                  </button>
                </div>

                {/* COL 3: STAKEHOLDER */}
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4">
                  <label className="pb-text-7 text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0">
                    <ArrowRight size={10} /> STAKEHOLDER
                  </label>
                  <div className="mt-2 flex-1">
                    <DropArea
                      value={step.stakeholderId ? { id: step.stakeholderId, name: step.stakeholderName || 'UNKNOWN' } as PlaybookOwner : null}
                      isMultiple={false}
                      disabled={step.isLocked}
                      onDrop={val => {
                        onUpdate(step.id, 'stakeholderId', val.id);
                        onUpdate(step.id, 'stakeholderName', val.name);
                      }}
                      hideLabel={true}
                    />
                  </div>
                </div>

                {/* COL 4: FREQUENCY */}
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4">
                  <label className="pb-text-7 text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0">
                    <Clock size={10} /> FREQ
                  </label>
                  <div className="mt-2 flex-1 flex flex-col gap-1">
                    <select
                      value={step.frequency}
                      disabled={step.isLocked}
                      onChange={e => onUpdate(step.id, 'frequency', e.target.value)}
                      className="pb-text-9 font-black uppercase outline-none bg-transparent w-full cursor-pointer border-b border-slate-100 pb-0.5"
                    >
                      {freqOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <div className="flex items-center justify-between gap-1 bg-slate-50 p-1 rounded">
                      <label className="pb-text-5 font-black text-slate-400 uppercase">REPS:</label>
                      <input
                        type="number"
                        min="1"
                        value={step.repetitions || 1}
                        disabled={step.isLocked}
                        onChange={e => onUpdate(step.id, 'repetitions', parseInt(e.target.value) || 1)}
                        className="w-6 bg-transparent pb-text-8 font-black text-indigo-700 outline-none text-center"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenDesc(step, 'freqNotes', 'DESCRIBE FREQUENCY & REPS')}
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-auto shrink-0 h-[10px]"
                  >
                    <FileText size={10} />
                    <span className="pb-text-6 font-black uppercase tracking-tighter">DESCRIBE FREQ & REPS</span>
                  </button>
                </div>

                {/* COL 5: SLA */}
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4 text-slate-900">
                  <label className="pb-text-7 text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0">
                    <Target size={10} /> SLA
                  </label>
                  <div className="mt-2 flex-1">
                    <button type="button" className="text-left w-full hover:bg-slate-50 rounded transition-all active:scale-95">
                      <p className="pb-text-9 font-black text-slate-800 uppercase truncate">{step.sla || 'SLA'}</p>
                    </button>
                  </div>
                  <button
                    onClick={() => onOpenDesc(step, 'slaDescription', 'DESCRIBE SLA')}
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-auto shrink-0 h-[10px]"
                  >
                    <FileText size={10} />
                    <span className="pb-text-6 font-black uppercase tracking-tighter">DESCRIBE SLA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COUNTERACTION COLUMN */}
          <div className="w-full md:w-72 bg-slate-50/20 p-4 flex flex-col border-t md:border-t-0 md:border-l border-slate-50 relative transition-all group-hover:bg-slate-50/40 text-left text-slate-900">
            {/* Eye → Flow Inspector (only available on locked steps) */}
            <button
              onClick={() => step.isLocked && onOpenFlow(step)}
              className={`absolute top-4 right-4 p-1 rounded-full transition-all ${step.isLocked ? 'text-indigo-600 hover:bg-indigo-100 cursor-pointer scale-110' : 'text-slate-200 cursor-not-allowed'}`}
            >
              <Eye size={18} />
            </button>

            <span className="pb-text-8 font-black text-indigo-600 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg" /> COUNTERACTION
            </span>

            <div className="space-y-4">
              <div>
                <label className="pb-text-6 font-black text-slate-400 uppercase mb-1 tracking-widest block">SUPPORT TASK:</label>
                <input
                  value={step.supportingTask}
                  disabled={step.isLocked}
                  onChange={e => onUpdate(step.id, 'supportingTask', e.target.value.toUpperCase())}
                  className="pb-text-9 font-black uppercase bg-white border border-slate-100 rounded-lg px-2 py-2 outline-none w-full shadow-sm focus:border-indigo-300 transition-all placeholder-slate-200 text-slate-900"
                  placeholder="SUPPORT NAME"
                />
              </div>
              <div>
                <label className="pb-text-6 font-black text-slate-400 uppercase mb-1 tracking-widest block">ASSIGN TO:</label>
                <select
                  value={step.requestedToId || ""}
                  disabled={step.isLocked}
                  onChange={e => {
                    const selRole = roles.find(r => r.id === e.target.value);
                    if (selRole) {
                       onUpdate(step.id, 'requestedToId', selRole.id);
                       onUpdate(step.id, 'requestedToName', selRole.name);
                    } else {
                       onUpdate(step.id, 'requestedToId', null);
                       onUpdate(step.id, 'requestedToName', null);
                    }
                  }}
                  className="pb-text-9 font-bold bg-white border border-slate-100 rounded-lg outline-none h-9 w-full shadow-sm px-2 cursor-pointer focus:border-indigo-300 transition-all text-slate-900"
                >
                  <option value="">Select Role</option>
                  {roles.map((r, index) => (
                    <option key={r.id || index} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => onOpenDesc(step, 'counteractionDescription', 'COUNTERACTION DESCRIPTION')}
                className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-700 pb-text-7 font-black uppercase tracking-widest mt-1 transition-colors"
              >
                <FileText size={10} /> Describe Request
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ADD NODE BUTTON */}
      <button
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 font-black pb-text-10 uppercase hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/10 transition-all flex items-center justify-center gap-3 active:scale-[0.99] group"
      >
        <Plus size={16} className="group-hover:rotate-90 transition-transform" />
        ADD OPERATIONAL NODE
      </button>
    </div>
  );
};
