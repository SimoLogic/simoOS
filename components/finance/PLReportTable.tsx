"use client";

import React, { useState } from "react";
import type { PivotNode } from "@/lib/finance-pl/pivot-engine";

function fmt(n: number): string {
    if (n === 0) return "$0.00";
    return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ROW_INDENT_PX = 20;

interface PivotRowProps {
    node: PivotNode;
    depth: number;
    months: string[];
    path: string[];
    onCellClick: (month: string, path: string[], value: number) => void;
}

function PivotRow({ node, depth, months, path, onCellClick }: PivotRowProps) {
    const [collapsed, setCollapsed] = useState(depth > 0);
    const hasChildren = node.children.length > 0;
    const isLeaf = !hasChildren;
    const isParent = depth === 0;
    const myPath = [...path, node.label];

    return (
        <>
            <tr className={isParent ? "bg-slate-50/90 border-y border-slate-200/60" : ""}>
                <td
                    className={`py-2 pr-3 text-sm whitespace-nowrap ${
                        isParent ? "font-bold text-[#001A40]" : "text-slate-700 font-normal pl-6"
                    } ${hasChildren ? "cursor-pointer select-none" : ""}`}
                    style={{ paddingLeft: 16 + depth * ROW_INDENT_PX }}
                    onClick={() => hasChildren && setCollapsed((c) => !c)}
                >
                    {hasChildren && <span className="inline-block w-3 text-slate-400">{collapsed ? "▸" : "▾"}</span>}
                    {node.label}
                </td>
                {months.map((m) => {
                    const val = node.byMonth[m] ?? 0;
                    return (
                        <td
                            key={m}
                            onClick={() => isLeaf && val !== 0 && onCellClick(m, myPath, val)}
                            className={`py-2 px-3 text-sm text-right font-mono tabular-nums transition-all rounded ${
                                val < 0 ? "text-rose-600" : "text-slate-600"
                            } ${val === 0 ? "text-slate-300" : ""} ${
                                isLeaf && val !== 0 ? "hover:bg-[#A6DEFF]/20 hover:text-[#001A40] cursor-pointer" : ""
                            }`}
                        >
                            {fmt(val)}
                        </td>
                    );
                })}
                <td className="py-2 px-3 text-sm text-right font-mono tabular-nums font-medium text-[#001A40] border-l border-slate-200">
                    {fmt(node.total)}
                </td>
            </tr>
            {!collapsed && node.children.map((child) => (
                <PivotRow key={child.key} node={child} depth={depth + 1} months={months} path={myPath} onCellClick={onCellClick} />
            ))}
        </>
    );
}

interface PLReportTableProps {
    tree: PivotNode[];
    months: string[];
    grandTotal: number;
    onCellClick: (month: string, path: string[], value: number) => void;
}

export const PLReportTable: React.FC<PLReportTableProps> = ({ tree, months, grandTotal, onCellClick }) => {
    if (tree.length === 0) {
        return <div className="text-sm text-slate-400 py-8 text-center">No hay transacciones cargadas todavía.</div>;
    }

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-w-[1392px]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#001A40] text-white">
                            <th className="py-3 px-4 text-left text-xs font-semibold tracking-wider">Categoría</th>
                            {months.map((m) => (
                                <th key={m} className="py-3 px-4 text-right text-xs font-semibold tracking-wider whitespace-nowrap">
                                    {m.slice(0, 3).toUpperCase()}
                                </th>
                            ))}
                            <th className="py-3 px-4 text-right text-xs font-semibold tracking-wider border-l border-white/20">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tree.map((node) => (
                            <PivotRow key={node.key} node={node} depth={0} months={months} path={[]} onCellClick={onCellClick} />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-[#001A40] text-white font-bold text-base">
                            <td className="py-3 px-4 rounded-bl-2xl">Total General</td>
                            {months.map((m) => {
                                const monthTotal = tree.reduce((sum, n) => sum + (n.byMonth[m] ?? 0), 0);
                                return (
                                    <td key={m} className="py-3 px-4 text-right font-mono tabular-nums">
                                        {fmt(monthTotal)}
                                    </td>
                                );
                            })}
                            <td className="py-3 px-4 text-right font-mono tabular-nums border-l border-white/20 rounded-br-2xl">
                                {fmt(grandTotal)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
