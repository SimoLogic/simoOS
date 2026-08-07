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
    | { step: "done"; count: number; deactivatedCount: number; uploadBatchId: string }
    | { step: "error"; message: string };

/**
 * Carga Centralizada -- sube el Excel "Centralización de Información SLTEAM"
 * (hoja "Active"), lo manda a Supabase (cifrado) + BigQuery (no sensible).
 * Ver app/actions/hr-centralized-upload-actions.ts y
 * docs/AGENT_CONTEXT_ANTIGRAVITY.md para el detalle del pipeline.
 *
 * Todo el texto visible va en inglés (regla global del proyecto).
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
                        message: `The file has no sheet named "Active". Sheets found: ${workbook.SheetNames.join(", ")}`,
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
                    message: err instanceof Error ? err.message : "The file could not be read.",
                });
            }
        };
        reader.onerror = () => setState({ step: "error", message: "The file could not be read." });
        reader.readAsBinaryString(file);
    }

    async function handleConfirm() {
        if (state.step !== "parsed") return;
        if (!currentTenant?.tenant_id) {
            setState({ step: "error", message: "No active tenant selected." });
            return;
        }

        setState({ step: "submitting", rows: state.rows, fileName: state.fileName });
        const result = await uploadActiveRosterAction(currentTenant.tenant_id, state.rows);

        if (result.success) {
            setState({
                step: "done",
                count: result.data.count,
                deactivatedCount: result.data.deactivatedCount,
                uploadBatchId: result.data.uploadBatchId,
            });
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
                <h1 className="text-xl font-semibold text-slate-800 mb-1">Centralized Employee Upload</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Upload the &ldquo;Centralización de Información SLTEAM&rdquo; file (sheet{" "}
                    <strong>Active</strong>). Sensitive data (national ID, address, bank account) is
                    stored encrypted and only visible to Admin/HR roles. Position, area, branch and
                    seniority fields are also sent to BigQuery for analytics. Employees already on
                    record who are not present in the new file are marked <strong>Inactive</strong>;
                    nothing is ever deleted.
                </p>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    {state.step === "idle" && (
                        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-lg py-12 cursor-pointer hover:border-[#0047AB] transition-colors">
                            <span className="text-sm text-slate-600">
                                Click to select the file (.xlsx)
                            </span>
                            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}

                    {state.step === "parsed" && (
                        <div className="flex flex-col gap-4">
                            <div className="text-sm text-slate-700">
                                <strong>{state.fileName}</strong> — {state.rows.length} rows read from the
                                &ldquo;Active&rdquo; sheet.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirm}
                                    className="bg-[#0047AB] text-white text-sm font-medium rounded-md px-4 py-2"
                                >
                                    Confirm upload
                                </button>
                                <button
                                    onClick={reset}
                                    className="text-sm text-slate-500 px-4 py-2 hover:text-slate-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {state.step === "submitting" && (
                        <div className="text-sm text-slate-500">Uploading {state.rows.length} records…</div>
                    )}

                    {state.step === "done" && (
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-emerald-700 font-medium">
                                ✓ Upload complete: {state.count} employees updated.
                            </div>
                            {state.deactivatedCount > 0 && (
                                <div className="text-sm text-amber-700">
                                    {state.deactivatedCount} employee{state.deactivatedCount !== 1 ? "s" : ""} not
                                    present in this file {state.deactivatedCount !== 1 ? "were" : "was"} marked as
                                    Inactive.
                                </div>
                            )}
                            <div className="text-xs text-slate-400">Batch: {state.uploadBatchId}</div>
                            <button
                                onClick={reset}
                                className="text-sm text-[#0047AB] hover:underline self-start"
                            >
                                Upload another file
                            </button>
                        </div>
                    )}

                    {state.step === "error" && (
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-red-600">{state.message}</div>
                            <button onClick={reset} className="text-sm text-[#0047AB] hover:underline self-start">
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
