"use server";

/**
 * HR CENTRALIZED UPLOAD — Server Action
 *
 * Cadena real (decisión 2026-08-07, revoca el diseño paralelo anterior):
 *   Excel -> BigQuery (TODO, sensible incluido) -> se lee de vuelta desde
 *   BigQuery -> Supabase (sensible cifrado ahí como defensa adicional).
 *
 * Ya no hay separación "sensible nunca sale de Supabase" -- eso se revocó
 * explícitamente. BigQuery es ahora el paso intermedio real, no un
 * side-channel de analítica que corre en paralelo.
 *
 * Si BigQuery falla, NO se escribe nada en Supabase (Supabase depende de
 * lo que ya haya en BigQuery) -- distinto al diseño anterior, donde
 * BigQuery era "opcional".
 *
 * Protegido en la UI por AdminGate (roles admin/hr) -- ver
 * components/hr/CentralizedUploadPage.tsx.
 */

import { prisma } from "@/lib/database";
import { encryptObject } from "@/lib/security/hr-vault";
import { insertActiveRosterRows, readCurrentActiveRoster, type ActiveRosterBigQueryRow } from "@/lib/bigquery/client";
import { randomUUID } from "crypto";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}
function fail<T>(error: string): ActionResult<T> {
    return { success: false, error };
}

// Una fila tal cual sale de parsear la hoja "Active" en el navegador
// (nombres de columna en español/inglés mixto, igual al Excel original).
export interface RawActiveRosterRow {
    "#"?: number;
    NOMBRE?: string;
    ID?: string | number;
    " GENDER"?: string;
    "Position POSITION"?: string;
    Area?: string;
    Supervisor?: string;
    BRANCH?: string | number;
    "Corporate email"?: string;
    "Date Started (dd/mm/aaaa)"?: string;
    Month?: string;
    "Indefinite Contract Date"?: string;
    antiquity?: string;
    "Tipo de contrato"?: string;
    "Professional Profile "?: string;
    University?: string;
    "English Level"?: string;
    "Home Adress"?: string;
    Neighborhood?: string;
    City?: string;
    "Phone (Colombia)"?: string;
    "Personal E-mail"?: string;
    "Emergency Contact"?: string;
    Phone?: string;
    Parentesco?: string;
    "Phone USA"?: string;
    "Birth Date"?: string;
    EPS?: string;
    "Beneficio Salud"?: string;
    Pensiones?: string;
    Cesantías?: string;
    "Caja de Compensación"?: string;
    Banco?: string;
    "#Cuenta"?: string | number;
}

function excelDateToISO(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    return isNaN(parsed.getTime()) ? null : parsed;
}

/** Convierte a Date de forma segura -- null en vez de reventar con "Invalid Date" si el valor no es parseable. */
function toSafeDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Paso 1: normaliza las filas del Excel a filas de BigQuery (todos los
 * campos, sensibles incluidos).
 */
function buildBigQueryRows(
    tenantId: string,
    uploadBatchId: string,
    uploadedAt: Date,
    rows: RawActiveRosterRow[]
): ActiveRosterBigQueryRow[] {
    const out: ActiveRosterBigQueryRow[] = [];
    for (const row of rows) {
        const fullName = row.NOMBRE?.trim();
        if (!fullName) continue; // fila vacía / de relleno, se ignora

        const employeeNumber = row["#"] ? Number(row["#"]) : null;
        const branchCode = row.BRANCH != null ? String(row.BRANCH) : null;
        const dateStarted = excelDateToISO(row["Date Started (dd/mm/aaaa)"]);
        const indefiniteContractDate = excelDateToISO(row["Indefinite Contract Date"]);

        out.push({
            upload_batch_id: uploadBatchId,
            uploaded_at: uploadedAt.toISOString(),
            tenant_code: tenantId,
            branch_code: branchCode,
            employee_number: employeeNumber,
            full_name: fullName,
            gender: row[" GENDER"] ?? null,
            position: row["Position POSITION"] ?? null,
            area: row.Area ?? null,
            supervisor_name: row.Supervisor ?? null,
            corporate_email: row["Corporate email"] ?? null,
            date_started: dateStarted ? dateStarted.toISOString().slice(0, 10) : null,
            month_started: row.Month ?? null,
            indefinite_contract_date: indefiniteContractDate
                ? indefiniteContractDate.toISOString().slice(0, 10)
                : null,
            antiquity_label: row.antiquity ?? null,
            contract_type: row["Tipo de contrato"] ?? null,
            professional_profile: row["Professional Profile "] ?? null,
            university: row.University ?? null,
            english_level: row["English Level"] ?? null,
            national_id: row.ID ? String(row.ID) : null,
            home_address: row["Home Adress"] ?? null,
            neighborhood: row.Neighborhood ?? null,
            city: row.City ?? null,
            phone_co: row["Phone (Colombia)"] ?? null,
            personal_email: row["Personal E-mail"] ?? null,
            emergency_contact_name: row["Emergency Contact"] ?? null,
            emergency_contact_phone: row.Phone ?? null,
            emergency_contact_relation: row.Parentesco ?? null,
            phone_usa: row["Phone USA"] ?? null,
            birth_date: row["Birth Date"] ?? null,
            eps: row.EPS ?? row["Beneficio Salud"] ?? null,
            pension: row.Pensiones ?? null,
            cesantias: row["Cesantías"] ?? null,
            ccf: row["Caja de Compensación"] ?? null,
            bank_name: row.Banco ?? null,
            bank_account: row["#Cuenta"] ? String(row["#Cuenta"]) : null,
        });
    }
    return out;
}

