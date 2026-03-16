"use client";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — MODAL COMPONENTS
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * US-008: As a Designer, I receive a warning before destructive/integrity actions.
 * US-009: As a Designer, I can view/edit rich text descriptions in a full modal.
 *         When a step is locked, the description modal is read-only.
 * ============================================================================
 */

import React, { useState } from 'react';
import { AlertTriangle, Copy, Shield, FileText, X } from 'lucide-react';
import { PlaybookStep, WarningModalType } from './types';

// ─── SystemModal ──────────────────────────────────────────────────────────────

interface SystemModalProps {
  title: string;
  message: string;
  type: WarningModalType | 'alert' | 'confirm';
  onClose: () => void;
  onConfirm?: () => void;
}

export const SystemModal: React.FC<SystemModalProps> = ({ title, message, type, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80 animate-in fade-in duration-300 text-center text-slate-900">
    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border p-10 animate-in zoom-in duration-400">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 shadow-xl ${type === 'alert' ? 'bg-red-50 text-red-500 border-red-100' : type === 'confirm' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-amber-50 text-amber-500 border-amber-100'}`}>
        {type === 'alert' ? <AlertTriangle size={40} /> : type === 'confirm' ? <Copy size={40} /> : <Shield size={40} />}
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight mb-3 leading-tight">{title}</h3>
      <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">&quot;{message}&quot;</p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all"
        >
          CANCEL
        </button>
        <button
          onClick={type === 'alert' ? onClose : onConfirm}
          className={`flex-1 py-3 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all ${type === 'uncheck' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {type === 'alert' ? 'UNDERSTOOD' : type === 'confirm' ? 'YES, REPLACE' : 'CONFIRM'}
        </button>
      </div>
    </div>
  </div>
);

// ─── WarningModal ─────────────────────────────────────────────────────────────

interface WarningModalProps {
  data: {
    title: string;
    message: string;
    type: WarningModalType | '';
    data: PlaybookStep | null;
  };
  onClose: () => void;
  onConfirm: () => void;
}

export const WarningModal: React.FC<WarningModalProps> = ({ data, onClose, onConfirm }) => (
  <SystemModal
    title={data.title}
    message={data.message}
    type={(data.type || 'alert') as WarningModalType}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);

// ─── DescriptionModal ─────────────────────────────────────────────────────────
// Atomic fidelity: modal is fully read-only when step isLocked = true

interface DescriptionModalProps {
  title: string;
  value: string;
  isReadOnly: boolean;
  onSave: (v: string) => void;
  onClose: () => void;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({ title, value, isReadOnly, onSave, onClose }) => {
  const [text, setText] = useState(value);
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-200 text-slate-900">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-tighter">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-2 flex justify-between">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Detail Specifications</span>
            <span className="text-[8px] font-black text-slate-400">{text.length}/1000</span>
          </div>
          <textarea
            maxLength={1000}
            value={text}
            onChange={(e) => !isReadOnly && setText(e.target.value)}
            readOnly={isReadOnly}
            className={`w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] outline-none ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'focus:border-indigo-500'} transition-all font-medium text-slate-600 italic resize-none leading-relaxed`}
            placeholder={isReadOnly ? "No details provided." : "Enter details..."}
          />
          <div className="mt-4 flex justify-end gap-2 text-[10px] font-black uppercase">
            {isReadOnly ? (
              <button
                onClick={onClose}
                className="px-8 py-2 bg-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-300 active:scale-95 transition-all"
              >
                CLOSE
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-5 py-2 border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  DISCARD
                </button>
                <button
                  onClick={() => onSave(text)}
                  className="px-8 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-500/20"
                >
                  SAVE CHANGES
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
