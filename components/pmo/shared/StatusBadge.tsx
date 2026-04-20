// ⚠️ Lee ARCHITECTURE.md antes de modificar
// StatusBadge — Badge de estado de tarea PMO con colores Vibe

"use client";

import React from "react";
import type { TaskStatus } from "@/types/pmo.types";

// Vibe color mapping for TaskStatus
const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; color: string }
> = {
  not_started:    { label: "Not Started",     bg: "#E6E9EF",   color: "#676879" },
  in_progress:    { label: "In Progress",     bg: "#FDAB3D20", color: "#FDAB3D" },
  done:           { label: "Done",            bg: "#00CA7220", color: "#00CA72" },
  stuck:          { label: "Stuck",           bg: "#FF3D5720", color: "#FF3D57" },
  pending_review: { label: "Pending Review",  bg: "#6161FF20", color: "#6161FF" },
  blocked:        { label: "Blocked",         bg: "#E3183720", color: "#E31837" },
};

interface StatusBadgeProps {
  status: TaskStatus;
  /** Si true, renderiza pill circular (para Kanban). Default: rectangular (Grid) */
  variant?: "pill" | "rect";
  /** Solo Grid: permite click-to-edit inline */
  editable?: boolean;
  onChange?: (status: TaskStatus) => void;
}

/**
 * StatusBadge — Componente unificado de estado para Grid y Kanban views
 * 
 * - Colores Vibe: done=green, stuck=pink, in_progress=orange, not_started=grey, pending_review=purple
 * - variant="pill": headers de columna Kanban
 * - variant="rect": celda en Grid (puede ser editable en Sprint 4)
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = "rect",
  editable = false,
  onChange,
}) => {
  const config = STATUS_CONFIG[status];
  const borderRadius = variant === "pill" ? "9999px" : "4px";

  const handleClick = () => {
    if (!editable || !onChange) return;
    // Ciclar entre estados — inline edit en Sprint 4
    const statuses = Object.keys(STATUS_CONFIG) as TaskStatus[];
    const nextIndex = (statuses.indexOf(status) + 1) % statuses.length;
    onChange(statuses[nextIndex]);
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${
        editable ? "cursor-pointer select-none" : ""
      }`}
      style={{
        borderRadius,
        backgroundColor: config.bg,
        color: config.color,
        transition: "opacity 70ms ease-in-out",
      }}
      onClick={handleClick}
      title={editable ? "Click to change status" : config.label}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
