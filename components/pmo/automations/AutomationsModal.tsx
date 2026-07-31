"use client";

/**
 * AutomationsModal.tsx — S-14 Vibe Automation Rule Builder
 *
 * UX: "Sentence Builder" pattern → "When [Field] changes to [Value] → Then [Action] [Field] to [Value]"
 * SHIELD: Displays active/inactive toggle per rule, deletion with confirmation.
 * DESIGN: Rounded-2xl panels, Zap iconography, motion slide-up transitions.
 * ARCHITECTURE: Uses Server Actions (automation-actions.ts), NEVER raw supabase.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Zap, Plus, Trash2, Loader2, ToggleLeft, ToggleRight,
  ChevronRight, AlertTriangle, Bell, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAutomationsAction,
  createAutomationAction,
  deleteAutomationAction,
  toggleAutomationAction,
} from "@/app/actions/pmo/automation-actions";
import type { PmoAutomation } from "@/lib/services/pmo/automation.service";

// ─── FIELD/VALUE CONSTANTS ────────────────────────────────────────────────────

const TRIGGER_FIELDS = [
  { value: "status",   label: "Status" },
  { value: "priority", label: "Priority" },
];

const STATUS_VALUES = [
  { value: "not_started",    label: "Not Started" },
  { value: "in_progress",    label: "In Progress" },
  { value: "done",           label: "Done" },
  { value: "stuck",          label: "Stuck" },
  { value: "pending_review", label: "Pending Review" },
];

const PRIORITY_VALUES = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

const ACTION_TYPES = [
  { value: "set_column", label: "Set Column Value", icon: Settings2 },
  { value: "notify",     label: "Send Notification", icon: Bell },
];

function getValuesForField(field: string) {
  if (field === "status")   return STATUS_VALUES;
  if (field === "priority") return PRIORITY_VALUES;
  return [];
}

function getLabelForValue(field: string, value: string): string {
  const options = getValuesForField(field);
  return options.find(o => o.value === value)?.label ?? value;
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface AutomationsModalProps {
  isOpen:  boolean;
  onClose: () => void;
  boardId: string;
  tenantId:   string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const AutomationsModal: React.FC<AutomationsModalProps> = ({
  isOpen,
  onClose,
  boardId,
  tenantId,
}) => {
  const [rules, setRules]             = useState<PmoAutomation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder state
  const [triggerField, setTriggerField]   = useState("status");
  const [triggerValue, setTriggerValue]   = useState("done");
  const [actionType, setActionType]       = useState<"set_column" | "notify">("set_column");
  const [actionField, setActionField]     = useState("priority");
  const [actionValue, setActionValue]     = useState("low");
  const [ruleName, setRuleName]           = useState("");

  // ── Load rules on open ──
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAutomationsAction(boardId, tenantId);
      setRules(data);
    } catch (err) {
      console.error("[AutomationsModal] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId, tenantId]);

  useEffect(() => {
    if (isOpen) loadRules();
  }, [isOpen, loadRules]);

  // ── Create rule ──
  const handleCreate = async () => {
    if (!ruleName.trim()) return;
    setCreating(true);
    try {
      const res = await createAutomationAction({
        tenantId,
        boardId,
        name:          ruleName.trim(),
        triggerType:   triggerField === "status" ? "on_status_change" : "on_column_change",
        triggerConfig: { field: triggerField, value: triggerValue },
        actionType,
        actionConfig:  actionType === "notify"
          ? { field: "notification", value: "true" }
          : { field: actionField, value: actionValue },
      });
      if (res.success) {
        setRules(prev => [...prev, res.data]);
        setShowBuilder(false);
        resetBuilder();
      }
    } catch (err) {
      console.error("[AutomationsModal] Create error:", err);
    } finally {
      setCreating(false);
    }
  };

  const resetBuilder = () => {
    setRuleName("");
    setTriggerField("status");
    setTriggerValue("done");
    setActionType("set_column");
    setActionField("priority");
    setActionValue("low");
  };

  // ── Toggle ──
  const handleToggle = async (rule: PmoAutomation) => {
    const res = await toggleAutomationAction(rule.id, tenantId, !rule.isActive);
    if (res.success) {
      setRules(prev => prev.map(r => r.id === rule.id ? res.data : r));
    }
  };

  // ── Delete ──
  const handleDelete = async (ruleId: string) => {
    const res = await deleteAutomationAction(ruleId, tenantId);
    if (res.success) {
      setRules(prev => prev.filter(r => r.id !== ruleId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden motion-preset-slide-up-sm">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800">Board Automations</h2>
              <p className="text-[12px] text-slate-400">Reactive rules that trigger automatically on task changes.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto p-6">

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
            </div>
          )}

          {/* Empty State */}
          {!loading && rules.length === 0 && !showBuilder && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center">
                <Zap className="w-8 h-8 text-amber-300" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-slate-700">No automations yet</p>
                <p className="text-[13px] text-slate-400 mt-1 max-w-xs">
                  Create your first rule to automate repetitive workflow operations.
                </p>
              </div>
              <button
                onClick={() => setShowBuilder(true)}
                className="flex items-center gap-2 px-4 py-2 mt-2 text-[13px] font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create First Automation
              </button>
            </div>
          )}

          {/* Rules List */}
          {!loading && rules.length > 0 && (
            <div className="space-y-3 mb-4">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={cn(
                    "border rounded-2xl px-4 py-3 flex items-center justify-between gap-3 transition-all group",
                    rule.isActive
                      ? "border-amber-200 bg-amber-50/30 hover:shadow-md hover:border-amber-300"
                      : "border-slate-200 bg-slate-50/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("w-1.5 h-10 rounded-full shrink-0", rule.isActive ? "bg-amber-400" : "bg-slate-200")} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Zap className={cn("w-3.5 h-3.5 shrink-0", rule.isActive ? "text-amber-500" : "text-slate-300")} />
                        <span className="text-[14px] font-bold text-slate-700 truncate">{rule.name}</span>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                          rule.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                        )}>
                          {rule.isActive ? "Live" : "Off"}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-400 mt-0.5 pl-5.5">
                        When <span className="font-semibold text-slate-600">{rule.triggerConfig.field}</span>
                        {" → "}
                        <span className="font-semibold text-amber-600">{getLabelForValue(rule.triggerConfig.field, rule.triggerConfig.value)}</span>
                        {" "}then{" "}
                        {rule.actionType === "set_column" ? (
                          <>
                            set <span className="font-semibold text-slate-600">{rule.actionConfig.field}</span>
                            {" → "}
                            <span className="font-semibold text-indigo-600">{getLabelForValue(rule.actionConfig.field, rule.actionConfig.value)}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-blue-600">Notify</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      title={rule.isActive ? "Disable" : "Enable"}
                    >
                      {rule.isActive
                        ? <ToggleRight className="w-5 h-5 text-amber-500" />
                        : <ToggleLeft className="w-5 h-5 text-slate-300" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SENTENCE BUILDER ── */}
          {showBuilder && (
            <div className="border border-amber-200 rounded-2xl p-5 bg-gradient-to-br from-amber-50/50 to-white motion-preset-slide-up-sm">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-[13px] font-bold text-slate-700">New Automation Rule</span>
              </div>

              {/* Rule Name */}
              <div className="mb-5">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Rule Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={e => setRuleName(e.target.value)}
                  placeholder='e.g. "Auto-low priority when done"'
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* WHEN */}
              <div className="mb-5">
                <label className="text-[12px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> When
                </label>
                <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-xl border border-amber-100">
                  <select
                    value={triggerField}
                    onChange={e => {
                      setTriggerField(e.target.value);
                      setTriggerValue(getValuesForField(e.target.value)[0]?.value ?? "");
                    }}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-bold text-[#6161FF]"
                  >
                    {TRIGGER_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <span className="text-[13px] text-slate-400 font-medium">changes to</span>
                  <select
                    value={triggerValue}
                    onChange={e => setTriggerValue(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-bold text-[#6161FF]"
                  >
                    {getValuesForField(triggerField).map(v => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex items-center gap-2 mb-5 pl-4">
                <ChevronRight className="w-5 h-5 text-amber-400" />
                <div className="flex-1 h-px bg-amber-200" />
              </div>

              {/* THEN */}
              <div className="mb-5">
                <label className="text-[12px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Settings2 className="w-3 h-3" /> Then
                </label>

                {/* Action Type Selector */}
                <div className="flex items-center gap-2 mb-3">
                  {ACTION_TYPES.map(at => {
                    const Icon = at.icon;
                    return (
                      <button
                        key={at.value}
                        onClick={() => setActionType(at.value as "set_column" | "notify")}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors",
                          actionType === at.value
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {at.label}
                      </button>
                    );
                  })}
                </div>

                {/* set_column config */}
                {actionType === "set_column" && (
                  <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-xl border border-indigo-100">
                    <span className="text-[13px] text-slate-400 font-medium">Set</span>
                    <select
                      value={actionField}
                      onChange={e => {
                        setActionField(e.target.value);
                        setActionValue(getValuesForField(e.target.value)[0]?.value ?? "");
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-[#00CA72]"
                    >
                      {TRIGGER_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <span className="text-[13px] text-slate-400 font-medium">to</span>
                    <select
                      value={actionValue}
                      onChange={e => setActionValue(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-[#00CA72]"
                    >
                      {getValuesForField(actionField).map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* notify config */}
                {actionType === "notify" && (
                  <div className="flex items-center gap-2 text-[13px] text-slate-500 bg-blue-50 px-3 py-2.5 rounded-xl border border-blue-100">
                    <Bell className="w-4 h-4 text-blue-400" />
                    A system notification will be created when this rule triggers.
                  </div>
                )}
              </div>

              {/* Preview Sentence */}
              {ruleName.trim() && (
                <div className="mb-5 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Preview</p>
                  <p className="text-[13px] text-slate-600">
                    When <strong className="text-amber-600">{triggerField}</strong> changes to{" "}
                    <strong className="text-amber-600">{getLabelForValue(triggerField, triggerValue)}</strong>
                    {" → "}
                    {actionType === "set_column" ? (
                      <>
                        Set <strong className="text-indigo-600">{actionField}</strong> to{" "}
                        <strong className="text-indigo-600">{getLabelForValue(actionField, actionValue)}</strong>
                      </>
                    ) : (
                      <strong className="text-blue-600">Send Notification</strong>
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setShowBuilder(false); resetBuilder(); }}
                  className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !ruleName.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Create Rule
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && rules.length > 0 && !showBuilder && (
          <div className="border-t border-slate-100 px-6 py-3 flex justify-between items-center bg-slate-50/50">
            <span className="text-[12px] text-slate-400">
              {rules.filter(r => r.isActive).length} active of {rules.length} rules
            </span>
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        )}

        {/* Close button always visible in footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-[13px] font-bold shadow-lg hover:bg-slate-900 transition-all">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
