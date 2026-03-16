import { RewardScheme, SalesStrategy, SalesHCAssignment, ApprovalRequisition, ApprovalStatus, Playbook, SellerActivityLog } from "./growthify-types";
import { supabase } from "./database";
import {
    sanitizeStr, sanitizeOptStr, sanitizeNum,
    sanitizePercent, sanitizeCurrency, sanitizeJson
} from "./utils/sanitizers";

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
 * Throws if the combination is invalid—preventing orphan FK inserts.
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
// NOTE: growthify_strategies table not in Phase 1 schema.
// All write operations remain mocked. Read operations return [] safely.

export async function getSalesStrategies(tenantCode: string): Promise<SalesStrategy[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function saveSalesStrategy(
    strategy: Partial<SalesStrategy> & { tenant_id: string; name: string; purpose: string }
): Promise<SalesStrategy> {
    if (!strategy.tenant_id?.trim()) throw new Error("tenant_id is required.");

    const newStrategy = {
        ...strategy,
        id: strategy.id || generateUUID(),
        tenant_id: sanitizeStr(strategy.tenant_id, 50),
        name: sanitizeStr(strategy.name, 255),
        purpose: sanitizeOptStr(strategy.purpose, 2000),
        isActive: strategy.isActive ?? false,
        created_at: sanitizeStr(strategy.created_at) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    return newStrategy as unknown as SalesStrategy;
}

export async function toggleStrategyStatus(id: string): Promise<boolean> {
    throw new Error("target specific DB operation via Server Action instead of generalized toggle.");
}

export async function deleteSalesStrategy(id: string): Promise<boolean> {
    if (!id?.trim()) throw new Error("id is required to delete a sales strategy.");
    return true;
}

// ─── Reward Schemes ───────────────────────────────────────────────────────────

export async function getRewardSchemes(tenantCode: string): Promise<RewardScheme[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function getRewardSchemesForStrategy(strategyId: string): Promise<RewardScheme[]> {
    if (!strategyId?.trim()) return [];
    return [];
}

export async function saveRewardScheme(
    scheme: Partial<RewardScheme> & { tenant_id: string; strategy_id: string }
): Promise<RewardScheme> {
    const id = scheme.id || generateUUID();

    // ── Sanitize all financial fields before insert ──
    const updated = {
        id,
        tenant_id: sanitizeStr(scheme.tenant_id, 50),
        strategy_id: sanitizeStr(scheme.strategy_id, 255),
        name: sanitizeStr(scheme.name || "Default Scheme", 255),
        // Financial percentages — clamped 0–100
        override_closed_loan_pct: sanitizePercent(scheme.override_closed_loan_pct),
        recruitment_override_pct: sanitizePercent(scheme.recruitment_override_pct),
        // Units — non-negative integers
        units_won_tier: Math.max(0, sanitizeNum(scheme.units_won_tier)),
        // Currency — 2 decimal precision
        fixed_bonus: sanitizeCurrency(scheme.fixed_bonus),
        // Approver fields — optional strings
        approver1_name: sanitizeStr(scheme.approver1_name || "Approver 1", 255),
        approver1_role: sanitizeOptStr(scheme.approver1_role, 100) ?? "Finance",
        approver1_status: "Pending",
        approver2_name: sanitizeStr(scheme.approver2_name || "Approver 2", 255),
        approver2_role: sanitizeOptStr(scheme.approver2_role, 100) ?? "Legal",
        approver2_status: "Pending",
        isActive: false,
        // JSONB — sanitize to catch malformed payloads
        drivers: sanitizeJson(scheme.drivers) ?? [],
        created_at: sanitizeStr(scheme.created_at) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    return updated as unknown as RewardScheme;
}

export async function evaluateRewardScheme(id: string, approverNumber: 1 | 2, status: ApprovalStatus): Promise<boolean> {
    throw new Error("Target specific DB operation via Server Action instead of generalized evaluate.");
}

export async function deleteRewardScheme(id: string): Promise<boolean> {
    if (!id?.trim()) throw new Error("id is required to delete a reward scheme.");
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
        // Sanitize optional notes / description fields
        notes: sanitizeOptStr((req as any).notes, 1000),
        created_at: new Date().toISOString(),
    };

    return true;
}

export async function resolveRequisitionsForTarget(targetId: string): Promise<boolean> {
    throw new Error("Implement in Server Action");
}

// ─── Sales HC Assignments ─────────────────────────────────────────────────────

export async function getSalesAssigments(tenantCode: string): Promise<SalesHCAssignment[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function saveSalesAssignment(
    assignment: Omit<SalesHCAssignment, "id" | "created_at" | "isApproved" | "approver1_status" | "approver2_status"> & { isApproved?: boolean }
): Promise<{ success: boolean; message?: string }> {
    if (!assignment.employee_id?.trim()) return { success: false, message: "employee_id is required." };
    if (!assignment.tenant_id?.trim()) return { success: false, message: "tenant_id is required." };

    if (assignment.strategies.length > 3) {
        return { success: false, message: "Un empleado no puede estar en más de 3 estrategias." };
    }

    // ── Referential integrity guard ──────────────────────────────────────────
    await assertEmployeeBelongsToTenant(assignment.employee_id, assignment.tenant_id);

    const row = {
        ...assignment,
        employee_id: sanitizeStr(assignment.employee_id, 100),
        tenant_id: sanitizeStr(assignment.tenant_id, 50),
        // JSONB — safe parse for the strategies array
        strategies: sanitizeJson(assignment.strategies) ?? [],
        id: generateUUID(),
        isApproved: false,
        approver1_status: "Pending",
        approver2_status: "Pending",
    };

    return { success: true };
}

export async function evaluateSalesAssignment(employeeId: string, approverNumber: 1 | 2, status: ApprovalStatus): Promise<boolean> {
    throw new Error("Implement in Server Action");
}

// ─── Playbooks ────────────────────────────────────────────────────────────────

export async function getPlaybooks(tenantCode: string): Promise<Playbook[]> {
    if (!tenantCode?.trim()) return [];
    // The growthify_playbooks table was migrated to dim_playbook. 
    // Returning empty array for legacy components to prevent crashes.
    return [];
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
        // Text fields with length caps
        name: sanitizeStr(playbook.name, 255),
        description: sanitizeOptStr((playbook as any).description, 2000),
        category: sanitizeStr(playbook.category, 50),
        tenant_id: sanitizeStr(playbook.tenant_id, 50),
        strategy_id: sanitizeStr(playbook.strategy_id, 255),
        // JSONB fields — critical: nodes and edges must be valid JSON objects
        nodes: sanitizeJson((playbook as any).nodes) ?? [],
        edges: sanitizeJson((playbook as any).edges) ?? [],
        created_at: sanitizeStr(playbook.created_at) || new Date().toISOString(),
    };

    return updated as unknown as Playbook;
}

export async function deletePlaybook(id: string): Promise<boolean> {
    if (!id?.trim()) throw new Error("id is required to delete a playbook.");
    return true;
}

// ─── Seller Activity Logger ────────────────────────────────────────────────────

export async function getSellerActivities(tenantCode: string, employeeId: string): Promise<SellerActivityLog[]> {
    if (!tenantCode?.trim()) return [];
    return [];
}

export async function logSellerActivity(log: Omit<SellerActivityLog, "id" | "created_at">): Promise<SellerActivityLog> {
    if (!log.employee_id?.trim()) throw new Error("employee_id is required for activity log.");
    if (!log.tenant_id?.trim()) throw new Error("tenant_id is required for activity log.");

    const newLog = {
        ...log,
        employee_id: sanitizeStr(log.employee_id, 100),
        tenant_id: sanitizeStr(log.tenant_id, 50),
        // Optional notes / description
        notes: sanitizeOptStr((log as any).notes, 2000),
        // Financial activity value — enforce currency precision
        value: sanitizeCurrency((log as any).value),
        id: generateUUID(),
        created_at: new Date().toISOString(),
    };

    return newLog as unknown as SellerActivityLog;
}

export async function calculateCurrentPace(employeeId: string, playbookId: string, stepId: string, tenantCode: string) {
    throw new Error("Calculations should be performed by Server Actions strictly against the DB.");
}

export async function calculateProjectedRewards(tenantCode: string, employeeId: string, schemeId: string, currentMonthVolumeTotal = 0) {
    throw new Error("Calculations should be performed by Server Actions strictly against the DB.");
}
