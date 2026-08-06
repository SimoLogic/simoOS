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

export const dynamic = "force-dynamic";

export async function GET() {
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
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ ok: false, error: message }, { status: 500 });
    }
}
