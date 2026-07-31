import { getRequiredSession } from "@/lib/pmo/auth-utils";
import { searchSalesforceLeads } from "@/lib/pmo/salesforce-sync";

/**
 * GET /api/integrations/salesforce/search?q=
 * Searches Salesforce for Leads, Contacts, and Opportunities matching the query.
 * Minimum query length: 3 characters.
 */
export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (q.length < 3) {
      return Response.json([]);
    }

    const results = await searchSalesforceLeads(session.tenantId, session.userId, q);
    return Response.json(results);
  } catch (err: unknown) {
    console.error("[SF Search]", (err as Error).message);
    return Response.json([], { status: 200 }); // Graceful fallback
  }
}
