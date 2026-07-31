import { getRequiredSession } from "@/lib/pmo/auth-utils";
import { getPmoDB } from "@/lib/pmo/pmo-db";

/**
 * GET /api/integrations/sync-events
 * Returns the latest 20 sync events for the current user's org.
 */
export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const db = getPmoDB();

    const { data: events, error } = await db
      .from("pmo_sync_events")
      .select("id, event_type, status, payload, created_at")
      .eq("tenant_id", session.tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return Response.json(events || []);
  } catch (err: unknown) {
    return Response.json([], { status: 200 }); // Graceful fallback
  }
}
