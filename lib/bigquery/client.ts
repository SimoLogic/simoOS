import "server-only";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * Cliente de BigQuery -- SOLO servidor (Server Actions / API routes).
 *
 * Requiere la variable de entorno GOOGLE_CLOUD_CREDENTIALS_JSON en Vercel:
 * el contenido completo del archivo .json de la cuenta de servicio creada en
 * Google Cloud Console (IAM & Admin -> Service Accounts -> Keys), pegado
 * como un solo string. Ver docs/AGENT_CONTEXT_ANTIGRAVITY.md para el
 * paso a paso de cómo se creó.
 *
 * Proyecto usado: mcp-connector-procedure (mismo que ya aloja los datasets
 * de Salesforce / home_si / app_b2b_metrics).
 */
function getBigQueryClient(): BigQuery {
    const credsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
    if (!credsJson) {
        throw new Error(
            "[BigQuery] Falta GOOGLE_CLOUD_CREDENTIALS_JSON en las variables de entorno. " +
                "Ver docs/AGENT_CONTEXT_ANTIGRAVITY.md para crear la cuenta de servicio."
        );
    }

    let credentials: { client_email: string; private_key: string; [key: string]: unknown };
    try {
        credentials = JSON.parse(credsJson);
    } catch {
        throw new Error(
            "[BigQuery] GOOGLE_CLOUD_CREDENTIALS_JSON no es un JSON válido -- " +
                "verifica que se haya pegado el archivo .json completo, sin recortar."
        );
    }

    return new BigQuery({
        projectId: "mcp-connector-procedure",
        credentials,
    });
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
