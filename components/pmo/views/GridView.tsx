// ⚠️ Lee ARCHITECTURE.md antes de modificar — PMO Sprint 4
// GridView: Tabla virtualizada con 10,000+ rows, inline editing, Side Peek
// Prompt #21 + #22 del Plan Maestro PMO

"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";

/**
 * GridView — Vista de tabla principal del PMO MyPlan
 * 
 * Características Sprint 4:
 * - Virtualización con @tanstack/react-virtual para 10,000+ items
 * - Edición inline sin modales (Vibe UX)
 * - Side Peek panel (Task detail sin salir del grid)
 * - Simo IS task protection (NUNCA mostrar Delete en isProtected=true)
 * - Agrupación por grupos coloreados con colapso
 * - Columnas redimensionables + reordenables
 */

interface GridViewProps {
  boardId: string;
  orgId: string;
}

// SPRINT 4 PLACEHOLDER — Implementación completa en Prompt #21+#22
export const GridView: React.FC<GridViewProps> = ({ boardId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6161FF]/10">
        <LayoutGrid className="w-6 h-6 text-[#6161FF]" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-[#323338]">Grid View</h3>
        <p className="text-xs text-[#676879] mt-1">Sprint 4 · Prompt #21–#22</p>
        <p className="text-xs text-[#676879]">boardId: {boardId}</p>
      </div>
    </div>
  );
};

export default GridView;
