"use client";

import React, { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import {
    uploadActiveRosterAction,
    getRecentUploadBatchesAction,
    type RawActiveRosterRow,
    type UploadBatchSummary,
} from "@/app/actions/hr-centralized-upload-actions";
import {
    uploadEmployeeDrawsAction,
    type RawEmployeeDrawRow,
} from "@/app/actions/hr-us-roster-upload-actions";

/**
 * Carga Centralizada -- dos pipelines, uno por país:
 *
 *  - Colombia: Excel "Centralización de Información SLTEAM" (hoja "Active")
 *    -> BigQuery active_roster_raw -> Supabase (sensible cifrado).
 *    Ver app/actions/hr-centralized-upload-actions.ts.
 *  - EE.UU.: CSV "EmployeeDraws" de CompensaFe -> BigQuery
 *    employee_draws_us_raw -> vista deduplicada -> Supabase.
 *    Ver app/actions/hr-us-roster-upload-actions.ts.
 *
 * Los dos comparten el bloque de historial persistente (UploadHistory), que se
 * lee de hr_upload_batches al montar y por eso sobrevive a un remount o a
 * cambiar de módulo y volver. Cada pestaña filtra por su `source`.
 *
 * Todo el texto visible va en inglés (regla global del proyecto).
 */

const CO_SOURCE = "CO_ACTIVE_ROSTER";
const US_SOURCE = "US_EMPLOYEE_DRAWS";

type CountryTab = "CO" | "US";

type CoUploadState =
    | { step: "idle" }
    | { step: "parsed"; rows: RawActiveRosterRow[]; fileName: string }
    | { step: "submitting"; rows: RawActiveRosterRow[]; fileName: string }
    | { step: "done"; count: number; deactivatedCount: number; uploadBatchId: string }
    | { step: "error"; message: string };

type UsUploadState =
    | { step: "idle" }
    | { step: "parsed"; rows: RawEmployeeDrawRow[]; fileName: string }
    | { step: "submitting"; rows: RawEmployeeDrawRow[]; fileName: string }
    | {
          step: "done";
          count: number;
          deactivatedCount: number;
          drawRowCount: number;
          skippedRows: number;
          unreadableNumericFields: string[];
          uploadBatchId: string;
      }
    | { step: "error"; message: string };

/** Fecha+hora legible para el historial (ej. "Aug 7, 2026, 1:07 PM"). */
function fmtDateTime(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
        ? "—"
        : d.toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
          });
}

// ─── Historial persistente (compartido por las dos pestañas) ─────────────────

