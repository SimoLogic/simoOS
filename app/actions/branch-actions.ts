"use server";

import { createClient } from "@supabase/supabase-js";
import {
    Branch, BranchNode, BranchEmployee, BranchLeaseData,
    BRANCH_MANAGER_TITLES, validParentLevel
} from "@/lib/branch-types";
import { sanitizeStr, sanitizeOptStr, sanitizeCurrency } from "@/lib/utils/sanitizers";

// ─── Supabase Client ──────────────────────────────────────────────────────────

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || url.includes("placeholder")) throw new Error("DB config error: SUPABASE_URL missing.");
    if (!key || key.includes("placeholder")) throw new Error("DB config error: SUPABASE_ANON_KEY missing.");
    return createClient(url, key);
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/** Get all branches for a tenant, ordered: Divisions first, then Regions, then Branches */
export async function getBranchesAction(tenantId: string): Promise<Branch[]> {
    if (!tenantId?.trim()) return [];
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_branch")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("hierarchy_level", { ascending: true })
            .order("branch_code", { ascending: true });

        if (error) throw error;
        return (data || []) as Branch[];
    } catch (err: any) {
        console.error("[Branch] getBranches error:", err.message);
        return [];
    }
}

/** Get only active branches for dropdowns */
export async function getActiveBranchesAction(tenantId: string): Promise<Branch[]> {
    if (!tenantId?.trim()) return [];
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("dim_branch")
            .select("id, branch_code, branch_name, hierarchy_level, parent_branch_id, is_active")
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .order("hierarchy_level")
            .order("branch_code");

        if (error) throw error;
        return (data || []) as Branch[];
    } catch (err: any) {
        console.error("[Branch] getActiveBranches error:", err.message);
        return [];
    }
}

