"use client";

import React from "react";
import { 
  X, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";

/**
 * MirrorConflictModal — Master Key #4 (Conflict Resolution)
 * 
 * Purpose: Allows the employee to resolve discrepancies between Simo IS Playbook
 * updates and their manual changes, ensuring NO silent data overwrites.
 */

interface ConflictField {
  field: string;
  label: string;
  simoValue: any;
  employeeValue: any;
}

interface MirrorConflictModalProps {
  taskId: string;
  taskTitle: string;
  conflicts: ConflictField[];
  onResolve: (resolutions: Record<string, 'simo' | 'employee'>) => void;
  onClose: () => void;
}

export const MirrorConflictModal: React.FC<MirrorConflictModalProps> = ({
  taskId,
  taskTitle,
  conflicts,
  onResolve,
  onClose
}) => {
  const [resolutions, setResolutions] = React.useState<Record<string, 'simo' | 'employee'>>(
    conflicts.reduce((acc, c) => ({ ...acc, [c.field]: 'employee' }), {})
  );

  const handleToggle = (field: string, type: 'simo' | 'employee') => {
    setResolutions(prev => ({ ...prev, [field]: type }));
  };

  const handleConfirm = () => {
    onResolve(resolutions);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white rounded-[var(--radius-lg)] shadow-[var(--elevation-3)] flex flex-col overflow-hidden animate-slide-up"
        style={{ animationDuration: 'var(--motion-expressive-short)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--vibe-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[rgba(253,171,61,0.1)] text-[var(--vibe-orange)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[var(--vibe-text-prime)]">Conflicto de Sincronización</h2>
              <p className="text-[12px] text-[var(--vibe-text-muted)]">Tarea: <span className="font-semibold">{taskTitle}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--vibe-surface-2)] rounded-full transition-colors">
            <X className="w-5 h-5 text-[var(--vibe-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-6">
          <div className="p-4 bg-[var(--vibe-surface-2)] rounded-[var(--radius-md)] border border-[var(--vibe-border)]">
            <p className="text-[14px] text-[var(--vibe-text-prime)] flex gap-2">
              <Clock className="w-4 h-4 text-[var(--vibe-orange)] shrink-0 mt-0.5" />
              <span>Simo IS ha intentado actualizar esta tarea, pero hemos detectado cambios manuales realizados por ti. Por favor, elige qué versión conservar para cada campo.</span>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {conflicts.map((conflict) => (
              <div key={conflict.field} className="flex flex-col gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--vibe-text-muted)]">{conflict.label}</span>
                <div className="grid grid-cols-2 gap-4">
                  {/* Employee Version */}
                  <button 
                    onClick={() => handleToggle(conflict.field, 'employee')}
                    className={cn(
                      "flex flex-col p-4 rounded-[var(--radius-md)] border transition-all text-left group",
                      resolutions[conflict.field] === 'employee' 
                        ? "border-[var(--vibe-purple)] bg-[rgba(97,97,255,0.05)] ring-1 ring-[var(--vibe-purple)]" 
                        : "border-[var(--vibe-border)] hover:border-[var(--vibe-text-muted)]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[var(--vibe-text-muted)]">Tu versión</span>
                      {resolutions[conflict.field] === 'employee' && <CheckCircle2 className="w-4 h-4 text-[var(--vibe-purple)]" />}
                    </div>
                    <div className="text-[14px] font-medium text-[var(--vibe-text-prime)]">{String(conflict.employeeValue)}</div>
                  </button>

                  {/* Simo IS Version */}
                  <button 
                    onClick={() => handleToggle(conflict.field, 'simo')}
                    className={cn(
                      "flex flex-col p-4 rounded-[var(--radius-md)] border transition-all text-left group",
                      resolutions[conflict.field] === 'simo' 
                        ? "border-[var(--vibe-purple)] bg-[rgba(97,97,255,0.05)] ring-1 ring-[var(--vibe-purple)]" 
                        : "border-[var(--vibe-border)] hover:border-[var(--vibe-text-muted)]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[var(--vibe-text-muted)]">Versión Simo IS</span>
                      {resolutions[conflict.field] === 'simo' && <CheckCircle2 className="w-4 h-4 text-[var(--vibe-purple)]" />}
                    </div>
                    <div className="text-[14px] font-medium text-[var(--vibe-text-prime)]">{String(conflict.simoValue)}</div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--vibe-border)] bg-[var(--vibe-surface-2)] flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-medium text-[var(--vibe-text-prime)] hover:bg-[var(--vibe-surface-3)] rounded-[var(--radius-sm)] transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 bg-[var(--vibe-purple)] text-white text-[14px] font-bold rounded-[var(--radius-sm)] shadow-lg shadow-[var(--vibe-purple)]/20 hover:brightness-110 active:scale-95 transition-all"
          >
            Guardar Resoluciones
          </button>
        </div>
      </div>
    </div>
  );
};
