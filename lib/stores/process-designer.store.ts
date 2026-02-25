import { SavedProcess, ProcessKpis, TaskValue, TaskFrequency, FREQUENCY_DAILY_FACTOR } from "@/types/process-designer.types";
import { supabase } from "@/lib/database";

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getSavedProcesses(tenantCode: string): Promise<SavedProcess[]> {
    if (!tenantCode) return [];

    const { data, error } = await supabase
        .from('hopsi_process_designs')
        .select('*')
        .eq('tenant_id', tenantCode);

    if (error) {
        console.error('Error fetching processes:', error.message);
        return [];
    }
    return data || [];
}

export async function saveProcess(process: SavedProcess, tenantCode: string): Promise<SavedProcess> {
    if (!tenantCode) throw new Error("Tenant code is required.");

    const updated: SavedProcess = {
        ...process,
        updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('hopsi_process_designs')
        .upsert({ ...updated, tenant_id: tenantCode });

    if (error) {
        throw new Error(`Error saving process: ${error.message}`);
    }
    return updated;
}

export async function deleteProcess(id: string, tenantCode: string): Promise<void> {
    if (!tenantCode) throw new Error("Tenant code is required.");

    const { error } = await supabase
        .from('hopsi_process_designs')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantCode);

    if (error) {
        throw new Error(`Error deleting process: ${error.message}`);
    }
}

export async function approveProcess(id: string, tenantCode: string): Promise<void> {
    if (!tenantCode) throw new Error("Tenant code is required.");

    const { error } = await supabase
        .from('hopsi_process_designs')
        .update({ status: "Approved", updatedAt: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantCode);

    if (error) {
        throw new Error(`Error approving process: ${error.message}`);
    }
}

// ── ID generator ─────────────────────────────────────────────────────────────

export function generateId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── KPI calculator ────────────────────────────────────────────────────────────

export function computeKpis(processes: SavedProcess[]): ProcessKpis {
    const rows = processes.flatMap((p) => p.rows || []);

    const totalTasks = rows.length;

    const totalFteMinDay = rows.reduce((acc, r) => {
        const factor = FREQUENCY_DAILY_FACTOR[r.frequency] ?? 0;
        return acc + r.pt * factor;
    }, 0);

    const valueMap: Record<TaskValue, number> = {
        "Value-Added": 0,
        "Necessary": 0,
        "Wait": 0,
        "Waste": 0,
    };
    rows.forEach((r) => {
        if (r.value && valueMap[r.value] !== undefined) valueMap[r.value]++;
    });

    const valueAddedPct = totalTasks > 0 ? (valueMap["Value-Added"] / totalTasks) * 100 : 0;
    const wastePct = totalTasks > 0 ? ((valueMap["Wait"] + valueMap["Waste"]) / totalTasks) * 100 : 0;

    const ownerMap: Record<string, number> = {};
    rows.forEach((r) => {
        const key = r.owner || "Unassigned";
        const factor = FREQUENCY_DAILY_FACTOR[r.frequency] ?? 0;
        ownerMap[key] = (ownerMap[key] ?? 0) + r.pt * factor;
    });
    const workloadByOwner = Object.entries(ownerMap)
        .map(([owner, minDay]) => ({ owner, minDay: Math.round(minDay * 10) / 10 }))
        .sort((a, b) => b.minDay - a.minDay);

    const tasksByValue = (Object.entries(valueMap) as [TaskValue, number][]).map(([value, count]) => ({
        value,
        count,
    }));

    const freqMap: Partial<Record<TaskFrequency, number>> = {};
    rows.forEach((r) => {
        if (r.frequency) freqMap[r.frequency] = (freqMap[r.frequency] ?? 0) + 1;
    });
    const tasksByFrequency = (Object.entries(freqMap) as [TaskFrequency, number][]).map(([freq, count]) => ({
        freq,
        count,
    }));

    return {
        totalTasks,
        totalFteMinDay: Math.round(totalFteMinDay * 10) / 10,
        valueAddedPct: Math.round(valueAddedPct * 10) / 10,
        wastePct: Math.round(wastePct * 10) / 10,
        workloadByOwner,
        tasksByValue,
        tasksByFrequency,
    };
}
