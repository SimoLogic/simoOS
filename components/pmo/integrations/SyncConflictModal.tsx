"use client";

import React, { useState } from "react";
import { resolveConflictAction } from "@/app/actions/pmo/sync-actions";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface ConflictDetail {
  field: string;
  simoValue: string;
  currentValue: string;
}

interface SyncConflictModalProps {
  eventId: string;
  orgId: string;
  taskTitle: string;
  conflicts: ConflictDetail[];
  onResolved?: () => void;
  onClose: () => void;
  userId: string;
}

export function SyncConflictModal({ eventId, orgId, taskTitle, conflicts, onResolved, onClose, userId }: SyncConflictModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async (mode: "keep_employee" | "apply_simo") => {
    setLoading(true);
    setError(null);
    try {
      const res = await resolveConflictAction({ eventId, orgId, resolutionMode: mode }, userId);
      if (res.success) {
        onResolved?.();
        onClose();
      } else {
        setError(res.error || "Error resolving conflict");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 border border-vibe-dark/10">
        <div className="flex gap-3 items-center text-vibe-dark">
          <AlertCircle className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-semibold">Resuelve Conflicto de Sincronización</h2>
        </div>

        <p className="text-sm text-gray-600">
          Simo Intellisense intentó actualizar la tarea <strong>"{taskTitle}"</strong> pero detectó que tú habías hecho cambios manuales previamente. Por la <i>Regla de Oro #2</i>, debes decidir qué versión prevalece.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-md p-4 border border-gray-200 flex flex-col gap-3">
          {conflicts.map((c, i) => (
            <div key={i} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
              <span className="font-medium text-gray-700 capitalize">{c.field}</span>
              <div className="flex gap-4 text-sm">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-500">Tu Carga (Actual)</span>
                  <span className="font-semibold text-vibe-dark">{c.currentValue}</span>
                </div>
                <div className="flex flex-col items-start border-l pl-4">
                  <span className="text-xs text-gray-500">Simo IS</span>
                  <span className="font-semibold text-vibe-blue">{c.simoValue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={() => handleResolve("keep_employee")}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-vibe-dark hover:bg-gray-800 rounded-md disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Mantener Mi Versión
          </button>

          <button
            onClick={() => handleResolve("apply_simo")}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-vibe-blue hover:bg-blue-600 rounded-md shadow-md disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Aplicar Simo IS
          </button>
        </div>
      </div>
    </div>
  );
}
