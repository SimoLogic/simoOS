import { createClient } from "@supabase/supabase-js";
import { FxRate } from "@/lib/finance-types";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || url.includes("placeholder")) throw new Error("DB config error: SUPABASE_URL missing.");
    if (!key || key.includes("placeholder")) throw new Error("DB config error: SUPABASE_ANON_KEY missing.");
    return createClient(url, key);
}

export async function getFxRatesService(tenantId: string): Promise<FxRate[]> {
    if (!tenantId?.trim()) return [];
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_fx_rates")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("effective_date", { ascending: false });

        if (error) throw error;
        return (data || []) as FxRate[];
    } catch (err: any) {
        console.error("[Finance Service] getFxRates error:", err.message);
        throw new Error(err.message);
    }
}

export async function saveFxRateService(
    rate: Omit<FxRate, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<void> {
    if (!rate.tenant_id || !rate.effective_date || !rate.exchange_rate) {
        throw new Error("Missing required fields for FX Rate");
    }
    try {
        const supabase = getSupabase();
        const row: any = {
            tenant_id: rate.tenant_id,
            effective_date: rate.effective_date,
            exchange_rate: rate.exchange_rate,
            currency_from: rate.currency_from || "COP",
            currency_to: rate.currency_to || "USD",
            updated_at: new Date().toISOString()
        };
        if (rate.id) {
            row.id = rate.id;
        }

        const { error } = await supabase
            .from("dim_fx_rates")
            .upsert(row, { onConflict: "tenant_id,effective_date,currency_from,currency_to" });

        if (error) throw error;
    } catch (err: any) {
        console.error("[Finance Service] saveFxRate error:", err.message);
        throw new Error(err.message);
    }
}

export async function getActiveFxRateService(tenantId: string, date: string, from = "COP", to = "USD"): Promise<number | null> {
    if (!tenantId?.trim() || !date) return null;
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_fx_rates")
            .select("exchange_rate")
            .eq("tenant_id", tenantId)
            .eq("currency_from", from)
            .eq("currency_to", to)
            .lte("effective_date", date)
            .order("effective_date", { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== "PGRST116") throw error; // PGRST116 is 0 rows returned
        return data ? data.exchange_rate : null;
    } catch (err: any) {
        console.error("[Finance Service] getActiveFxRate error:", err.message);
        return null;
    }
}
