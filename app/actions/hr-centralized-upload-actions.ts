"use server";

/**
 * HR CENTRALIZED UPLOAD — Server Action
 *
 * Recibe las filas ya parseadas de la hoja "Active" del Excel centralizado
 * de SLTEAM (subido desde el navegador con SheetJS), y:
 *   1. Cifra los campos sensibles (cédula, dirección, cuenta bancaria, etc.)
 *      en un solo blob AES-256-GCM -- ver lib/security/hr-vault.ts.
 *   2. Guarda el maestro completo (no sensible + cifrado) en Supabase
 *      (public.hr_active_roster vía Prisma), upsert por tenant+número.
 *   3. Envía SOLO los campos no sensibles a BigQuery
 *      (hr_centralizado.active_roster_raw) para análisis -- append-only,
 *      queda histórico de cada carga mensual.
 *
 * Protegido en la UI por AdminGate (roles admin/hr) -- ver
 * components/hr/CentralizedUploadPage.tsx. Esta Server Action en sí NO
 * vuelve a validar el rol porque Prisma corre con las credenciales del
 * servidor (no expuestas al navegador); el gate de UI es la barrera real.
 */

import { prisma } from "@/lib/database";
import { encryptObject } from "@/lib/security/hr-vault";
import { insertActiveRosterRows, type ActiveRosterBigQueryRow } from "@/lib/bigquery/client";
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

/**
 * Sube el maestro "Active" completo: reemplaza/actualiza el snapshot actual
 * en Supabase (upsert), y agrega una fila nueva por empleado en BigQuery
 * (histórico append-only -- no reemplaza cargas anteriores).
 */
export async function uploadActiveRosterAction(
    tenantId: string,
    rows: RawActiveRosterRow[]
): Promise<ActionResult<{ uploadBatchId: string; count: number }>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");
    if (!rows.length) return fail("El archivo no tiene filas para procesar.");

    const uploadBatchId = randomUUID();
    const uploadedAt = new Date();
    const bigQueryRows: ActiveRosterBigQueryRow[] = [];

    try {
        for (const row of rows) {
            const fullName = row.NOMBRE?.trim();
            if (!fullName) continue; // fila vacía / de relleno, se ignora

            const employeeNumber = row["#"] ? Number(row["#"]) : null;
            const branchCode = row.BRANCH != null ? String(row.BRANCH) : null;
            const dateStarted = excelDateToISO(row["Date Started (dd/mm/aaaa)"]);
            const indefiniteContractDate = excelDateToISO(row["Indefinite Contract Date"]);

            // Solo lo sensible va cifrado -- nunca sale de Supabase, nunca viaja a BigQuery.
            const sensitiveDataEnc = await encryptObject({
                nationalId: row.ID ? String(row.ID) : null,
                homeAddress: row["Home Adress"] ?? null,
                neighborhood: row.Neighborhood ?? null,
                city: row.City ?? null,
                phoneCo: row["Phone (Colombia)"] ?? null,
                personalEmail: row["Personal E-mail"] ?? null,
                emergencyContactName: row["Emergency Contact"] ?? null,
                emergencyContactPhone: row.Phone ?? null,
                emergencyContactRelation: row.Parentesco ?? null,
                phoneUsa: row["Phone USA"] ?? null,
                birthDate: row["Birth Date"] ?? null,
                eps: row.EPS ?? row["Beneficio Salud"] ?? null,
                pension: row.Pensiones ?? null,
                cesantias: row["Cesantías"] ?? null,
                ccf: row["Caja de Compensación"] ?? null,
                bankName: row.Banco ?? null,
                bankAccount: row["#Cuenta"] ? String(row["#Cuenta"]) : null,
            });

            await prisma.hrActiveRoster.upsert({
                where: {
                    tenantId_employeeNumber: {
                        tenantId,
                        employeeNumber: employeeNumber ?? -1,
                    },
                },
                create: {
                    tenantId,
                    branchCode,
                    employeeNumber,
                    fullName,
                    gender: row[" GENDER"] ?? null,
                    position: row["Position POSITION"] ?? null,
                    area: row.Area ?? null,
                    supervisorName: row.Supervisor ?? null,
                    corporateEmail: row["Corporate email"] ?? null,
                    dateStarted,
                    monthStarted: row.Month ?? null,
                    indefiniteContractDate,
                    antiquityLabel: row.antiquity ?? null,
                    contractType: row["Tipo de contrato"] ?? null,
                    professionalProfile: row["Professional Profile "] ?? null,
                    university: row.University ?? null,
                    englishLevel: row["English Level"] ?? null,
                    sensitiveDataEnc,
                    uploadBatchId,
                    uploadedAt,
                },
                update: {
                    branchCode,
                    fullName,
                    gender: row[" GENDER"] ?? null,
                    position: row["Position POSITION"] ?? null,
                    area: row.Area ?? null,
                    supervisorName: row.Supervisor ?? null,
                    corporateEmail: row["Corporate email"] ?? null,
                    dateStarted,
                    monthStarted: row.Month ?? null,
                    indefiniteContractDate,
                    antiquityLabel: row.antiquity ?? null,
                    contractType: row["Tipo de contrato"] ?? null,
                    professionalProfile: row["Professional Profile "] ?? null,
                    university: row.University ?? null,
                    englishLevel: row["English Level"] ?? null,
                    sensitiveDataEnc,
                    uploadBatchId,
                    uploadedAt,
                },
            });

            bigQueryRows.push({
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
            });
        }

        // BigQuery: histórico append-only. Si falla, la carga a Supabase ya
        // quedó guardada -- se informa el error pero no se revierte lo demás
        // (la app sigue funcionando con Supabase; BigQuery es analítica, no
        // la fuente de verdad operativa).
        try {
            await insertActiveRosterRows(bigQueryRows);
        } catch (bqError) {
            console.error("[uploadActiveRosterAction] BigQuery insert failed:", bqError);
            return ok({ uploadBatchId, count: bigQueryRows.length });
            // Nota: no se marca como error total -- ver comentario arriba.
        }

        return ok({ uploadBatchId, count: bigQueryRows.length });
    } catch (err) {
        console.error("[uploadActiveRosterAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Error desconocido al procesar la carga.");
    }
}
