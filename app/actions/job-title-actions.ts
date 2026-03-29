"use server";

import { supabase } from "@/lib/database";
import { sanitizeStr, sanitizeOptStr } from "@/lib/utils/sanitizers";
import {
    type JobTitle, type JobTitleRef, type ApprovalDecision, type JobDescriptionData,
    type RoleTitle, type RoleTitleRef, parseJdfData
} from "@/lib/job-title-types";

// ─── Helper: map raw DB row → RoleTitleRef ────────────────────────────────────

const mapRoleTitleRef = (r: any): RoleTitleRef => ({
    id: r.id,
    role_title: r.role_title,
    job_title_id: r.job_title_id,
    describe_role: r.describe_role ?? "",
});

// ─── Helper: map raw DB row → JobTitle ────────────────────────────────────────

const mapRow = (row: any): JobTitle => ({
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    area: row.area ?? "",
    sub_area: row.sub_area ?? "",
    cost_center: row.cost_center ?? "",
    sub_cost_center: row.sub_cost_center ?? "",
    direct_supervisor: row.direct_supervisor ?? "",
    status: row.status,
    requester_id: row.requester_id ?? "",
    approver1_id: row.approver1_id ?? "",
    approver1_status: row.approver1_status,
    approver2_id: row.approver2_id ?? "",
    approver2_status: row.approver2_status,
    jdf_data: parseJdfData(row.jdf_data),
    role_titles: Array.isArray(row.dim_role_title)
        ? row.dim_role_title.filter((rt: any) => rt.status === "Active").map(mapRoleTitleRef)
        : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
});

// ─── READ: Get Active Job Titles (for dropdowns) — includes Role Titles ───────

export async function getActiveJobTitlesAction(tenant_id: string): Promise<JobTitleRef[]> {
    if (!tenant_id) return [];
    const { data, error } = await supabase
        .from("dim_job_title")
        .select("id, title, area, status, dim_role_title(id, role_title, job_title_id, describe_role, status)")
        .eq("tenant_id", tenant_id)
        .eq("status", "Active")
        .order("title", { ascending: true });

    if (error) {
        console.error("[job-title-actions] getActiveJobTitlesAction:", error.message);
        return [];
    }
    return (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        area: r.area ?? "",
        status: r.status,
        role_titles: Array.isArray(r.dim_role_title)
            ? (r.dim_role_title as any[])
                .filter((rt) => rt.status === "Active")
                .map(mapRoleTitleRef)
            : [],
    }));
}

// ─── READ: Get All Job Titles (admin panel) ───────────────────────────────────

export async function getAllJobTitlesAction(tenant_id: string): Promise<JobTitle[]> {
    if (!tenant_id) return [];
    const { data, error } = await supabase
        .from("dim_job_title")
        .select("*, dim_role_title(id, role_title, job_title_id, describe_role, status)")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[job-title-actions] getAllJobTitlesAction:", error.message);
        return [];
    }
    return (data ?? []).map(mapRow);
}

// ─── READ: Get Role Titles for a specific Job Title ───────────────────────────

export async function getRoleTitlesForJobTitleAction(
    tenant_id: string,
    job_title_id: string
): Promise<RoleTitleRef[]> {
    if (!tenant_id || !job_title_id) return [];
    const { data, error } = await supabase
        .from("dim_role_title")
        .select("id, role_title, job_title_id, describe_role")
        .eq("tenant_id", tenant_id)
        .eq("job_title_id", job_title_id)
        .eq("status", "Active")
        .order("role_title", { ascending: true });

    if (error) {
        console.error("[job-title-actions] getRoleTitlesForJobTitleAction:", error.message);
        return [];
    }
    return (data ?? []).map(mapRoleTitleRef);
}

// ─── WRITE: Save / Upsert Role Title ─────────────────────────────────────────

export interface SaveRoleTitlePayload {
    id?: string;
    tenant_id: string;
    job_title_id: string;
    role_title: string;
    describe_role?: string;
}

