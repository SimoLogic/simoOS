import { Playbook, BPWorkflowEntry } from "@/types/bp.types";
import { supabase } from "@/lib/database";

// ─── Store Logic ─────────────────────────────────────────────────────────────

export const getPlaybooks = async (): Promise<Playbook[]> => {
    const { data, error } = await supabase
        .from('dim_playbooks')
        .select('*');

    if (error) {
        console.error('Error fetching playbooks from DB:', error.message);
        return [];
    }
    return data || [];
};

export const getBPWorkflowEntries = async (tenantCode: string): Promise<BPWorkflowEntry[]> => {
    if (!tenantCode) return [];

    const { data, error } = await supabase
        .from('bp_workflow')
        .select('*')
        .eq('tenant_id', tenantCode);

    if (error) {
        console.warn('BP workflow table not available, using empty state:', error.message);
        return [];
    }
    return data || [];
};

export const saveBPWorkflowEntry = async (entry: BPWorkflowEntry, tenantCode: string) => {
    if (!tenantCode) throw new Error("Tenant code is required.");

    const { error } = await supabase
        .from('bp_workflow')
        .upsert({
            ...entry,
            tenant_id: tenantCode,
            updated_at: new Date().toISOString()
        }, { onConflict: 'eid,tenant_id' });

    if (error) {
        throw new Error(`Error saving BP workflow entry: ${error.message}`);
    }
};

export const deleteBPWorkflowEntry = async (eid: string, tenantCode: string) => {
    if (!tenantCode) throw new Error("Tenant code is required.");

    const { error } = await supabase
        .from('bp_workflow')
        .delete()
        .eq('eid', eid)
        .eq('tenant_id', tenantCode);

    if (error) {
        throw new Error(`Error deleting BP workflow entry: ${error.message}`);
    }
};
