"use server";

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

export interface PmoNotification {
    id: string;
    org_id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    related_entity_id: string | null;
    related_entity_type: string | null;
    read: boolean;
    created_at: string;
}

export async function getMyNotificationsAction(orgId: string, limit = 20): Promise<PmoNotification[]> {
    if (!orgId) return [];
    const db = getPmoDB();

    const { data, error } = await db
        .from("pmo_notifications")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);

    throwIfDbError(error, "getMyNotifications");
    return data as PmoNotification[];
}

export async function markNotificationReadAction(notificationId: string, orgId: string): Promise<boolean> {
    const db = getPmoDB();
    const { error } = await db
        .from("pmo_notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("org_id", orgId);
        
    if (error) {
        console.error("Failed to mark read", error);
        return false;
    }
    return true;
}
