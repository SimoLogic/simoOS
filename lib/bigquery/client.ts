import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * Cliente de BigQuery -- SOLO servidor (Server Actions / API routes).
 *
 * Autenticación KEYLESS vía Vercel OIDC Federation + Google Cloud Workload
 * Identity Federation -- no existe ningún archivo de llave (la política de
 * la organización de Google Cloud bloquea la creación de llaves de cuenta
 * de servicio; este es el método recomendado por el admin, 2026-08-06).
 *
 * Cadena de autenticación: token OIDC de Vercel -> STS de Google intercambia
 * el token -> impersona la cuenta de servicio simoos-app-bigquery -> esa
 * cuenta tiene los roles de BigQuery (Data Editor + Job User).
 *
 * Requiere estas variables de entorno en Vercel (ya configuradas por el
 * admin, Production + Preview -- ninguna es secreta, no hay llave):
 *   GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_EMAIL, GCP_AUDIENCE
 *
 * Ver docs/AGENT_CONTEXT_ANTIGRAVITY.md para el handoff completo del admin.
 */
function getBigQueryClient(): BigQuery {
    const { GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_EMAIL, GCP_AUDIENCE } = process.env as Record<
        string,
        string | undefined
    >;

    if (!GCP_PROJECT_ID || !GCP_SERVICE_ACCOUNT_EMAIL || !GCP_AUDIENCE) {
        throw new Error(
            "[BigQuery] Faltan GCP_PROJECT_ID / GCP_SERVICE_ACCOUNT_EMAIL / GCP_AUDIENCE en las " +
                "variables de entorno. Ver docs/AGENT_CONTEXT_ANTIGRAVITY.md (handoff de Google Cloud)."
        );
    }

    // El provider de GCP usa "Allowed audiences" = https://vercel.com/simo-logic
    // (la audiencia por defecto del token de Vercel) -- por eso getVercelOidcToken
    // se llama sin override. GCP_AUDIENCE aquí es el destino de STS (el nombre
    // del provider), un campo distinto.
    const authClient = ExternalAccountClient.fromJSON({
        type: "external_account",
        audience: GCP_AUDIENCE,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: "https://sts.googleapis.com/v1/token",
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: {
            getSubjectToken: getVercelOidcToken,
        },
    });

    if (!authClient) {
        throw new Error("[BigQuery] No se pudo construir el ExternalAccountClient (revisar variables de entorno).");
    }

    return new BigQuery({ projectId: GCP_PROJECT_ID, authClient });
}

export interface ActiveRosterBigQueryRow {
    upload_batch_id: string;
    uploaded_at: string; // ISO timestamp
    tenant_code: string;
    branch_code: string | null;
    employee_number: number | null;
    full_name: string;
    gender: string | null;
    position: string | null;
    area: string | null;
    supervisor_name: string | null;
    corporate_email: string | null;
    date_started: string | null; // YYYY-MM-DD
    month_started: string | null;
    indefinite_contract_date: string | null; // YYYY-MM-DD
    antiquity_label: string | null;
    contract_type: string | null;
    professional_profile: string | null;
    university: string | null;
    english_level: string | null;
}

/**
 * Inserta filas en hr_centralizado.active_roster_raw (tabla append-only --
 * cada carga queda registrada, no se sobreescribe el histórico).
 * Solo campos NO sensibles -- ver decisión de gobierno de datos 2026-07-31
 * en docs/AGENT_CONTEXT_ANTIGRAVITY.md (cédula/cuenta bancaria/dirección
 * NUNCA viajan a BigQuery, solo quedan cifradas en Supabase).
 */
export async function insertActiveRosterRows(rows: ActiveRosterBigQueryRow[]): Promise<void> {
    if (rows.length === 0) return;
    const bigquery = getBigQueryClient();
    const dataset = bigquery.dataset("hr_centralizado");
    const table = dataset.table("active_roster_raw");
    await table.insert(rows, { skipInvalidRows: false, ignoreUnknownValues: false });
}

/** Exportado para el health-check route (app/api/bq-healthcheck). */
export { getBigQueryClient };
