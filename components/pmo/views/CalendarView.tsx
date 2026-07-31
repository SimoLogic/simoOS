// ⚠️ Lee ARCHITECTURE.md antes de modificar — PMO Sprint 5
// CalendarView: Calendario comercial con WorkdayHelper
// Prompt #25 del Plan Maestro PMO

"use client";

import React from "react";
import { CalendarDays } from "lucide-react";

/**
 * CalendarView — Vista de Calendario Comercial del PMO MyPlan
 * 
 * Características Sprint 5:
 * - Calendario con WorkdayHelper integrado (date-fns + date-fns-tz)
 * - Fines de semana atenuados (no son días hábiles por defecto)
 * - Festivos del país configurado en org.settings.country
 * - Drag & Drop de tareas entre días
 * - Vista: Mes / Semana / Día
 * - Tareas Simo IS: no-draggable entre días (isProtected)
 */

interface CalendarViewProps {
  boardId: string;
  tenantId: string;
}

// SPRINT 5 PLACEHOLDER — Implementación completa en Prompt #25
export const CalendarView: React.FC<CalendarViewProps> = ({ boardId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#FDAB3D]/10">
        <CalendarDays className="w-6 h-6 text-[#FDAB3D]" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-[#323338]">Calendar View</h3>
        <p className="text-xs text-[#676879] mt-1">Sprint 5 · Prompt #25</p>
        <p className="text-xs text-[#676879]">boardId: {boardId}</p>
      </div>
    </div>
  );
};

export default CalendarView;
