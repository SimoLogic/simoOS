"use client";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — LIBRARY ASSETS SIDEBAR
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * Renders the right sidebar with:
 * - Filter input
 * - Internal & External role groups (draggable)
 * - Activity Types (draggable)
 * - Repeatable Nodes library (saved repeatable steps, draggable)
 * ============================================================================
 */

import React from 'react';
import { Search, Layers, Shield, GripVertical } from 'lucide-react';
import { PlaybookStep, ActivityLibraryItem, PlaybookOwner } from './types';
import { RoleGroup } from './SubComponents';

interface LibraryAssetsProps {
  internalRoles: PlaybookOwner[];
  externalRoles: PlaybookOwner[];
  activityLibrary: ActivityLibraryItem[];
  repeatableActivities: PlaybookStep[];
}

export const LibraryAssets: React.FC<LibraryAssetsProps> = ({
  internalRoles,
  externalRoles,
  activityLibrary,
  repeatableActivities,
}) => {
  return (
    <aside className="w-[340px] bg-white border-l border-slate-200 hidden lg:flex flex-col shadow-2xl shrink-0 z-30">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 text-center text-slate-800">
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] mb-4">LIBRARY ASSETS</h2>
        <div className="relative text-slate-800">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input
            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all"
            placeholder="Filter library..."
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-10 pb-scrollbar text-slate-800">
        {/* Internal & External Roles */}
        <RoleGroup title="INTERNAL ROLES" roles={internalRoles} color="indigo" />
        <RoleGroup title="EXTERNAL ROLES" roles={externalRoles} color="emerald" />

        {/* Activity Types */}
        <div>
          <h3 className="text-[8px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
            ACTIVITY TYPES
          </h3>
          {activityLibrary.map(l => (
            <div
              key={l.type}
              draggable
              onDragStart={e => e.dataTransfer.setData("activityType", l.type)}
              className="p-3.5 rounded-xl border border-slate-100 bg-white mb-3 shadow-sm hover:border-indigo-400 cursor-grab flex justify-between items-center transition-all group active:cursor-grabbing"
            >
              <div className="flex items-center gap-3 text-slate-800">
                <Layers size={14} className="text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-wider">{l.type}</span>
              </div>
              <GripVertical size={14} className="text-slate-200 group-hover:text-indigo-400" />
            </div>
          ))}
        </div>

        {/* Repeatable Nodes */}
        <div>
          <h3 className="text-[8px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
            <Shield size={12} className="text-indigo-500" /> REPEATABLE NODES
          </h3>
          {repeatableActivities.length === 0 ? (
            <p className="text-[9px] text-slate-300 italic text-center p-8 border-2 border-dashed border-slate-50 rounded-2xl bg-slate-50/30 uppercase tracking-widest">
              No nodes saved
            </p>
          ) : (
            repeatableActivities.map((act, i) => (
              <div
                key={i}
                draggable
                onDragStart={e => e.dataTransfer.setData("repeatableActivity", JSON.stringify(act))}
                className="p-4 rounded-2xl border-2 border-indigo-50 bg-white hover:border-indigo-400 transition-all cursor-grab shadow-sm mb-3 group active:cursor-grabbing hover:shadow-md text-slate-800 text-left"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">UID: {act.uid}</span>
                  <Shield size={12} className="text-indigo-500" />
                </div>
                <h4 className="text-[10px] font-black uppercase truncate text-slate-700 mb-2">{act.name}</h4>
                <GripVertical size={12} className="text-slate-100 group-hover:text-slate-300 ml-auto" />
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
