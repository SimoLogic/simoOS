"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getBranchHeadcountHierarchyAction, EmployeeHierarchyNode } from "@/app/actions/branch-actions";
import { X, Users, DollarSign, Globe, Loader2, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";

interface BranchHeadcountModalProps {
    branchCode: string;
    onClose: () => void;
}

const HeadcountNodeCard: React.FC<{ node: EmployeeHierarchyNode; depth: number }> = ({ node, depth }) => {
    return (
        <div className="flex flex-col relative w-full mb-2">
            <div className={cn(
                "relative bg-white rounded-xl border border-slate-200 shadow-sm p-3 hover:border-cobalt-blue/40 transition-all z-10",
                depth === 0 ? "bg-slate-50 border-slate-300" : ""
            )}>
                {depth > 0 && (
                    <div className="absolute -left-6 top-6 w-6 h-px bg-slate-200" />
                )}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-blue to-cobalt-blue flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {node.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-navy-blue">{node.fullName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{node.jobTitle}</span>
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
                                    node.country === "US" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                    <Globe className="w-2.5 h-2.5" />
                                    {node.country}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="flex items-center justify-end text-sm font-bold text-emerald-600">
                            <DollarSign className="w-3.5 h-3.5" />
                            {node.convertedSalary.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">{node.displayCurrency} Monthly</p>
                    </div>
                </div>
            </div>

            {node.children.length > 0 && (
                <div className="relative pl-6 pt-2 w-full">
                    <div className="absolute left-6 top-0 bottom-6 w-px bg-slate-200" />
                    {node.children.map(child => (
                        <HeadcountNodeCard key={child.eid} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const BranchHeadcountModal: React.FC<BranchHeadcountModalProps> = ({ branchCode, onClose }) => {
    const { currentTenant } = useTenant();
    const [loading, setLoading] = useState(true);
    const [roots, setRoots] = useState<EmployeeHierarchyNode[]>([]);
    const [totalConverted, setTotalConverted] = useState(0);

    const load = useCallback(async () => {
        if (!currentTenant) return;
        setLoading(true);
        const res = await getBranchHeadcountHierarchyAction(currentTenant.tenant_id, branchCode);
        if (res.success && res.data) {
            setRoots(res.data);
            
            // Calc total HC cost in display currency
            let total = 0;
            const sumNode = (n: EmployeeHierarchyNode) => {
                total += n.convertedSalary;
                n.children.forEach(sumNode);
            };
            res.data.forEach(sumNode);
            setTotalConverted(total);
        }
        setLoading(false);
    }, [currentTenant, branchCode]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 text-cobalt-blue" />
                            <h2 className="text-lg font-bold text-navy-blue">Branch Headcount Hierarchy</h2>
                        </div>
                        <p className="text-xs text-slate-500">
                            {branchCode} — Real-time HR data merged with FX Financials
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-100 rounded-lg px-4 py-2 border border-slate-200 text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Monthly HC Cost</p>
                            <p className="text-base font-black text-navy-blue flex items-center justify-end gap-1">
                                <DollarSign className="w-4 h-4" />
                                {totalConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                {roots[0] && <span className="text-xs text-slate-500 font-semibold">{roots[0].displayCurrency}</span>}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-8 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 rounded-b-2xl">
                            <Loader2 className="w-8 h-8 text-cobalt-blue animate-spin mb-4" />
                            <p className="text-sm font-bold text-navy-blue">Fetching Live Org Chart...</p>
                            <p className="text-[10px] text-slate-400 mt-1">Cross-referencing HR Master with FX Manager</p>
                        </div>
                    ) : roots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <Users className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">No headcount found for {branchCode}</p>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto flex flex-col items-start pb-12">
                            {roots.map(root => (
                                <HeadcountNodeCard key={root.eid} node={root} depth={0} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
