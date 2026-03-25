import { getRequiredSession } from "@/lib/pmo/auth-utils";
import { getPmoDB } from "@/lib/pmo/pmo-db";

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const db = getPmoDB();

    // Obtener userId de la sesión
    const { data: tokens, error } = await db
      .from("pmo_integration_tokens")
      .select("*")
      .eq("user_id", session.userId);

    if (error) throw error;

    const now = new Date();

    const isTokenValid = (t: any) => {
      if (!t.is_active) return false;
      if (!t.expires_at) return true; // Si no expira, es válido
      return new Date(t.expires_at) > now;
    };

    const sfToken = tokens?.find(t => t.provider.toLowerCase() === "salesforce" && isTokenValid(t));
    const outlookToken = tokens?.find(t => t.provider.toLowerCase() === "outlook" && isTokenValid(t));
    const zoomToken = tokens?.find(t => t.provider.toLowerCase() === "zoom" && isTokenValid(t));

    return Response.json({
      salesforce: {
        connected: !!sfToken,
        providerEmail: sfToken?.provider_user_id || null, // Assuming provider_user_id holds email based on token-vault schema
        lastSyncAt: sfToken?.updated_at || null,
        syncEnabled: !!sfToken
      },
      outlook: {
        connected: !!outlookToken,
        icsFeedUrl: outlookToken && process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/ics?token=${outlookToken.id}` : null,
        icsFeedLastAccess: null,
        graphConnected: !!outlookToken
      },
      zoom: {
        viaSalesforce: !!sfToken,
        directEnabled: process.env.ZOOM_DIRECT_ENABLED === 'true',
        directConnected: !!zoomToken
      }
    });

  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 401 });
  }
}
