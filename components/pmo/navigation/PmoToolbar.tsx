"use client";

import React from "react";
import { ChevronRight, Plus, LayoutGrid, CheckCircle2, RefreshCw } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { ImportExportMenu } from "@/components/pmo/navigation/ImportExportMenu";
import { KeyboardShortcuts } from "@/components/pmo/shared/KeyboardShortcuts";
import { NotificationCenter } from "@/components/pmo/navigation/NotificationCenter";

interface PmoToolbarProps {
  boardName: string;
  workspaceName?: string;
  onNewTaskClick?: () => void;
  onNewGroupClick?: () => void;
}

export function PmoToolbar({ boardName, workspaceName = "Workspace", onNewTaskClick, onNewGroupClick }: PmoToolbarProps) {
  const activeView = usePmoStore(s => s.activeView);
  const filterStatus = usePmoStore(s => s.filterStatus);
  const setFilterStatus = usePmoStore(s => s.setFilterStatus);
  const filterAssignee = usePmoStore(s => s.filterAssignee);
  const setFilterAssignee = usePmoStore(s => s.setFilterAssignee);
  const optimisticTasks = usePmoStore(s => s.optimisticTasks);

  const pendingSyncs = Object.keys(optimisticTasks).length;

  return (
    <div className="w-full flex flex-col gap-4 p-4 border-b border-gray-200 bg-white shadow-sm z-10 shrink-0">
      
      {/* Top Row: Breadcrumbs & Quick Actions */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center text-sm font-medium text-gray-500 gap-1 select-none">
          <span className="hover:text-vibe-dark cursor-pointer transition-colors px-1 rounded hover:bg-gray-100">{workspaceName}</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-vibe-dark bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 font-semibold">{boardName}</span>
          
          <div className="flex items-center gap-1 ml-4 px-2 py-1 rounded-full text-xs font-semibold">
             {pendingSyncs > 0 ? (
               <span className="flex items-center gap-1 text-vibe-blue animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> {pendingSyncs} Syncing...
               </span>
             ) : (
               <span className="flex items-center gap-1 text-gray-400">
                  <CheckCircle2 className="w-3 h-3" /> Saved 
               </span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Invisible Global Listener for Time Travel */}
          <KeyboardShortcuts />
          
          <NotificationCenter orgId="org-1" />
          
          <ImportExportMenu orgId="org-1" boardId="b1" />
          
          <button 
            onClick={onNewGroupClick}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm"
          >
             + Nuevo Grupo
          </button>
          <button 
            onClick={onNewTaskClick}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-vibe-blue rounded hover:bg-blue-600 transition-colors shadow-sm"
          >
             <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Bottom Row: Views & Filters */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
           <button 
              onClick={() => usePmoStore.setState({ activeView: "grid" })}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeView === 'grid' ? 'bg-indigo-50 text-vibe-blue border-b-2 border-vibe-blue' : 'text-gray-600 hover:bg-gray-100'}`}
           >
              <LayoutGrid className="w-4 h-4" /> Principal (Grid)
           </button>
           <button 
              onClick={() => usePmoStore.setState({ activeView: "gantt" })}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeView === 'gantt' ? 'bg-indigo-50 text-vibe-blue border-b-2 border-vibe-blue' : 'text-gray-500 hover:bg-gray-100'}`}
           >
              Cronograma (Gantt)
           </button>
           <button 
              onClick={() => usePmoStore.setState({ activeView: "dashboard" })}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeView === 'dashboard' ? 'bg-indigo-50 text-vibe-blue border-b-2 border-vibe-blue' : 'text-gray-500 hover:bg-gray-100'}`}
           >
              Salud del Proyecto
           </button>
        </div>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <span className="text-xs text-gray-400 mr-2 uppercase tracking-wider font-semibold">Filtros</span>
            <select 
               value={filterStatus || ""} 
               onChange={(e) => setFilterStatus(e.target.value || null)}
               className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-vibe-blue outline-none"
            >
               <option value="">Cualquier Estado</option>
               <option value="not_started">No Iniciado</option>
               <option value="in_progress">Trabajando</option>
               <option value="done">Listo</option>
               <option value="stuck">Estancado</option>
            </select>

            <select 
               value={filterAssignee || ""} 
               onChange={(e) => setFilterAssignee(e.target.value || null)}
               className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 outline-none focus:outline-none focus:ring-1 focus:ring-vibe-blue"
            >
               <option value="">Cualquier Responsable</option>
               {/* Mock users for filter as well */}
               <option value="usr1">David Gomez</option>
               <option value="usr2">Laura Martinez</option>
               <option value="usr3">Carlos Perez</option>
            </select>
        </div>
      </div>
      
    </div>
  );
}
