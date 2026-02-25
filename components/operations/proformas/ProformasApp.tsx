"use client";

import React from "react";
import { FileText, TrendingUp, BarChart2, Calculator, DollarSign, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── P&L Structure Preview ────────────────────────────────────────────────────

const PnLRow: React.FC<{ label: string; type?: "section" | "total" | "sub" }> = ({ label, type = "sub" }) => (
    <div className={cn(
        "flex items-center justify-between py-2.5 px-4 border-b border-slate-50",
        type === "section" && "bg-slate-50 border-t border-slate-100 mt-2",
        type === "total" && "bg-navy-blue/5 font-bold"
    )}>
        <span className={cn(
            "text-sm",
            type === "section" && "text-[10px] font-bold text-slate-400 uppercase tracking-widest",
            type === "total" && "text-sm font-bold text-navy-blue",
            type === "sub" && "text-sm text-slate-500 pl-4"
        )}>
            {type === "sub" && "↳ "}{label}
        </span>
        <span className={cn(
            "text-xs font-mono",
            type === "total" ? "text-navy-blue font-bold" : "text-slate-300"
        )}>— —</span>
    </div>
);

// ─── Main Placeholder ─────────────────────────────────────────────────────────

export const ProformasApp: React.FC = () => {
    const pnlStructure: { label: string; type?: "section" | "total" | "sub" }[] = [
        { label: "REVENUE", type: "section" },
        { label: "Loan Volume (units)" },
        { label: "Average Loan Size" },
        { label: "Gross Revenue (basis points)" },
        { label: "Override / Bonus Revenue" },
        { label: "GROSS REVENUE", type: "total" },
        { label: "LOAN-LEVEL COSTS", type: "section" },
        { label: "Loan Officer Compensation (% of revenue)" },
        { label: "Processor / Underwriting Support" },
        { label: "Per-Loan Technology Cost" },
        { label: "LOAN MARGIN", type: "total" },
        { label: "INDIRECT / OPERATING COSTS", type: "section" },
        { label: "Office Rent & Utilities" },
        { label: "Marketing & Lead Gen" },
        { label: "Compliance & Licensing" },
        { label: "G&A Allocated" },
        { label: "NET BRANCH PROFIT", type: "total" },
    ];

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-8 pt-6 pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operations</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Proformas</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy-blue">Branch Proformas</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            P&L projections per branch — by program and loan category
                        </p>
                    </div>
                    <span className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                        <TrendingUp className="w-4 h-4" /> Module Under Development
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="max-w-3xl mx-auto space-y-8">

                    {/* Description Card */}
                    <div className="bg-gradient-to-br from-navy-blue to-cobalt-blue rounded-2xl p-6 text-white">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Calculator className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Branch P&L Proforma</h3>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    Model the financial performance of each branch. Define revenue by loan program and category,
                                    apply loan-level cost structures, and project net profit with indirect cost allocations.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-6">
                            {[
                                { icon: DollarSign, label: "Revenue Modeling", desc: "By program & BPS" },
                                { icon: BarChart2, label: "Margin Stack", desc: "Div / Region / Branch" },
                                { icon: TrendingUp, label: "Scenario Planning", desc: "Volume sensitivity" },
                            ].map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                                    <Icon className="w-5 h-5 mx-auto mb-1 text-white/80" />
                                    <p className="text-xs font-bold text-white/90">{label}</p>
                                    <p className="text-[10px] text-white/50">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* P&L Structure Preview */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-violet-500" />
                                <h3 className="text-sm font-bold text-navy-blue">P&L Structure (Coming Soon)</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">Preview Only</span>
                        </div>
                        <div>
                            {pnlStructure.map((row, i) => (
                                <PnLRow key={i} label={row.label} type={row.type} />
                            ))}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <p className="text-[11px] text-slate-400 italic">
                                ✦ Proforma inputs, scenario modeling, and multi-branch comparison will be available in the next build sprint. Click "Proforma" in the Hierarchy Map to preview a branch read-only projection.
                            </p>
                        </div>
                    </div>

                    {/* Navigation hint */}
                    <div className="flex items-center gap-3 p-4 bg-cobalt-blue/5 border border-cobalt-blue/20 rounded-xl">
                        <ArrowRight className="w-4 h-4 text-cobalt-blue shrink-0" />
                        <p className="text-xs text-slate-600">
                            To preview an existing branch proforma, go to <strong>Hierarchy Map</strong> and click the <strong>Proforma</strong> button on any Branch card.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
