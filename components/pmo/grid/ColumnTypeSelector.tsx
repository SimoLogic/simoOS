"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, X, Type, Hash, ToggleLeft, Calendar, ChevronDown, Link2, Star, Activity, User, ListChecks } from "lucide-react";
import type { PmoFieldType, PmoColumn } from "@/types/pmo.types";
import { addColumnAction } from "@/app/actions/pmo/column-actions";

interface ColumnTypeSelectorProps {
  boardId: string;
  orgId:   string;
  onColumnAdded: (column: PmoColumn) => void; // reactive — fires immediately on success
}

interface ColumnTypeOption {
  type:        PmoFieldType;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;
}

const COLUMN_TYPES: ColumnTypeOption[] = [
  { type: "text",     label: "Text",      description: "Free-form text entry",       icon: Type,       color: "#6161FF" },
  { type: "number",   label: "Number",    description: "Currency, percent, plain",   icon: Hash,       color: "#0086C0" },
  { type: "status",   label: "Status",    description: "Working, Done, Stuck…",      icon: Activity,   color: "#00CA72" },
  { type: "person",   label: "Person",    description: "Assign a team member",       icon: User,       color: "#FDAB3D" },
  { type: "date",     label: "Date",      description: "Workday-aware date picker",  icon: Calendar,   color: "#FF3D57" },
  { type: "checkbox", label: "Checkbox",  description: "Boolean toggle",             icon: ToggleLeft, color: "#6161FF" },
  { type: "dropdown", label: "Dropdown",  description: "Custom option list",         icon: ChevronDown,color: "#8B5CF6" },
  { type: "link",     label: "Link",      description: "URL with validation",        icon: Link2,      color: "#0086C0" },
  { type: "rating",   label: "Rating",    description: "1–5 star rating",            icon: Star,       color: "#FDAB3D" },
  { type: "progress", label: "Progress",  description: "0–100% progress bar",        icon: Activity,   color: "#00CA72" },
  { type: "file",     label: "Files",     description: "Upload attachments",         icon: ListChecks, color: "#FF3D57" },
];

export const ColumnTypeSelector: React.FC<ColumnTypeSelectorProps> = ({
  boardId, orgId, onColumnAdded
}) => {
  const [isOpen, setIsOpen]     = useState(false);
  const [step, setStep]         = useState<"pick" | "name">("pick");
  const [selected, setSelected] = useState<ColumnTypeOption | null>(null);
  const [colName, setColName]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const containerRef            = useRef<HTMLDivElement>(null);
  const nameInputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (step === "name" && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  const handleClose = () => {
    setIsOpen(false);
    setStep("pick");
    setSelected(null);
    setColName("");
    setError(null);
  };

  const handleSelectType = (opt: ColumnTypeOption) => {
    setSelected(opt);
    setColName(opt.label); // pre-fill with type name
    setStep("name");
  };

  const handleCreate = async () => {
    if (!selected || !colName.trim()) return;
    setLoading(true);
    setError(null);

    const result = await addColumnAction({
      boardId,
      orgId,
      title: colName.trim(),
      type:  selected.type,
    });

    setLoading(false);

    if (result.success) {
      onColumnAdded(result.data); // ← triggers immediate reactive re-render in GridView
      handleClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* The [+] Trigger Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#6161FF]/10 text-slate-400 hover:text-[#6161FF] transition-all duration-[70ms]"
        title="Add column"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-10 right-0 z-[60] bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden"
          style={{ width: 280 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {step === "pick" ? "Add Column" : `Name your column`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === "pick" ? "Choose a column type" : `Type: ${selected?.label}`}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === "pick" ? (
            /* ── Step 1: Type Picker ── */
            <div className="p-2 max-h-[340px] overflow-y-auto">
              {COLUMN_TYPES.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleSelectType(opt)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${opt.color}18`, color: opt.color }}
                  >
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-[#6161FF] transition-colors">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* ── Step 2: Name Input ── */
            <div className="p-4 space-y-4">
              {selected && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: `${selected.color}12` }}
                >
                  <selected.icon className="w-4 h-4" style={{ color: selected.color }} />
                  <span className="text-sm font-semibold" style={{ color: selected.color }}>
                    {selected.label} column
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Column name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={colName}
                  onChange={e => setColName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") handleClose(); }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6161FF]/40 focus:border-[#6161FF]"
                  placeholder="e.g. Due Date, Budget, Owner..."
                  maxLength={100}
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("pick")}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !colName.trim()}
                  className="flex-1 px-3 py-2 text-sm font-bold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#6161FF" }}
                >
                  {loading ? "Creating…" : "Create Column"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColumnTypeSelector;
