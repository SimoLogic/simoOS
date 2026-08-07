"use server";

/**
 * HR ACTIVE ROSTER — Server Action (lectura para HC Master)
 *
 * Fuente de verdad del headcount real: public.hr_active_roster, alimentada
 * por el módulo Carga Centralizada (Excel -> BigQuery -> Supabase, ver
 * app/actions/hr-centralized-upload-actions.ts).
 *
 * Ojo con el modelo viejo: dim_employee / hr_employees (app/actions/
 * hr-actions.ts) es un modelo distinto -- y hoy está vacío. HC Master leía
 * de ahí y por eso no mostraba a nadie. Este archivo es el reemplazo.
 *
 * Lo sensible vive cifrado en sensitiveDataEnc (AES-256-GCM, hr-vault.ts).
 * Aquí se descifra en el servidor y se devuelve plano porque HC Master está
 * detrás de AdminGate (rol admin) a nivel de página completa -- ver
 * components/dashboard/DashboardContent.tsx. Si algún día HC Master deja de
 * estar bajo el gate, hay que dejar de devolver estos campos aquí.
 */

import { prisma } from "@/lib/database";
import { decryptObject } from "@/lib/security/hr-vault";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}
function fail<T>(error: string): ActionResult<T> {
    return { success: false, error };
}

/** Forma exacta del JSON cifrado que escribe uploadActiveRosterAction. */
export interface ActiveRosterSensitiveData {
    nationalId: string | null;
    homeAddress: string | null;
    neighborhood: string | null;
    city: string | null;
    phoneCo: string | null;
    personalEmail: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    phoneUsa: string | null;
    birthDate: string | null;
    eps: string | null;
    pension: string | null;
    cesantias: string | null;
    ccf: string | null;
    bankName: string | null;
    bankAccount: string | null;
}

/**
 * Fila plana para la UI: campos no sensibles + los sensibles ya descifrados.
 * Las fechas van como ISO string -- los Server Components serializan Date
 * sin problema, pero el string evita sorpresas de zona horaria en la tabla.
 */
export interface ActiveRosterEmployee extends ActiveRosterSensitiveData {
    id: string;
    tenantId: string;
    branchCode: string | null;
    employeeNumber: number | null;
    fullName: string;
    gender: string | null;
    position: string | null;
    area: string | null;
    supervisorName: string | null;
    corporateEmail: string | null;
    dateStarted: string | null;
    monthStarted: string | null;
    indefiniteContractDate: string | null;
    antiquityLabel: string | null;
    contractType: string | null;
    professionalProfile: string | null;
    university: string | null;
    englishLevel: string | null;
    status: string;
    uploadBatchId: string;
    uploadedAt: string;
    /** true si sensitiveDataEnc existía pero no se pudo descifrar (llave rotada, dato corrupto). */
    sensitiveDataUnavailable: boolean;
}

const EMPTY_SENSITIVE: ActiveRosterSensitiveData = {
    nationalId: null,
    homeAddress: null,
    neighborhood: null,
    city: null,
    phoneCo: null,
    personalEmail: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelation: null,
    phoneUsa: null,
    birthDate: null,
    eps: null,
    pension: null,
    cesantias: null,
    ccf: null,
    bankName: null,
    bankAccount: null,
};

function toISO(value: Date | null): string | null {
    return value ? value.toISOString() : null;
}

/**
 * Devuelve TODAS las filas de hr_active_roster del tenant (Active e Inactive),
 * con lo sensible ya descifrado. El filtro Active/Inactive se hace en la UI
 * para que HC Master pueda mostrar también a quien ya salió.
 */
export async function getActiveRosterAction(
    tenantId: string
): Promise<ActionResult<ActiveRosterEmployee[]>> {
    if (!tenantId?.trim()) return fail("No tenant selected.");

    try {
        const rows = await prisma.hrActiveRoster.findMany({
            where: { tenantId },
            orderBy: [{ employeeNumber: "asc" }],
        });

        const employees: ActiveRosterEmployee[] = [];
        for (const row of rows) {
            let sensitive: ActiveRosterSensitiveData = EMPTY_SENSITIVE;
            let sensitiveDataUnavailable = false;

            if (row.sensitiveDataEnc) {
                try {
                    const decrypted = await decryptObject<Partial<ActiveRosterSensitiveData>>(
                        row.sensitiveDataEnc
                    );
                    sensitive = { ...EMPTY_SENSITIVE, ...decrypted };
                } catch (decryptError) {
                    // Una fila ilegible no puede tumbar el reporte completo:
                    // se devuelve sin datos sensibles y marcada para la UI.
                    console.error(
                        `[getActiveRosterAction] could not decrypt sensitive data for employee ${row.id}:`,
                        decryptError
                    );
                    sensitiveDataUnavailable = true;
                }
            }

            employees.push({
                ...sensitive,
                id: row.id,
                tenantId: row.tenantId,
                branchCode: row.branchCode,
                employeeNumber: row.employeeNumber,
                fullName: row.fullName,
                gender: row.gender,
                position: row.position,
                area: row.area,
                supervisorName: row.supervisorName,
                corporateEmail: row.corporateEmail,
                dateStarted: toISO(row.dateStarted),
                monthStarted: row.monthStarted,
                indefiniteContractDate: toISO(row.indefiniteContractDate),
                antiquityLabel: row.antiquityLabel,
                contractType: row.contractType,
                professionalProfile: row.professionalProfile,
                university: row.university,
                englishLevel: row.englishLevel,
                status: row.status,
                uploadBatchId: row.uploadBatchId,
                uploadedAt: row.uploadedAt.toISOString(),
                sensitiveDataUnavailable,
            });
        }

        return ok(employees);
    } catch (err) {
        console.error("[getActiveRosterAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Could not load the employee roster.");
    }
}
