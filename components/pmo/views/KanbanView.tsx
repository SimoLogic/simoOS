// ⚠️ Lee ARCHITECTURE.md antes de modificar — PMO Sprint 4
// KanbanView: Cards con Vibe tokens, swimlanes, WIP limits
// Prompt #23 del Plan Maestro PMO

"use client";

import React from "react";
import { Trello } from "lucide-react";

/**
 * KanbanView — Vista Kanban del PMO MyPlan
 * 
 * Características Sprint 4:
 * - Cards con Vibe tokens (purple headers, status badges)
 * - Swimlanes por assignee / grupo
 * - WIP limits por columna (warning en FDAB3D)
 * - Simo IS task barriers (cards protegidas no drag&drop entre columnas)
 * - Drag & Drop con @hello-pangea/dnd
 */

interface KanbanViewProps {
  boardId: string;
  orgId: string;
}

// SPRINT 4 PLACEHOLDER — Implementación completa en Prompt #23
export const KanbanView: React.FC<KanbanViewProps> = ({ boardId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0073EA]/10">
        <Trello className="w-6 h-6 text-[#0073EA]" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-[#323338]">Kanban View</h3>
        <p className="text-xs text-[#676879] mt-1">Sprint 4 · Prompt #23</p>
        <p className="text-xs text-[#676879]">boardId: {boardId}</p>
      </div>
    </div>
  );
};

export default KanbanView;
