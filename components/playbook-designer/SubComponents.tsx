"use client";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — SUB-COMPONENTS
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * Atomic Fidelity Rules:
 * - MetadataField: label + select dropdown
 * - RoleGroup: draggable role badges (internal=indigo, external=emerald)
 * - DropArea: multi-select cumulative (globalOwners) or 1:1 strict replacement (stakeholder)
 * - SolidNode: BPMN node card with click-to-expand description
 * - NodeConnector: labeled arrow between BPMN nodes
 * ============================================================================
 */

import React, { useState } from 'react';
import { Users, GripVertical, X, MoveRight } from 'lucide-react';

// ─── MetadataField ────────────────────────────────────────────────────────────

interface MetadataFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

export const MetadataField: React.FC<MetadataFieldProps> = ({ label, value, onChange, options }) => (
  <div className="flex items-center justify-between gap-2">
    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{label}:</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[8px] font-black text-indigo-700 uppercase bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none w-24 h-5 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── RoleGroup ────────────────────────────────────────────────────────────────

import { PlaybookOwner } from './types';

interface RoleGroupProps {
  title: string;
  roles: PlaybookOwner[];
  color: 'indigo' | 'emerald';
}

export const RoleGroup: React.FC<RoleGroupProps> = ({ title, roles, color }) => (
  <div>
    <h3 className="text-[8px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
      <Users size={12} className={color === 'indigo' ? 'text-indigo-500' : 'text-emerald-500'} /> {title}
    </h3>
    <div className="flex flex-wrap gap-2 text-slate-800">
      {roles.map(role => (
        <div
          key={role.id}
          draggable
          onDragStart={e => {
            // Support both object and legacy string lookups
            e.dataTransfer.setData("role", JSON.stringify(role));
            e.dataTransfer.setData("roleName", role.name);
          }}
          className={`px-2.5 py-1.5 rounded-lg border text-[8px] font-black cursor-grab active:scale-95 shadow-sm transition-all ${color === 'indigo' ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-400'}`}
        >
          {role.name}
        </div>
      ))}
    </div>
  </div>
);

// ─── DropArea ─────────────────────────────────────────────────────────────────

interface DropAreaProps {
  label?: string;
  icon?: React.ReactNode;
  value: PlaybookOwner | PlaybookOwner[] | null;
  isMultiple: boolean;
  disabled?: boolean;
  onDrop: (val: PlaybookOwner) => void;
  onRemove?: (val: string) => void;
  hideLabel?: boolean;
}

export const DropArea: React.FC<DropAreaProps> = ({
  label,
  icon,
  value,
  isMultiple,
  disabled,
  onDrop,
  onRemove,
  hideLabel = false,
}) => {
  const [isOver, setIsOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsOver(true); }}
      onDragLeave={e => { e.stopPropagation(); setIsOver(false); }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation(); // Shield Protocol: Prevent triggering parent step reorder or replacement
        setIsOver(false);
        if (!disabled) {
          const roleData = e.dataTransfer.getData("role");
          const roleName = e.dataTransfer.getData("roleName");
          
          if (roleData) {
            try {
              onDrop(JSON.parse(roleData));
            } catch (err) {
              if (roleName) onDrop({ id: roleName, name: roleName });
            }
          } else if (roleName) {
            onDrop({ id: roleName, name: roleName });
          }
        }
      }}
      className={`relative transition-all text-left text-slate-800 min-h-[28px] ${isOver ? 'bg-indigo-50/80 scale-[1.02] shadow-md z-10 rounded-lg ring-1 ring-indigo-300' : ''} ${disabled ? 'opacity-80' : ''}`}
    >
      {!hideLabel && (
        <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 mb-1 leading-none h-[10px]">
          {icon} {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5 min-h-[22px]">
        {isMultiple ? (
          ((value as PlaybookOwner[]) || []).length > 0 ? (
            ((value as PlaybookOwner[]) || []).map((role) => (
              <div key={role.id} className="bg-indigo-900 text-white px-2 py-1 rounded-lg text-[6px] font-black flex items-center gap-1.5 shadow-sm animate-in fade-in zoom-in duration-200">
                {role.name}
                {!disabled && onRemove && (
                  <X size={8} className="cursor-pointer text-indigo-400 hover:text-white transition-colors" onClick={() => onRemove(role.id)} />
                )}
              </div>
            ))
          ) : (
            // Empty state placeholder — matches Stakeholder visual parity
            <div className="text-[7px] text-slate-200 italic font-black uppercase text-center w-full border border-dashed border-slate-200 rounded-lg py-1">DROP ROLE</div>
          )
        ) : (
          (value as PlaybookOwner) ? (
            <div className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[7px] font-black truncate shadow-sm uppercase w-full text-center animate-in fade-in duration-300 tracking-tighter">
              {(value as PlaybookOwner).name}
            </div>
          ) : (
            <div className="text-[7px] text-slate-200 italic font-black uppercase text-center w-full border border-dashed border-slate-200 rounded-lg py-1">DROP</div>
          )
        )}
      </div>
    </div>
  );
};

// ─── SolidNode (BPMN) ─────────────────────────────────────────────────────────

interface SolidNodeProps {
  label: string;
  title: string;
  bgClass: string;
  icon: React.ReactNode;
  desc?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const SolidNode: React.FC<SolidNodeProps> = ({ label, title, bgClass, icon, desc, isActive, onClick }) => (
  <div className="flex flex-col items-center gap-2 group transition-all duration-300">
    <div
      onClick={desc ? onClick : undefined}
      className={`p-5 rounded-[2rem] w-[180px] shadow-xl flex flex-col items-center text-center transition-all duration-300 ${bgClass} ${desc ? 'cursor-pointer hover:scale-105 active:scale-95 hover:shadow-2xl' : ''} animate-in zoom-in duration-500 text-white`}
    >
      <div className="mb-3 p-2 bg-white/20 rounded-xl text-white shadow-inner">{icon}</div>
      <label className="text-[7px] font-black text-white/70 uppercase tracking-[0.15em] mb-1">{label}</label>
      <h4 className="text-[11px] font-black text-white uppercase leading-tight min-h-[28px] flex items-center justify-center">{title}</h4>
      {isActive && desc && (
        <div className="mt-4 p-4 bg-black/10 rounded-2xl border border-white/10 animate-in slide-in-from-top-2 duration-300 w-full overflow-hidden shadow-inner text-left">
          <p className="text-[9px] text-white/90 italic font-medium leading-relaxed">&quot;{desc}&quot;</p>
        </div>
      )}
      {desc && !isActive && (
        <div className="mt-2 text-[6px] font-black text-white/60 uppercase tracking-widest bg-black/10 px-2 py-1 rounded-full">Click to Expand</div>
      )}
    </div>
  </div>
);

// ─── NodeConnector (BPMN) ─────────────────────────────────────────────────────

interface NodeConnectorProps {
  label: string;
  dashed?: boolean;
}

export const NodeConnector: React.FC<NodeConnectorProps> = ({ label, dashed = false }) => (
  <div className="flex flex-col items-center justify-center pt-8 w-20 shrink-0">
    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
    <div className="flex items-center w-full">
      <div className={`h-0.5 flex-1 ${dashed ? 'border-t-2 border-dashed border-slate-300' : 'bg-slate-300'}`}></div>
      <MoveRight size={16} className="text-slate-400" />
      <div className={`h-0.5 flex-1 ${dashed ? 'border-t-2 border-dashed border-slate-300' : 'bg-slate-300'}`}></div>
    </div>
  </div>
);
