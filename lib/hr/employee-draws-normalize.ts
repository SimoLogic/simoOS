/**
 * Normalización del CSV EmployeeDraws (CompensaFe) -> filas de BigQuery.
 *
 * Vive aquí y no dentro de la Server Action porque un archivo "use server"
 * solo puede exportar funciones async: metido allí, nada de esto se podía
 * probar. Es la parte más frágil del pipeline (encabezados del export, montos
 * con formato de nómina, fechas en formato de EE.UU.), así que tiene test:
 * __tests__/employee-draws-normalize.test.ts.
 */

import type { EmployeeDrawBigQueryRow } from "@/lib/bigquery/client";

/**
 * Una fila cruda del CSV, tal como la entrega el parser del navegador.
 *
 * Deliberadamente laxo: los encabezados exactos del export de CompensaFe no
 * están fijados en ningún contrato, así que en vez de casarnos con una
 * escritura ("Employee Number" vs "employee_number" vs "EmployeeNumber") se
 * normalizan las llaves y se busca por nombre canónico (ver pickField).
 * Si el export cambia de estilo de encabezado, esto sigue funcionando.
 */
export type RawEmployeeDrawRow = Record<string, string | number | boolean | null | undefined>;

/** Nombres canónicos que se buscan en cada fila del CSV. */
export const FIELDS = [
    "branch_number",
    "employee_number",
    "employee_name",
    "hire_date",
    "job_title",
    "region_name",
    "branch_name",
    "type",
    "guar_min",
    "draw_date",
    "amount",
    "waived",
    "recaptured",
    "draw_balance",
    "waived_date",
    "net_pay",
    "recaptured_date",
    "notes",
] as const;

export type FieldName = (typeof FIELDS)[number];

/** "Employee  Number" / "EmployeeNumber" / "employee_number" -> "employeenumber". */
export function normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Índice normalizado de una fila, para poder buscar por nombre canónico. */
export function indexRow(row: RawEmployeeDrawRow): Map<string, unknown> {
    const map = new Map<string, unknown>();
    for (const [key, value] of Object.entries(row)) {
        map.set(normalizeKey(key), value);
    }
    return map;
}

export function pickField(index: Map<string, unknown>, field: FieldName): unknown {
    return index.get(normalizeKey(field));
}

export function toText(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
}

/**
 * Convierte a número tolerando lo que traen los exports de nómina:
 * "$1,234.56", "(500.00)" para negativos, y espacios.
 * Devuelve undefined -- no null -- cuando el valor venía con contenido pero no
 * se pudo interpretar, para poder avisarlo en vez de tragárselo en silencio.
 */
export function toNumber(value: unknown): number | null | undefined {
    if (value == null || value === "") return null;
    if (typeof value === "number") return isFinite(value) ? value : undefined;

    let s = String(value).trim();
    if (s === "" || s === "-") return null;

    const isParenNegative = /^\(.*\)$/.test(s);
    if (isParenNegative) s = s.slice(1, -1);
    s = s.replace(/[$,\s]/g, "");

    if (s === "") return undefined;
    const n = Number(s);
    if (!isFinite(n)) return undefined;
    return isParenNegative ? -n : n;
}

/**
 * Normaliza una fecha a YYYY-MM-DD (lo que espera una columna DATE de
 * BigQuery). Acepta lo típico de un CSV: "3/15/2024", "2024-03-15",
 * "03/15/2024 00:00:00".
 */
export function toDateOnly(value: unknown): string | null {
    const s = toText(value);
    if (!s) return null;

    // Ya viene ISO (con o sin hora).
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];

    const parsed = new Date(s);
    if (isNaN(parsed.getTime())) return null;
    // getUTC* no: `new Date("3/15/2024")` se interpreta en hora local, y usar
    // UTC correría la fecha un día hacia atrás en zonas negativas como Bogotá.
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export interface BuildResult {
    rows: EmployeeDrawBigQueryRow[];
    /** Campos donde algún valor venía con contenido pero no se pudo leer como número. */
    unreadableNumericFields: string[];
    /** Filas descartadas por no traer nada identificable. */
    skippedRows: number;
}

/** CSV -> filas listas para hr_centralizado.employee_draws_us_raw. */
export function buildEmployeeDrawRows(
    tenantId: string,
    uploadBatchId: string,
    uploadedAt: Date,
    rows: RawEmployeeDrawRow[]
): BuildResult {
    const out: EmployeeDrawBigQueryRow[] = [];
    const unreadable = new Set<string>();
    let skippedRows = 0;

    for (const raw of rows) {
        const index = indexRow(raw);

        const employeeNumber = toNumber(pickField(index, "employee_number"));
        const employeeName = toText(pickField(index, "employee_name"));

        // Una fila sin empleado no aporta nada (líneas de total, filas en blanco
        // al final del export, etc.).
        if (employeeNumber == null && !employeeName) {
            skippedRows++;
            continue;
        }

        const num = (field: FieldName): number | null => {
            const v = toNumber(pickField(index, field));
            if (v === undefined) {
                unreadable.add(field);
                return null;
            }
            return v;
        };

        out.push({
            upload_batch_id: uploadBatchId,
            uploaded_at: uploadedAt.toISOString(),
            tenant_code: tenantId,
            branch_number: toText(pickField(index, "branch_number")),
            employee_number: num("employee_number"),
            employee_name: employeeName,
            hire_date: toDateOnly(pickField(index, "hire_date")),
            job_title: toText(pickField(index, "job_title")),
            region_name: toText(pickField(index, "region_name")),
            branch_name: toText(pickField(index, "branch_name")),
            type: toText(pickField(index, "type")),
            guar_min: num("guar_min"),
            draw_date: toDateOnly(pickField(index, "draw_date")),
            amount: num("amount"),
            waived: num("waived"),
            recaptured: num("recaptured"),
            draw_balance: num("draw_balance"),
            waived_date: toDateOnly(pickField(index, "waived_date")),
            net_pay: num("net_pay"),
            recaptured_date: toDateOnly(pickField(index, "recaptured_date")),
            notes: toText(pickField(index, "notes")),
        });
    }

    return { rows: out, unreadableNumericFields: [...unreadable], skippedRows };
}
