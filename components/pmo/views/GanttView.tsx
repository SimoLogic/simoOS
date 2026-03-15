"use client";

import React, { useEffect, useRef } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import { PmoBoard, PmoTask } from "@/types/pmo.types";

interface GanttViewProps {
  board: PmoBoard;
  orgCountryCode?: string;
  filterStatus?: string | null;
  filterAssignee?: string | null;
  optimisticTasks: Record<string, Partial<PmoTask>>;
  isReadOnly?: boolean;
}

const GanttView: React.FC<GanttViewProps> = ({ 
  board, 
  orgCountryCode = "CO", 
  filterStatus, 
  filterAssignee, 
  optimisticTasks,
  isReadOnly 
}) => {
    const ganttContainer = useRef<HTMLDivElement>(null);
    const { isViewLocked } = usePmoStore();

    useEffect(() => {
        if (!ganttContainer.current) return;

        // --- CONFIGURACIÓN VIBE & SIMO IS ---
        gantt.config.date_format = "%Y-%m-%d";
        gantt.config.drag_links = !isReadOnly && !isViewLocked;
        gantt.config.drag_move = !isReadOnly && !isViewLocked;
        gantt.config.drag_resize = !isReadOnly && !isViewLocked;
        gantt.config.grid_width = 350;
        gantt.config.row_height = 40; // Simple height mode per Vibe
        gantt.config.header_height = 48;

        // Estilo de columnas
        gantt.config.columns = [
            { name: "text", label: "Tarea", tree: true, width: "*" },
            { name: "start_date", label: "Inicio", align: "center", width: 80 },
            { name: "duration", label: "Días", align: "center", width: 60 },
        ];

        // --- LLAVE #1: PROTECCIÓN SIMO IS ---
        const dragId = gantt.attachEvent("onBeforeTaskDrag", (id, mode) => {
            const task = gantt.getTask(id) as any;
            if (task.isProtected || task.sourcePlaybookId) {
                // Tarea gestionada por Simo Intellisense
                return false; 
            }
            return !isReadOnly && !isViewLocked;
        }, { id: "pmo_drag_protection" });

        const dblClickId = gantt.attachEvent("onTaskDblClick", (id) => {
            const task = gantt.getTask(id) as any;
            if (task.isProtected || task.sourcePlaybookId) {
                return false; // Bloquear edición rápida
            }
            return !isReadOnly && !isViewLocked;
        }, { id: "pmo_edit_protection" });

        // Tooltip Literal
        gantt.templates.tooltip_text = (start: Date, end: Date, task: any) => {
            if (task.isProtected || task.sourcePlaybookId) {
                return `<div class="p-2">
                          <b class="text-vibe-purple">${task.text}</b><br/>
                          <span class="text-xs text-gray-500 italic">Tarea gestionada por Simo Intellisense</span>
                        </div>`;
            }
            return `<b>${task.text}</b><br/>Duración: ${task.duration} días`;
        };

        // Estilos Vibe
        gantt.templates.task_class = (start: Date, end: Date, task: any) => {
            if (task.isProtected || task.sourcePlaybookId) return "simo-protected-task";
            return "vibe-task-bar";
        };

        // Inicializar
        gantt.init(ganttContainer.current);

        return () => {
            gantt.detachEvent(dragId);
            gantt.detachEvent(dblClickId);
            gantt.clearAll();
        };
    }, [isReadOnly, isViewLocked]);

    useEffect(() => {
        if (board && board.groups) {
            const tasks = board.groups.flatMap(group => 
                (group.tasks || []).map(task => {
                    const optimistic = optimisticTasks[task.id] || {};
                    const finalTask = { ...task, ...optimistic };
                    
                    return {
                        id: finalTask.id,
                        text: finalTask.title,
                        start_date: finalTask.dueDate ? new Date(finalTask.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        duration: 3, 
                        parent: 0,
                        isProtected: finalTask.isProtected,
                        sourcePlaybookId: finalTask.sourcePlaybookId,
                        color: finalTask.isProtected ? VibeTokens.colors.vibePurple : (group.color || VibeTokens.colors.vibeBlue)
                    };
                })
            );
            gantt.clearAll();
            gantt.parse({ data: tasks, links: [] });
        }
    }, [board, optimisticTasks]);

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden border-t border-gray-200">
            <style jsx global>{`
                .simo-protected-task.gantt_task_line {
                    border: 2px dashed ${VibeTokens.colors.vibePurple} !important;
                    background-color: rgba(97, 97, 255, 0.1) !important;
                    border-radius: ${VibeTokens.radius.sm} !important;
                }
                .vibe-task-bar.gantt_task_line {
                    border-radius: ${VibeTokens.radius.sm} !important;
                    border: none !important;
                    background-color: ${VibeTokens.colors.vibeBlue} !important;
                }
                .gantt_task_content {
                    font-size: 13px;
                    font-weight: 500;
                    color: #fff !important;
                }
                .simo-protected-task .gantt_task_content {
                    color: ${VibeTokens.colors.vibePurple} !important;
                }
                .gantt_grid_head_cell {
                    font-size: 12px;
                    font-weight: 700;
                    color: ${VibeTokens.colors.vibeTextMuted};
                    text-transform: uppercase;
                }
                .gantt_task_row, .gantt_grid_data .gantt_row {
                    height: 40px !important;
                    line-height: 40px !important;
                }
            `}</style>
            <div ref={ganttContainer} className="flex-1 w-full" />
        </div>
    );
};

export default GanttView;
