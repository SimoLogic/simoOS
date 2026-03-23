"use client";

import { useState, useTransition, useCallback } from "react";
import {
    Lock, TrendingUp, AlertTriangle, CheckCircle2, Calendar, Users, ChevronRight,
    RefreshCw, DollarSign, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateMonthlyPayroll } from "@/lib/hr/payroll-calculator";
import type { WorkdayOrgConfig } from "@/lib/workday-helper";

// ─── Demo data (replace with real Prisma fetch) ───────────────────────────────

const DEMO_ORG_CONFIG: WorkdayOrgConfig = {
    tenantCountry: "US",
    userCountry: "CO",
    timezone: "America/Bogota",
};

interface PeriodSummary {
    id: string;
    periodLabel: string;
    employee: string;
    workedDays: number;
    netPay: number;
    isLocked: boolean;
    processedAt: string | null;
}

const MOCK_PERIODS: PeriodSummary[] = [
    { id: "p1", periodLabel: "2026-02", employee: "EID-0001 — Ana García", workedDays: 20, netPay: 2_304_000, isLocked: true,  processedAt: "2026-03-01" },
    { id: "p2", periodLabel: "2026-02", employee: "EID-0002 — Carlos López", workedDays: 20, netPay: 2_880_000, isLocked: true,  processedAt: "2026-03-01" },
    { id: "p3", periodLabel: "2026-03", employee: "EID-0001 — Ana García", workedDays: 0,  netPay: 0,         isLocked: false, processedAt: null },
    { id: "p4", periodLabel: "2026-03", employee: "EID-0002 — Carlos López", workedDays: 0,  netPay: 0,         isLocked: false, processedAt: null },
];

// ─── WorkdayHelper Live Preview ───────────────────────────────────────────────

