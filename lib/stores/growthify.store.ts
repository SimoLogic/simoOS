import { RewardScheme, SalesStrategy, SalesHCAssignment, ApprovalRequisition, ApprovalStatus, Playbook, SellerActivityLog } from "@/types/growthify.types";
import { supabase } from "@/lib/database";
import {
    sanitizeStr, sanitizeOptStr, sanitizeNum,
    sanitizePercent, sanitizeCurrency, sanitizeJson
} from "@/lib/utils/sanitizers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Referential integrity guard: verifies that employee_id exists and belongs
 * to the expected tenant before allowing an assignment insert.
 */
async function assertEmployeeBelongsToTenant(employeeId: string, tenantId: string): Promise<void> {
    if (!employeeId?.trim() || !tenantId?.trim()) {
        throw new Error("Guard: employee_id and tenant_id are both required for assignment.");
    }
    const { data, error } = await supabase
        .from('dim_employee')
        .select('eid, tenant_id')
        .eq('eid', employeeId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

    if (error) throw new Error(`Guard DB error: ${error.message}`);
    if (!data) {
        throw new Error(
            `Referential integrity violation: employee "${employeeId}" does not exist in tenant "${tenantId}". ` +
            `The assignment was blocked to prevent orphan records.`
        );
    }
}

// ─── Strategies ───────────────────────────────────────────────────────────────

export async function getSalesStrategies(tenantCode: string): Promise<SalesStrategy[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function saveSalesStrategy(
    strategy: Partial<SalesStrategy> & { tenant_id: string; name: string; purpose: string }
): Promise<SalesStrategy> {
    throw new Error("Cannot save strategy in Phase 1 database schema.");
}

export async function toggleStrategyStatus(id: string): Promise<boolean> {
    throw new Error("target specific DB operation via Server Action instead of generalized toggle.");
}

export async function deleteSalesStrategy(id: string): Promise<boolean> {
    throw new Error("Cannot delete strategy in Phase 1 database schema.");
}

// ─── Reward Schemes ───────────────────────────────────────────────────────────

export async function getRewardSchemes(tenantCode: string): Promise<RewardScheme[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function getRewardSchemesForStrategy(strategyId: string): Promise<RewardScheme[]> {
    return [];
}

export async function saveRewardScheme(
    scheme: Partial<RewardScheme> & { tenant_id: string; strategy_id: string }
): Promise<RewardScheme> {
    const id = scheme.id || generateUUID();

    const updated = {
        id,
        tenant_id: sanitizeStr(scheme.tenant_id, 50),
        strategy_id: sanitizeStr(scheme.strategy_id, 255),
        name: sanitizeStr(scheme.name || "Default Scheme", 255),
        override_closed_loan_pct: sanitizePercent(scheme.override_closed_loan_pct),
        recruitment_override_pct: sanitizePercent(scheme.recruitment_override_pct),
        units_won_tier: Math.max(0, sanitizeNum(scheme.units_won_tier)),
        fixed_bonus: sanitizeCurrency(scheme.fixed_bonus),
        approver1_name: sanitizeStr(scheme.approver1_name || "Approver 1", 255),
        approver1_role: sanitizeOptStr(scheme.approver1_role, 100) ?? "Finance",
        approver1_status: "Pending",
        approver2_name: sanitizeStr(scheme.approver2_name || "Approver 2", 255),
        approver2_role: sanitizeOptStr(scheme.approver2_role, 100) ?? "Legal",
        approver2_status: "Pending",
        isActive: false,
        drivers: sanitizeJson(scheme.drivers) ?? [],
        created_at: sanitizeStr(scheme.created_at) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('growthify_rewards').upsert(updated);
    if (error) throw new Error(`[Growthify] saveRewardScheme DB Error: ${error.message}`);

    return updated as unknown as RewardScheme;
}

export async function evaluateRewardScheme(id: string, approverNumber: 1 | 2, status: ApprovalStatus): Promise<boolean> {
    throw new Error("Target specific DB operation via Server Action instead of generalized evaluate.");
}

export async function deleteRewardScheme(id: string): Promise<boolean> {
    if (!id?.trim()) throw new Error("id is required to delete a reward scheme.");
    const { error } = await supabase.from('growthify_rewards').delete().eq('id', id);
    if (error) throw new Error(`[Growthify] deleteRewardScheme DB Error: ${error.message}`);
    return true;
}

// ─── Requisitions ─────────────────────────────────────────────────────────────

export async function getPendingRequisitions(tenantCode: string): Promise<ApprovalRequisition[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function createApprovalRequisition(
    req: Omit<ApprovalRequisition, "id" | "created_at" | "status">
): Promise<boolean> {
    if (!req.tenant_id?.trim()) throw new Error("tenant_id is required for requisition.");

    const newReq = {
        ...req,
        tenant_id: sanitizeStr(req.tenant_id, 50),
        id: generateUUID(),
        status: "Pending",
        notes: sanitizeOptStr((req as any).notes, 1000),
        created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('growthify_requisitions').insert([newReq]);
    if (error) throw new Error(`[Growthify] createApprovalRequisition DB Error: ${error.message}`);
    return true;
}

export async function resolveRequisitionsForTarget(targetId: string): Promise<boolean> {
    throw new Error("Implement in Server Action");
}

// ─── Sales HC Assignments ─────────────────────────────────────────────────────

export async function getSalesAssigments(tenantCode: string): Promise<SalesHCAssignment[]> {
    if (!tenantCode?.trim()) return [];
    const { data, error } = await supabase
        .from('growthify_assignments')
        .select('*')
        .eq('tenant_id', tenantCode);
    if (error) throw new Error(`[Growthify] getSalesAssignments DB Error: ${error.message}`);
    return data || [];
}

export async function saveSalesAssignment(
    assignment: Omit<SalesHCAssignment, "id" | "created_at" | "isApproved" | "approver1_status" | "approver2_status"> & { isApproved?: boolean }
): Promise<{ success: boolean; message?: string }> {
    if (!assignment.employee_id?.trim()) return { success: false, message: "employee_id is required." };
    if (!assignment.tenant_id?.trim()) return { success: false, message: "tenant_id is required." };

    if (assignment.strategies.length > 3) {
        return { success: false, message: "Un empleado no puede estar en más de 3 estrategias." };
    }

    await assertEmployeeBelongsToTenant(assignment.employee_id, assignment.tenant_id);

    const row = {
        ...assignment,
        employee_id: sanitizeStr(assignment.employee_id, 100),
        tenant_id: sanitizeStr(assignment.tenant_id, 50),
        strategies: sanitizeJson(assignment.strategies) ?? [],
        id: generateUUID(),
        isApproved: false,
        approver1_status: "Pending",
        approver2_status: "Pending",
    };

    const { error } = await supabase.from('growthify_assignments').upsert([row]);
    if (error) throw new Error(`[Growthify] saveSalesAssignment DB Error: ${error.message}`);
    return { success: true };
}

export async function evaluateSalesAssignment(employeeId: string, approverNumber: 1 | 2, status: ApprovalStatus): Promise<boolean> {
    throw new Error("Implement in Server Action");
}

// ─── Playbooks ────────────────────────────────────────────────────────────────

export async function getPlaybooks(tenantCode: string): Promise<Playbook[]> {
    if (!tenantCode?.trim()) return [];
    const { data, error } = await supabase
        .from('growthify_playbooks')
        .select('*')
        .eq('tenant_id', tenantCode);
    if (error) throw new Error(`[Growthify] getPlaybooks DB Error: ${error.message}`);
    return data || [];
}

export async function savePlaybook(
    playbook: Partial<Playbook> & { tenant_id: string; strategy_id: string; category: "commercial" | "supporting" | "special" }
): Promise<Playbook> {
    if (!playbook.tenant_id?.trim()) throw new Error("tenant_id is required for playbook.");
    if (!playbook.strategy_id?.trim()) throw new Error("strategy_id is required for playbook.");

    const id = playbook.id || `PB-${generateUUID()}`;

    const updated = {
        ...playbook,
        id,
        name: sanitizeStr(playbook.name, 255),
        description: sanitizeOptStr((playbook as any).description, 2000),
        category: sanitizeStr(playbook.category, 50),
        tenant_id: sanitizeStr(playbook.tenant_id, 50),
        strategy_id: sanitizeStr(playbook.strategy_id, 255),
        nodes: sanitizeJson((playbook as any).nodes) ?? [],
        edges: sanitizeJson((playbook as any).edges) ?? [],
        created_at: sanitizeStr(playbook.created_at) || new Date().toISOString(),
    };

    const { error } = await supabase.from('growthify_playbooks').upsert(updated);
    if (error) throw new Error(`[Growthify] savePlaybook DB Error: ${error.message}`);
    return updated as unknown as Playbook;
}

export async function deletePlaybook(id: string): Promise<boolean> {
    if (!id?.trim()) throw new Error("id is required to delete a playbook.");
    const { error } = await supabase.from('growthify_playbooks').delete().eq('id', id);
    if (error) throw new Error(`[Growthify] deletePlaybook DB Error: ${error.message}`);
    return true;
}

// ─── Seller Activity Logger ────────────────────────────────────────────────────

export async function getSellerActivities(tenantCode: string, employeeId: string): Promise<SellerActivityLog[]> {
    if (!tenantCode?.trim()) return [];
    const { data, error } = await supabase
        .from('growthify_seller_activity')
        .select('*')
        .eq('tenant_id', tenantCode)
        .eq('employee_id', employeeId);
    if (error) throw new Error(`[Growthify] getSellerActivities DB Error: ${error.message}`);
    return data || [];
}

export async function logSellerActivity(log: Omit<SellerActivityLog, "id" | "created_at">): Promise<SellerActivityLog> {
    if (!log.employee_id?.trim()) throw new Error("employee_id is required for activity log.");
    if (!log.tenant_id?.trim()) throw new Error("tenant_id is required for activity log.");

    const newLog = {
        ...log,
        employee_id: sanitizeStr(log.employee_id, 100),
        tenant_id: sanitizeStr(log.tenant_id, 50),
        notes: sanitizeOptStr((log as any).notes, 2000),
        value: sanitizeCurrency((log as any).value),
        id: generateUUID(),
        created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('growthify_seller_activity').insert([newLog]);
    if (error) throw new Error(`[Growthify] logSellerActivity DB Error: ${error.message}`);
    return newLog as unknown as SellerActivityLog;
}

export async function calculateCurrentPace(employeeId: string, playbookId: string, stepId: string, tenantCode: string) {
    throw new Error("Calculations should be performed by Server Actions strictly against the DB.");
}

export async function calculateProjectedRewards(tenantCode: string, employeeId: string, schemeId: string, currentMonthVolumeTotal = 0) {
    throw new Error("Calculations should be performed by Server Actions strictly against the DB.");
}
