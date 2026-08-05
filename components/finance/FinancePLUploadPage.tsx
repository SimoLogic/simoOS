"use client";

import React, { useState } from "react";
import { useTenant } from "@/lib/tenant-context";
import { uploadPLFileAction } from "@/app/actions/finance-pl-upload-actions";

type UploadState =
    | { step: "idle" }
    | { step: "uploading"; fileName: string }
    | {
          step: "done";
          rowCount: number;
          uncategorized: number;
          unknownBranch: number;
          warnings: number;
      }
    | { step: "error"; message: string };

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // "data:application/...;base64,XXXX" -> nos quedamos solo con XXXX
            resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Carga del GL Detail Report (P&L) -- puerto del flujo "Upload P&L" de
 * homesi-pl, contra finance_pl.pl_transactions en simoOS. El mapeo GL y las
 * sucursales ya están cargados (ver docs/AGENT_CONTEXT_ANTIGRAVITY.md) --
 * esta página solo sube el reporte mensual.
 */
export const FinancePLUploadPage: React.FC = () => {
    const { currentTenant } = useTenant();
    const [state, setState] = useState<UploadState>({ step: "idle" });

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!currentTenant?.tenant_id) {
            setState({ step: "error", message: "No hay un tenant activo seleccionado." });
            return;
        }

        setState({ step: "uploading", fileName: file.name });
        try {
            const base64 = await fileToBase64(file);
            const result = await uploadPLFileAction(currentTenant.tenant_id, file.name, base64);
            if (result.success) {
                setState({
                    step: "done",
                    rowCount: result.data.rowCount,
                    uncategorized: result.data.uncategorized,
                    unknownBranch: result.data.unknownBranch,
                    warnings: result.data.warnings,
                });
            } else {
                setState({ step: "error", message: result.error });
            }
        } catch (err) {
            setState({ step: "error", message: err instanceof Error ? err.message : "Error al leer el archivo." });
        }
    }

    function reset() {
        setState({ step: "idle" });
    }

    return (
        <div className="flex-1 h-full overflow-auto p-8 bg-slate-50">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-xl font-semibold text-slate-800 mb-1">Carga de P&amp;L (GL Detail Report)</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Sube el reporte contable mensual. Se normaliza, se le asigna categoría según el
                    mapeo GL ya cargado, y queda disponible por sucursal.
                </p>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    {state.step === "idle" && (
                        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-lg py-12 cursor-pointer hover:border-[#0047AB] transition-colors">
                            <span className="text-sm text-slate-600">
                                Haz clic para seleccionar el archivo (.xlsx)
                            </span>
                            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}

                    {state.step === "uploading" && (
                        <div className="text-sm text-slate-500">Procesando {state.fileName}…</div>
                    )}

                    {state.step === "done" && (
                        <div className="flex flex-col gap-2">
                            <div className="text-sm text-emerald-700 font-medium">
                                ✓ Carga completada: {state.rowCount} transacciones.
                            </div>
                            {state.uncategorized > 0 && (
                                <div className="text-xs text-amber-600">
                                    {state.uncategorized} sin categoría GL (código no encontrado en el mapeo).
                                </div>
                            )}
                            {state.unknownBranch > 0 && (
                                <div className="text-xs text-amber-600">
                                    {state.unknownBranch} con sucursal desconocida.
                                </div>
                            )}
                            {state.warnings > 0 && (
                                <div className="text-xs text-amber-600">{state.warnings} filas con advertencias de formato.</div>
                            )}
                            <button onClick={reset} className="text-sm text-[#0047AB] hover:underline self-start mt-2">
                                Subir otro archivo
                            </button>
                        </div>
                    )}

                    {state.step === "error" && (
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-red-600">{state.message}</div>
                            <button onClick={reset} className="text-sm text-[#0047AB] hover:underline self-start">
                                Intentar de nuevo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
