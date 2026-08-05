"use server";

/**
 * FINANCE P&L REPORT — Server Action
 *
 * Trae las transacciones (opcionalmente filtradas por sucursal) y arma el
 * árbol de pivot con lib/finance-pl/pivot-engine.ts (puerto de homesi-pl,
 * sin tocar el algoritmo). Niveles fijos para este alcance:
 * Category 2 -> Category 7 -> GL (sin cost center, sin drag-and-drop de
 * columnas -- eso es un puerto simplificado del "P&L All" original).
 */

import { supabaseFinancePl } from "@/lib/finance-pl/supabase-client";
import { buildDynamicPivot, expandForOpNonOp, type PivotNode } from "@/lib/finance-pl/pivot-engine";
import type { PLReportTx } from "@/lib/finance-pl/types";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}
function fail<T>(error: string): ActionResult<T> {
    return { success: false, error };
}

const MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export interface PLReportResult {
    tree: PivotNode[];
    months: string[];
    grandTotal: number;
}

export async function getPLReportAction(
    tenantId: string,
    branchCode: string | null
): Promise<ActionResult<PLReportResult>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");

    try {
        let query = supabaseFinancePl
            .from("pl_transactions")
            .select(
                "id, month, branch, check_description, vendor, ref_numb, debit, credit, movement, gl_code, gl_name, category_2, category_6, category_7, order_1, order_2, order_3"
            )
            .eq("tenant_id", tenantId);

        if (branchCode) {
            query = query.eq("branch", branchCode);
        }

        const { data, error } = await query;
        if (error) return fail(`Error leyendo transacciones: ${error.message}`);

        const txs: PLReportTx[] = (data ?? []).map((r) => ({
            id: r.id,
            month: r.month,
            branch: r.branch,
            check_description: r.check_description,
            vendor: r.vendor,
            ref_numb: r.ref_numb,
            debit: Number(r.debit ?? 0),
            credit: Number(r.credit ?? 0),
            movement: r.movement != null ? Number(r.movement) : null,
            gl_code: r.gl_code,
            gl_name: r.gl_name,
            category_2: r.category_2,
            category_6: r.category_6,
            category_7: r.category_7,
            order_1: r.order_1,
            order_2: r.order_2,
            order_3: r.order_3,
        }));

        const expanded = expandForOpNonOp(txs);
        const tree = buildDynamicPivot(expanded, ["category_2", "category_7", "gl"]);

        const monthsPresent = new Set<string>();
        for (const t of txs) if (t.month) monthsPresent.add(t.month);
        const months = MONTH_ORDER.filter((m) => monthsPresent.has(m));

        const grandTotal = txs.reduce((sum, t) => sum + (t.movement ?? 0), 0);

        return ok({ tree, months, grandTotal });
    } catch (err) {
        console.error("[getPLReportAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Error desconocido al generar el reporte.");
    }
}

/** Lista de sucursales que ya tienen transacciones cargadas (para el selector del admin). */
export async function getBranchesWithDataAction(tenantId: string): Promise<ActionResult<string[]>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");
    try {
        const { data, error } = await supabaseFinancePl
            .from("pl_transactions")
            .select("branch")
            .eq("tenant_id", tenantId);
        if (error) return fail(error.message);
        const branches = Array.from(new Set((data ?? []).map((r) => r.branch).filter(Boolean))).sort();
        return ok(branches as string[]);
    } catch (err) {
        return fail(err instanceof Error ? err.message : "Error desconocido.");
    }
}
