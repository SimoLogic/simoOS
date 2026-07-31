"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { getMyTasksAction } from "@/app/actions/pmo/my-work-actions";
import { Loader2, AlertCircle, CalendarClock, Briefcase, CheckCircle2 } from "lucide-react";
import { PmoTask } from "@/types/pmo.types";
import { countWorkdays, isWorkday } from "@/lib/workday-helper";
import { StatusCell } from "@/components/pmo/grid/fields/StatusCell";
import { PriorityBadge } from "@/components/pmo/shared/PriorityBadge";

// Definimos la agrupación usando el WorkdayHelper
type TaskBucket = "OVERDUE" | "DUE_SOON" | "LATER" | "DONE";

export const MyWorkView: React.FC<{ tenantId: string; userId: string }> = ({ tenantId, userId }) => {
   const myTasks = usePmoStore(s => s.myTasks);
   const setMyTasks = usePmoStore(s => s.setMyTasks);
   const optimisticTasks = usePmoStore(s => s.optimisticTasks);

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
     let isMounted = true;
     // Carga inicial rápida si ya hay caché
     if (myTasks.length > 0) setLoading(false);

     async function fetchTasks() {
        const res = await getMyTasksAction(tenantId, userId);
        if (isMounted) {
            if (res.success && res.data) {
                setMyTasks(res.data);
            } else {
                setError(res.error || "Failed to load My Work.");
            }
            setLoading(false);
        }
     }
     
     // Background sync para mantener fresh data
     fetchTasks();

     return () => { isMounted = false; };
   }, [tenantId, userId, setMyTasks]);

   // Clustering Lógica Ultra-Rápida con Estado Optimista (<100ms)
   const clusteredTasks = useMemo(() => {
       const today = new Date();
       const buckets: Record<TaskBucket, PmoTask[]> = {
           "OVERDUE": [],
           "DUE_SOON": [],
           "LATER": [],
           "DONE": []
       };

       myTasks.forEach(task => {
           // Usamos optimistic tracking por si el user la completó de inmediato en UI
           const currentStatus = optimisticTasks[task.id]?.status || task.status;
           const currentTaskData = { ...task, status: currentStatus };

           if (currentStatus === "done") {
               buckets["DONE"].push(currentTaskData);
               return;
           }

           if (!task.dueDate) {
               buckets["LATER"].push(currentTaskData);
               return;
           }

           const due = new Date(task.dueDate);
           
           // Si ya pasó el due date
           if (today > due && today.getDate() !== due.getDate()) {
               buckets["OVERDUE"].push(currentTaskData);
           } else {
               // Si vence dentro de los próximos 3 días hábiles
               const daysRemaining = countWorkdays(today, due, "US", "CO"); // Usando el engine oficial
               if (daysRemaining <= 3) {
                   buckets["DUE_SOON"].push(currentTaskData);
               } else {
                   buckets["LATER"].push(currentTaskData);
               }
           }
       });

       return buckets;
   }, [myTasks, optimisticTasks]);


   if (loading && myTasks.length === 0) {
      return (
          <div className="flex w-full h-full items-center justify-center bg-gray-50 text-vibe-blue inset-0 absolute">
              <Loader2 className="w-8 h-8 animate-spin" />
          </div>
      );
   }

   if (error) {
       return (
           <div className="flex flex-col w-full h-full items-center justify-center bg-gray-50 text-vibe-dark inset-0 absolute gap-2">
               <AlertCircle className="w-8 h-8 text-vibe-red" />
               <p className="text-gray-500 font-medium">{error}</p>
           </div>
       );
   }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-y-auto px-10 py-8 relative">
       
       <header className="mb-8">
           <h1 className="text-3xl font-bold text-[#001e42] flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-vibe-blue" />
              My Work
           </h1>
           <p className="text-gray-400 font-medium text-sm mt-1 uppercase tracking-widest pl-[44px]">Human Factor Consolidated View</p>
       </header>

       <div className="flex flex-col gap-8 max-w-5xl">

          {/* OVERDUE */}
          {clusteredTasks["OVERDUE"].length > 0 && (
             <TaskSection 
                title="Vencidas" 
                color="text-vibe-red" 
                borderColor="border-vibe-red/30"
                icon={<AlertCircle className="w-5 h-5 text-vibe-red" />}
                tasks={clusteredTasks["OVERDUE"]} 
             />
          )}

          {/* DUE SOON */}
          <TaskSection 
             title="Próximas a vencer (Próximos 3 días hábiles)" 
             color="text-amber-500" 
             borderColor="border-amber-200"
             icon={<CalendarClock className="w-5 h-5 text-amber-500" />}
             tasks={clusteredTasks["DUE_SOON"]} 
          />

          {/* LATER */}
          <TaskSection 
             title="Más Adelante" 
             color="text-[#001e42]" 
             borderColor="border-gray-200"
             icon={<Briefcase className="w-5 h-5 text-[#001e42]/50" />}
             tasks={clusteredTasks["LATER"]} 
          />

          {/* DONE */}
          {clusteredTasks["DONE"].length > 0 && (
              <TaskSection 
                 title="Completadas Recientemente" 
                 color="text-green-600" 
                 borderColor="border-green-200"
                 icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
                 tasks={clusteredTasks["DONE"]} 
              />
          )}
          
       </div>
    </div>
  );
};

