"use client";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — FLOW INSPECTOR (BPMN WHITE EDITION — V20)
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * US-006: As a Designer, I can view a full-screen BPMN narrative trace for
 *         any locked step, showing the 6-node sequence with click-to-expand
 *         descriptions and a contingency tandem (dashed exception flow).
 *
 * Atomic Fidelity:
 * - Descending analogous harmony: Violet → Indigo → Blue → Cyan → Teal → Emerald
 * - Contingency Tandem: Amber node, dashed vertical branch from Activity Task
 * - Click-to-reveal descriptions natively integrated (no scrolling)
 * - White corporate canvas for max contrast
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  X, GitBranch, User, Zap, FileText, Users,
  Clock, Target, Shield,
} from 'lucide-react';
import { PlaybookStep, EmployeeRef, PlaybookOwner } from './types';
import { SolidNode, NodeConnector } from './SubComponents';

interface FlowInspectorBPMNProps {
  step: PlaybookStep;
  owners: PlaybookOwner[];
  employeeList: EmployeeRef[];
  playbookPurpose: string;
  onClose: () => void;
}

type ActiveNodeId = 'actor' | 'action' | 'deliverable' | 'cadence' | 'sla' | 'counter' | null;

export const FlowInspectorBPMN: React.FC<FlowInspectorBPMNProps> = ({
  step,
  owners,
  employeeList,
  playbookPurpose,
  onClose,
}) => {
  const [activeNode, setActiveNode] = useState<ActiveNodeId>(null);
  const employee = employeeList.find(e => e.id === step.requestedToId);

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col p-6 animate-in fade-in duration-300 overflow-hidden">

      {/* CORPORATE HEADER */}
      <header className="flex justify-between items-center mb-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <GitBranch size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Process Trace Engine</h2>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Activity Step {step.stepNum}</span>
              <span className="text-[10px] text-slate-300">•</span>
              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">ID: {step.uid}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </header>

      {/* MAIN VISUAL CANVAS */}
      <div className="flex-1 flex flex-col justify-center items-center relative gap-8">

        {/* NARRATIVE BACKGROUND */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-50 font-black text-[25vw] pointer-events-none tracking-tighter uppercase whitespace-nowrap z-0">
          BPMN
        </div>

        {/* ROW 1: THE CORE SEQUENCE (DESCENDING ANALOGOUS HARMONY) */}
        <div className="flex items-start justify-center gap-2 relative z-10 w-full px-10">

          {/* VIOLET-600 → USER TASK */}
          <SolidNode
            label="EXECUTORS"
            title={owners.map(o => o.name).join(' & ')}
            bgClass="bg-violet-600"
            icon={<User size={20} />}
            desc={playbookPurpose}
            isActive={activeNode === 'actor'}
            onClick={() => setActiveNode(activeNode === 'actor' ? null : 'actor')}
          />

          <NodeConnector label={`Day ${step.schedulerValue}`} />

          {/* INDIGO-600 → ACTIVITY TASK WITH TANDEM BRANCH */}
          <div className="relative">
            <SolidNode
              label="ACTIVITY TASK"
              title={step.name}
              bgClass="bg-indigo-600"
              icon={<Zap size={20} />}
              desc={step.activityDescription}
              isActive={activeNode === 'action'}
              onClick={() => setActiveNode(activeNode === 'action' ? null : 'action')}
            />

            {/* VERTICAL BRANCH TO COUNTERACTION (EXCEPTION FLOW) */}
            <div className="absolute left-1/2 -bottom-[130px] -translate-x-1/2 flex flex-col items-center">
              <div className="h-12 w-0 border-r-2 border-dashed border-slate-300"></div>
              <div
                className="bg-amber-500 p-4 rounded-2xl w-[260px] shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
                onClick={() => setActiveNode(activeNode === 'counter' ? null : 'counter')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-white/20 text-white"><Shield size={16} /></div>
                  <div>
                    <label className="text-[8px] font-black text-white/70 uppercase tracking-widest block">CONTINGENCY TANDEM</label>
                    <h4 className="text-[11px] font-black text-white uppercase truncate">{step.supportingTask}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 bg-black/10 rounded-xl text-white">
                  <User size={12} />
                  <span className="text-[9px] font-bold uppercase truncate">{employee ? employee.name : 'UNASSIGNED'}</span>
                </div>
                {activeNode === 'counter' && step.counteractionDescription && (
                  <div className="mt-3 p-3 bg-black/10 rounded-xl text-[10px] text-white font-medium italic leading-snug animate-in zoom-in duration-300 text-left">
                    &quot;{step.counteractionDescription}&quot;
                  </div>
                )}
                {step.counteractionDescription && activeNode !== 'counter' && (
                  <div className="mt-2 text-[6px] font-black text-white/60 uppercase tracking-widest text-center">Click to Expand</div>
                )}
              </div>
            </div>
          </div>

          <NodeConnector label="Produces" />

          {/* BLUE-600 → DATA OBJECT */}
          <SolidNode
            label="DATA DELIVERABLE"
            title={step.deliverable}
            bgClass="bg-blue-600"
            icon={<FileText size={20} />}
            desc={step.deliverableDescription}
            isActive={activeNode === 'deliverable'}
            onClick={() => setActiveNode(activeNode === 'deliverable' ? null : 'deliverable')}
          />

          {/* MESSAGE FLOW TO EXTERNAL POOL */}
          <NodeConnector label="Message" dashed={true} />

          {/* CYAN-600 → STAKEHOLDER */}
          <SolidNode
            label="RECIPIENT"
            title={step.stakeholderName || 'UNKNOWN'}
            bgClass="bg-cyan-600"
            icon={<Users size={20} />}
          />

          <NodeConnector label="Execution" />

          {/* TEAL-600 → TIMER EVENT */}
          <SolidNode
            label="CADENCE TIMER"
            title={`${step.repetitions}x ${step.frequency}`}
            bgClass="bg-teal-600"
            icon={<Clock size={20} />}
            desc={step.freqNotes}
            isActive={activeNode === 'cadence'}
            onClick={() => setActiveNode(activeNode === 'cadence' ? null : 'cadence')}
          />

          <NodeConnector label="Metric" />

          {/* EMERALD-600 → END EVENT (SLA) */}
          <SolidNode
            label="SUCCESS SLA"
            title={step.sla}
            bgClass="bg-emerald-600"
            icon={<Target size={20} />}
            desc={step.slaDescription}
            isActive={activeNode === 'sla'}
            onClick={() => setActiveNode(activeNode === 'sla' ? null : 'sla')}
          />
        </div>

        {/* BOTTOM SPACER FOR TANDEM VIEWING */}
        <div className="h-[140px]"></div>
      </div>

      {/* FOOTER */}
      <footer className="flex justify-between items-center px-4 pt-4 border-t border-slate-100 text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">BPMN 2.0 Narrative Protocol</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">SIMO INTELLISENSE — WORLD CLASS ARCHITECTURE</p>
      </footer>
    </div>
  );
};
