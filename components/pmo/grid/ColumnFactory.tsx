"use client";

// ColumnFactory.tsx — Motor de Renderizado Dinámico PMO
// REGLA DE ORO: Fuente única de verdad para fieldType → CellComponent.
// PARIDAD TOTAL: 17/17 tipos cubiertos. CERO stubs visuales. CERO inline components.
//
// Para agregar un nuevo tipo:
// 1. Crear SuNombreCell.tsx en fields/
// 2. Importarlo aquí
// 3. Agregar el case en el switch

import React from "react";
import type { PmoColumn, PmoTask } from "@/types/pmo.types";

// ─── Native field cells ───────────────────────────────────────────────────────
import { TextCell }          from "./fields/TextCell";
import { StatusCell }        from "./fields/StatusCell";
import { PersonCell }        from "./fields/PersonCell";
import { DateCell }          from "./fields/DateCell";
import { NumberCell }        from "./fields/NumberCell";
import { CheckboxCell }      from "./fields/CheckboxCell";
import { PriorityCell }      from "./fields/PriorityCell";
import { LinkCell }          from "./fields/LinkCell";
import { FileUploader }      from "./fields/FileUploader";

// ─── Extracted (were inline stubs) ───────────────────────────────────────────
import { RatingCell }        from "./fields/RatingCell";
import { ProgressCell }      from "./fields/ProgressCell";

// ─── New S-11 cells ───────────────────────────────────────────────────────────
import { CurrencyCell }      from "./fields/CurrencyCell";
import { TagsCell }          from "./fields/TagsCell";
import { DropdownCell }      from "./fields/DropdownCell";
import { TimelineCell }      from "./fields/TimelineCell";
import { AutoNumberCell }    from "./fields/AutoNumberCell";
import { FormulaCell }       from "./fields/FormulaCell";
import { EmailCell }         from "./fields/EmailCell";
import { PhoneCell }         from "./fields/PhoneCell";
import { LastUpdatedCell }   from "./fields/LastUpdatedCell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnFactoryProps {
  column:    PmoColumn;
  task:      PmoTask;
  rowIndex?: number; // for AutoNumberCell
}

// ─── ColumnFactory ────────────────────────────────────────────────────────────

export const ColumnFactory: React.FC<ColumnFactoryProps> = ({ column, task, rowIndex }) => {
  const fieldKey = column.id;
  const settings = column.settings ?? {};

  switch (column.type) {

    // ── 1. TEXT ───────────────────────────────────────────────────────────────
    case "text":
      return <TextCell task={task} />;

    // ── 2. STATUS ─────────────────────────────────────────────────────────────
    case "status":
      return <StatusCell task={task} />;

    // ── 3. PERSON ─────────────────────────────────────────────────────────────
    case "person":
      return <PersonCell task={task} />;

    // ── 4. DATE ───────────────────────────────────────────────────────────────
    case "date":
      return (
        <DateCell
          task={task}
          fieldKey={fieldKey}
          isNative={column.title.toLowerCase() === "due date"}
        />
      );

    // ── 5. DATE RANGE / TIMELINE ──────────────────────────────────────────────
    case "date_range":
      return <TimelineCell task={task} fieldKey={fieldKey} />;

    // ── 6. NUMBER ─────────────────────────────────────────────────────────────
    case "number":
      return (
        <NumberCell
          task={task}
          fieldKey={fieldKey}
          format={(settings.format as "plain" | "currency" | "percent") ?? "plain"}
          currency={String(settings.currency ?? "USD")}
        />
      );

    // ── 7. CURRENCY ───────────────────────────────────────────────────────────
    case "currency" as string:
      return (
        <CurrencyCell
          task={task}
          fieldKey={fieldKey}
          currency={String(settings.currency ?? "USD")}
        />
      );

    // ── 8. CHECKBOX ───────────────────────────────────────────────────────────
    case "checkbox":
      return <CheckboxCell task={task} fieldKey={fieldKey} />;

    // ── 9. DROPDOWN ───────────────────────────────────────────────────────────
    // Priority is a special dropdown case
    case "dropdown":
      if (column.title.toLowerCase() === "priority") {
        return <PriorityCell task={task} />;
      }
      return (
        <DropdownCell
          task={task}
          fieldKey={fieldKey}
          options={(settings.options as Array<{ id: string; label: string; color?: string }>) ?? []}
        />
      );

    // ── 10. TAGS ──────────────────────────────────────────────────────────────
    case "tags" as string:
      return (
        <TagsCell
          task={task}
          fieldKey={fieldKey}
          options={(settings.options as string[]) ?? []}
        />
      );

    // ── 11. LINK ──────────────────────────────────────────────────────────────
    case "link":
      return <LinkCell task={task} fieldKey={fieldKey} />;

    // ── 12. EMAIL ─────────────────────────────────────────────────────────────
    case "email":
      return <EmailCell task={task} fieldKey={fieldKey} />;

    // ── 13. PHONE ─────────────────────────────────────────────────────────────
    case "phone":
      return <PhoneCell task={task} fieldKey={fieldKey} />;

    // ── 14. FILE ──────────────────────────────────────────────────────────────
    case "file":
      return (
        <FileUploader
          taskId={task.id}
          orgId={task.orgId}
          boardId={task.boardId}
        />
      );

    // ── 15. RATING ────────────────────────────────────────────────────────────
    case "rating":
      return <RatingCell task={task} fieldKey={fieldKey} />;

    // ── 16. PROGRESS ──────────────────────────────────────────────────────────
    case "progress":
      return <ProgressCell task={task} fieldKey={fieldKey} />;

    // ── 17. FORMULA ───────────────────────────────────────────────────────────
    case "formula":
      return (
        <FormulaCell
          task={task}
          fieldKey={fieldKey}
          formula={String(settings.formula ?? "")}
          format={(settings.format as "number" | "currency" | "percent") ?? "number"}
          currency={String(settings.currency ?? "USD")}
        />
      );

    // ── AUTO NUMBER ───────────────────────────────────────────────────────────
    // Not a standard PmoFieldType — rendered via explicit column.type check
    case "auto_number" as string:
      return <AutoNumberCell task={task} rowIndex={rowIndex} />;

    // ── LAST UPDATED ──────────────────────────────────────────────────────────
    case "last_updated" as string:
      return <LastUpdatedCell task={task} />;

    // ── MIRROR ────────────────────────────────────────────────────────────────
    // Mirror columns display a value from another board — S-16 scope
    case "mirror":
      return (
        <div className="flex items-center gap-1 px-2 w-full opacity-50" title="Mirror columns require cross-board configuration">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-slate-400">
            <path d="M8 5v14M16 5v14M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[11px] text-slate-400 italic">Mirror</span>
        </div>
      );

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    // Should never be reached with full type coverage
    default:
      return (
        <div className="flex items-center px-2 w-full">
          <span className="text-[12px] text-slate-300 font-mono">{column.type}</span>
        </div>
      );
  }
};

export default ColumnFactory;
