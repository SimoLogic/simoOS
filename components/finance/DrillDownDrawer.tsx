"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getTransactionDetailAction, type TransactionDetail } from "@/app/actions/finance-pl-report-actions";

interface DrillDownDrawerProps {
    tenantId: string;
    branchCode: string | null;
    year: number | null;
    month: string;
    category2: string;
    category7: string;
    glCode: string;
    cellTotal: number;
    onClose: () => void;
}

function fmt(n: number): string {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const DrillDownDrawer: React.FC<DrillDownDrawerProps> = ({
    tenantId,
    branchCode,
    year,
    month,
    category2,
    category7,
    glCode,
    cellTotal,
    onClose,
}) => {
    const [rows, setRows] = useState<TransactionDetail[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getTransactionDetailAction(tenantId, branchCode, year, month, category2, category7, glCode).then((res) => {
            if (res.success) setRows(res.data);
            else setError(res.error);
        });
    }, [tenantId, branchCode, year, month, category2, category7, glCode]);

    return (
        <>
            <div className="fixed inset-0 bg-[#001A40]/20 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 p-6 z-50 overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{month}</div>
                        <h3 className="text-base font-bold text-[#001A40] mt-1">{glCode}</h3>
                        <div className="text-sm text-slate-500 mt-0.5">
                            {category2} › {category7}
                        </div>
                        <div className="text-lg font-bold text-[#001A40] mt-2 font-mono tabular-nums">${fmt(cellTotal)}</div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-[#001A40] p-1 rounded hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="border-t border-slate-200 pt-4">
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {!error && rows === null && <div className="text-sm text-slate-400">Cargando…</div>}
                    {!error && rows && rows.length === 0 && (
                        <div className="text-sm text-slate-400">Sin transacciones individuales para esta celda.</div>
                    )}
                    {!error && rows && rows.length > 0 && (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b border-slate-200">
                                    <th className="py-2 pr-2">Loan # / Ref</th>
                                    <th className="py-2 pr-2">Descripción / Vendor</th>
                                    <th className="py-2 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((r) => (
                                    <tr key={r.id}>
                                        <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">
                                            {r.loan_number || r.ref_numb || "—"}
                                        </td>
                                        <td className="py-2 pr-2 text-slate-700">
                                            {r.check_description || r.vendor || "—"}
                                        </td>
                                        <td
                                            className={`py-2 text-right font-mono tabular-nums ${
                                                r.movement < 0 ? "text-rose-600" : "text-slate-700"
                                            }`}
                                        >
                                            {fmt(r.movement)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
};
