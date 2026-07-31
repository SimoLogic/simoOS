import { NextRequest, NextResponse } from "next/server";
import { pullTasksFromSalesforce } from "@/lib/pmo/salesforce-sync";
import { verifyToken, ACCESS_TOKEN_NAME } from "@/lib/pmo/auth-core";

/**
 * POST /api/integrations/salesforce/sync
 *
 * Triggers a bidirectional pull from Salesforce.
 * Detects conflicts and writes pmo_sync_events so the UI can show the Mirror Sync Modal.
 * Auth: Requires a valid PMO session JWT cookie.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate the request using the PMO session cookie
  const tokenCookie = req.cookies.get(ACCESS_TOKEN_NAME);
  const session = tokenCookie ? await verifyToken(tokenCookie.value) : null;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pullTasksFromSalesforce(session.tenantId, session.userId);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      conflicts: result.conflicts,
      message: result.conflicts > 0
        ? `Sync complete. ${result.conflicts} conflict(s) detected — review in the Mirror Sync panel.`
        : `Sync complete. ${result.synced} task(s) are up-to-date.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Salesforce Sync] Pull failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
