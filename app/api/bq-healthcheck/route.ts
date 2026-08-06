/**
 * Verifica la cadena completa de autenticación keyless a BigQuery:
 * Vercel OIDC -> impersonación de simoos-app-bigquery -> BigQuery job -> lectura.
 *
 * Solo funciona desplegado en Vercel (o `vercel dev`) -- depende del token
 * OIDC de Vercel, no funciona con un `next dev` local plano.
 *
 * Borrar esta ruta una vez confirmado que funciona (es solo de diagnóstico).
 */
import { getBigQueryClient } from "@/lib/bigquery/client";
import { getVercelOidcToken } from "@vercel/oidc";

export const dynamic = "force-dynamic";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payload = token.split(".")[1];
        const json = Buffer.from(payload, "base64url").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export async function GET() {
    // Diagnóstico primero: decodificar el token OIDC crudo de Vercel ANTES
    // de mandarlo a Google, para ver exactamente qué "aud"/"iss"/"sub" trae
    // -- evidencia real en vez de seguir adivinando el desajuste.
    let rawTokenClaims: Record<string, unknown> | null = null;
    let rawTokenError: string | null = null;
    try {
        const rawToken = await getVercelOidcToken();
        rawTokenClaims = decodeJwtPayload(rawToken);
    } catch (err) {
        rawTokenError = err instanceof Error ? err.message : String(err);
    }

    try {
        const bigquery = getBigQueryClient();

        const [rows] = await bigquery.query({
            query: "SELECT SESSION_USER() AS running_as, CURRENT_TIMESTAMP() AS server_time",
        });
        const [datasets] = await bigquery.getDatasets();

        return Response.json({
            ok: true,
            running_as: rows?.[0]?.running_as ?? null, // esperado: simoos-app-bigquery@...
            server_time: rows?.[0]?.server_time ?? null,
            datasets_visible: datasets.map((d) => d.id),
            raw_token_claims: rawTokenClaims,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json(
            { ok: false, error: message, raw_token_claims: rawTokenClaims, raw_token_error: rawTokenError },
            { status: 500 }
        );
    }
}
