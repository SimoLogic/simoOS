"use server";

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { TaskStatus, TaskPriority } from "@/types/pmo.types";

/**
 * Bulk updates tasks and logs changes.
 * Considers WorkdayHelper indirectly via individual check if needed.
 */
export async function bulkUpdateTasksAction(
    taskIds: string[], 
    orgId: string, 
    userId: string, 
    updates: { status?: TaskStatus, priority?: TaskPriority, dueDate?: string }
) {
    try {
        const db = getPmoDB();
        
        const patch: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
        if (updates.status === "done") patch.completed_at = new Date().toISOString();

        const { data, error } = await db
            .from("pmo_tasks")
            .update(patch)
            .in("id", taskIds)
            .eq("org_id", orgId)
            .select("id, status, title");

        throwIfDbError(error, "bulkUpdateTasks");

        // Audit Logs for each task
        if (data && data.length > 0) {
            const logs = data.map(task => ({
                org_id: orgId,
                task_id: task.id,
                user_id: userId,
                action: "bulk_update",
                field_name: Object.keys(updates).join(", "),
                old_value: null,
                new_value: JSON.stringify(updates),
            }));
            await db.from("pmo_item_activity").insert(logs);

        }

        return { success: true, count: data?.length || 0 };
    } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
    }
}
