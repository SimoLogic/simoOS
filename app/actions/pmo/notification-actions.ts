"use server";

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

export interface PmoNotification {
    id: string;
    tenant_id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    related_entity_id: string | null;
    related_entity_type: string | null;
    read: boolean;
    created_at: string;
}

export async function getMyNotificationsAction(tenantId: string, limit = 20): Promise<PmoNotification[]> {
    if (!tenantId) return [];
    const db = getPmoDB();

    const { data, error } = await db
        .from("pmo_notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);

    throwIfDbError(error, "getMyNotifications");
    return data as PmoNotification[];
}

export async function markNotificationReadAction(notificationId: string, tenantId: string): Promise<boolean> {
    const db = getPmoDB();
    const { error } = await db
        .from("pmo_notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("tenant_id", tenantId);
        
    if (error) {
        console.error("Failed to mark read", error);
        return false;
    }
    return true;
}
