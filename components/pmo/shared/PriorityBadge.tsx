// ⚠️ Lee ARCHITECTURE.md antes de modificar
// PriorityBadge — Indicador visual de prioridad de tarea PMO

"use client";

import React from "react";
import { ArrowUp, ArrowRight, ArrowDown, AlertTriangle } from "lucide-react";
import type { TaskPriority } from "@/types/pmo.types";

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; icon: React.ElementType }
> = {
  low:      { label: "Low",      color: "#676879", icon: ArrowDown },
  medium:   { label: "Medium",   color: "#FDAB3D", icon: ArrowRight },
  high:     { label: "High",     color: "#0086C0", icon: ArrowUp },
  critical: { label: "Critical", color: "#FF3D57", icon: AlertTriangle },
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  showLabel?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showLabel = false,
}) => {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: config.color }}
      title={config.label}
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && config.label}
    </span>
  );
};

export default PriorityBadge;
