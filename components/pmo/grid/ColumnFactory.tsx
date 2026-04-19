"use client";

// ColumnFactory.tsx — Motor de Renderizado Dinámico de Celdas PMO
// REGLA DE ORO: Este componente es la única fuente de verdad para el mapeo
// fieldType → CellComponent. Agregar un nuevo tipo de campo = agregar un case aquí.

import React from "react";
import type { PmoColumn, PmoTask } from "@/types/pmo.types";
import { usePmoStore }    from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import { TextCell }     from "./fields/TextCell";
import { StatusCell }   from "./fields/StatusCell";
import { PersonCell }   from "./fields/PersonCell";
import { DateCell }     from "./fields/DateCell";
import { NumberCell }   from "./fields/NumberCell";
import { CheckboxCell } from "./fields/CheckboxCell";
import { PriorityCell } from "./fields/PriorityCell";
import { LinkCell }     from "./fields/LinkCell";
import { FileUploader } from "./fields/FileUploader";

interface ColumnFactoryProps {
  column: PmoColumn;
  task:   PmoTask;
}

/**
 * ColumnFactory — recibe un PmoColumn con su fieldType y retorna
 * el Cell Component correspondiente, pasándole task + fieldKey para
 * leer/escribir en task.customFieldValues[fieldKey].
 *
 * Para columnas nativas (text, status, person, priority, date-nativa)
 * usa los campos directos de PmoTask. Para columnas custom usa fieldKey
 * para leer/escribir en customFieldValues JSONB.
 */
export const ColumnFactory: React.FC<ColumnFactoryProps> = ({ column, task }) => {
  const fieldKey = column.id;

  switch (column.type) {

    case "text":
      return <TextCell task={task} />;

    case "status":
      return <StatusCell task={task} />;

    case "person":
      return <PersonCell task={task} />;

    case "date":
    case "date_range":
      return (
        <DateCell
          task={task}
          fieldKey={fieldKey}
          isNative={column.title.toLowerCase() === "due date" && column.type === "date"}
        />
      );

    case "number":
      return (
        <NumberCell
          task={task}
          fieldKey={fieldKey}
          format={(column.settings?.format as "plain" | "currency" | "percent") ?? "plain"}
          currency={String(column.settings?.currency ?? "USD")}
        />
      );

    case "checkbox":
      return <CheckboxCell task={task} fieldKey={fieldKey} />;

    case "dropdown":
      if (column.title.toLowerCase() === "priority") {
        return <PriorityCell task={task} />;
      }
      return <TextCell task={task} />;

    case "link":
    case "email":
      return <LinkCell task={task} fieldKey={fieldKey} />;

    case "file":
      return (
        <FileUploader
          taskId={task.id}
          orgId={task.orgId}
          boardId={task.boardId}
        />
      );

    case "phone":
      return <TextCell task={task} />;

    case "rating":
      return <RatingCell task={task} fieldKey={fieldKey} />;

    case "progress":
      return <ProgressCell task={task} fieldKey={fieldKey} />;

    case "formula":
    case "mirror":
      return (
        <div className="w-full h-full flex items-center px-2">
          <span className="text-xs text-slate-400 italic">Computed</span>
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center px-2">
          <span className="text-xs text-slate-300">—</span>
        </div>
      );
  }
};

// ── Inline micro-components ───────────────────────────────────────────────────

const RatingCell: React.FC<{ task: PmoTask; fieldKey: string }> = ({ task, fieldKey }) => {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const rating = rawVal !== undefined ? Number(rawVal) : 0;

  const handleClick = async (val: number) => {
    const newVal = val === rating ? 0 : val;
    setOptimisticTask(task.id, { [fieldKey]: newVal } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, newVal);
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); handleClick(i); }}
          className={`text-base leading-none transition-colors ${i <= rating ? "text-[#FDAB3D]" : "text-slate-200 hover:text-[#FDAB3D]"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const ProgressCell: React.FC<{ task: PmoTask; fieldKey: string }> = ({ task, fieldKey }) => {
  const optimisticTasks = usePmoStore(s => s.optimisticTasks);
  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const pct = rawVal !== undefined ? Math.min(100, Math.max(0, Number(rawVal))) : 0;

  return (
    <div className="flex items-center gap-2 px-2 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 100 ? "#00CA72" : "#6161FF",
          }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
};

export default ColumnFactory;
