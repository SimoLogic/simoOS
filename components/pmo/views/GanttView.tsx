// ⚠️ Lee ARCHITECTURE.md antes de modificar — PMO Sprint 5
// GanttView: Timeline con baselines, auto-schedule, barras Simo IS no-resizable
// Prompt #24 del Plan Maestro PMO

"use client";

import React from "react";
import { GanttChartSquare } from "lucide-react";

/**
 * GanttView — Vista Gantt del PMO MyPlan
 * 
 * Características Sprint 5:
 * - Timeline con WorkdayHelper para días hábiles
 * - Baselines configurables (línea base del playbook)
 * - Auto-schedule por dependencias de tareas
 * - Barras de tareas Simo IS: NO resizable (isProtected=true)
 * - Fines de semana y festivos atenuados (WorkdayHelper)
 * - Critical path highlighting
 */

interface GanttViewProps {
  boardId: string;
  orgId: string;
}

// SPRINT 5 PLACEHOLDER — Implementación completa en Prompt #24
export const GanttView: React.FC<GanttViewProps> = ({ boardId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00CA72]/10">
        <GanttChartSquare className="w-6 h-6 text-[#00CA72]" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-[#323338]">Gantt View</h3>
        <p className="text-xs text-[#676879] mt-1">Sprint 5 · Prompt #24</p>
        <p className="text-xs text-[#676879]">boardId: {boardId}</p>
      </div>
    </div>
  );
};

export default GanttView;
