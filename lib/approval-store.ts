import { supabase } from "./database";

export interface EmployeeApproverMap {
    eid: string;
    tenant_id: string;
    approver1Id: string;
    approver2Id: string;
    approver3Id: string;
}

export const getApproverMap = async (tenantId: string): Promise<EmployeeApproverMap[]> => {
    if (!tenantId) return [];

    const { data, error } = await supabase
        .from('employee_approvers')
        .select('*')
        .eq('tenant_id', tenantId);

    if (error) {
        console.error("Error fetching approver map", error.message);
        return [];
    }
    return data || [];
};

export const saveApproverMap = async (tenantId: string, map: EmployeeApproverMap[]) => {
    if (!tenantId || map.length === 0) return;

    // Ensure tenant_id is explicitly set
    const rows = map.map(m => ({ ...m, tenant_id: tenantId }));

    const { error } = await supabase
        .from('employee_approvers')
        .upsert(rows);

    if (error) {
        throw new Error(`Error saving approver map: ${error.message}`);
    }
};
