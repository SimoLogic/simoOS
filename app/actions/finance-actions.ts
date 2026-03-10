"use server";

import { z } from "zod";
import { getFxRatesService, saveFxRateService, getActiveFxRateService } from "@/lib/services/finance.service";
import { FxRate } from "@/lib/finance-types";

// Schema for input validation mathematically linked to DB schema types (Triple Shield)
const FxRateSchema = z.object({
    id: z.string().optional(),
    tenant_id: z.string().min(1, "Tenant ID is required"),
    effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    exchange_rate: z.number().positive("Exchange rate must be a positive number"),
    currency_from: z.string().min(3).max(3).optional(),
    currency_to: z.string().min(3).max(3).optional(),
});

/** Get all fx rates timeline for a tenant */
export async function getFxRatesAction(tenantId: string): Promise<FxRate[]> {
    if (!tenantId?.trim()) return [];
    try {
        return await getFxRatesService(tenantId);
    } catch (err: any) {
        console.error("[Finance Action] getFxRates error:", err.message);
        return [];
    }
}

/** Upsert an fx rate */
export async function saveFxRateAction(
    rate: Omit<FxRate, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validation (Shield 2)
        const validatedData = FxRateSchema.parse({
            id: rate.id,
            tenant_id: rate.tenant_id,
            effective_date: rate.effective_date,
            exchange_rate: rate.exchange_rate,
            currency_from: rate.currency_from,
            currency_to: rate.currency_to
        });

        await saveFxRateService({
            id: validatedData.id,
            tenant_id: validatedData.tenant_id,
            effective_date: validatedData.effective_date,
            exchange_rate: validatedData.exchange_rate,
            currency_from: validatedData.currency_from,
            currency_to: validatedData.currency_to
        });

        return { success: true };
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return { success: false, error: "Validation Error: " + err.errors.map(e => e.message).join(", ") };
        }
        console.error("[Finance Action] saveFxRate error:", err.message);
        return { success: false, error: err.message };
    }
}

/** Get the active FX rate for a given date (the closest one on or before the date) */
export async function getActiveFxRateAction(tenantId: string, date: string, from = "COP", to = "USD"): Promise<number | null> {
    if (!tenantId?.trim() || !date) return null;
    try {
        return await getActiveFxRateService(tenantId, date, from, to);
    } catch (err: any) {
        console.error("[Finance Action] getActiveFxRate error:", err.message);
        return null;
    }
}
