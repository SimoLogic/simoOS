"use client";

import { useState, useTransition } from "react";
import { Calendar, CheckCircle2, XCircle, Clock, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateVacationDays } from "@/lib/hr/vacation-calculator";
import type { WorkdayOrgConfig } from "@/lib/workday-helper";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEMO_ORG_CONFIG: WorkdayOrgConfig = {
    tenantCountry: "US",
    userCountry: "CO",
    timezone: "America/Bogota",
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    PENDING:   "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED:  "bg-red-50 text-red-600 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    PENDING:   <Clock className="w-3 h-3" />,
    APPROVED:  <CheckCircle2 className="w-3 h-3" />,
    REJECTED:  <XCircle className="w-3 h-3" />,
    CANCELLED: <XCircle className="w-3 h-3" />,
};

// ─── Vacation Day Preview (WorkdayHelper Live) ────────────────────────────────

function VacationPreview() {
    const [startDate, setStartDate] = useState("2026-04-02");
    const [endDate, setEndDate]     = useState("2026-04-10");

    const hasRange = startDate && endDate && endDate >= startDate;
    const result = hasRange
        ? calculateVacationDays({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            orgConfig: DEMO_ORG_CONFIG,
          })
        : null;

    return (
        <div className="rounded-xl border border-cobalt-blue/20 bg-cobalt-blue/5 p-5">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-cobalt-blue" />
                <h3 className="text-sm font-bold text-navy-blue">Vacation Days — Live Preview</h3>
                <span className="text-[10px] font-bold bg-navy-blue text-white px-2 py-0.5 rounded-full">Key #2</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full mt-0.5 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full mt-0.5 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue"
                    />
                </div>
            </div>

            {result && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Calendar Days",    value: result.calendarDays,   color: "text-slate-700" },
                        { label: "Holidays Skipped", value: result.holidaysSkipped, color: "text-amber-600" },
                        { label: "Net Working Days", value: result.workdayDays,    color: "text-cobalt-blue font-bold" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                            <p className="text-2xl font-bold tabular-nums text-center mb-0.5">
                                <span className={color}>{value}</span>
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[10px] text-slate-400 mt-3">
                Holidays from both Colombia 🇨🇴 and USA 🇺🇸 are excluded · Powered by <code className="font-mono">countWorkdays()</code> + date-holidays
            </p>
        </div>
    );
}

// ─── Mock requests ────────────────────────────────────────────────────────────

interface VacRequest {
    id: string;
    employee: string;
    startDate: string;
    endDate: string;
    calendarDays: number;
    workdayDays: number;
    holidaysSkipped: number;
    status: string;
    notes?: string;
}

const MOCK_REQUESTS: VacRequest[] = [
    { id: "v1", employee: "EID-0001 — Ana García",    startDate: "2026-04-02", endDate: "2026-04-10", calendarDays: 9, workdayDays: 5, holidaysSkipped: 2, status: "PENDING",  notes: "Semana Santa travel" },
    { id: "v2", employee: "EID-0002 — Carlos López",  startDate: "2026-05-01", endDate: "2026-05-05", calendarDays: 5, workdayDays: 4, holidaysSkipped: 1, status: "APPROVED", notes: "" },
    { id: "v3", employee: "EID-0003 — María Rondón",  startDate: "2026-03-20", endDate: "2026-03-22", calendarDays: 3, workdayDays: 1, holidaysSkipped: 0, status: "REJECTED", notes: "" },
];

function VacRow({ req }: { req: VacRequest }) {
    const [isPending, startTransition] = useTransition();

    const handleAction = (action: "APPROVED" | "REJECTED") => {
        startTransition(async () => {
            await new Promise((r) => setTimeout(r, 600));
            alert(`[Demo] Vacation ${req.id} → ${action}. In production calls updateVacationStatusAction().`);
        });
    };

    return (
        <tr className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
            <td className="px-4 py-3 text-xs font-medium text-slate-700">{req.employee}</td>
            <td className="px-4 py-3 text-xs text-slate-500">{req.startDate} → {req.endDate}</td>
            <td className="px-4 py-3 text-xs text-center tabular-nums">{req.calendarDays}</td>
            <td className="px-4 py-3 text-xs text-center tabular-nums text-amber-600">{req.holidaysSkipped}</td>
            <td className="px-4 py-3 text-xs text-center tabular-nums font-semibold text-cobalt-blue">{req.workdayDays}</td>
            <td className="px-4 py-3 text-center">
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLE[req.status])}>
                    {STATUS_ICON[req.status]} {req.status}
                </span>
            </td>
            <td className="px-4 py-3">
                {req.status === "PENDING" && (
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={() => handleAction("APPROVED")}
                            disabled={isPending}
                            className="px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Approve
                        </button>
                        <button
                            onClick={() => handleAction("REJECTED")}
                            disabled={isPending}
                            className="px-2.5 py-1.5 text-[11px] font-semibold bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                            <XCircle className="w-3 h-3" /> Reject
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VacationsPage() {
    return (
        <div className="h-full bg-white overflow-y-auto">
            {/* Header */}
            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HR Module</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">Vacations</span>
                        </div>
                        <h1 className="text-xl font-bold text-navy-blue">Vacation Requests</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Net working days computed with WorkdayHelper · CO + US holiday-aware (Llave #2)
                        </p>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold bg-navy-blue text-white rounded-lg hover:bg-navy-blue/90 transition-all flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        New Request
                    </button>
                </div>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* Live Preview */}
                <VacationPreview />

                {/* Info alert */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
                    <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                        The <strong>Net Working Days</strong> column reflects actual days deducted from payroll —
                        weekends plus any Colombian 🇨🇴 or US 🇺🇸 public holidays within the period are automatically excluded.
                    </p>
                </div>

                {/* Requests table */}
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vacation Requests</span>
                        </div>
                        <span className="text-xs text-slate-400">{MOCK_REQUESTS.length} requests</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white">
                                {["Employee", "Period", "Calendar Days", "Holidays", "Net Workdays", "Status", "Actions"]
                                    .map((h) => (
                                        <th key={h} className={cn(
                                            "px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap",
                                            ["Calendar Days", "Holidays", "Net Workdays", "Status"].includes(h) ? "text-center" : h === "Actions" ? "text-right" : "text-left"
                                        )}>
                                            {h}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_REQUESTS.map((r) => <VacRow key={r.id} req={r} />)}
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-slate-400 flex items-center gap-1">
                    Data persisted to <code className="font-mono text-cobalt-blue">hr_vacation_requests</code>
                    <ChevronRight className="w-3 h-3" />
                    Queried via <code className="font-mono text-cobalt-blue">createVacationRequestAction()</code> + Prisma
                </p>
            </div>
        </div>
    );
}
