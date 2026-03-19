"use client";

import React, { useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import { PmoBoard, PmoTask } from "@/types/pmo.types";
import { cn } from "@/lib/utils";
import { Lock, User } from "lucide-react";

interface KanbanViewProps {
  board: PmoBoard;
  optimisticTasks: Record<string, Partial<PmoTask>>;
  isReadOnly?: boolean;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ board, optimisticTasks, isReadOnly }) => {
  const { isViewLocked } = usePmoStore();

  // Swimlanes por STATUS (Default para este prompt)
  const columns = useMemo(() => {
    const statuses: Record<string, PmoTask[]> = {
      not_started: [],
      in_progress: [],
      done: [],
      stuck: [],
      pending_review: [],
    };

    board.groups?.forEach((group) => {
      group.tasks?.forEach((task) => {
        const optimistic = optimisticTasks[task.id] || {};
        const finalTask = { ...task, ...optimistic };
        if (statuses[finalTask.status]) {
          statuses[finalTask.status].push(finalTask as PmoTask);
        }
      });
    });

    return Object.entries(statuses).map(([status, tasks]) => ({
      id: status,
      title: status.replace("_", " ").toUpperCase(),
      tasks,
    }));
  }, [board, optimisticTasks]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (isReadOnly || isViewLocked) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;

    // BLOQUEO SIMO IS: Tareas protegidas no se mueven entre columnas
    const task = board.groups.flatMap(g => g.tasks).find(t => t.id === taskId);
    if (task?.isProtected || task?.sourcePlaybookId) {
        // En un entorno real, aquí lanzaríamos un Toast de error
        return;
    }

    // Aquí llamaríamos a la acción del store para actualizar el status
    console.log(`Moviendo tarea ${taskId} a ${newStatus}`);
  };

  return (
    <div className="h-full bg-white overflow-x-auto p-6">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="w-80 flex flex-col bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-bold text-gray-500 tracking-wider">
                  {column.title}
                </h3>
                <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                  {column.tasks.length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "flex-1 flex flex-col gap-3 min-h-[200px] transition-colors",
                      snapshot.isDraggingOver ? "bg-gray-100/50" : ""
                    )}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                        isDragDisabled={isReadOnly || isViewLocked || task.isProtected}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                            className={cn(
                              "bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all group",
                              snapshot.isDragging ? "shadow-xl rotate-2 ring-2 ring-vibe-purple/20" : "hover:border-gray-300",
                              task.isProtected ? "border-2 border-dashed border-vibe-purple" : ""
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-900 line-clamp-2">
                                  {task.title}
                                </span>
                                {(task as any).sfExternalId && (
                                  <span
                                    title="Vinculada a Salesforce"
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      backgroundColor: "#0086C0",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                              </div>
                              {task.isProtected && (
                                <Lock className="w-3 h-3 text-vibe-purple shrink-0" />
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                  <User className="w-3 h-3 text-gray-400" />
                                </div>
                              </div>
                              
                              {task.dueDate && (
                                <div className="text-[10px] text-gray-400 font-medium">
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
      <style jsx global>{`
        .ring-vibe-purple\/20 {
            --tw-ring-color: rgba(97, 97, 255, 0.2);
        }
        .border-vibe-purple {
            border-color: ${VibeTokens.colors.vibePurple} !important;
        }
        .text-vibe-purple {
            color: ${VibeTokens.colors.vibePurple} !important;
        }
      `}</style>
    </div>
  );
};

export default KanbanView;
