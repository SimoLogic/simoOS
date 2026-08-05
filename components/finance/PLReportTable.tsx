"use client";

import React, { useState } from "react";
import type { PivotNode } from "@/lib/finance-pl/pivot-engine";

function fmt(n: number): string {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ROW_INDENT_PX = 18;

function PivotRow({ node, depth, months }: { node: PivotNode; depth: number; months: string[] }) {
    const [collapsed, setCollapsed] = useState(depth > 0);
    const hasChildren = node.children.length > 0;

    return (
        <>
            <tr className={depth === 0 ? "bg-slate-50 font-semibold" : ""}>
                <td
                    className="py-1.5 pr-3 text-sm text-slate-700 cursor-pointer select-none whitespace-nowrap"
                    style={{ paddingLeft: 12 + depth * ROW_INDENT_PX }}
                    onClick={() => hasChildren && setCollapsed((c) => !c)}
                >
                    {hasChildren && <span className="inline-block w-3 text-slate-400">{collapsed ? "▸" : "▾"}</span>}
                    {node.label}
                </td>
                {months.map((m) => (
                    <td key={m} className="py-1.5 px-3 text-sm text-right tabular-nums text-slate-600">
                        {node.byMonth[m] ? fmt(node.byMonth[m]) : "—"}
                    </td>
                ))}
                <td className="py-1.5 px-3 text-sm text-right tabular-nums font-medium text-slate-800 border-l border-slate-200">
                    {fmt(node.total)}
                </td>
            </tr>
            {!collapsed && node.children.map((child) => (
                <PivotRow key={child.key} node={child} depth={depth + 1} months={months} />
            ))}
        </>
    );
}

export const PLReportTable: React.FC<{ tree: PivotNode[]; months: string[]; grandTotal: number }> = ({
    tree,
    months,
    grandTotal,
}) => {
    if (tree.length === 0) {
        return <div className="text-sm text-slate-400 py-8 text-center">No hay transacciones cargadas todavía.</div>;
    }

    return (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                        {months.map((m) => (
                            <th key={m} className="py-2 px-3 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                                {m.slice(0, 3)}
                            </th>
                        ))}
                        <th className="py-2 px-3 text-right text-xs font-semibold text-slate-500 uppercase border-l border-slate-200">
                            Total
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tree.map((node) => (
                        <PivotRow key={node.key} node={node} depth={0} months={months} />
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-800 text-white font-semibold">
                        <td className="py-2 px-3 text-sm">Total General</td>
                        {months.map((m) => {
                            const monthTotal = tree.reduce((sum, n) => sum + (n.byMonth[m] ?? 0), 0);
                            return (
                                <td key={m} className="py-2 px-3 text-sm text-right tabular-nums">
                                    {fmt(monthTotal)}
                                </td>
                            );
                        })}
                        <td className="py-2 px-3 text-sm text-right tabular-nums border-l border-slate-600">
                            {fmt(grandTotal)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};
