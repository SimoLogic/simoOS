import { getRequiredSession } from "@/lib/pmo/auth-utils";
import { getPmoDB } from "@/lib/pmo/pmo-db";

export async function DELETE(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;
    const session = await getRequiredSession();
    const db = getPmoDB();

    // UPDATE pmo_integration_tokens SET is_active = false
    const { error: updateError } = await db
      .from("pmo_integration_tokens")
      .update({ is_active: false })
      .eq("user_id", session.userId)
      .ilike("provider", provider);

    if (updateError) throw updateError;

    // Registrar en pmo_sync_events: { type: "REVOKE", provider, userId }
    const { error: insertError } = await db.from("pmo_sync_events").insert({
      tenant_id: session.tenantId,
      event_type: "REVOKE",
      status: "success",
      payload: { provider: provider.toUpperCase(), userId: session.userId }
    });
    
    // Ignore minor errors on logging
    if (insertError) {
      console.warn(`[SF-4] Failed to log revocation for ${provider}:`, insertError.message);
    }

    return Response.json({ success: true, provider, revokedAt: new Date().toISOString() });
  } catch (err: unknown) {
    return Response.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