/** Build tree structure for Hierarchy Map */
export async function getBranchHierarchyAction(tenantId: string, showInactive = false): Promise<BranchNode[]> {
    if (!tenantId?.trim()) return [];
    const branches = await getBranchesAction(tenantId);
    const filtered = showInactive ? branches : branches.filter(b => b.is_active);

    // Also fetch employees grouped by branch_code
    const employees = await getBranchEmployeesAction(tenantId, showInactive);
    const empByBranch: Record<string, BranchEmployee[]> = {};
    employees.forEach(e => {
        if (!empByBranch[e.eid]) empByBranch[e.eid] = [];
    });

    // Group employees by branch_code from their HistorialLaboral
    const empMap: Record<string, BranchEmployee[]> = {};
    for (const emp of employees) {
        const bc = (emp as any).branch_code;
        if (!bc) continue;
        if (!empMap[bc]) empMap[bc] = [];
        empMap[bc].push(emp);
    }

    // Build node map
    const nodeMap: Record<string, BranchNode> = {};
    for (const b of filtered) {
        nodeMap[b.id] = {
            ...b,
            children: [],
            employees: empMap[b.branch_code] || [],
        };
    }

    // Wire children to parents
    const roots: BranchNode[] = [];
    for (const b of filtered) {
        const node = nodeMap[b.id];
        if (b.parent_branch_id && nodeMap[b.parent_branch_id]) {
            nodeMap[b.parent_branch_id].children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

/** Get employees eligible to appear in Hierarchy Map (have a branch_code set) */
export async function getBranchEmployeesAction(tenantId: string, includeInactive = false): Promise<BranchEmployee[]> {
    if (!tenantId?.trim()) return [];
    try {
        const supabase = getSupabase();
        let query = supabase
            .from("dim_employee")
            .select("eid, primer_nombre, primer_apellido, sub_area, branch, status")
            .eq("tenant_id", tenantId)
            .not("branch", "is", null);

        if (!includeInactive) {
            query = query.eq("status", "Active");
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((e: any) => ({
            eid: e.eid,
            full_name: `${e.primer_nombre} ${e.primer_apellido}`.trim(),
            position: e.sub_area || "—",
            status: e.status,
            branch_code: e.branch,
        }));
    } catch (err: any) {
        console.error("[Branch] getBranchEmployees error:", err.message);
        return [];
    }
}

/** Get employees eligible to be Branch Managers.
 *  Primary check: job_title field (linked to dim_job_title).
 *  Fallback: sub_area contains a manager-level title.
 */
export async function getBranchManagersAction(tenantId: string): Promise<{ eid: string; full_name: string; title: string }[]> {
    if (!tenantId?.trim()) return [];
    try {
        const supabase = getSupabase();
        // Query employees whose job_title OR sub_area matches a manager-level title.
        // We use OR filter: job_title is preferred (official), sub_area is legacy fallback.
        const { data, error } = await supabase
            .from("dim_employee")
            .select("eid, primer_nombre, primer_apellido, job_title, sub_area, status")
            .eq("tenant_id", tenantId)
            .eq("status", "Active")
            .or(`job_title.in.(${BRANCH_MANAGER_TITLES.map(t => `"${t}"`).join(",")}),sub_area.in.(${BRANCH_MANAGER_TITLES.map(t => `"${t}"`).join(",")})`);

        if (error) throw error;

        return (data || []).map((e: any) => ({
            eid: e.eid,
            full_name: `${e.primer_nombre} ${e.primer_apellido}`.trim(),
            title: e.job_title || e.sub_area || "",
        }));
    } catch (err: any) {
        console.error("[Branch] getBranchManagers error:", err.message);
        return [];
    }
}

// ─── CIRCULAR REFERENCE CHECK ─────────────────────────────────────────────────

/**
 * Checks if setting `proposedParentId` as parent of `branchId` would create a cycle.
 * Traverses upward from proposedParent — if we encounter branchId, it's circular.
 */
export async function checkCircularReferenceAction(
    branchId: string,
    proposedParentId: string
): Promise<{ circular: boolean }> {
    if (!branchId || !proposedParentId) return { circular: false };
    if (branchId === proposedParentId) return { circular: true };

    try {
        const supabase = getSupabase();
        let currentId: string | null = proposedParentId;
        const visited = new Set<string>();

        while (currentId) {
            if (currentId === branchId) return { circular: true };
            if (visited.has(currentId)) break; // already-visited safety
            visited.add(currentId);

            const { data } = await supabase
                .from("dim_branch")
                .select("parent_branch_id")
                .eq("id", currentId)
                .single() as { data: { parent_branch_id: string | null } | null, error: any };

            currentId = data?.parent_branch_id ?? null;
        }

        return { circular: false };
    } catch {
        return { circular: false };
    }
}

// ─── WRITE ────────────────────────────────────────────────────────────────────

/** Upsert a branch record. Sanitizes all fields. */
export async function saveBranchAction(
    branch: Partial<Branch> & { tenant_id: string; branch_code: string }
): Promise<{ success: boolean; data?: Branch; error?: string }> {
    if (!branch.branch_code?.trim()) return { success: false, error: "branch_code is required." };
    if (!branch.tenant_id?.trim()) return { success: false, error: "tenant_id is required." };

    // Validate hierarchy constraints
    if (branch.hierarchy_level === "Division" && branch.parent_branch_id) {
        return { success: false, error: "A Division cannot have a parent." };
    }

    // Circular reference check
    if (branch.id && branch.parent_branch_id) {
        const { circular } = await checkCircularReferenceAction(branch.id, branch.parent_branch_id);
        if (circular) return { success: false, error: "Circular reference detected. This parent assignment would create a loop." };
    }

    const supabase = getSupabase();

    const row: Record<string, any> = {
        tenant_id: sanitizeStr(branch.tenant_id, 20),
        branch_code: sanitizeStr(branch.branch_code, 20).toUpperCase(),
        branch_name: sanitizeOptStr(branch.branch_name, 255),
        branch_manager_eid: sanitizeOptStr(branch.branch_manager_eid, 20),
        states_licensed: Array.isArray(branch.states_licensed) ? branch.states_licensed : [],
        field_office_type: branch.field_office_type ?? "Physical",
        office_address: sanitizeOptStr(branch.office_address),
        has_lease: branch.has_lease ?? false,
        lease_data: branch.has_lease && branch.lease_data
            ? sanitizeLeaseData(branch.lease_data)
            : null,
        hierarchy_level: branch.hierarchy_level ?? "Branch",
        parent_branch_id: branch.parent_branch_id ?? null,
        is_active: branch.is_active ?? true,
        updated_at: new Date().toISOString(),
    };

    if (branch.id) row.id = branch.id;

    const { data, error } = await supabase
        .from("dim_branch")
        .upsert(row, { onConflict: "tenant_id,branch_code" })
        .select()
        .single();

    if (error) return { success: false, error: `Save error: ${error.message}` };
    return { success: true, data: data as Branch };
}

/** Soft-toggle a branch's active status. Branches are never deleted. */
export async function toggleBranchStatusAction(
    id: string,
    is_active: boolean
): Promise<{ success: boolean }> {
    if (!id?.trim()) return { success: false };
    const supabase = getSupabase();
    const { error } = await supabase
        .from("dim_branch")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw new Error(`Toggle error: ${error.message}`);
    return { success: true };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function sanitizeLeaseData(data: BranchLeaseData): BranchLeaseData {
    return {
        landlord_name: sanitizeStr(data.landlord_name, 255),
        sub_lease: Boolean(data.sub_lease),
        monthly_rent: sanitizeCurrency(data.monthly_rent),
        currency: sanitizeStr(data.currency, 5) || "USD",
        renewal: data.renewal,
        utilities_included: Boolean(data.utilities_included),
    };
}
