"use client";

import React, { useState } from "react";
import {
    Users,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Briefcase,
    MapPin,
    Clock,
    Award,
    UserCheck,
    UserX,
    CalendarDays,
    BarChart3,
    PieChart,
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const kpiData = [
    {
        id: "total-hc",
        label: "Total Headcount",
        value: "87",
        change: 4.8,
        direction: "up" as const,
        good: "up",
        icon: Users,
        color: "cobalt",
        sparkline: [72, 74, 76, 78, 80, 83, 87],
        sub: "Active employees",
    },
    {
        id: "payroll",
        label: "Monthly Payroll",
        value: "COP 412.6M",
        change: 3.2,
        direction: "up" as const,
        good: "neutral",
        icon: DollarSign,
        color: "amber",
        sparkline: [370, 378, 385, 392, 398, 405, 412.6],
        sub: "Gross payroll cost",
    },
    {
        id: "avg-salary",
        label: "Avg. Base Salary",
        value: "COP 4.74M",
        change: 1.1,
        direction: "up" as const,
        good: "up",
        icon: Award,
        color: "cobalt",
        sparkline: [4.5, 4.55, 4.6, 4.65, 4.68, 4.71, 4.74],
        sub: "Per employee / month",
    },
    {
        id: "attrition",
        label: "Attrition Rate",
        value: "6.2%",
        change: -1.4,
        direction: "down" as const,
        good: "down",
        icon: UserX,
        color: "red",
        sparkline: [9.1, 8.8, 8.2, 7.8, 7.4, 6.9, 6.2],
        sub: "Rolling 12-month",
    },
    {
        id: "open-positions",
        label: "Open Positions",
        value: "11",
        change: 10,
        direction: "up" as const,
        good: "neutral",
        icon: Briefcase,
        color: "violet",
        sparkline: [6, 7, 8, 9, 10, 10, 11],
        sub: "Active requisitions",
    },
    {
        id: "tenure",
        label: "Avg. Tenure",
        value: "14.3 mo",
        change: 5.9,
        direction: "up" as const,
        good: "up",
        icon: CalendarDays,
        color: "green",
        sparkline: [11, 11.5, 12, 12.8, 13.2, 13.8, 14.3],
        sub: "Company average",
    },
];

const departmentData = [
    { name: "Mortgage Operations", count: 28, payroll: 128.4, color: "#0047AB", pct: 32 },
    { name: "Client Success", count: 18, payroll: 87.2, color: "#002B5B", pct: 21 },
    { name: "Compliance & QA", count: 14, payroll: 72.1, color: "#6366f1", pct: 16 },
    { name: "Technology", count: 12, payroll: 68.5, color: "#0ea5e9", pct: 14 },
    { name: "Finance & Admin", count: 9, payroll: 38.6, color: "#10b981", pct: 10 },
    { name: "HR & Talent", count: 6, payroll: 17.8, color: "#f59e0b", pct: 7 },
];

const costCenterData = [
    { code: "CC-001", name: "US Client – Alpha Corp", employees: 24, budget: 110.2, spend: 98.4, pct: 89 },
    { code: "CC-002", name: "US Client – Beta Partners", employees: 19, budget: 88.0, spend: 82.1, pct: 93 },
    { code: "CC-003", name: "EU Client – Nexus GmbH", employees: 16, budget: 76.5, spend: 71.0, pct: 93 },
    { code: "CC-004", name: "Internal – HOMESI Ops", employees: 28, budget: 145.0, spend: 161.1, pct: 111 },
];

const tenureDistribution = [
    { label: "0–3 mo", count: 12, pct: 14 },
    { label: "4–6 mo", count: 18, pct: 21 },
    { label: "7–12 mo", count: 22, pct: 25 },
    { label: "1–2 yr", count: 21, pct: 24 },
    { label: "2+ yr", count: 14, pct: 16 },
];

const headcountTrend = [72, 74, 76, 78, 80, 83, 87];
const trendMonths = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

const recentActivity = [
    { type: "hire", text: "New hire onboarded: Valentina Ríos — Mortgage Ops", time: "Today, 9:14 AM", dot: "bg-emerald-400" },
    { type: "exit", text: "Offboarding initiated: Carlos Mejía — Compliance", time: "Today, 8:02 AM", dot: "bg-action-red" },
    { type: "promo", text: "Promotion approved: Ana Gómez → Senior Analyst", time: "Yesterday, 4:30 PM", dot: "bg-cobalt-blue" },
    { type: "req", text: "New requisition opened: QA Specialist (CC-001)", time: "Yesterday, 2:15 PM", dot: "bg-violet-500" },
    { type: "payroll", text: "Payroll cycle closed — Feb 2026 (87 employees)", time: "Feb 15, 11:00 AM", dot: "bg-amber-400" },
    { type: "alert", text: "Attrition alert: 2 resignations in Client Success", time: "Feb 14, 3:45 PM", dot: "bg-action-red" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 72;
    const h = 28;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    });
    const colorMap: Record<string, string> = {
        cobalt: "#0047AB",
        amber: "#f59e0b",
        green: "#22c55e",
        red: "#E31837",
        violet: "#6366f1",
    };
    const stroke = colorMap[color] || "#0047AB";
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
            />
        </svg>
    );
};

