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
    // Sensible -- decisión 2026-08-07: ya puede viajar a BigQuery (revocó la
    // restricción anterior del 2026-07-31). Se sigue cifrando en Supabase
    // como defensa adicional, aunque ya no sea obligatorio.
    national_id: string | null;
    home_address: string | null;
    neighborhood: string | null;
    city: string | null;
    phone_co: string | null;
    personal_email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relation: string | null;
    phone_usa: string | null;
    birth_date: string | null;
    eps: string | null;
    pension: string | null;
    cesantias: string | null;
    ccf: string | null;
    bank_name: string | null;
    bank_account: string | null;
}

/**
 * Inserta filas en hr_centralizado.active_roster_raw (tabla append-only --
 * cada carga queda registrada, no se sobreescribe el histórico).
 * Incluye TODOS los campos, sensibles y no sensibles -- decisión 2026-08-07
 * (ver docs/AGENT_CONTEXT_ANTIGRAVITY.md, revoca la restricción anterior).
 */
export async function insertActiveRosterRows(rows: ActiveRosterBigQueryRow[]): Promise<void> {
    if (rows.length === 0) return;
    const bigquery = getBigQueryClient();
    const dataset = bigquery.dataset("hr_centralizado");
    const table = dataset.table("active_roster_raw");
    await table.insert(rows, { skipInvalidRows: false, ignoreUnknownValues: false });
}

/**
 * El cliente de BigQuery devuelve los campos DATE/TIMESTAMP envueltos en un
 * objeto `{ value: "..." }` (clases BigQueryDate/BigQueryTimestamp), no como
 * texto plano -- por eso `new Date(r.date_started)` fallaba con "Invalid
 * Date" al leer de vuelta. Se desenvuelve aquí para que el resto del código
 * pueda seguir asumiendo string | null, como ya declara el tipo.
 */
function unwrapBigQueryValue(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object" && "value" in (v as Record<string, unknown>)) {
        return String((v as { value: unknown }).value);
    }
    return String(v);
}

/**
 * Lee de vuelta el snapshot actual (última carga por empleado) desde
 * hr_centralizado.v_active_roster_current -- BigQuery es el paso
 * intermedio de la cadena Excel -> BigQuery -> Supabase (decisión
 * 2026-08-07): Supabase se llena A PARTIR de lo que quedó en BigQuery,
 * no en paralelo desde el Excel original.
 */
export async function readCurrentActiveRoster(tenantCode: string): Promise<ActiveRosterBigQueryRow[]> {
    const bigquery = getBigQueryClient();
    const [rows] = await bigquery.query({
        query: `SELECT * FROM \`${bigquery.projectId}.hr_centralizado.v_active_roster_current\` WHERE tenant_code = @tenantCode`,
        params: { tenantCode },
    });

    return (rows as Record<string, unknown>[]).map((r) => ({
        ...r,
        uploaded_at: unwrapBigQueryValue(r.uploaded_at) ?? new Date().toISOString(),
        date_started: unwrapBigQueryValue(r.date_started),
        indefinite_contract_date: unwrapBigQueryValue(r.indefinite_contract_date),
    })) as ActiveRosterBigQueryRow[];
}

// ─── EE.UU. — Employee Draws (CompensaFe) ────────────────────────────────────

/**
 * Una fila del CSV EmployeeDraws ya normalizada, tal cual se inserta en
 * hr_centralizado.employee_draws_us_raw (tabla append-only, igual que
 * active_roster_raw en Colombia).
 *
 * OJO: los tipos exactos de las columnas numéricas en BigQuery no se pudieron
 * verificar desde el entorno de desarrollo (el cliente requiere OIDC de
 * Vercel). Se asume NUMERIC para los montos y DATE para las fechas. Si la
 * suposición estuviera mal, el insert falla ruidosamente con
 * skipInvalidRows: false y -- por la cadena estricta -- Supabase no se toca.
 */
export interface EmployeeDrawBigQueryRow {
    upload_batch_id: string;
    uploaded_at: string; // ISO timestamp
    tenant_code: string;
    branch_number: string | null;
    employee_number: number | null;
    employee_name: string | null;
    hire_date: string | null; // YYYY-MM-DD
    job_title: string | null;
    region_name: string | null;
    branch_name: string | null;
    type: string | null;
    guar_min: number | null;
    draw_date: string | null; // YYYY-MM-DD
    amount: number | null;
    waived: number | null;
    recaptured: number | null;
    draw_balance: number | null;
    waived_date: string | null; // YYYY-MM-DD
    net_pay: number | null;
    recaptured_date: string | null; // YYYY-MM-DD
    notes: string | null;
}

/**
 * Inserta filas en hr_centralizado.employee_draws_us_raw (append-only --
 * cada carga queda registrada, no se sobreescribe el histórico).
 */
export async function insertEmployeeDrawsRows(rows: EmployeeDrawBigQueryRow[]): Promise<void> {
    if (rows.length === 0) return;
    const bigquery = getBigQueryClient();
    const dataset = bigquery.dataset("hr_centralizado");
    const table = dataset.table("employee_draws_us_raw");
    await table.insert(rows, { skipInvalidRows: false, ignoreUnknownValues: false });
}

/**
 * Una fila de hr_centralizado.v_active_roster_us_current -- la vista ya viene
 * deduplicada por employee_number (un empleado por fila), a diferencia de la
 * tabla raw, donde un mismo empleado aparece una vez por cada draw.
 */
export interface UsRosterBigQueryRow {
    tenant_code: string;
    country: string;
    branch_code: string | null;
    employee_number: number | null;
    full_name: string | null;
    position: string | null;
    region_name: string | null;
    date_started: string | null; // YYYY-MM-DD
    last_seen_at: string | null; // ISO timestamp
}

/**
 * Lee de vuelta el roster vigente de EE.UU. desde
 * hr_centralizado.v_active_roster_us_current -- mismo rol que
 * readCurrentActiveRoster en Colombia: Supabase se llena A PARTIR de lo que
 * quedó en BigQuery, nunca en paralelo desde el archivo original.
 *
 * Desenvuelve DATE/TIMESTAMP igual que readCurrentActiveRoster: el cliente los
 * entrega como { value: "..." } y no como texto plano (ver unwrapBigQueryValue).
 */
export async function readCurrentUsRoster(tenantCode: string): Promise<UsRosterBigQueryRow[]> {
    const bigquery = getBigQueryClient();
    const [rows] = await bigquery.query({
        query: `SELECT * FROM \`${bigquery.projectId}.hr_centralizado.v_active_roster_us_current\` WHERE tenant_code = @tenantCode`,
        params: { tenantCode },
    });

    return (rows as Record<string, unknown>[]).map((r) => ({
        ...r,
        date_started: unwrapBigQueryValue(r.date_started),
        last_seen_at: unwrapBigQueryValue(r.last_seen_at),
    })) as UsRosterBigQueryRow[];
}

/** Exportado para el health-check route (app/api/bq-healthcheck). */
export { getBigQueryClient };
