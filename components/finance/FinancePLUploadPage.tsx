"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { supabaseBrowser } from "@/lib/auth/supabase-browser-client";
import { uploadPLFileAction } from "@/app/actions/finance-pl-upload-actions";
import {
    getPLReportAction,
    getBranchesWithDataAction,
    getAvailableYearsAction,
    type PLReportResult,
} from "@/app/actions/finance-pl-report-actions";
import { PLReportTable } from "./PLReportTable";
import { DrillDownDrawer } from "./DrillDownDrawer";
import type { PivotNode } from "@/lib/finance-pl/pivot-engine";

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

const QUARTERS: Record<string, string[]> = {
    full: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    q1: ["January", "February", "March"],
    q2: ["April", "May", "June"],
    q3: ["July", "August", "September"],
    q4: ["October", "November", "December"],
};

function fmtKpi(n: number): string {
    return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Finance -> P&L Overview.
 * Rediseño 2026-08-05 (paleta HOMESÍ, solo este módulo -- decisión del
 * usuario, ver docs/AGENT_CONTEXT_ANTIGRAVITY.md): control bar con
 * selector de sucursal + año fiscal + carga, tarjetas KPI ejecutivas,
 * tabla con drill-down en drawer lateral.
 */
export const FinancePLUploadPage: React.FC = () => {
    const { currentTenant } = useTenant();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [myBranchCode, setMyBranchCode] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>({ step: "idle" });
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string>("full");
    const [report, setReport] = useState<PLReportResult | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [drawer, setDrawer] = useState<{ month: string; path: string[]; value: number } | null>(null);

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
        async (branchCode: string | null, year: number | null) => {
            if (!currentTenant?.tenant_id) return;
            setReportLoading(true);
            setReportError(null);
            const result = await getPLReportAction(currentTenant.tenant_id, branchCode || null, year);
            if (result.success) setReport(result.data);
            else setReportError(result.error);
            setReportLoading(false);
        },
        [currentTenant?.tenant_id]
    );

    useEffect(() => {
        if (isAdmin === null || !currentTenant?.tenant_id) return;
        if (isAdmin) {
            getBranchesWithDataAction(currentTenant.tenant_id).then((res) => {
                if (res.success) setAvailableBranches(res.data);
            });
            getAvailableYearsAction(currentTenant.tenant_id).then((res) => {
                if (res.success && res.data.length > 0) {
                    setAvailableYears(res.data);
                    setSelectedYear((prev) => prev ?? res.data[0]);
                }
            });
        } else if (myBranchCode) {
            getAvailableYearsAction(currentTenant.tenant_id).then((res) => {
                if (res.success && res.data.length > 0) {
                    setAvailableYears(res.data);
                    setSelectedYear((prev) => prev ?? res.data[0]);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, myBranchCode, currentTenant?.tenant_id]);

    useEffect(() => {
        if (isAdmin === null || !currentTenant?.tenant_id || selectedYear === null) return;
        if (isAdmin) loadReport(selectedBranch || null, selectedYear);
        else if (myBranchCode) loadReport(myBranchCode, selectedYear);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, myBranchCode, selectedYear, selectedBranch, currentTenant?.tenant_id]);

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
                getAvailableYearsAction(currentTenant.tenant_id).then((res) => {
                    if (res.success) setAvailableYears(res.data);
                });
                loadReport(selectedBranch || null, selectedYear);
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

    const kpis = report?.kpis;
    const netPositive = (kpis?.netIncome ?? 0) >= 0;

    return (
        <div className="flex-1 h-full overflow-auto" style={{ backgroundColor: "#FCFCFA" }}>
            <div className="max-w-[1440px] mx-auto px-6 py-6 flex flex-col gap-5">
                {/* Control bar */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-[#001A40]">P&amp;L Overview</h1>
                        <p className="text-sm text-slate-500">
                            {isAdmin ? "Vista de administrador" : `Sucursal ${myBranchCode ?? "(sin asignar)"}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {isAdmin && (
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-[#001A40] shadow-sm"
                            >
                                <option value="">All Branches</option>
                                {availableBranches.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        )}

                        {availableYears.length > 0 && (
                            <select
                                value={selectedYear ?? ""}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-[#001A40] shadow-sm"
                            >
                                {availableYears.map((y) => (
                                    <option key={y} value={y}>
                                        Fiscal Year: {y}
                                    </option>
                                ))}
                            </select>
                        )}

                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-[#001A40] shadow-sm"
                        >
                            <option value="full">Full Year (JAN - DEC)</option>
                            <option value="q1">Q1 (JAN - MAR)</option>
                            <option value="q2">Q2 (APR - JUN)</option>
                            <option value="q3">Q3 (JUL - SEP)</option>
                            <option value="q4">Q4 (OCT - DEC)</option>
                        </select>

                        {isAdmin && (
                            <label className="bg-slate-100 hover:bg-slate-200 text-[#001A40] font-bold rounded-full px-4 py-2 text-sm transition-all cursor-pointer flex items-center gap-2">
                                <Upload size={14} />
                                {uploadState.step === "uploading" ? "Procesando…" : "Upload File"}
                                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>
                </div>

                {uploadState.step === "done" && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs text-sm">
                        <span className="text-emerald-700 font-medium">✓ Carga completada: {uploadState.rowCount} transacciones.</span>
                        {uploadState.uncategorized > 0 && (
                            <span className="text-amber-600 ml-3">{uploadState.uncategorized} sin categoría GL.</span>
                        )}
                        {uploadState.unknownBranch > 0 && (
                            <span className="text-amber-600 ml-3">{uploadState.unknownBranch} con sucursal desconocida.</span>
                        )}
                    </div>
                )}
                {uploadState.step === "error" && (
                    <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs text-sm text-rose-600">
                        {uploadState.message}
                    </div>
                )}

                {/* KPI Cards */}
                {kpis && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Gross Income</div>
                            <div className="text-2xl font-bold text-[#001A40] mt-1 tabular-nums">
                                {fmtKpi(kpis.grossIncome)}
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Operating Expenses</div>
                            <div className="text-2xl font-bold text-[#001A40] mt-1 tabular-nums">
                                {fmtKpi(kpis.operatingExpenses)}
                            </div>
                        </div>
                        <div
                            className={`rounded-2xl p-4 border ${
                                netPositive ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"
                            }`}
                        >
                            <div className={`text-xs font-semibold uppercase tracking-wide ${netPositive ? "text-emerald-800" : "text-rose-800"}`}>
                                Net Income
                            </div>
                            <div className={`text-2xl font-bold mt-1 tabular-nums ${netPositive ? "text-emerald-800" : "text-rose-800"}`}>
                                {fmtKpi(kpis.netIncome)}
                            </div>
                        </div>
                        <div className="rounded-2xl p-4 border" style={{ backgroundColor: "rgba(166,222,255,0.15)", borderColor: "rgba(166,222,255,0.4)" }}>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#001A40" }}>
                                Operating Margin
                            </div>
                            <div className="text-2xl font-bold mt-1 tabular-nums" style={{ color: "#001A40" }}>
                                {kpis.operatingMarginPct.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                )}

                {reportLoading && <div className="text-sm text-slate-400 py-8 text-center">Cargando reporte…</div>}
                {reportError && <div className="text-sm text-red-600 py-4">{reportError}</div>}
                {!reportLoading && !reportError && report && (
                    <PLReportTable
                        tree={report.tree}
                        months={report.months.filter((m) => QUARTERS[selectedPeriod].includes(m))}
                        grandTotal={report.tree.reduce(
                            (sum, n) =>
                                sum + QUARTERS[selectedPeriod].reduce((s, m) => s + (n.byMonth[m] ?? 0), 0),
                            0
                        )}
                        onCellClick={(month, path, value) => setDrawer({ month, path, value })}
                    />
                )}
                {!reportLoading && !reportError && !report && !isAdmin && !myBranchCode && (
                    <div className="text-sm text-amber-600 py-8 text-center">
                        Tu cuenta todavía no tiene una sucursal asignada. Contacta a tu administrador.
                    </div>
                )}
            </div>

            {drawer && currentTenant?.tenant_id && (
                <DrillDownDrawer
                    tenantId={currentTenant.tenant_id}
                    branchCode={isAdmin ? selectedBranch || null : myBranchCode}
                    year={selectedYear}
                    month={drawer.month}
                    category6={drawer.path[0] ?? "(No Category 6)"}
                    category7={drawer.path[1] ?? "(No Category 7)"}
                    description={drawer.path[2] ?? "(No Description)"}
                    cellTotal={drawer.value}
                    onClose={() => setDrawer(null)}
                />
            )}
        </div>
    );
};