const TrendBadge: React.FC<{ change: number; direction: "up" | "down"; good: string }> = ({
    change,
    direction,
    good,
}) => {
    const isNeutral = good === "neutral";
    const isGood =
        (good === "up" && direction === "up") || (good === "down" && direction === "down");
    const isBad =
        (good === "up" && direction === "down") || (good === "down" && direction === "up");

    const cls = isNeutral
        ? "bg-slate-100 text-slate-500"
        : isGood
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-50 text-action-red";

    return (
        <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full", cls)}>
            {direction === "up" ? (
                <ArrowUpRight className="w-3 h-3" />
            ) : (
                <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(change)}%
        </span>
    );
};

// ─── Headcount Trend Mini-Chart ───────────────────────────────────────────────

const HeadcountTrendChart: React.FC = () => {
    const max = Math.max(...headcountTrend);
    const min = Math.min(...headcountTrend) - 2;
    const range = max - min;
    const W = 100;
    const H = 60;

    const pts = headcountTrend.map((v, i) => {
        const x = (i / (headcountTrend.length - 1)) * W;
        const y = H - ((v - min) / range) * H;
        return { x, y, v };
    });

    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H} L 0 ${H} Z`;

    return (
        <div className="relative w-full" style={{ height: 80 }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                <defs>
                    <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0047AB" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0047AB" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill="url(#hcGrad)" />
                <path d={pathD} fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#0047AB" />
                ))}
            </svg>
            {/* Month labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0">
                {trendMonths.map((m) => (
                    <span key={m} className="text-[9px] text-slate-400 font-medium">
                        {m}
                    </span>
                ))}
            </div>
        </div>
    );
};

// ─── Department Bar Chart ─────────────────────────────────────────────────────

const DepartmentChart: React.FC = () => {
    const maxCount = Math.max(...departmentData.map((d) => d.count));
    return (
        <div className="space-y-2.5">
            {departmentData.map((dept) => (
                <div key={dept.name} className="group">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600 truncate max-w-[160px]">
                            {dept.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">
                                COP {dept.payroll}M
                            </span>
                            <span className="text-xs font-bold text-navy-blue w-6 text-right">
                                {dept.count}
                            </span>
                        </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${(dept.count / maxCount) * 100}%`,
                                backgroundColor: dept.color,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Tenure Distribution ──────────────────────────────────────────────────────

const TenureChart: React.FC = () => {
    const maxPct = Math.max(...tenureDistribution.map((t) => t.pct));
    const barColors = ["#0047AB", "#0047AB", "#002B5B", "#002B5B", "#6366f1"];
    return (
        <div className="flex items-end gap-2 h-20 pt-2">
            {tenureDistribution.map((t, i) => (
                <div key={t.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600">{t.count}</span>
                    <div className="w-full flex items-end" style={{ height: 44 }}>
                        <div
                            className="w-full rounded-t-sm transition-all duration-700"
                            style={{
                                height: `${(t.pct / maxPct) * 100}%`,
                                backgroundColor: barColors[i],
                                opacity: 0.85,
                            }}
                        />
                    </div>
                    <span className="text-[9px] text-slate-400 text-center leading-tight">
                        {t.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Cost Center Table ────────────────────────────────────────────────────────

const CostCenterTable: React.FC = () => (
    <div className="overflow-x-auto">
        <table className="w-full text-xs">
            <thead>
                <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Cost Center
                    </th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        HC
                    </th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Budget
                    </th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Spend
                    </th>
                    <th className="text-right py-2 pl-2 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Utilization
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {costCenterData.map((cc) => {
                    const over = cc.pct > 100;
                    return (
                        <tr key={cc.code} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-2.5 pr-3">
                                <div className="font-semibold text-navy-blue">{cc.code}</div>
                                <div className="text-slate-400 text-[10px] truncate max-w-[140px]">
                                    {cc.name}
                                </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold text-slate-700">
                                {cc.employees}
                            </td>
                            <td className="py-2.5 px-2 text-right text-slate-500">
                                {cc.budget}M
                            </td>
                            <td className="py-2.5 px-2 text-right text-slate-500">
                                {cc.spend}M
                            </td>
                            <td className="py-2.5 pl-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(cc.pct, 100)}%`,
                                                backgroundColor: over ? "#E31837" : "#0047AB",
                                            }}
                                        />
                                    </div>
                                    <span
                                        className={cn(
                                            "font-semibold text-[11px]",
                                            over ? "text-action-red" : "text-emerald-600"
                                        )}
                                    >
                                        {cc.pct}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const MaestroHC: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"overview" | "payroll" | "structure">("overview");

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            {/* ── Dashboard Header ── */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-navy-blue">HC Master</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Headcount Intelligence · As of February 2026
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Tab switcher */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                            {(["overview", "payroll", "structure"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all",
                                        activeTab === tab
                                            ? "bg-white text-navy-blue shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-cobalt-blue text-white text-xs font-semibold rounded-lg hover:bg-navy-blue transition-colors shadow-sm">
                            <Users className="w-3.5 h-3.5" />
                            Open Roster
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* ── KPI Cards Row ── */}
                <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
                    {kpiData.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                            <div
                                key={kpi.id}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col gap-2"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <TrendBadge
                                        change={kpi.change}
                                        direction={kpi.direction}
                                        good={kpi.good}
                                    />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-navy-blue leading-tight">
                                        {kpi.value}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                        {kpi.label}
                                    </div>
                                </div>
                                <Sparkline data={kpi.sparkline} color={kpi.color} />
                            </div>
                        );
                    })}
                </div>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-12 gap-4">
                    {/* ── Headcount Trend ── */}
                    <div className="col-span-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                HC Trend
                            </h3>
                            <span className="text-[10px] text-slate-400">Last 7 months</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-bold text-navy-blue">87</span>
                            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3" /> +15 YTD
                            </span>
                        </div>
                        <HeadcountTrendChart />
                    </div>

                    {/* ── Employees by Department ── */}
                    <div className="col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                By Department
                            </h3>
                            <span className="text-[10px] text-slate-400">87 total</span>
                        </div>
                        <DepartmentChart />
                    </div>

                    {/* ── Tenure Distribution ── */}
                    <div className="col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                Tenure
                            </h3>
                            <span className="text-[10px] text-slate-400">Distribution</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">
                            Avg. <span className="font-semibold text-navy-blue">14.3 months</span>
                        </p>
                        <TenureChart />
                    </div>
                </div>

                {/* ── Bottom Grid ── */}
                <div className="grid grid-cols-12 gap-4">
                    {/* ── Cost Center Table ── */}
                    <div className="col-span-7 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                Cost Centers
                            </h3>
                            <button className="text-[11px] text-cobalt-blue font-medium hover:underline flex items-center gap-0.5">
                                Full report <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <CostCenterTable />
                        {/* Budget alert */}
                        <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 text-action-red shrink-0" />
                            <span className="text-[11px] text-action-red font-medium">
                                CC-004 (Internal Ops) is over budget by 11% — review headcount allocation.
                            </span>
                        </div>
                    </div>

                    {/* ── Activity Feed ── */}
                    <div className="col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                Recent Activity
                            </h3>
                            <button className="text-[11px] text-cobalt-blue font-medium hover:underline">
                                View all
                            </button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {recentActivity.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                                >
                                    <div
                                        className={cn(
                                            "w-2 h-2 rounded-full shrink-0 mt-1.5",
                                            item.dot
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-600 leading-snug">
                                            {item.text}
                                        </p>
                                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                                            {item.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Payroll Breakdown Summary ── */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                            Payroll Composition — February 2026
                        </h3>
                        <span className="text-xs font-bold text-navy-blue">COP 412.6M Total</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        {[
                            { label: "Base Salaries", value: "COP 312.4M", pct: 75.7, color: "#0047AB" },
                            { label: "Social Security", value: "COP 56.2M", pct: 13.6, color: "#002B5B" },
                            { label: "Bonuses & Extras", value: "COP 24.8M", pct: 6.0, color: "#6366f1" },
                            { label: "Benefits", value: "COP 12.1M", pct: 2.9, color: "#10b981" },
                            { label: "Severance Prov.", value: "COP 7.1M", pct: 1.7, color: "#f59e0b" },
                        ].map((item) => (
                            <div key={item.label} className="text-center">
                                <div
                                    className="w-full h-1.5 rounded-full mb-2"
                                    style={{ backgroundColor: item.color }}
                                />
                                <div className="text-base font-bold text-navy-blue">{item.pct}%</div>
                                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                    {item.label}
                                </div>
                                <div className="text-[10px] text-slate-400">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