const UploadHistory: React.FC<{ history: UploadBatchSummary[]; loading: boolean }> = ({
    history,
    loading,
}) => {
    if (loading || history.length === 0) return null;
    const last = history[0];

    return (
        <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Last upload</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-sm text-slate-700">
                    <strong>{last.savedCount}</strong> employees · {fmtDateTime(last.uploadedAt)}
                    {last.fileName && <span className="text-slate-500"> · {last.fileName}</span>}
                </div>
                {last.deactivatedCount > 0 && (
                    <div className="text-xs text-amber-700 mt-1">
                        {last.deactivatedCount} marked Inactive
                    </div>
                )}
                <div className="text-xs text-slate-400 mt-1">Batch: {last.uploadBatchId}</div>
            </div>

            {history.length > 1 && (
                <>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-5 mb-2">
                        Earlier uploads
                    </h3>
                    <ul className="flex flex-col divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl shadow-sm">
                        {history.slice(1).map((b) => (
                            <li
                                key={b.uploadBatchId}
                                className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                            >
                                <span className="text-xs text-slate-600 truncate">
                                    {b.fileName ?? "(file name not recorded)"}
                                </span>
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {b.savedCount} employees
                                    {b.deactivatedCount > 0 && ` · ${b.deactivatedCount} inactive`} ·{" "}
                                    {fmtDateTime(b.uploadedAt)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

// ─── Página ──────────────────────────────────────────────────────────────────

export const CentralizedUploadPage: React.FC = () => {
    const { currentTenant } = useTenant();
    const tenantId = currentTenant?.tenant_id;

    const [tab, setTab] = useState<CountryTab>("CO");

    const [coState, setCoState] = useState<CoUploadState>({ step: "idle" });
    const [usState, setUsState] = useState<UsUploadState>({ step: "idle" });

    // El historial vive en la base, no en este useState: si el componente se
    // remonta (o el usuario cambia de módulo y vuelve), la última carga sigue
    // visible. Antes, el único rastro de una carga era el estado en memoria.
    const [coHistory, setCoHistory] = useState<UploadBatchSummary[]>([]);
    const [usHistory, setUsHistory] = useState<UploadBatchSummary[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        if (!tenantId) return;
        const [co, us] = await Promise.all([
            getRecentUploadBatchesAction(tenantId, 5, CO_SOURCE),
            getRecentUploadBatchesAction(tenantId, 5, US_SOURCE),
        ]);
        // Un fallo acá no se le grita al usuario: el historial es informativo y
        // la pantalla de carga tiene que seguir siendo usable igual.
        setCoHistory(co.success ? co.data : []);
        setUsHistory(us.success ? us.data : []);
        setHistoryLoading(false);
    }, [tenantId]);

    useEffect(() => {
        setHistoryLoading(true);
        loadHistory();
    }, [loadHistory]);

    // ─── Colombia: Excel SLTEAM ──────────────────────────────────────────────

    function handleCoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: "binary", cellDates: true });

                if (!workbook.SheetNames.includes("Active")) {
                    setCoState({
                        step: "error",
                        message: `The file has no sheet named "Active". Sheets found: ${workbook.SheetNames.join(", ")}`,
                    });
                    return;
                }

                const sheet = workbook.Sheets["Active"];
                // La hoja "Active" tiene un título en la fila 1 -- el encabezado real está en la fila 2.
                const rows = XLSX.utils.sheet_to_json<RawActiveRosterRow>(sheet, { range: 1 });

                setCoState({ step: "parsed", rows, fileName: file.name });
            } catch (err) {
                setCoState({
                    step: "error",
                    message: err instanceof Error ? err.message : "The file could not be read.",
                });
            }
        };
        reader.onerror = () => setCoState({ step: "error", message: "The file could not be read." });
        reader.readAsBinaryString(file);
    }

    async function handleCoConfirm() {
        if (coState.step !== "parsed") return;
        if (!tenantId) {
            setCoState({ step: "error", message: "No active tenant selected." });
            return;
        }

        setCoState({ step: "submitting", rows: coState.rows, fileName: coState.fileName });
        const result = await uploadActiveRosterAction(tenantId, coState.rows, coState.fileName);

        if (result.success) {
            setCoState({
                step: "done",
                count: result.data.count,
                deactivatedCount: result.data.deactivatedCount,
                uploadBatchId: result.data.uploadBatchId,
            });
            loadHistory();
        } else {
            setCoState({ step: "error", message: result.error });
        }
    }

    // ─── EE.UU.: CSV EmployeeDraws ───────────────────────────────────────────

    function handleUsFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // El CSV es transaccional: una fila por draw, no por empleado. La
        // deduplicación a un empleado por fila la hace la vista de BigQuery.
        Papa.parse<RawEmployeeDrawRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (!results.data.length) {
                    setUsState({ step: "error", message: "The file has no rows to process." });
                    return;
                }
                setUsState({ step: "parsed", rows: results.data, fileName: file.name });
            },
            error: (err: Error) =>
                setUsState({ step: "error", message: err.message || "The file could not be read." }),
        });
    }

    async function handleUsConfirm() {
        if (usState.step !== "parsed") return;
        if (!tenantId) {
            setUsState({ step: "error", message: "No active tenant selected." });
            return;
        }

        setUsState({ step: "submitting", rows: usState.rows, fileName: usState.fileName });
        const result = await uploadEmployeeDrawsAction(tenantId, usState.fileName, usState.rows);

        if (result.success) {
            setUsState({
                step: "done",
                count: result.data.count,
                deactivatedCount: result.data.deactivatedCount,
                drawRowCount: result.data.drawRowCount,
                skippedRows: result.data.skippedRows,
                unreadableNumericFields: result.data.unreadableNumericFields,
                uploadBatchId: result.data.uploadBatchId,
            });
            loadHistory();
        } else {
            setUsState({ step: "error", message: result.error });
        }
    }

    const isCo = tab === "CO";

    return (
        <div className="flex-1 h-full overflow-auto p-8 bg-slate-50">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-xl font-semibold text-slate-800 mb-4">Centralized Employee Upload</h1>

                {/* Pestañas de país */}
                <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
                    {(
                        [
                            { value: "CO", label: "Colombia" },
                            { value: "US", label: "USA" },
                        ] as { value: CountryTab; label: string }[]
                    ).map((t) => (
                        <button
                            key={t.value}
                            onClick={() => setTab(t.value)}
                            aria-current={tab === t.value ? "page" : undefined}
                            className={cn(
                                "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
                                tab === t.value
                                    ? "border-[#0047AB] text-[#0047AB]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {isCo ? (
                    <>
                        <p className="text-sm text-slate-500 mb-6">
                            Upload the &ldquo;Centralización de Información SLTEAM&rdquo; file (sheet{" "}
                            <strong>Active</strong>). Sensitive data (national ID, address, bank account)
                            is stored encrypted and only visible to Admin/HR roles. Employees already on
                            record who are not present in the new file are marked <strong>Inactive</strong>;
                            nothing is ever deleted.
                        </p>

                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            {coState.step === "idle" && (
                                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-lg py-12 cursor-pointer hover:border-[#0047AB] transition-colors">
                                    <span className="text-sm text-slate-600">
                                        Click to select the file (.xlsx)
                                    </span>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={handleCoFileChange}
                                    />
                                </label>
                            )}

                            {coState.step === "parsed" && (
                                <div className="flex flex-col gap-4">
                                    <div className="text-sm text-slate-700">
                                        <strong>{coState.fileName}</strong> — {coState.rows.length} rows read
                                        from the &ldquo;Active&rdquo; sheet.
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCoConfirm}
                                            className="bg-[#0047AB] text-white text-sm font-medium rounded-md px-4 py-2"
                                        >
                                            Upload
                                        </button>
                                        <button
                                            onClick={() => setCoState({ step: "idle" })}
                                            className="text-sm text-slate-500 px-4 py-2 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {coState.step === "submitting" && (
                                <div className="text-sm text-slate-500">
                                    Uploading {coState.rows.length} records…
                                </div>
                            )}

                            {coState.step === "done" && (
                                <div className="flex flex-col gap-3">
                                    <div className="text-sm text-emerald-700 font-medium">
                                        ✓ Upload complete: {coState.count} employees updated.
                                    </div>
                                    {coState.deactivatedCount > 0 && (
                                        <div className="text-sm text-amber-700">
                                            {coState.deactivatedCount} employee
                                            {coState.deactivatedCount !== 1 ? "s" : ""} not present in this
                                            file {coState.deactivatedCount !== 1 ? "were" : "was"} marked as
                                            Inactive.
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-400">
                                        Batch: {coState.uploadBatchId}
                                    </div>
                                    <button
                                        onClick={() => setCoState({ step: "idle" })}
                                        className="text-sm text-[#0047AB] hover:underline self-start"
                                    >
                                        Upload another file
                                    </button>
                                </div>
                            )}

                            {coState.step === "error" && (
                                <div className="flex flex-col gap-3">
                                    <div className="text-sm text-red-600">{coState.message}</div>
                                    <button
                                        onClick={() => setCoState({ step: "idle" })}
                                        className="text-sm text-[#0047AB] hover:underline self-start"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}
                        </div>

                        <UploadHistory history={coHistory} loading={historyLoading} />
                    </>
                ) : (
                    <>
                        <p className="text-sm text-slate-500 mb-6">
                            Upload the <strong>Employee Draws (CompensaFe)</strong> export (.csv). Every row
                            is stored in BigQuery; the US roster in Supabase is then rebuilt from the
                            deduplicated view — one row per employee. US employees already on record who are
                            not present in the new file are marked <strong>Inactive</strong>; nothing is ever
                            deleted, and the Colombia roster is not touched.
                        </p>

                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            {usState.step === "idle" && (
                                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-lg py-12 cursor-pointer hover:border-[#0047AB] transition-colors">
                                    <span className="text-sm text-slate-600">
                                        Click to select the file (.csv)
                                    </span>
                                    <input
                                        type="file"
                                        accept=".csv,text/csv"
                                        className="hidden"
                                        onChange={handleUsFileChange}
                                    />
                                </label>
                            )}

                            {usState.step === "parsed" && (
                                <div className="flex flex-col gap-4">
                                    <div className="text-sm text-slate-700">
                                        <strong>{usState.fileName}</strong> — {usState.rows.length} draw rows
                                        read.
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleUsConfirm}
                                            className="bg-[#0047AB] text-white text-sm font-medium rounded-md px-4 py-2"
                                        >
                                            Upload
                                        </button>
                                        <button
                                            onClick={() => setUsState({ step: "idle" })}
                                            className="text-sm text-slate-500 px-4 py-2 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {usState.step === "submitting" && (
                                <div className="text-sm text-slate-500">
                                    Uploading {usState.rows.length} draw rows…
                                </div>
                            )}

                            {usState.step === "done" && (
                                <div className="flex flex-col gap-3">
                                    <div className="text-sm text-emerald-700 font-medium">
                                        ✓ Upload complete: {usState.count} employees updated from{" "}
                                        {usState.drawRowCount} draw rows.
                                    </div>
                                    {usState.deactivatedCount > 0 && (
                                        <div className="text-sm text-amber-700">
                                            {usState.deactivatedCount} US employee
                                            {usState.deactivatedCount !== 1 ? "s" : ""} not present in this
                                            file {usState.deactivatedCount !== 1 ? "were" : "was"} marked as
                                            Inactive.
                                        </div>
                                    )}
                                    {usState.skippedRows > 0 && (
                                        <div className="text-xs text-slate-500">
                                            {usState.skippedRows} row
                                            {usState.skippedRows !== 1 ? "s" : ""} skipped (no employee number
                                            or name).
                                        </div>
                                    )}
                                    {usState.unreadableNumericFields.length > 0 && (
                                        <div className="text-xs text-amber-700">
                                            Some values could not be read as numbers and were stored empty:{" "}
                                            {usState.unreadableNumericFields.join(", ")}. Check the export
                                            format for those columns.
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-400">
                                        Batch: {usState.uploadBatchId}
                                    </div>
                                    <button
                                        onClick={() => setUsState({ step: "idle" })}
                                        className="text-sm text-[#0047AB] hover:underline self-start"
                                    >
                                        Upload another file
                                    </button>
                                </div>
                            )}

                            {usState.step === "error" && (
                                <div className="flex flex-col gap-3">
                                    <div className="text-sm text-red-600">{usState.message}</div>
                                    <button
                                        onClick={() => setUsState({ step: "idle" })}
                                        className="text-sm text-[#0047AB] hover:underline self-start"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}
                        </div>

                        <UploadHistory history={usHistory} loading={historyLoading} />
                    </>
                )}
            </div>
        </div>
    );
};
