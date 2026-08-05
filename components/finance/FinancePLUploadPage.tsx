"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTenant } from "@/lib/tenant-context";
import { supabaseBrowser } from "@/lib/auth/supabase-browser-client";
import { uploadPLFileAction } from "@/app/actions/finance-pl-upload-actions";
import {
    getPLReportAction,
    getBranchesWithDataAction,
    type PLReportResult,
} from "@/app/actions/finance-pl-report-actions";
import { PLReportTable } from "./PLReportTable";

type UploadState =
    | { step: "idle" }
    | { step: "uploading"; fileName: string }
    | { step: "done"; rowCount: number; uncategorized: number; unknownBranch: number; warnings: number }
    | { step: "error"; message: string };

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Finance -> P&L Overview. Una sola pantalla (sin pestañas nuevas):
 *   - Admin: carga compacta (colapsable) + selector de sucursal + reporte.
 *   - Branch manager: sin opción de carga, reporte fijo a su propia
 *     sucursal (public.users.branch_code) -- rol listo, sin cuentas
 *     reales todavía (2026-08-05).
 */
export const FinancePLUploadPage: React.FC = () => {
    const { currentTenant } = useTenant();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [myBranchCode, setMyBranchCode] = useState<string | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadState, setUploadState] = useState<UploadState>({ step: "idle" });
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>(""); // "" = todas (solo admin)
    const [report, setReport] = useState<PLReportResult | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    // Determina el rol y, si es branch_manager, su sucursal asignada.
    useEffect(() => {
        (async () => {
            const { data: session } = await supabaseBrowser.auth.getSession();
            if (!session.session) {
                setIsAdmin(false);
                return;
            }
            const { data: adminCheck } = await supabaseBrowser.rpc("current_user_has_any_role", {
                required_roles: ["admin"],
            });
            setIsAdmin(!!adminCheck);

            if (!adminCheck) {
                const { data: userRow } = await supabaseBrowser
                    .from("users")
                    .select("branch_code")
                    .eq("id", session.session.user.id)
                    .single();
                setMyBranchCode(userRow?.branch_code ?? null);
            }
        })();
    }, []);

    const loadReport = useCallback(
        async (branchCode: string | null) => {
            if (!currentTenant?.tenant_id) return;
            setReportLoading(true);
            setReportError(null);
            const result = await getPLReportAction(currentTenant.tenant_id, branchCode || null);
            if (result.success) {
                setReport(result.data);
            } else {
                setReportError(result.error);
            }
            setReportLoading(false);
        },
        [currentTenant?.tenant_id]
    );

    // Carga inicial del reporte + lista de sucursales (solo admin necesita el selector)
    useEffect(() => {
        if (isAdmin === null || !currentTenant?.tenant_id) return;

        if (isAdmin) {
            getBranchesWithDataAction(currentTenant.tenant_id).then((res) => {
                if (res.success) setAvailableBranches(res.data);
            });
            loadReport(selectedBranch || null);
        } else if (myBranchCode) {
            loadReport(myBranchCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, myBranchCode, currentTenant?.tenant_id]);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !currentTenant?.tenant_id) return;

        setUploadState({ step: "uploading", fileName: file.name });
        try {
            const base64 = await fileToBase64(file);
            const result = await uploadPLFileAction(currentTenant.tenant_id, file.name, base64);
            if (result.success) {
                setUploadState({
                    step: "done",
                    rowCount: result.data.rowCount,
                    uncategorized: result.data.uncategorized,
                    unknownBranch: result.data.unknownBranch,
                    warnings: result.data.warnings,
                });
                getBranchesWithDataAction(currentTenant.tenant_id).then((res) => {
                    if (res.success) setAvailableBranches(res.data);
                });
                loadReport(selectedBranch || null);
            } else {
                setUploadState({ step: "error", message: result.error });
            }
        } catch (err) {
            setUploadState({ step: "error", message: err instanceof Error ? err.message : "Error al leer el archivo." });
        }
    }

    if (isAdmin === null) {
        return <div className="p-8 text-sm text-slate-400">Cargando…</div>;
    }

    return (
        <div className="flex-1 h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">P&amp;L Overview</h1>
                        <p className="text-sm text-slate-500">
                            {isAdmin
                                ? "Vista de administrador -- todas las sucursales."
                                : `Sucursal ${myBranchCode ?? "(sin asignar)"}`}
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedBranch}
                                onChange={(e) => {
                                    setSelectedBranch(e.target.value);
                                    loadReport(e.target.value || null);
                                }}
                                className="border border-slate-300 rounded-md text-sm px-3 py-1.5"
                            >
                                <option value="">Todas las sucursales</option>
                                {availableBranches.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setUploadOpen((o) => !o)}
                                className="text-sm text-[#0047AB] border border-[#0047AB] rounded-md px-3 py-1.5 hover:bg-blue-50"
                            >
                                {uploadOpen ? "Ocultar carga" : "Cargar archivo"}
                            </button>
                        </div>
                    )}
                </div>

                {isAdmin && uploadOpen && (
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        {uploadState.step === "idle" && (
                            <label className="flex items-center gap-3 border border-dashed border-slate-300 rounded-md px-4 py-3 cursor-pointer hover:border-[#0047AB] transition-colors w-fit">
                                <span className="text-sm text-slate-600">Seleccionar archivo GL Detail Report (.xlsx)</span>
                                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                        {uploadState.step === "uploading" && (
                            <div className="text-sm text-slate-500">Procesando {uploadState.fileName}…</div>
                        )}
                        {uploadState.step === "done" && (
                            <div className="flex flex-col gap-1">
                                <div className="text-sm text-emerald-700 font-medium">
                                    ✓ Carga completada: {uploadState.rowCount} transacciones.
                                </div>
                                {uploadState.uncategorized > 0 && (
                                    <div className="text-xs text-amber-600">{uploadState.uncategorized} sin categoría GL.</div>
                                )}
                                {uploadState.unknownBranch > 0 && (
                                    <div className="text-xs text-amber-600">{uploadState.unknownBranch} con sucursal desconocida.</div>
                                )}
                                <button
                                    onClick={() => setUploadState({ step: "idle" })}
                                    className="text-sm text-[#0047AB] hover:underline self-start mt-1"
                                >
                                    Subir otro archivo
                                </button>
                            </div>
                        )}
                        {uploadState.step === "error" && (
                            <div className="flex flex-col gap-2">
                                <div className="text-sm text-red-600">{uploadState.message}</div>
                                <button
                                    onClick={() => setUploadState({ step: "idle" })}
                                    className="text-sm text-[#0047AB] hover:underline self-start"
                                >
                                    Intentar de nuevo
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    {reportLoading && <div className="text-sm text-slate-400 py-8 text-center">Cargando reporte…</div>}
                    {reportError && <div className="text-sm text-red-600 py-4">{reportError}</div>}
                    {!reportLoading && !reportError && report && (
                        <PLReportTable tree={report.tree} months={report.months} grandTotal={report.grandTotal} />
                    )}
                    {!reportLoading && !reportError && !report && !isAdmin && !myBranchCode && (
                        <div className="text-sm text-amber-600 py-8 text-center">
                            Tu cuenta todavía no tiene una sucursal asignada. Contacta a tu administrador.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
