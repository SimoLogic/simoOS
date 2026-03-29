"use client";

import React, { useEffect, useState } from "react";
import { getProjectHealthAction, ProjectHealthMetrics } from "@/app/actions/pmo/dashboard-actions";
import { CheckCircle2, CircleDashed, Clock, LayoutGrid, AlertCircle, Loader2 } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { WorkloadWidget } from "@/components/pmo/views/WorkloadWidget";

interface DashboardEngineProps {
  boardId: string;
  orgId: string;
  isReadOnly?: boolean;
}

export function DashboardEngine({ boardId, orgId, isReadOnly }: DashboardEngineProps) {
  const [metrics, setMetrics] = useState<ProjectHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optimisticTasks = usePmoStore(s => s.optimisticTasks); // Trigger re-calculation on local changes

  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
        setLoading(true);
        const res = await getProjectHealthAction(boardId, orgId);
        if (isMounted) {
            if (res.success && res.data) {
                setMetrics(res.data);
            } else {
                setError(res.error || "Failed to load dashboard metrics");
            }
            setLoading(false);
        }
    }
    loadMetrics();
    return () => { isMounted = false; };
  }, [boardId, orgId, optimisticTasks]);

  if (loading && !metrics) {
      return (
          <div className="flex w-full h-full items-center justify-center bg-gray-50 absolute inset-0 text-vibe-blue">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
      );
  }

  if (error) {
      return (
         <div className="flex flex-col w-full h-full items-center justify-center bg-gray-50 absolute inset-0 text-vibe-dark gap-2">
            <AlertCircle className="w-8 h-8 text-vibe-red" />
            <p className="text-gray-500 font-medium">{error}</p>
         </div>
      );
  }

  if (!metrics) return null;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-y-auto absolute inset-0 p-6 space-y-6">
       <div className="flex items-center justify-between">
           <h2 className="text-2xl font-semibold text-vibe-dark tracking-tight">Project Health</h2>
           <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">High Density Dashboard</span>
       </div>

       {/* Progress Overview Hero Widget */}
       <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex flex-col gap-2 flex-1">
             <h3 className="text-sm font-semibold text-gray-500">Avance de Ejecución (Burn Rate)</h3>
             <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mt-1 shadow-inner relative">
                <div 
                   className="h-full bg-vibe-blue transition-all duration-500 ease-out"
                   style={{ width: `${metrics.burnRate}%` }}
                />
             </div>
             <p className="text-sm text-gray-400 mt-1 font-medium">Completed {metrics.completedTasks} of {metrics.totalTasks} tasks.</p>
          </div>
          
          <div className="flex items-center gap-6 border-l border-gray-100 pl-8 shrink-0">
             <div className="flex flex-col items-center">
                <span className="text-4xl font-bold text-vibe-dark tracking-tighter">{metrics.burnRate}%</span>
                <span className="text-xs font-semibold text-vibe-blue uppercase tracking-widest mt-1">Burn Rate</span>
             </div>
          </div>
       </div>

       {/* Widget Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card: SLA Breaches */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -z-0"></div>
             <div className="flex items-center justify-between w-full mb-3 z-10">
                 <div className="w-8 h-8 rounded-full bg-red-100 text-vibe-red flex items-center justify-center border border-red-200">
                     <AlertCircle className="w-4 h-4" />
                 </div>
             </div>
             <p className="text-xs font-bold text-vibe-red tracking-wider z-10">SLA BREACHES</p>
             <p className="text-3xl font-bold text-vibe-dark mt-1 z-10">{metrics.slaBreaches}</p>
          </div>

          {/* Card: Ready */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between w-full mb-3">
                 <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                     <CheckCircle2 className="w-4 h-4" />
                 </div>
             </div>
             <p className="text-xs font-semibold text-gray-400 tracking-wider">TAREAS LISTAS</p>
             <p className="text-3xl font-bold text-vibe-dark mt-1">{metrics.completedTasks}</p>
          </div>

          {/* Card: Working */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between w-full mb-3">
                 <div className="w-8 h-8 rounded-full bg-blue-50 text-vibe-blue flex items-center justify-center border border-blue-100">
                     <Clock className="w-4 h-4" />
                 </div>
             </div>
             <p className="text-xs font-semibold text-gray-400 tracking-wider">TRABAJANDO</p>
             <p className="text-3xl font-bold text-vibe-dark mt-1">{metrics.inProgressTasks}</p>
          </div>

          {/* Card: Stuck */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between w-full mb-3">
                 <div className="w-8 h-8 rounded-full bg-red-50 text-vibe-red flex items-center justify-center border border-red-100">
                     <AlertCircle className="w-4 h-4" />
                 </div>
             </div>
             <p className="text-xs font-semibold text-gray-400 tracking-wider">ESTANCADAS</p>
             <p className="text-3xl font-bold text-vibe-dark mt-1">{metrics.stuckTasks}</p>
          </div>

          {/* Card: Not Started */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between w-full mb-3">
                 <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center border border-gray-200">
                     <CircleDashed className="w-4 h-4" />
                 </div>
             </div>
             <p className="text-xs font-semibold text-gray-400 tracking-wider">SIN INICIAR</p>
             <p className="text-3xl font-bold text-vibe-dark mt-1">{metrics.notStartedTasks}</p>
          </div>

       </div>

       {/* People View */}
       <div className="flex w-full mt-6">
           <WorkloadWidget boardId={boardId} />
       </div>
    </div>
  );
}
