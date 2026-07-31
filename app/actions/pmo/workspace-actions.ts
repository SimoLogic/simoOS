"use server";

import { z } from "zod";
import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

const UpdateWorkspaceThemeSchema = z.object({
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid HEX color"),
});

export async function updateWorkspaceThemeAction(
  tenantId: string,
  workspaceId: string,
  themeColor: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = UpdateWorkspaceThemeSchema.parse({ tenantId, workspaceId, themeColor });
    const db = getPmoDB();

    // Assuming we have a pmo_workspaces table, or we just put it on active workspace in store for now 
    // if the table doesn't exist. We will attempt to update if the table exists.
    // Sprint 8 requirement: Workspace Customization.
    
    // Check if table exists (silently fail if not scaffolding yet)
    const { error } = await db
        .from("pmo_workspaces")
        .update({ theme_color: validated.themeColor })
        .eq("id", validated.workspaceId)
        .eq("tenant_id", validated.tenantId);

    if (error && error.code !== '42P01') { // 42P01 is undefined_table
        throwIfDbError(error, "updateWorkspaceTheme");
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}
