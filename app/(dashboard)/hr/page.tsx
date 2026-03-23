import { Suspense } from "react";
import { Users, Clock, Calendar, Star, TrendingUp, Shield, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getHrKpiStatsAction } from "@/app/actions/hr-prisma-actions";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: string;
    href?: string;
    accent?: "navy" | "cobalt" | "emerald" | "amber" | "red";
}

const ACCENT_STYLES = {
    navy:    { card: "border-navy-blue/20 bg-navy-blue/5",    icon: "bg-navy-blue/10 text-navy-blue",    value: "text-navy-blue" },
    cobalt:  { card: "border-cobalt-blue/20 bg-cobalt-blue/5", icon: "bg-cobalt-blue/10 text-cobalt-blue", value: "text-cobalt-blue" },
    emerald: { card: "border-emerald-200 bg-emerald-50",       icon: "bg-emerald-100 text-emerald-600",   value: "text-emerald-700" },
    amber:   { card: "border-amber-200 bg-amber-50",           icon: "bg-amber-100 text-amber-600",       value: "text-amber-700" },
    red:     { card: "border-red-200 bg-red-50",               icon: "bg-red-100 text-red-600",           value: "text-red-700" },
};

function KpiCard({ label, value, icon, trend, href, accent = "cobalt" }: KpiCardProps) {
    const s = ACCENT_STYLES[accent];
    const content = (
        <div className={`relative rounded-xl border p-5 transition-all duration-100 ${s.card} ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.icon}`}>
                    {icon}
                </div>
                {href && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
            <p className={`text-2xl font-bold tabular-nums ${s.value}`}>{value}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
            {trend && (
                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />{trend}
                </p>
            )}
        </div>
    );
    return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Navigation Card ──────────────────────────────────────────────────────────

interface NavCardProps {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: string;
    badgeColor?: string;
}

function NavCard({ href, icon, title, description, badge, badgeColor = "bg-cobalt-blue" }: NavCardProps) {
    return (
        <Link href={href}>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-cobalt-blue/30 hover:shadow-sm transition-all duration-100 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-cobalt-blue/10 group-hover:text-cobalt-blue transition-colors shrink-0">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-blue">{title}</p>
                    <p className="text-xs text-slate-400 truncate">{description}</p>
                </div>
                {badge && (
                    <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badge}
                    </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cobalt-blue transition-colors" />
            </div>
        </Link>
    );
}

// ─── Stats Section ────────────────────────────────────────────────────────────

async function HRStats({ orgId }: { orgId: string }) {
    const result = await getHrKpiStatsAction(orgId);

    if (!result.success) {
        return (
            <div className="col-span-4 text-center py-8 text-slate-400 text-sm">
                Could not load HR statistics.
            </div>
        );
    }

    const stats = result.data;

    return (
        <>
            <KpiCard
                label="Total Employees"
                value={stats.totalEmployees}
                icon={<Users className="w-5 h-5" />}
                accent="navy"
            />
            <KpiCard
                label="Active"
                value={stats.active}
                icon={<Shield className="w-5 h-5" />}
                trend="Currently engaged"
                accent="emerald"
            />
            <KpiCard
                label="On Leave"
                value={stats.onLeave}
                icon={<Clock className="w-5 h-5" />}
                href="/hr/vacations"
                accent="amber"
            />
            <KpiCard
                label="Pending Vacations"
                value={stats.pendingVacations}
                icon={<Calendar className="w-5 h-5" />}
                href="/hr/vacations"
                accent="cobalt"
            />
            <KpiCard
                label="Reviews Pending"
                value={stats.pendingReviews}
                icon={<Star className="w-5 h-5" />}
                href="/hr/performance"
                accent="red"
            />
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// In production, pull orgId from auth session / middleware
const DEFAULT_ORG_ID = process.env.DEMO_ORG_ID ?? "demo-org-id";

export default function HRCommandCenterPage() {
    return (
        <div className="h-full bg-white overflow-y-auto">
            {/* Header */}
            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">SIMO Intellisense</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">HR Module</span>
                </div>
                <h1 className="text-xl font-bold text-navy-blue">Human Resources — Command Center</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                    Every action engineered for certainty. Shield Protocol active.
                </p>
            </div>

            <div className="px-8 py-6 space-y-8">
                {/* KPI Grid */}
                <section>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Workforce Snapshot
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        <Suspense fallback={
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
                            ))
                        }>
                            <HRStats orgId={DEFAULT_ORG_ID} />
                        </Suspense>
                    </div>
                </section>

                {/* Sub-module navigation */}
                <section>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Sub-Modules
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                        <NavCard
                            href="/hr/hc-maestro"
                            icon={<Users className="w-5 h-5" />}
                            title="HC Master Roster"
                            description="Full employee dossiers, inline editing, CSV export"
                        />
                        <NavCard
                            href="/hr/payroll"
                            icon={<TrendingUp className="w-5 h-5" />}
                            title="Payroll"
                            description="Create periods, WorkdayHelper calculations, lock & process"
                            badge="Key #2"
                            badgeColor="bg-navy-blue"
                        />
                        <NavCard
                            href="/hr/vacations"
                            icon={<Calendar className="w-5 h-5" />}
                            title="Vacation Requests"
                            description="Submit, approve/reject — CO + US holiday-aware"
                        />
                        <NavCard
                            href="/hr/performance"
                            icon={<Star className="w-5 h-5" />}
                            title="Performance Reviews"
                            description="360° scores, quarterly cycles, acknowledgement lock"
                            badge="360°"
                            badgeColor="bg-cobalt-blue"
                        />
                        <NavCard
                            href="/hr/recruitment"
                            icon={<Shield className="w-5 h-5" />}
                            title="Recruitment"
                            description="Job titles, AI-powered JD audio extraction"
                        />
                    </div>
                </section>

                {/* Shield Protocol status */}
                <section className="max-w-3xl">
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                        <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-700">Shield Protocol Active</p>
                            <p className="text-xs text-emerald-600 mt-0.5">
                                Salary data encrypted with AES-256-GCM · Signed contracts and processed payrolls are immutable ·
                                Every query filtered by org_id
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
