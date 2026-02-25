"use server";

import { supabase } from "@/lib/database";
import { sanitizeStr, sanitizeOptStr } from "@/lib/utils/sanitizers";
import type { JobTitle, JobTitleRef, ApprovalDecision, JobDescriptionData } from "@/lib/job-title-types";

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
    jdf_data: (row.jdf_data as JobDescriptionData) ?? ({} as JobDescriptionData),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

// ─── READ: Get Active Job Titles (for dropdowns) ──────────────────────────────

export async function getActiveJobTitlesAction(tenant_id: string): Promise<JobTitleRef[]> {
    if (!tenant_id) return [];
    const { data, error } = await supabase
        .from("dim_job_title")
        .select("id, title, area, status")
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
    }));
}

// ─── READ: Get All Job Titles (admin panel) ───────────────────────────────────

export async function getAllJobTitlesAction(tenant_id: string): Promise<JobTitle[]> {
    if (!tenant_id) return [];
    const { data, error } = await supabase
        .from("dim_job_title")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[job-title-actions] getAllJobTitlesAction:", error.message);
        return [];
    }
    return (data ?? []).map(mapRow);
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
    submitForApproval?: boolean;  // if true → moves from Draft to awaiting approval
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

        // Anti-self-approval guard (belt + suspenders — DB constraint also handles this)
        if (payload.requester_id && payload.approver1_id && payload.requester_id === payload.approver1_id) {
            return { success: false, message: "Approver 1 cannot be the same person as the Requester." };
        }
        if (payload.requester_id && payload.approver2_id && payload.requester_id === payload.approver2_id) {
            return { success: false, message: "Approver 2 cannot be the same person as the Requester." };
        }
        if (payload.approver1_id && payload.approver2_id && payload.approver1_id === payload.approver2_id) {
            return { success: false, message: "Approver 1 and Approver 2 must be different people." };
        }

        let result;
        if (payload.id) {
            // UPDATE
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

        return { success: true, id: result.data?.id };
    } catch (err: any) {
        console.error("[job-title-actions] saveJobTitleAction:", err.message);
        return { success: false, message: err.message ?? "Unexpected error saving Job Title." };
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

        // First fetch the current record to check if both approvals will be given
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

// ─── WRITE: Toggle Status (Activate / Deactivate) ────────────────────────────

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
