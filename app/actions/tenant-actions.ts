"use server";

import { createClient } from "@supabase/supabase-js";
import { Tenant } from "@/lib/tenant-types";

// ─── Supabase Client (Server-side) ───────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
    }
    if (!supabaseKey || supabaseKey.includes("placeholder")) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
    }
    return createClient(supabaseUrl, supabaseKey);
}

// ─── DB Mapping ────────────────────────────────────────────────────────────────

/**
 * Maps the Tenant TypeScript type to the dim_tenant Postgres columns.
 * dim_tenant columns: tcode, legal_name, dba_name, reporting_currency,
 *                     status, hq_address (JSONB), pocs (JSONB),
 *                     account_managers (JSONB), created_at, updated_at
 */
const mapTenantToDb = (tenant: Tenant) => ({
    tcode: tenant.tenant_id.trim().slice(0, 15),
    legal_name: (tenant.legal_name ?? "").slice(0, 255),
    dba_name: tenant.dba_name.trim().slice(0, 255),
    reporting_currency: tenant.reporting_currency,
    status: tenant.status ?? true,
    hq_address: tenant.hq_address ?? {},
    pocs: tenant.pocs ?? [],
    account_managers: tenant.account_managers ?? [],
    created_at: tenant.created_at,
});

// ─── TCODE Generation ─────────────────────────────────────────────────────────

export async function generateTCODEAction(): Promise<string> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_tenant")
            .select("tcode")
            .order("tcode", { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return "TNT-001";

        const last = data[0].tcode as string;
        const parts = last.split("-");
        const num = parseInt(parts[1] ?? "0", 10);
        if (isNaN(num)) return "TNT-001";
        return `TNT-${String(num + 1).padStart(3, "0")}`;
    } catch {
        return "TNT-001";
    }
}

// ─── Add Tenant ───────────────────────────────────────────────────────────────

export async function addTenantAction(
    tenant: Tenant
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getSupabase();
        const payload = mapTenantToDb(tenant);

        const { error } = await supabase
            .from("dim_tenant")
            .insert([payload]);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("[Tenant Action] addTenant error:", err);
        return { success: false, error: err.message ?? "Unknown error" };
    }
}

// ─── Eligible Employees (for POC + AM pickers) ──────────────────────────────

/**
 * Returns ALL active employees across all tenants in the system.
 * Used by the Tenant Setup Form to populate the POC and Account Manager
 * pickers. The admin has global visibility — no tenant_id filter applied.
 */
export interface EligibleEmployee {
    eid: string;
    tenant_id: string;
    primer_nombre: string;
    primer_apellido: string;
    email_corporativo: string | null;
    job_title: string | null;
    area: string;
}

export async function getActiveHomesiEmployeesAction(): Promise<EligibleEmployee[]> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_employee")
            .select("eid, tenant_id, primer_nombre, primer_apellido, email_corporativo, job_title, area")
            .eq("status", "Active")          // Only active employees
            .order("primer_apellido", { ascending: true });

        if (error) throw error;
        return (data ?? []) as EligibleEmployee[];
    } catch (err: any) {
        console.error("[Tenant Action] getActiveEmployees error:", err);
        return [];
    }
}
