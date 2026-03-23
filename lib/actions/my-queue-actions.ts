"use server";

import { supabase } from "@/lib/database";

export interface SimoNotification {
    id: string;
    org_id: string;
    user_id: string;
    type: 'APPROVAL' | 'TASK' | 'FORM' | 'ALERT';
    module: string;
    title: string;
    summary: string | null;
    action_url: string;
    entity_id: string | null;
    entity_type: string | null;
    status: 'PENDING' | 'READ' | 'RESOLVED' | 'DISMISSED';
    priority: 'HIGH' | 'NORMAL' | 'LOW';
    created_at: string;
    resolved_at: string | null;
}

export async function getNotificationsAction(orgId: string, userId: string): Promise<SimoNotification[]> {
    if (!orgId || !userId) return [];

    const { data, error } = await supabase
        .from('simo_notifications')
        .select('*')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching notifications:", error.message);
        throw new Error(error.message);
    }

    return data as SimoNotification[];
}

export async function getPendingCountAction(orgId: string, userId: string): Promise<number> {
    if (!orgId || !userId) return 0;

    const { count, error } = await supabase
        .from('simo_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'PENDING');

    if (error) {
        console.error("Error fetching pending count:", error.message);
        return 0;
    }

    return count || 0;
}

export async function markNotificationReadAction(id: string): Promise<boolean> {
    if (!id) return false;

    const { error } = await supabase
        .from('simo_notifications')
        .update({ status: 'READ' })
        .eq('id', id);

    if (error) {
        console.error("Error marking notification read:", error.message);
        throw new Error(error.message);
    }

    return true;
}
