// ⚠️ Lee ARCHITECTURE.md antes de modificar — PMO Sprint 5
// DashboardView: mondayDB widgets (Battery, Workload, límites)
// Prompt #26 del Plan Maestro PMO

"use client";

import React from "react";
import { LayoutDashboard } from "lucide-react";

/**
 * DashboardView — Vista de Dashboard de Widgets del PMO MyPlan
 * 
 * Características Sprint 5 (mondayDB Widgets):
 * - Battery Chart: progreso total de tareas en el board
 * - Workload Widget: carga por assignee
 * - Countdown Widget: días hasta próxima tarea vencida
 * - Límites mondayDB: warning banner en >30 widgets (#FDAB3D)
 * - AI features desactivadas automáticamente si >50 widgets
 * - HPCRenderMode si >3,000 items
 */

interface DashboardViewProps {
  boardId: string;
  orgId: string;
  widgetCount?: number;
}

// mondayDB limits constants
export const WIDGETS_WARNING_THRESHOLD = 30;
export const WIDGETS_AI_DISABLE_THRESHOLD = 50;
export const ITEMS_HPC_THRESHOLD = 3000;
export const ITEMS_MAX_THRESHOLD = 20000;

// SPRINT 5 PLACEHOLDER — Implementación completa en Prompt #26
export const DashboardView: React.FC<DashboardViewProps> = ({ boardId, widgetCount = 0 }) => {
  const isNearLimit = widgetCount >= WIDGETS_WARNING_THRESHOLD;
  const isAiDisabled = widgetCount > WIDGETS_AI_DISABLE_THRESHOLD;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      {isNearLimit && (
        <div
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#FDAB3D20", color: "#FDAB3D" }}
        >
          ⚠️ {isAiDisabled ? "AI features disabled (>50 widgets)" : `Approaching widget limit (${widgetCount}/30)`}
        </div>
      )}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6161FF]/10">
        <LayoutDashboard className="w-6 h-6 text-[#6161FF]" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-[#323338]">Dashboard View</h3>
        <p className="text-xs text-[#676879] mt-1">Sprint 5 · Prompt #26</p>
        <p className="text-xs text-[#676879]">boardId: {boardId}</p>
      </div>
    </div>
  );
};

export default DashboardView;
