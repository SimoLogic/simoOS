// ⚠️ Lee ARCHITECTURE.md antes de modificar
// PlaybookBadge — Badge visual para tareas originadas desde Simo IS
// Regla de Oro #1: NUNCA mostrar opción de borrado si isProtected=true

"use client";

import React from "react";
import { Zap, Lock } from "lucide-react";

// Vibe tokens (importar desde CSS vars en producción)
const VIBE_BLUE = "#0086C0";
const VIBE_PINK = "#FF3D57";

interface PlaybookBadgeProps {
  simoPlaybookId: string;
  playbookName?: string;
  /** Si true, muestra ícono de candado (tarea del playbook protegida) */
  isProtected?: boolean;
  size?: "sm" | "md";
}

/**
 * PlaybookBadge — Identifica visualmente tareas vinculadas a Simo IS
 * 
 * Uso: Mostrar en task cards, grid rows, y drag items del Kanban
 * REGLA: Si isProtected=true, renderizar con ícono Lock (no Zap)
 */
export const PlaybookBadge: React.FC<PlaybookBadgeProps> = ({
  simoPlaybookId: _simoPlaybookId,
  playbookName,
  isProtected = false,
  size = "sm",
}) => {
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold tracking-wide uppercase ${padding} ${textSize}`}
      style={{
        backgroundColor: `${VIBE_BLUE}18`,
        color: VIBE_BLUE,
      }}
      title={playbookName ? `Simo IS Playbook: ${playbookName}` : "Simo IS task"}
    >
      {isProtected ? (
        <Lock className={iconSize} style={{ color: VIBE_PINK }} />
      ) : (
        <Zap className={iconSize} />
      )}
      Simo IS
    </span>
  );
};

export default PlaybookBadge;
