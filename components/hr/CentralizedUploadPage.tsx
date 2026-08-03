"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { useTenant } from "@/lib/tenant-context";
import {
    uploadActiveRosterAction,
    type RawActiveRosterRow,
} from "@/app/actions/hr-centralized-upload-actions";

type UploadState =
    | { step: "idle" }
    | { step: "parsed"; rows: RawActiveRosterRow[]; fileName: string }
    | { step: "submitting"; rows: RawActiveRosterRow[]; fileName: string }
    | { step: "done"; count: number; uploadBatchId: string }
    | { step: "error"; message: string };

/**
 * Carga Centralizada -- sube el Excel "Centralización de Información SLTEAM"
 * (hoja "Active"), lo manda a Supabase (cifrado) + BigQuery (no sensible).
 * Ver app/actions/hr-centralized-upload-actions.ts y
 * docs/AGENT_CONTEXT_ANTIGRAVITY.md para el detalle del pipeline.
 */
export const CentralizedUploadPage: React.FC = () => {
    const { currentTenant } = useTenant();
    const [state, setState] = useState<UploadState>({ step: "idle" });

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: "binary", cellDates: true });

                if (!workbook.SheetNames.includes("Active")) {
                    setState({
                        step: "error",
                        message: `El archivo no tiene una hoja llamada "Active". Hojas encontradas: ${workbook.SheetNames.join(", ")}`,
                    });
                    return;
                }

                const sheet = workbook.Sheets["Active"];
                // La hoja "Active" tiene un título en la fila 1 -- el encabezado real está en la fila 2.
                const rows = XLSX.utils.sheet_to_json<RawActiveRosterRow>(sheet, { range: 1 });

                setState({ step: "parsed", rows, fileName: file.name });
            } catch (err) {
                setState({
                    step: "error",
                    message: err instanceof Error ? err.message : "No se pudo leer el archivo.",
                });
            }
        };
        reader.onerror = () => setState({ step: "error", message: "No se pudo leer el archivo." });
        reader.readAsBinaryString(file);
    }

    async function handleConfirm() {
        if (state.step !== "parsed") return;
        if (!currentTenant?.tenant_id) {
            setState({ step: "error", message: "No hay un tenant activo seleccionado." });
            return;
        }

        setState({ step: "submitting", rows: state.rows, fileName: state.fileName });
        const result = await uploadActiveRosterAction(currentTenant.tenant_id, state.rows);

        if (result.success) {
            setState({ step: "done", count: result.data.count, uploadBatchId: result.data.uploadBatchId });
        } else {
            setState({ step: "error", message: result.error });
        }
    }

    function reset() {
        setState({ step: "idle" });
    }

    return (
        <div className="flex-1 h-full overflow-auto p-8 bg-slate-50">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-xl font-semibold text-slate-800 mb-1">Carga Centralizada de Empleados</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Sube el archivo &ldquo;Centralización de Información SLTEAM&rdquo; (hoja{" "}
                    <strong>Active</strong>). Los datos sensibles (cédula, dirección, cuenta bancaria)
                    quedan cifrados y solo visibles para roles Admin/HR. Los campos de cargo, área,
                    sucursal y antigüedad también se envían a BigQuery para análisis.
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

                    {state.step === "parsed" && (
                        <div className="flex flex-col gap-4">
                            <div className="text-sm text-slate-700">
                                <strong>{state.fileName}</strong> — {state.rows.length} filas leídas de la hoja
                                "Active".
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirm}
                                    className="bg-[#0047AB] text-white text-sm font-medium rounded-md px-4 py-2"
                                >
                                    Confirmar carga
                                </button>
                                <button
                                    onClick={reset}
                                    className="text-sm text-slate-500 px-4 py-2 hover:text-slate-700"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {state.step === "submitting" && (
                        <div className="text-sm text-slate-500">Subiendo {state.rows.length} registros…</div>
                    )}

                    {state.step === "done" && (
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-emerald-700 font-medium">
                                ✓ Carga completada: {state.count} empleados actualizados.
                            </div>
                            <div className="text-xs text-slate-400">Lote: {state.uploadBatchId}</div>
                            <button
                                onClick={reset}
                                className="text-sm text-[#0047AB] hover:underline self-start"
                            >
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