/**
 * Sube el maestro "Active" completo, en cadena real:
 *   1. Excel -> BigQuery (append-only, todos los campos).
 *   2. Lee de vuelta el snapshot actual desde BigQuery
 *      (hr_centralizado.v_active_roster_current).
 *   3. Guarda ese snapshot en Supabase (sensible cifrado ahí), status "Active".
 *   4. Marca "Inactive" a quien ya estaba en Supabase y no viene en esta carga.
 */
export async function uploadActiveRosterAction(
    tenantId: string,
    rows: RawActiveRosterRow[],
    fileName?: string
): Promise<ActionResult<{ uploadBatchId: string; count: number; deactivatedCount: number }>> {
    // Los mensajes de error se muestran tal cual en la UI -> van en inglés.
    if (!tenantId?.trim()) return fail("No tenant selected.");
    if (!rows.length) return fail("The file has no rows to process.");

    const uploadBatchId = randomUUID();
    const uploadedAt = new Date();

    try {
        // Paso 1: Excel -> BigQuery
        const bigQueryRows = buildBigQueryRows(tenantId, uploadBatchId, uploadedAt, rows);
        if (bigQueryRows.length === 0) return fail("No valid rows (with a name) were found in the file.");

        try {
            await insertActiveRosterRows(bigQueryRows);
        } catch (bqError) {
            console.error("[uploadActiveRosterAction] BigQuery insert failed:", bqError);
            // Cadena estricta: si BigQuery falla, NO se toca Supabase.
            return fail(
                `Could not save to BigQuery: ${bqError instanceof Error ? bqError.message : "unknown error"}. Supabase was not updated.`
            );
        }

        // Paso 2: leer de vuelta el snapshot actual desde BigQuery
        const currentRoster = await readCurrentActiveRoster(tenantId);

        // Paso 3: BigQuery -> Supabase (cifrando lo sensible ahí, defensa adicional)
        let savedCount = 0;
        const employeeNumbersInUpload: number[] = [];
        for (const r of currentRoster) {
            const sensitiveDataEnc = await encryptObject({
                nationalId: r.national_id,
                homeAddress: r.home_address,
                neighborhood: r.neighborhood,
                city: r.city,
                phoneCo: r.phone_co,
                personalEmail: r.personal_email,
                emergencyContactName: r.emergency_contact_name,
                emergencyContactPhone: r.emergency_contact_phone,
                emergencyContactRelation: r.emergency_contact_relation,
                phoneUsa: r.phone_usa,
                birthDate: r.birth_date,
                eps: r.eps,
                pension: r.pension,
                cesantias: r.cesantias,
                ccf: r.ccf,
                bankName: r.bank_name,
                bankAccount: r.bank_account,
            });

            const employeeNumber = r.employee_number;
            employeeNumbersInUpload.push(employeeNumber ?? -1);

            await prisma.hrActiveRoster.upsert({
                where: {
                    tenantId_employeeNumber: {
                        tenantId,
                        employeeNumber: employeeNumber ?? -1,
                    },
                },
                create: {
                    tenantId,
                    branchCode: r.branch_code,
                    employeeNumber,
                    fullName: r.full_name,
                    gender: r.gender,
                    position: r.position,
                    area: r.area,
                    supervisorName: r.supervisor_name,
                    corporateEmail: r.corporate_email,
                    dateStarted: toSafeDate(r.date_started),
                    monthStarted: r.month_started,
                    indefiniteContractDate: toSafeDate(r.indefinite_contract_date),
                    antiquityLabel: r.antiquity_label,
                    contractType: r.contract_type,
                    professionalProfile: r.professional_profile,
                    university: r.university,
                    englishLevel: r.english_level,
                    status: "Active",
                    sensitiveDataEnc,
                    uploadBatchId: r.upload_batch_id,
                    uploadedAt: toSafeDate(r.uploaded_at) ?? new Date(),
                },
                update: {
                    branchCode: r.branch_code,
                    fullName: r.full_name,
                    gender: r.gender,
                    position: r.position,
                    area: r.area,
                    supervisorName: r.supervisor_name,
                    corporateEmail: r.corporate_email,
                    dateStarted: toSafeDate(r.date_started),
                    monthStarted: r.month_started,
                    indefiniteContractDate: toSafeDate(r.indefinite_contract_date),
                    antiquityLabel: r.antiquity_label,
                    contractType: r.contract_type,
                    professionalProfile: r.professional_profile,
                    university: r.university,
                    englishLevel: r.english_level,
                    // Quien viene en la carga vuelve a quedar Activo, incluso si
                    // una carga anterior lo había marcado Inactive (recontratación).
                    status: "Active",
                    sensitiveDataEnc,
                    uploadBatchId: r.upload_batch_id,
                    uploadedAt: toSafeDate(r.uploaded_at) ?? new Date(),
                },
            });
            savedCount++;
        }

        // Paso 4: quien YA estaba en Supabase pero no viene en esta carga se
        // marca Inactive -- nunca se borra (el histórico de la persona y su
        // dato cifrado se conservan; HC Master lo muestra con badge gris).
        let deactivatedCount = 0;
        if (employeeNumbersInUpload.length > 0) {
            const deactivated = await prisma.hrActiveRoster.updateMany({
                where: {
                    tenantId,
                    employeeNumber: { notIn: employeeNumbersInUpload },
                    status: { not: "Inactive" },
                },
                data: { status: "Inactive" },
            });
            deactivatedCount = deactivated.count;
        }

        // Paso 5: deja constancia de la carga en el historial. Va en try/catch
        // a propósito: en este punto el roster YA quedó guardado, así que un
        // fallo escribiendo el historial (p. ej. la tabla todavía no existe en
        // ese ambiente, ver sql/ddl_hr_upload_batches.sql) no debe hacer
        // fracasar una carga que sí funcionó.
        try {
            await prisma.hrUploadBatch.create({
                data: {
                    tenantId,
                    uploadBatchId,
                    fileName: fileName ?? null,
                    sourceRowCount: rows.length,
                    savedCount,
                    deactivatedCount,
                    uploadedAt,
                },
            });
        } catch (historyError) {
            console.error(
                "[uploadActiveRosterAction] roster saved but could not record upload history:",
                historyError
            );
        }

        return ok({ uploadBatchId, count: savedCount, deactivatedCount });
    } catch (err) {
        console.error("[uploadActiveRosterAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Unknown error while processing the upload.");
    }
}