function PayrollPreview() {
    const [salario, setSalario] = useState(2_500_000);
    const [periodStart] = useState("2026-03-01");
    const [periodEnd] = useState("2026-03-31");

    const result = calculateMonthlyPayroll({
        salarioBase: salario,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        orgConfig: DEMO_ORG_CONFIG,
    });

    const fmt = (n: number) => `$ ${n.toLocaleString("es-CO")} COP`;

    return (
        <div className="rounded-xl border border-cobalt-blue/20 bg-cobalt-blue/5 p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-cobalt-blue" />
                <h3 className="text-sm font-bold text-navy-blue">WorkdayHelper Live Calculator</h3>
                <span className="text-[10px] font-bold bg-navy-blue text-white px-2 py-0.5 rounded-full">Key #2</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</label>
                    <p className="text-sm font-semibold text-navy-blue mt-0.5">March 2026</p>
                    <p className="text-xs text-slate-400">US + CO holidays excluded</p>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workdays Counted</label>
                    <p className="text-2xl font-bold text-cobalt-blue tabular-nums">{result.workedDaysCount}</p>
                    <p className="text-xs text-slate-400">via countWorkdays()</p>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salary Base</label>
                    <input
                        type="number"
                        value={salario}
                        onChange={(e) => setSalario(Number(e.target.value))}
                        className="w-full text-sm font-semibold border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-cobalt-blue/20 outline-none mt-0.5"
                        step={100000}
                        min={0}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Base Amount",  value: fmt(result.baseAmount),      color: "text-slate-700" },
                    { label: "Health (4%)",  value: `- ${fmt(result.deductions.health)}`,  color: "text-red-600" },
                    { label: "Pension (4%)", value: `- ${fmt(result.deductions.pension)}`, color: "text-red-600" },
                    { label: "Net Pay",      value: fmt(result.netPay),           color: "text-emerald-700 font-bold" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                        <p className={`text-sm mt-0.5 tabular-nums ${color}`}>{value}</p>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                🔐 In production: amounts stored AES-256-GCM encrypted · Locked payrolls are immutable (Shield Protocol)
            </p>
        </div>
    );
}

// ─── Period Row ───────────────────────────────────────────────────────────────

function PeriodRow({ period }: { period: PeriodSummary }) {
    const [isPending, startTransition] = useTransition();

    const handleLock = useCallback(() => {
        startTransition(async () => {
            // In production: call lockPayrollPeriodAction(orgId, period.id, userId)
            await new Promise((r) => setTimeout(r, 800));
            alert(`[Demo] Payroll ${period.id} locked. In production this calls lockPayrollPeriodAction().`);
        });
    }, [period.id]);

    return (
        <tr className={cn(
            "border-b border-slate-50 hover:bg-cobalt-blue/5 transition-colors",
            period.isLocked && "bg-slate-50/60"
        )}>
            <td className="px-4 py-3">
                <span className="font-mono text-xs font-semibold text-navy-blue">{period.periodLabel}</span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-600">{period.employee}</td>
            <td className="px-4 py-3 text-xs tabular-nums text-center">{period.workedDays > 0 ? period.workedDays : "—"}</td>
            <td className="px-4 py-3 text-xs tabular-nums text-right text-slate-700">
                {period.netPay > 0 ? `$ ${period.netPay.toLocaleString("es-CO")}` : "—"}
            </td>
            <td className="px-4 py-3 text-center">
                {period.isLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" /> Processed
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-3 h-3" /> Open
                    </span>
                )}
            </td>
            <td className="px-4 py-3 text-xs text-slate-400 text-center">{period.processedAt ?? "—"}</td>
            <td className="px-4 py-3 text-center">
                {!period.isLocked && (
                    <button
                        onClick={handleLock}
                        disabled={isPending}
                        className="px-3 py-1.5 text-[11px] font-semibold bg-navy-blue text-white rounded-lg hover:bg-navy-blue/90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                        Lock & Process
                    </button>
                )}
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
    return (
        <div className="h-full bg-white overflow-y-auto">
            {/* Header */}
            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HR Module</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">Payroll</span>
                        </div>
                        <h1 className="text-xl font-bold text-navy-blue">Payroll Management</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Periods calculated with WorkdayHelper · Salary data AES-256 encrypted · Locked = immutable
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Shield Protocol Active
                        </div>
                        <button className="px-4 py-2 text-sm font-semibold bg-navy-blue text-white rounded-lg hover:bg-navy-blue/90 transition-all flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            New Period
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* WorkdayHelper Calculator */}
                <PayrollPreview />

                {/* Warning about locked records */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                        <strong>Shield Protocol:</strong> Once a payroll period is locked ("Lock & Process"), it becomes
                        permanently immutable. Salary figures are encrypted with AES-256-GCM before writing to the database.
                        Only personnel with the HR_ADMIN role can initiate locking.
                    </p>
                </div>

                {/* Period Table */}
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payroll Periods</span>
                        </div>
                        <span className="text-xs text-slate-400">{MOCK_PERIODS.length} records</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white">
                                {["Period", "Employee", "Workdays", "Net Pay (COP)", "Status", "Processed", "Action"]
                                    .map((h) => (
                                        <th key={h} className={cn(
                                            "px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap",
                                            h === "Net Pay (COP)" ? "text-right" : h === "Workdays" || h === "Status" || h === "Processed" || h === "Action" ? "text-center" : "text-left"
                                        )}>
                                            {h}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_PERIODS.map((p) => <PeriodRow key={p.id} period={p} />)}
                        </tbody>
                    </table>
                </div>

                {/* Info footer */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                    Payroll data persisted via <code className="font-mono text-cobalt-blue">hr_payroll_periods</code> table · Queried via Prisma with <code className="font-mono text-cobalt-blue">orgId</code> filter
                    <ChevronRight className="w-3 h-3" />
                    Locked rows trigger DB <code className="font-mono text-cobalt-blue">prevent_locked_update</code> Supabase trigger
                </div>
            </div>
        </div>
    );
}
