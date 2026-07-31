"use client";

// TemplateSelectorModal.tsx — Create board with predefined columns
// Mapped from S-09 specification

import React, { useState } from "react";
import { X, Search, Briefcase, CheckSquare, BarChart, Rocket } from "lucide-react";
import { createBoardAction } from "@/app/actions/pmo/board-actions";
import { addColumnAction } from "@/app/actions/pmo/column-actions";
import { usePmoStore } from "@/lib/stores/pmo.store";
import type { PmoFieldType } from "@/types/pmo.types";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  columns: { title: string; type: PmoFieldType; widthPx?: number; settings?: any }[];
}

const TEMPLATES: Template[] = [
  {
    id: "crm",
    name: "CRM Pipeline",
    description: "Manage leads, tracks stages, and forecast revenue.",
    icon: Briefcase,
    color: "#00CA72",
    columns: [
      { title: "Status", type: "status", widthPx: 140 },
      { title: "Company", type: "text", widthPx: 160 },
      { title: "Email", type: "email", widthPx: 160 },
      { title: "Phone", type: "phone", widthPx: 140 },
      { title: "Expected Value", type: "number", widthPx: 140, settings: { currency: "USD" } },
    ],
  },
  {
    id: "tasks",
    name: "Gestión de Tareas",
    description: "Assign responsibilities and track workday deadlines.",
    icon: CheckSquare,
    color: "#6161FF",
    columns: [
      { title: "Responsable", type: "person", widthPx: 160 },
      { title: "Fecha Límite", type: "date", widthPx: 140 },
      { title: "Prioridad", type: "dropdown", widthPx: 140 },
      { title: "Progreso", type: "progress", widthPx: 140 },
    ],
  },
  {
    id: "pipeline",
    name: "Sales Pipeline",
    description: "Track opportunities and probabilities.",
    icon: BarChart,
    color: "#FDAB3D",
    columns: [
      { title: "Etapa", type: "status", widthPx: 140 },
      { title: "Valor Estimado", type: "number", widthPx: 140, settings: { currency: "USD" } },
      { title: "Probabilidad (%)", type: "number", widthPx: 140, settings: { format: "percent" } },
      { title: "Fecha de Cierre", type: "date", widthPx: 140 },
    ],
  },
  {
    id: "blank",
    name: "Mesa de Trabajo Vacía",
    description: "Start from scratch with only basic defaults.",
    icon: Rocket,
    color: "#0086C0",
    columns: [
      // Fallback: we will use seedColumns: true for this one
    ],
  },
];

interface Props {
  tenantId: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}

export function TemplateSelectorModal({ tenantId, workspaceId, isOpen, onClose, onCreated }: Props) {
  const [selected, setSelected] = useState<string>("crm");
  const [boardName, setBoardName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!boardName.trim() || loading) return;
    setLoading(true);

    const template = TEMPLATES.find(t => t.id === selected);
    const isBlank = selected === "blank";

    try {
      // Create board. If blank, seed defaults. If not, seed false to build our own.
      const res = await createBoardAction({
        tenantId,
        workspaceId,
        title: boardName.trim(),
        seedColumns: isBlank,
        isPlaybookBoard: false,
      });

      if (!res.success || !res.data) {
        throw new Error(('error' in res ? res.error : undefined) || "Failed to create board");
      }

      const boardId = res.data.id;

      // Inject custom template columns
      if (!isBlank && template) {
        // Create the default Task title column first
        await addColumnAction({
          tenantId,
          boardId,
          title: "Item",
          type: "text",
          widthPx: 250,
        });

        for (const col of template.columns) {
          await addColumnAction({
            tenantId,
            boardId,
            title: col.title,
            type: col.type as PmoFieldType,
            widthPx: col.widthPx,
            settings: col.settings,
          });
        }
      }

      onCreated(boardId);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error creating board template.");
    } finally {
      setLoading(false);
      setBoardName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden motion-preset-slide-right motion-duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Choose a Template</h2>
            <p className="text-sm text-slate-500">Pick a starting point or start from scratch.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Workspace Board Name</label>
            <input
              type="text"
              value={boardName}
              onChange={e => setBoardName(e.target.value)}
              placeholder="e.g. Q3 Marketing Roadmap"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-800 focus:outline-none focus:border-[#6161FF] focus:ring-1 focus:ring-[#6161FF] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                  selected === t.id 
                    ? "border-[#6161FF] bg-[#6161FF]/5 ring-1 ring-[#6161FF]" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${t.color}15`, color: t.color }}
                >
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-semibold text-[14px] ${selected === t.id ? "text-[#6161FF]" : "text-slate-800"}`}>
                    {t.name}
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-1 leading-snug">
                    {t.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!boardName.trim() || loading}
            className="px-6 py-2.5 bg-[#6161FF] text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? "Building Board..." : "Use Template"}
          </button>
        </div>

      </div>
    </div>
  );
}