/** Una carga anterior, tal como la muestra la UI (fechas ya serializadas). */
export interface UploadBatchSummary {
    uploadBatchId: string;
    fileName: string | null;
    sourceRowCount: number;
    savedCount: number;
    deactivatedCount: number;
    uploadedAt: string;
}

/**
 * Últimas cargas del tenant, más reciente primero.
 *
 * La Carga Centralizada la llama al montar para poder mostrar qué se subió
 * la última vez. Antes, el único registro de una carga era el useState del
 * componente: si algo lo remontaba (ver el fix de AdminGate) o el usuario
 * simplemente cambiaba de módulo y volvía, no quedaba ni rastro de que la
 * carga había ocurrido. Esto lo hace persistente.
 */
export async function getRecentUploadBatchesAction(
    tenantId: string,
    limit = 5
): Promise<ActionResult<UploadBatchSummary[]>> {
    if (!tenantId?.trim()) return fail("No tenant selected.");

    try {
        const batches = await prisma.hrUploadBatch.findMany({
            where: { tenantId },
            orderBy: { uploadedAt: "desc" },
            take: Math.min(Math.max(limit, 1), 20),
        });

        return ok(
            batches.map((b) => ({
                uploadBatchId: b.uploadBatchId,
                fileName: b.fileName,
                sourceRowCount: b.sourceRowCount,
                savedCount: b.savedCount,
                deactivatedCount: b.deactivatedCount,
                uploadedAt: b.uploadedAt.toISOString(),
            }))
        );
    } catch (err) {
        console.error("[getRecentUploadBatchesAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Could not load the upload history.");
    }
}
