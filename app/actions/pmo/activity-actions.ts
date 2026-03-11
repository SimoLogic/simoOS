"use server";

import { z } from "zod";
import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

const GetLogsSchema = z.object({
  orgId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export interface ActivityLog {
  id: string;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  userEmail: string; // Fetch joined from auth.users theoretically, but for now we might just have id or need a helper
  userId: string;
}

export async function getTaskActivityLogsAction(orgId: string, taskId: string): Promise<{ success: boolean; data?: ActivityLog[]; error?: string }> {
  try {
    const validated = GetLogsSchema.parse({ orgId, taskId });
    const db = getPmoDB();

    // Query logs. Note: auth.users is usually cross-schema, restricted. 
    // In Supabase, if we can't join auth.users directly via standard PostgREST easily due to permissions, 
    // we may need a secure view or just return userId for now.
    const { data: logs, error } = await db
      .from("pmo_activity_logs")
      .select("*")
      .eq("org_id", validated.orgId)
      .eq("task_id", validated.taskId)
      .order("created_at", { ascending: false })
      .limit(50);

    throwIfDbError(error, "getActivityLogs");

    const formatted: ActivityLog[] = (logs || []).map(l => ({
        id: l.id,
        actionType: l.action_type,
        oldValue: l.old_value,
        newValue: l.new_value,
        createdAt: l.created_at,
        userId: l.user_id,
        userEmail: "Usuario" // Placeholder till user dictionary mapped
    }));

    return { success: true, data: formatted };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}