// ─── Componente Interno para Renderizar el Grupo ────────────────────────
const TaskSection: React.FC<{ title: string, color: string, borderColor: string, icon: React.ReactNode, tasks: PmoTask[] }> = ({ title, color, borderColor, icon, tasks }) => {
    
    if (tasks.length === 0) return null;

    return (
        <section className={`flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/50`}>
                {icon}
                <h3 className={`font-bold ${color} text-sm`}>{title}</h3>
                <span className="ml-2 bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full font-bold">{tasks.length}</span>
            </div>
            
            <div className="flex flex-col">
                {tasks.map(task => {
                    const today = new Date();
                    let isCriticalSLA = false;
                    
                    if (task.dueDate && task.status !== "done") {
                        const due = new Date(task.dueDate);
                        const daysRemaining = countWorkdays(today, due, "US", "CO");
                        isCriticalSLA = daysRemaining <= 1 || today > due;
                    }

                    return (
                    <div key={task.id} className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group ${isCriticalSLA ? 'bg-rose-50/40 hover:bg-rose-50 border-rose-100' : ''}`}>
                        <div className="flex flex-col gap-1 w-[40%]">
                            <span className="text-sm font-semibold text-vibe-dark truncate group-hover:text-vibe-blue transition-colors flex items-center gap-2">
                                {task.title}
                                {isCriticalSLA && (
                                   <span className="flex items-center gap-1 text-[10px] text-action-red font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200 shadow-sm" title="SLA Breach Risk < 24h">
                                       <AlertCircle className="w-3 h-3" /> SLA
                                   </span>
                                )}
                            </span>
                            <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full shadow-sm"
                                  style={{ backgroundColor: task.groupColor || '#001e42' }} 
                                />
                                <span className="text-xs text-gray-400 font-medium truncate">{task.groupName || "General Group"}</span>
                            </div>
                        </div>

                        <div className="flex flex-1 justify-end items-center gap-6">
                            <div className="w-[140px]">
                                <StatusCell task={task} />
                            </div>
                            <div className="w-[140px]">
                                {task.priority ? <PriorityBadge priority={task.priority} showLabel /> : <span className="text-gray-400 text-xs">Sin prioridad</span>}
                            </div>
                            <div className={`w-[100px] text-right text-xs font-semibold ${isCriticalSLA ? 'text-action-red' : 'text-gray-500'}`}>
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </section>
    );
};
