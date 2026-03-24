"use client";

import React, { useState } from "react";
import { X, Clock, Users, ArrowRight, Activity, CalendarDays, CheckCircle2 } from "lucide-react";
import { PlaybookAssignmentPanel } from "@/components/shared/PlaybookAssignmentPanel";
import { useTenant } from "@/lib/tenant-context";

interface PlaybookPreviewModalProps {
  playbook: any; // the whole playbook including steps
  onClose: () => void;
}

export const PlaybookPreviewModal: React.FC<PlaybookPreviewModalProps> = ({ playbook, onClose }) => {
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const { currentTenant } = useTenant();
  const orgId = currentTenant?.tenant_id ?? '';

  if (!playbook) return null;

  // Calculate total duration based on highest scheduler value
  let totalDurationDays = 0;
  playbook.bp_playbook_steps?.forEach((step: any) => {
    if (step.scheduler_value > totalDurationDays) {
      totalDurationDays = step.scheduler_value;
    }
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      {/* Side Peek Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
          <div>
            <div className="flex gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">{playbook.status}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700">{playbook.type}</span>
            </div>
            <h2 className="text-3xl font-black text-navy-blue tracking-tight leading-none mb-2">{playbook.name}</h2>
            <p className="text-sm font-medium text-slate-500 max-w-lg">{playbook.mission || 'No mission available.'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors shadow-sm bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">FAMILY / STRAT</p>
              <p className="text-sm font-bold text-slate-800">{playbook.family} / {playbook.strategy}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10} /> OWNERS</p>
              <p className="text-sm font-bold text-slate-800 truncate">{Array.isArray(playbook.global_owners) ? playbook.global_owners.join(', ') : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> STEPS</p>
              <p className="text-sm font-bold text-slate-800">{playbook.bp_playbook_steps?.length || 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CalendarDays size={10} /> DURATION</p>
              <p className="text-sm font-bold text-slate-800">{totalDurationDays} Days</p>
            </div>
          </div>

          {/* Steps List */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">TACTICAL EXECUTION PLAN</h3>
            <div className="space-y-3 relative">
              {/* Vertical line connecting steps */}
              <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-100 z-0"></div>
              
              {playbook.bp_playbook_steps?.sort((a: any, b: any) => a.scheduler_value - b.scheduler_value).map((step: any, idx: number) => (
                <div key={step.id} className="relative z-10 flex gap-4 bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* Step Sequence Bubble */}
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#002B5B] flex flex-col items-center justify-center shadow-lg text-white">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-70">DAY</span>
                    <span className="text-lg font-black leading-none">{step.scheduler_value || 0}</span>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {step.type_of_activity}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 uppercase tracking-tight leading-none">{step.name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{step.purpose || step.activity_description}</p>
                  </div>

                  {/* Right Meta */}
                  <div className="shrink-0 flex flex-col items-end gap-2 border-l border-slate-50 pl-4 w-48">
                    <div className="flex items-center gap-1.5 w-full justify-end text-slate-700">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">FREQ:</span>
                      <span className="text-xs font-bold uppercase">{step.frequency} ({step.repetitions}X)</span>
                    </div>
                    
                    {step.requested_to && (
                      <div className="flex items-center justify-end w-full gap-1 p-1 bg-amber-50 rounded border border-amber-100">
                        <Activity size={10} className="text-amber-500" />
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter truncate">
                          {step.requested_to}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">Created {new Date(playbook.created_at).toLocaleDateString()}</p>
          <button 
            onClick={() => setShowAssignPanel(true)}
            className="px-8 py-3 bg-[var(--cobalt-blue)] hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
          >
            ASIGNAR PLAYBOOK <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Assignment Panel */}
      {showAssignPanel && (
        <PlaybookAssignmentPanel
          mode="playbook-first"
          playbook={playbook}
          orgId={orgId}
          onClose={() => setShowAssignPanel(false)}
        />
      )}
    </>
  );
};
