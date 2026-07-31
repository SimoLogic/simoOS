"use server";

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";


export interface BoardShare {
    id: string;
    board_id: string;
    token: string;
    expires_at: string | null;
    created_at: string;
}

/**
 * Generates a public share token for a board.
 */
export async function createBoardShareAction(boardId: string, tenantId: string, userId: string, expiresDays?: number) {
    try {
        const db = getPmoDB();
        const token = require("node:crypto").randomBytes(32).toString("hex"); // 64 chars hex string
        const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : null;

        const { data, error } = await db
            .from("pmo_board_shares")
            .insert({
                board_id: boardId,
                tenant_id: tenantId,
                created_by: userId,
                token: token,
                expires_at: expiresAt
            })
            .select()
            .single();

        throwIfDbError(error, "createBoardShare");
        return { success: true, data: data as BoardShare };
    } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
    }
}

/**
 * Resolves a share token to its board and organization.
 * Used by the public route.
 */
export async function resolveShareTokenAction(token: string) {
    try {
        // Use SERVICE ROLE or a specific policy that allows anon read by token
        // For simplicity and security, we'll fetch via a server action which has elevated permissions or bypasses RLS if configured via admin client
        const db = getPmoDB(); 
        
        const { data, error } = await db
            .from("pmo_board_shares")
            .select("board_id, tenant_id, expires_at")
            .eq("token", token)
            .single();

        if (error || !data) return { success: false, error: "Share link invalid or expired." };

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return { success: false, error: "Share link has expired." };
        }

        return { success: true, boardId: data.board_id, tenantId: data.tenant_id };
    } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
    }
}
