// Tipos portados 1:1 desde homesi-pl/types/index.ts (solo los necesarios
// para el pipeline de carga: normalizar -> enriquecer -> guardar).
// No se tocó la lógica original -- ver docs/AGENT_CONTEXT_ANTIGRAVITY.md.

export interface NormalizedRow {
    gl_number_raw: string;
    gl_code: string;
    branch: string;
    gl_name: string;
    check_description: string;
    loan_number: string | null;
    loan_number_raw: string | null;
    borrower_name: string | null;
    journal_post_date: string | null;
    year: number | null;
    month: string | null;
    vendor: string;
    invoice_numb: string;
    ref_numb: string;
    doc_type: string;
    debit: number;
    credit: number;
    movement: number;
}

export interface NormalizeWarning {
    rowIndex: number;
    rawGLNumber: string;
    message: string;
}

export interface NormalizePLResult {
    rows: NormalizedRow[];
    warnings: NormalizeWarning[];
}

export interface GLMapping {
    gl_code: string;
    gl_name: string;
    category_1: string | null;
    category_2: string | null;
    category_3: string | null;
    category_4: string | null;
    category_5: string | null;
    category_6: string | null;
    category_7: string | null;
    order_1: number | null;
    order_2: number | null;
    order_3: number | null;
}

export interface Branch {
    branch: string;
    region: string | null;
    branch_manager: string | null;
}

export interface EnrichedTransaction extends NormalizedRow {
    upload_id: string;
    category_1: string | null;
    category_2: string | null;
    category_3: string | null;
    category_4: string | null;
    category_5: string | null;
    category_6: string | null;
    category_7: string | null;
    order_1: number | null;
    order_2: number | null;
    order_3: number | null;
    region: string | null;
    branch_manager: string | null;
    manual_override: false;
    source: "original" | "addback" | "offshore_allocations" | "manual_entry";
}

export interface EnrichResult {
    transactions: EnrichedTransaction[];
    uncategorizedCount: number;
    unknownBranchCount: number;
}

// ─── Reporte / Pivot (lib/finance-pl/pivot-engine.ts) ──────────────────────
// Nota: se omiten los campos de cost_center del original (motor de reglas
// deferido, no se usa en este incremento) -- siempre operational_pct
// undefined => 100% Operational por defecto en expandForOpNonOp().
export interface PLReportTx {
    id: string;
    month: string | null;
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
    check_description_2?: string | null;
    check_description_3?: string | null;
    loan_number?: string | null;
    cost_center_id?: string | null;
    cost_center_status?: string | null;
    cost_centers?: { name: string } | null;
    operational_pct?: number;
}
