"use server";

/**
 * FINANCE P&L REPORT — Server Action
 *
 * Trae las transacciones (opcionalmente filtradas por sucursal + año) y arma
 * el árbol de pivot con lib/finance-pl/pivot-engine.ts (puerto de homesi-pl,
 * sin tocar el algoritmo). Niveles fijos para este alcance:
 * Category 2 -> Category 7 -> GL.
 *
 * Incluye paginación explícita (PostgREST limita a 1000 filas por defecto)
 * y KPIs ejecutivos (Gross Income / Operating Expenses / Net Income / Margin)
 * derivados de order_1 del mapeo GL:
 *   order_1 = 1        -> Revenue (Gross Income)
 *   order_1 in (2,3,4) -> Direct Production Costs + Personnel + SG&A (Operating Expenses)
 *   order_1 in (5,6)   -> BM Payroll / Corporate Subsidy (ya incluido en Net Income total)
 * Nota: esta agrupación es una aproximación razonable según el mapeo GL real
 * -- si el negocio define estos buckets distinto, se ajusta aquí.
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

export interface PLReportKPIs {
    grossIncome: number;
    operatingExpenses: number;
    netIncome: number;
    operatingMarginPct: number;
}

export interface PLReportResult {
    tree: PivotNode[];
    months: string[];
    grandTotal: number;
    kpis: PLReportKPIs;
}

interface RawTxRow {
    id: string;
    month: string | null;
    year: number | null;
    branch: string | null;
    check_description: string | null;
    vendor: string | null;
    ref_numb: string | null;
    debit: number;
    credit: number;
    movement: number | null;
    gl_code: string | null;
    gl_name: string | null;
    category_2: string | null;
    category_6: string | null;
    category_7: string | null;
    order_1: number | null;
    order_2: number | null;
    order_3: number | null;
}

async function fetchAllTransactions(
    tenantId: string,
    branchCode: string | null,
    year: number | null
): Promise<{ data: RawTxRow[] | null; error: string | null }> {
    const PAGE_SIZE = 1000;
    let allRows: RawTxRow[] = [];
    let from = 0;
    while (true) {
        let page = supabaseFinancePl
            .from("pl_transactions")
            .select(
                "id, month, year, branch, check_description, vendor, ref_numb, debit, credit, movement, gl_code, gl_name, category_2, category_6, category_7, order_1, order_2, order_3"
            )
            .eq("tenant_id", tenantId)
            .range(from, from + PAGE_SIZE - 1);

        if (branchCode) page = page.eq("branch", branchCode);
        if (year) page = page.eq("year", year);

        const { data: pageData, error: pageError } = await page;
        if (pageError) return { data: null, error: pageError.message };
        if (!pageData || pageData.length === 0) break;

        allRows = allRows.concat(pageData as RawTxRow[]);
        if (pageData.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return { data: allRows, error: null };
}

export async function getPLReportAction(
    tenantId: string,
    branchCode: string | null,
    year: number | null
): Promise<ActionResult<PLReportResult>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");

    try {
        const { data, error } = await fetchAllTransactions(tenantId, branchCode, year);
        if (error) return fail(`Error leyendo transacciones: ${error}`);

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

        // KPIs derivados de order_1 (ver nota arriba del archivo)
        let grossIncome = 0;
        let operatingExpenses = 0;
        for (let i = 0; i < txs.length; i++) {
            const order1 = (data ?? [])[i]?.order_1;
            const mvmt = txs[i].movement ?? 0;
            if (order1 === 1) grossIncome += mvmt;
            else if (order1 === 2 || order1 === 3 || order1 === 4) operatingExpenses += mvmt;
        }
        const netIncome = grandTotal;
        const operatingMarginPct = grossIncome !== 0 ? (netIncome / grossIncome) * 100 : 0;

        return ok({
            tree,
            months,
            grandTotal,
            kpis: { grossIncome, operatingExpenses, netIncome, operatingMarginPct },
        });
    } catch (err) {
        console.error("[getPLReportAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Error desconocido al generar el reporte.");
    }
}

/** Lista de sucursales que ya tienen transacciones cargadas (para el selector del admin). */
export async function getBranchesWithDataAction(tenantId: string): Promise<ActionResult<string[]>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");
    try {
        const { data, error } = await fetchAllTransactions(tenantId, null, null);
        if (error) return fail(error);
        const branches = Array.from(new Set((data ?? []).map((r) => r.branch).filter(Boolean))).sort();
        return ok(branches as string[]);
    } catch (err) {
        return fail(err instanceof Error ? err.message : "Error desconocido.");
    }
}

/** Años disponibles en los datos cargados (para el selector "Fiscal Year"). */
export async function getAvailableYearsAction(tenantId: string): Promise<ActionResult<number[]>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");
    try {
        const { data, error } = await fetchAllTransactions(tenantId, null, null);
        if (error) return fail(error);
        const years = Array.from(new Set((data ?? []).map((r) => r.year).filter((y): y is number => y != null)));
        years.sort((a, b) => b - a);
        return ok(years);
    } catch (err) {
        return fail(err instanceof Error ? err.message : "Error desconocido.");
    }
}

/** Detalle de transacciones individuales para el drawer de auditoría (celda = categoría + mes). */
export interface TransactionDetail {
    id: string;
    loan_number: string | null;
    check_description: string | null;
    vendor: string | null;
    ref_numb: string | null;
    journal_post_date: string | null;
    movement: number;
}

export async function getTransactionDetailAction(
    tenantId: string,
    branchCode: string | null,
    year: number | null,
    month: string,
    category2: string,
    category7: string,
    glCode: string
): Promise<ActionResult<TransactionDetail[]>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");
    try {
        let query = supabaseFinancePl
            .from("pl_transactions")
            .select("id, loan_number, check_description, vendor, ref_numb, journal_post_date, movement, gl_code, gl_name, category_2, category_7, month")
            .eq("tenant_id", tenantId)
            .eq("month", month);

        if (branchCode) query = query.eq("branch", branchCode);
        if (year) query = query.eq("year", year);

        const { data, error } = await query;
        if (error) return fail(error.message);

        // Filtramos en memoria por la combinación exacta (incluye el fallback
        // "Uncategorized"/"(No Category 7)"/"(No GL)" que usa el motor de pivot).
        const rows = (data ?? []).filter((r) => {
            const c2 = r.category_2?.trim() || "Uncategorized";
            const c7 = r.category_7?.trim() || "(No Category 7)";
            const gl = r.gl_code?.trim() && r.gl_name?.trim() ? `${r.gl_code.trim()} — ${r.gl_name.trim()}` : (r.gl_code?.trim() ?? r.gl_name?.trim() ?? "(No GL)");
            return c2 === category2 && c7 === category7 && gl === glCode;
        });

        return ok(
            rows.map((r) => ({
                id: r.id,
                loan_number: r.loan_number,
                check_description: r.check_description,
                vendor: r.vendor,
                ref_numb: r.ref_numb,
                journal_post_date: r.journal_post_date,
                movement: Number(r.movement ?? 0),
            }))
        );
    } catch (err) {
        return fail(err instanceof Error ? err.message : "Error desconocido.");
    }
}