export async function saveRoleTitleAction(
    payload: SaveRoleTitlePayload
): Promise<{ success: boolean; message?: string; id?: string }> {
    try {
        const dbPayload = {
            tenant_id: payload.tenant_id,
            job_title_id: payload.job_title_id,
            role_title: sanitizeStr(payload.role_title, 60),
            describe_role: sanitizeOptStr(payload.describe_role ?? "", 500),
            status: "Active" as const,
        };

        let result;
        if (payload.id) {
            result = await supabase
                .from("dim_role_title")
                .update(dbPayload)
                .eq("id", payload.id)
                .eq("tenant_id", payload.tenant_id)
                .select("id")
                .single();
        } else {
            result = await supabase
                .from("dim_role_title")
                .insert([dbPayload])
                .select("id")
                .single();
        }

        if (result.error) {
            if (result.error.code === "23505") {
                return { success: false, message: `Role Title "${payload.role_title}" already exists for this Job Title.` };
            }
            throw result.error;
        }
        return { success: true, id: result.data?.id };
    } catch (err: any) {
        console.error("[job-title-actions] saveRoleTitleAction:", err.message);
        return { success: false, message: err.message ?? "Unexpected error saving Role Title." };
    }
}

// ─── WRITE: Toggle Role Title Status (Activate / Deactivate) ─────────────────

export async function toggleRoleTitleStatusAction(
    id: string,
    currentStatus: "Active" | "Inactive"
): Promise<{ success: boolean; message?: string }> {
    try {
        const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
        const { error } = await supabase
            .from("dim_role_title")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("[job-title-actions] toggleRoleTitleStatusAction:", err.message);
        return { success: false, message: err.message };
    }
}

// ─── WRITE: Save / Upsert Job Title ──────────────────────────────────────────

export interface SaveJobTitlePayload {
    id?: string;
    tenant_id: string;
    title: string;
    area: string;
    sub_area: string;
    cost_center: string;
    sub_cost_center: string;
    direct_supervisor: string;
    requester_id: string;
    approver1_id: string;
    approver2_id: string;
    jdf_data: JobDescriptionData;
    /** Inline Role Titles to upsert alongside the Job Title */
    role_titles?: Array<{ id?: string; role_title: string; describe_role: string }>;
    submitForApproval?: boolean;
}

export async function saveJobTitleAction(
    payload: SaveJobTitlePayload
): Promise<{ success: boolean; message?: string; id?: string }> {
    try {
        const dbPayload: any = {
            tenant_id: payload.tenant_id,
            title: sanitizeStr(payload.title, 255),
            area: sanitizeOptStr(payload.area, 100),
            sub_area: sanitizeOptStr(payload.sub_area, 100),
            cost_center: sanitizeOptStr(payload.cost_center, 20),
            sub_cost_center: sanitizeOptStr(payload.sub_cost_center, 20),
            direct_supervisor: sanitizeOptStr(payload.direct_supervisor, 255),
            requester_id: sanitizeOptStr(payload.requester_id, 15),
            approver1_id: sanitizeOptStr(payload.approver1_id, 15),
            approver2_id: sanitizeOptStr(payload.approver2_id, 15),
            jdf_data: payload.jdf_data,
            status: "Draft",
            approver1_status: "Pending",
            approver2_status: "Pending",
        };

        // Anti-self-approval guard
        if (payload.requester_id && payload.approver1_id && payload.requester_id === payload.approver1_id) {
            return { success: false, message: "Approver 1 cannot be the same person as the Requester." };
        }
        if (payload.requester_id && payload.approver2_id && payload.requester_id === payload.approver2_id) {
            return { success: false, message: "Approver 2 cannot be the same person as the Requester." };
        }
        if (payload.approver1_id && payload.approver2_id && payload.approver1_id === payload.approver2_id) {
            return { success: false, message: "Approver 1 and Approver 2 must be different people." };
        }

        let jobTitleId: string | undefined = payload.id;
        let result;

        if (payload.id) {
            // UPDATE — preserve approval state
            const { data: current } = await supabase
                .from("dim_job_title")
                .select("status, approver1_status, approver2_status")
                .eq("id", payload.id)
                .single();

            if (current) {
                dbPayload.status = current.status;
                dbPayload.approver1_status = current.approver1_status;
                dbPayload.approver2_status = current.approver2_status;
            }

            result = await supabase
                .from("dim_job_title")
                .update(dbPayload)
                .eq("id", payload.id)
                .eq("tenant_id", payload.tenant_id)
                .select("id")
                .single();
        } else {
            // INSERT
            result = await supabase
                .from("dim_job_title")
                .insert([dbPayload])
                .select("id")
                .single();
        }

        if (result.error) {
            if (result.error.code === "23505") {
                return { success: false, message: `A Job Title named "${payload.title}" already exists for this tenant.` };
            }
            throw result.error;
        }

        jobTitleId = result.data?.id ?? payload.id;

        // ── Upsert Role Titles ────────────────────────────────────────────────
        if (jobTitleId && payload.role_titles && payload.role_titles.length > 0) {
            for (const rt of payload.role_titles) {
                if (!rt.role_title.trim()) continue;
                await saveRoleTitleAction({
                    id: rt.id,
                    tenant_id: payload.tenant_id,
                    job_title_id: jobTitleId,
                    role_title: rt.role_title,
                    describe_role: rt.describe_role,
                });
            }
        }

        return { success: true, id: jobTitleId };
    } catch (err: any) {
        console.error("[job-title-actions] saveJobTitleAction:", err.message);
        return { success: false, message: err.message ?? "Unexpected error saving Job Title." };
    }
}

