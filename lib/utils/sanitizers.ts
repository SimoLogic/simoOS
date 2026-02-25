// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · Central Sanitizer Library
// Single source of truth for all data-layer sanitization helpers.
// Import these into any Server Action or store function before a DB write.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts empty/null/whitespace strings to null for PostgreSQL DATE / TIMESTAMPTZ columns.
 * Postgres rejects "" for date columns — must be null or a valid ISO string.
 *
 * @example sanitizeDate("") → null
 * @example sanitizeDate("2024-01-15") → "2024-01-15"
 */
export function sanitizeDate(val: string | null | undefined): string | null {
    if (!val) return null;
    const t = String(val).trim();
    return t && t !== "null" && t !== "undefined" ? t : null;
}

/**
 * Sanitizes a REQUIRED string field.
 * Trims whitespace. Never returns null. Accepts an optional maxLength cap.
 *
 * @example sanitizeStr(undefined) → ""
 * @example sanitizeStr("  Carlos  ", 20) → "Carlos"
 */
export function sanitizeStr(val: string | null | undefined, maxLength?: number): string {
    const s = String(val ?? "").trim();
    return maxLength ? s.slice(0, maxLength) : s;
}

/**
 * Sanitizes an OPTIONAL string field.
 * Converts empty strings / whitespace-only strings to null (for nullable VARCHAR columns).
 *
 * @example sanitizeOptStr("") → null
 * @example sanitizeOptStr("Finance Lead") → "Finance Lead"
 */
export function sanitizeOptStr(val: string | null | undefined, maxLength?: number): string | null {
    if (val === undefined || val === null) return null;
    const t = String(val).trim();
    if (!t) return null;
    return maxLength ? t.slice(0, maxLength) : t;
}

/**
 * Sanitizes a numeric field. Returns the number, or a safe fallback if invalid/empty.
 *
 * @example sanitizeNum("abc") → 0
 * @example sanitizeNum(1_300_000) → 1300000
 */
export function sanitizeNum(val: number | string | null | undefined, fallback = 0): number {
    const n = Number(val);
    return isNaN(n) ? fallback : n;
}

/**
 * Sanitizes a percentage value. Clamps result to [0, 100].
 * Used for commission_pct, override_pct, and dedication_pct fields.
 *
 * @example sanitizePercent(120) → 100
 * @example sanitizePercent(-5) → 0
 * @example sanitizePercent("35.5") → 35.5
 */
export function sanitizePercent(val: number | string | null | undefined): number {
    const n = Number(val);
    if (isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
}

/**
 * Sanitizes a currency / financial amount.
 * Removes common formatting ($ , . symbols), returns a number rounded to 2 decimal places.
 * Falls back to 0 for invalid inputs.
 *
 * @example sanitizeCurrency("$1,300,000.50") → 1300000.50
 * @example sanitizeCurrency("abc") → 0
 */
export function sanitizeCurrency(val: number | string | null | undefined): number {
    if (val === null || val === undefined || val === "") return 0;
    const cleaned = String(val).replace(/[$,\s]/g, ""); // remove currency formatting
    const n = parseFloat(cleaned);
    if (isNaN(n)) return 0;
    return Math.round(n * 100) / 100; // 2 decimal precision
}

/**
 * Safely parses a JSONB field.
 * If the value is already an object/array, returns it as-is.
 * If it is a string, tries JSON.parse and returns null on failure.
 * Prevents malformed JSON from reaching Supabase JSONB columns.
 *
 * @example sanitizeJson('{"key":"value"}') → { key: "value" }
 * @example sanitizeJson("{bad json") → null
 * @example sanitizeJson(null) → null
 */
export function sanitizeJson<T = unknown>(val: string | T | null | undefined): T | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "string") {
        if (!val.trim()) return null;
        try {
            return JSON.parse(val) as T;
        } catch {
            console.warn("[sanitizeJson] Malformed JSON rejected:", val.slice(0, 80));
            return null;
        }
    }
    // Already an object / array — validate it can survive serialization
    try {
        JSON.stringify(val); // throws if circular
        return val as T;
    } catch {
        return null;
    }
}

/**
 * Sanitizes an integer field. Parses to int, returns fallback on failure.
 *
 * @example sanitizeInt("42") → 42
 * @example sanitizeInt("abc") → 0
 */
export function sanitizeInt(val: number | string | null | undefined, fallback = 0): number {
    const n = parseInt(String(val ?? ""), 10);
    return isNaN(n) ? fallback : n;
}
