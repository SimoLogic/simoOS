"use client";

import React, { useState } from "react";
import { X, ArrowRight, Activity, CalendarDays, Archive } from "lucide-react";
import { PlaybookAssignmentPanel } from "@/components/shared/PlaybookAssignmentPanel";
import { deactivatePlaybookAction } from "@/app/actions/business-plan-actions";
import { useTenant } from "@/lib/tenant-context";

interface PlaybookPreviewModalProps {
  playbook: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export const PlaybookPreviewModal: React.FC<PlaybookPreviewModalProps> = ({ playbook, onClose, onRefresh }) => {
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenant_id ?? '';

  if (!playbook) return null;

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await deactivatePlaybookAction(tenantId, playbook.id);
      onRefresh?.();
      onClose();
    } catch {
      alert("Error deactivating playbook. Please try again.");
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

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

        {/* When assignment panel is shown, it takes over the entire right panel */}
        {showAssignPanel ? (
          <PlaybookAssignmentPanel
            mode="playbook-first"
            playbook={playbook}
            tenantId={tenantId}
            onClose={() => setShowAssignPanel(false)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
              <div>
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">{playbook.status}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700">{playbook.type}</span>
                </div>
                <h2 className="text-3xl font-black text-navy-blue tracking-tight leading-none mb-1">{playbook.name}</h2>
                {(playbook.version > 1) && (
                  <span className="text-xs text-slate-400 font-bold tracking-widest">VERSION {playbook.version}</span>
                )}
                <p className="text-sm font-medium text-slate-500 max-w-lg mt-1">{playbook.purpose || 'No mission available.'}</p>
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">STEPS</p>
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-[var(--cobalt-blue)]" />
                    <p className="text-sm font-bold text-slate-800">{playbook.bp_playbook_steps?.length ?? 0}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DURATION</p>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-amber-500" />
                    <p className="text-sm font-bold text-slate-800">{totalDurationDays} workdays</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VERSION</p>
                  <p className="text-sm font-bold text-slate-800">v{playbook.version ?? 1}</p>
                </div>
              </div>

              {/* Steps List */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">PLAYBOOK STEPS</h3>
                <div className="space-y-3">
                  {(playbook.bp_playbook_steps ?? []).map((step: any, idx: number) => (
                    <div
                      key={step.id || idx}
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--cobalt-blue)] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-wider leading-tight">{step.name}</p>
                        {step.type_of_activity && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase">{step.type_of_activity}</span>
                        )}
                        {step.activity_description && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{step.activity_description}</p>
                        )}
                      </div>
                      {step.scheduler_value > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-black text-slate-400 uppercase">DAY</p>
                          <p className="text-sm font-bold text-slate-700">{step.scheduler_value}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {playbook.status === 'PUBLISHED' && (
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                  >
                    <Archive size={12} /> Deactivate
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAssignPanel(true)}
                className="px-8 py-3 bg-[var(--cobalt-blue)] hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
              >
                ASSIGN PLAYBOOK <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Deactivate confirm modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-2">Deactivate Playbook?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              <strong>&quot;{playbook.name}&quot;</strong> will be marked as Inactive and hidden from the assignment flow. You can still view it by filtering for Inactive playbooks.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-50"
              >
                {isDeactivating ? "Deactivating..." : "Confirm Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