// ─── WRITE: Duplicate Job Title (creates new Draft with all Role Titles) ──────

export async function duplicateJobTitleAction(
    id: string,
    tenant_id: string
): Promise<{ success: boolean; message?: string; id?: string }> {
    try {
        // Fetch the original
        const { data: original, error: fetchErr } = await supabase
            .from("dim_job_title")
            .select("*, dim_role_title(role_title, describe_role)")
            .eq("id", id)
            .eq("tenant_id", tenant_id)
            .single();

        if (fetchErr || !original) throw fetchErr ?? new Error("Job Title not found");

        const copyTitle = `${original.title} (Copy)`;

        const res = await saveJobTitleAction({
            tenant_id,
            title: copyTitle,
            area: original.area ?? "",
            sub_area: original.sub_area ?? "",
            cost_center: original.cost_center ?? "",
            sub_cost_center: original.sub_cost_center ?? "",
            direct_supervisor: original.direct_supervisor ?? "",
            requester_id: original.requester_id ?? "",
            approver1_id: original.approver1_id ?? "",
            approver2_id: original.approver2_id ?? "",
            jdf_data: parseJdfData(original.jdf_data),
            role_titles: Array.isArray(original.dim_role_title)
                ? original.dim_role_title.map((rt: any) => ({
                    role_title: rt.role_title,
                    describe_role: rt.describe_role ?? "",
                }))
                : [],
        });

        return res;
    } catch (err: any) {
        console.error("[job-title-actions] duplicateJobTitleAction:", err.message);
        return { success: false, message: err.message ?? "Unexpected error duplicating Job Title." };
    }
}

// ─── WRITE: Approval Decision ─────────────────────────────────────────────────

export async function approveJobTitleAction(
    id: string,
    approverNum: 1 | 2,
    decision: ApprovalDecision
): Promise<{ success: boolean; message?: string }> {
    try {
        const field = approverNum === 1 ? "approver1_status" : "approver2_status";

        const { data: current, error: fetchErr } = await supabase
            .from("dim_job_title")
            .select("approver1_status, approver2_status")
            .eq("id", id)
            .single();

        if (fetchErr || !current) throw fetchErr ?? new Error("Record not found");

        const otherField = approverNum === 1 ? current.approver2_status : current.approver1_status;
        const newStatus = decision === "Approved" && otherField === "Approved" ? "Active" : "Draft";

        const { error } = await supabase
            .from("dim_job_title")
            .update({ [field]: decision, status: newStatus })
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("[job-title-actions] approveJobTitleAction:", err.message);
        return { success: false, message: err.message };
    }
}

// ─── WRITE: Toggle Job Title Status (Activate / Deactivate) ──────────────────

export async function toggleJobTitleStatusAction(
    id: string,
    currentStatus: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
        const { error } = await supabase
            .from("dim_job_title")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("[job-title-actions] toggleJobTitleStatusAction:", err.message);
        return { success: false, message: err.message };
    }
}
