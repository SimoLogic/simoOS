"use client";

import { useState } from "react";
import { Star, CheckCircle2, Clock, Lock, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewRecord {
    id: string;
    employee: string;
    reviewPeriod: string;
    reviewDate: string;
    scoreDelivery: number;
    scoreAttitude: number;
    scoreCollaboration: number;
    scoreInnovation: number;
    scoreOverall: number;
    status: "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED";
    isLocked: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_REVIEWS: ReviewRecord[] = [
    {
        id: "r1",
        employee: "EID-0001 — Ana García",
        reviewPeriod: "Q4-2025",
        reviewDate: "2026-01-15",
        scoreDelivery: 4.5, scoreAttitude: 4.2, scoreCollaboration: 4.8, scoreInnovation: 3.9,
        scoreOverall: 4.36,
        status: "ACKNOWLEDGED",
        isLocked: true,
    },
    {
        id: "r2",
        employee: "EID-0002 — Carlos López",
        reviewPeriod: "Q4-2025",
        reviewDate: "2026-01-16",
        scoreDelivery: 3.8, scoreAttitude: 4.0, scoreCollaboration: 3.5, scoreInnovation: 4.2,
        scoreOverall: 3.87,
        status: "SUBMITTED",
        isLocked: false,
    },
    {
        id: "r3",
        employee: "EID-0003 — María Rondón",
        reviewPeriod: "Q1-2026",
        reviewDate: "2026-03-15",
        scoreDelivery: 0, scoreAttitude: 0, scoreCollaboration: 0, scoreInnovation: 0,
        scoreOverall: 0,
        status: "DRAFT",
        isLocked: false,
    },
];

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    DRAFT:        "bg-slate-100 text-slate-500 border-slate-200",
    SUBMITTED:    "bg-amber-50 text-amber-700 border-amber-200",
    ACKNOWLEDGED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    DRAFT:        <Clock className="w-3 h-3" />,
    SUBMITTED:    <TrendingUp className="w-3 h-3" />,
    ACKNOWLEDGED: <Lock className="w-3 h-3" />,
};

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
    const pct = (score / 5) * 100;
    const color = score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-cobalt-blue" : "bg-amber-500";
    return (
        <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 w-24 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-6 text-right">{score > 0 ? score.toFixed(1) : "—"}</span>
        </div>
    );
}

// ─── Review Row ───────────────────────────────────────────────────────────────

function ReviewRow({ review, onAcknowledge }: { review: ReviewRecord; onAcknowledge: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const overallPct = (review.scoreOverall / 5) * 100;

    return (
        <>
            <tr
                className={cn(
                    "border-b border-slate-50 hover:bg-slate-50/40 transition-colors cursor-pointer",
                    review.isLocked && "bg-slate-50/30"
                )}
                onClick={() => setExpanded((e) => !e)}
            >
                <td className="px-4 py-3 text-xs font-medium text-slate-700">{review.employee}</td>
                <td className="px-4 py-3 text-xs font-mono text-cobalt-blue font-semibold">{review.reviewPeriod}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{review.reviewDate}</td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[80px]">
                            <div
                                className={cn("h-full rounded-full", review.scoreOverall >= 4 ? "bg-emerald-500" : review.scoreOverall >= 3 ? "bg-cobalt-blue" : "bg-amber-500")}
                                style={{ width: `${overallPct}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 tabular-nums">
                            {review.scoreOverall > 0 ? review.scoreOverall.toFixed(2) : "—"}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLE[review.status])}>
                        {STATUS_ICON[review.status]} {review.status}
                        {review.isLocked && <Lock className="w-2.5 h-2.5 ml-0.5" />}
                    </span>
                </td>
                <td className="px-4 py-3 text-right">
                    {review.status === "SUBMITTED" && !review.isLocked && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAcknowledge(review.id); }}
                            className="px-3 py-1.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1.5 ml-auto"
                        >
                            <CheckCircle2 className="w-3 h-3" /> Acknowledge & Lock
                        </button>
                    )}
                    {review.isLocked && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                            <Lock className="w-3 h-3" /> Immutable
                        </span>
                    )}
                    <ChevronRight className={cn("w-3 h-3 text-slate-300 ml-auto transition-transform", expanded && "rotate-90")} />
                </td>
            </tr>
            {expanded && review.scoreOverall > 0 && (
                <tr>
                    <td colSpan={6} className="px-8 py-4 bg-slate-50/30 border-b border-slate-100">
                        <div className="max-w-sm space-y-2">
                            <ScoreBar label="Delivery (35%)" score={review.scoreDelivery} />
                            <ScoreBar label="Attitude (20%)" score={review.scoreAttitude} />
                            <ScoreBar label="Collaboration (25%)" score={review.scoreCollaboration} />
                            <ScoreBar label="Innovation (20%)" score={review.scoreInnovation} />
                        </div>
                        {review.isLocked && (
                            <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                This review has been acknowledged. Shield Protocol prevents further edits.
                            </p>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
    const handleAcknowledge = (id: string) => {
        alert(`[Demo] Review ${id} acknowledged + locked. In production calls acknowledgePerformanceReviewAction(orgId, "${id}").`);
    };

    const avgScore = MOCK_REVIEWS
        .filter((r) => r.scoreOverall > 0)
        .reduce((acc, r, _, arr) => acc + r.scoreOverall / arr.length, 0);

    return (
        <div className="h-full bg-white overflow-y-auto">
            {/* Header */}
            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HR Module</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-semibold text-cobalt-blue uppercase tracking-widest">Performance</span>
                        </div>
                        <h1 className="text-xl font-bold text-navy-blue">Performance Reviews</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            360° scoring · Quarterly cycles · Acknowledge = immutable (Shield Protocol)
                        </p>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold bg-navy-blue text-white rounded-lg hover:bg-navy-blue/90 transition-all flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        New Review
                    </button>
                </div>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* Summary KPIs */}
                <div className="grid grid-cols-3 gap-4 max-w-2xl">
                    {[
                        { label: "Total Reviews",  value: MOCK_REVIEWS.length,             color: "text-navy-blue" },
                        { label: "Avg Score",      value: avgScore > 0 ? `${avgScore.toFixed(2)} / 5` : "—", color: "text-cobalt-blue" },
                        { label: "Pending Ack.",   value: MOCK_REVIEWS.filter((r) => r.status === "SUBMITTED").length, color: "text-amber-600" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40">
                            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Scoring legend */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-semibold">Weighting:</span>
                    <span>Delivery <strong>35%</strong></span>
                    <span>Collaboration <strong>25%</strong></span>
                    <span>Attitude <strong>20%</strong></span>
                    <span>Innovation <strong>20%</strong></span>
                    <span className="ml-auto text-slate-400">Click row to expand breakdown</span>
                </div>

                {/* Reviews table */}
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Review Records</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white">
                                {["Employee", "Period", "Review Date", "Overall Score", "Status", "Action"].map((h) => (
                                    <th key={h} className={cn(
                                        "px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest",
                                        h === "Action" ? "text-right" : "text-left"
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_REVIEWS.map((r) => (
                                <ReviewRow key={r.id} review={r} onAcknowledge={handleAcknowledge} />
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-slate-400 flex items-center gap-1">
                    Data persisted to <code className="font-mono text-cobalt-blue">hr_performance_reviews</code>
                    <ChevronRight className="w-3 h-3" />
                    <code className="font-mono text-cobalt-blue">isLocked = true</code> after acknowledgement prevents all future writes (Shield Protocol)
                </p>
            </div>
        </div>
    );
}
