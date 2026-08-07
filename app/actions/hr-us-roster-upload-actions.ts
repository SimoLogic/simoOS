"use server";

/**
 * HR US ROSTER — Server Action (CSV EmployeeDraws de CompensaFe)
 *
 * Misma cadena estricta que Colombia (ver hr-centralized-upload-actions.ts):
 *   CSV -> BigQuery (employee_draws_us_raw, TODAS las filas) -> se lee de
 *   vuelta la vista deduplicada (v_active_roster_us_current) -> Supabase.
 *
 * Nada llega a Supabase de forma manual: si BigQuery falla, no se toca
 * Supabase. Supabase se llena A PARTIR de lo que quedó en BigQuery.
 *
 * Diferencia con Colombia: el CSV es transaccional (una fila por draw, un
 * empleado aparece muchas veces), por eso la vista de BigQuery deduplica a un
 * empleado por fila antes de que esto escriba en hr_active_roster.
 *
 * De EE.UU. hoy solo llega identidad básica -- no hay sensitiveDataEnc, y por
 * eso HC Master muestra "No sensitive data on file" en esas filas.
 */

import { prisma } from "@/lib/database";
import {
    insertEmployeeDrawsRows,
    readCurrentUsRoster,
} from "@/lib/bigquery/client";
import {
    buildEmployeeDrawRows,
    type RawEmployeeDrawRow,
} from "@/lib/hr/employee-draws-normalize";
import { randomUUID } from "crypto";

// Re-exportado para que la UI importe el tipo desde la misma Server Action que
// llama (los tipos se borran en compilación, así que no rompe "use server").
export type { RawEmployeeDrawRow };

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}
function fail<T>(error: string): ActionResult<T> {
    return { success: false, error };
}

/** Marca de este pipeline en hr_upload_batches (ver columna `source`). */
const UPLOAD_SOURCE = "US_EMPLOYEE_DRAWS";

export interface UsRosterUploadResult {
    uploadBatchId: string;
    /** Filas de draws insertadas en BigQuery. */
    drawRowCount: number;
    /** Empleados guardados en Supabase (la vista ya viene deduplicada). */
    count: number;
    /** Empleados de EE.UU. que ya existían y no vinieron en esta carga. */
    deactivatedCount: number;
    /** Filas del CSV descartadas por no traer empleado. */
    skippedRows: number;
    /**
     * Campos numéricos con algún valor ilegible (p. ej. si "waived" trajera
     * "Y"/"N" en vez de un monto). Se avisa en vez de tragárselo en silencio.
     */
    unreadableNumericFields: string[];
}

/**
 * Sube el CSV EmployeeDraws completo, en cadena estricta:
 *   1. CSV -> BigQuery employee_draws_us_raw (append-only, todas las filas).
 *   2. Lee de vuelta v_active_roster_us_current (un empleado por fila).
 *   3. Upsert de ese snapshot en Supabase con country "US", status "Active".
 *   4. Marca "Inactive" a los empleados de EE.UU. que no vinieron.
 *   5. Deja constancia del lote en hr_upload_batches.
 */
export async function uploadEmployeeDrawsAction(
    tenantId: string,
    fileName: string,
    rows: RawEmployeeDrawRow[]
): Promise<ActionResult<UsRosterUploadResult>> {
    // Los mensajes de error se muestran tal cual en la UI -> van en inglés.
    if (!tenantId?.trim()) return fail("No tenant selected.");
    if (!rows.length) return fail("The file has no rows to process.");

    const uploadBatchId = randomUUID();
    const uploadedAt = new Date();

    try {
        // Paso 1: CSV -> BigQuery
        const built = buildEmployeeDrawRows(tenantId, uploadBatchId, uploadedAt, rows);
        if (built.rows.length === 0) {
            return fail("No valid rows (with an employee number or name) were found in the file.");
        }

        try {
            await insertEmployeeDrawsRows(built.rows);
        } catch (bqError) {
            console.error("[uploadEmployeeDrawsAction] BigQuery insert failed:", bqError);
            // Cadena estricta: si BigQuery falla, NO se toca Supabase.
            return fail(
                `Could not save to BigQuery: ${bqError instanceof Error ? bqError.message : "unknown error"}. Supabase was not updated.`
            );
        }

        // Paso 2: leer de vuelta el roster vigente (ya deduplicado por la vista)
        const currentRoster = await readCurrentUsRoster(tenantId);

        // Paso 3: BigQuery -> Supabase
        let savedCount = 0;
        const employeeNumbersInUpload: number[] = [];

        for (const r of currentRoster) {
            // Sin employee_number no hay llave para el upsert (tenantId_employeeNumber).
            if (r.employee_number == null) continue;

            const employeeNumber = Number(r.employee_number);
            if (!isFinite(employeeNumber)) continue;
            employeeNumbersInUpload.push(employeeNumber);

            const dateStarted = r.date_started ? new Date(r.date_started) : null;
            const safeDateStarted = dateStarted && !isNaN(dateStarted.getTime()) ? dateStarted : null;

            await prisma.hrActiveRoster.upsert({
                where: { tenantId_employeeNumber: { tenantId, employeeNumber } },
                create: {
                    tenantId,
                    employeeNumber,
                    fullName: r.full_name ?? `Employee ${employeeNumber}`,
                    branchCode: r.branch_code,
                    position: r.position,
                    // region_name es el equivalente funcional del área en este dataset.
                    area: r.region_name,
                    dateStarted: safeDateStarted,
                    country: "US",
                    status: "Active",
                    uploadBatchId,
                    uploadedAt,
                },
                update: {
                    fullName: r.full_name ?? undefined,
                    branchCode: r.branch_code,
                    position: r.position,
                    area: r.region_name,
                    dateStarted: safeDateStarted,
                    country: "US",
                    // Quien vuelve a aparecer queda Activo, incluso si una carga
                    // anterior lo había marcado Inactive (recontratación).
                    status: "Active",
                    uploadBatchId,
                    uploadedAt,
                },
            });
            savedCount++;
        }

        // Paso 4: los de EE.UU. que ya estaban y no vinieron pasan a Inactive.
        // El filtro country: "US" es obligatorio -- sin él esta carga marcaría
        // Inactive a TODA la nómina de Colombia, que vive en la misma tabla.
        let deactivatedCount = 0;
        if (employeeNumbersInUpload.length > 0) {
            const deactivated = await prisma.hrActiveRoster.updateMany({
                where: {
                    tenantId,
                    country: "US",
                    employeeNumber: { notIn: employeeNumbersInUpload },
                    status: { not: "Inactive" },
                },
                data: { status: "Inactive" },
            });
            deactivatedCount = deactivated.count;
        }

        // Paso 5: constancia del lote. En try/catch a propósito: el roster ya
        // quedó guardado, así que un fallo del historial no debe hacer fracasar
        // una carga que sí funcionó (ver sql/ddl_hr_upload_batches_source.sql).
        try {
            await prisma.hrUploadBatch.create({
                data: {
                    tenantId,
                    uploadBatchId,
                    source: UPLOAD_SOURCE,
                    fileName: fileName || null,
                    sourceRowCount: rows.length,
                    savedCount,
                    deactivatedCount,
                    uploadedAt,
                },
            });
        } catch (historyError) {
            console.error(
                "[uploadEmployeeDrawsAction] roster saved but could not record upload history:",
                historyError
            );
        }

        return ok({
            uploadBatchId,
            drawRowCount: built.rows.length,
            count: savedCount,
            deactivatedCount,
            skippedRows: built.skippedRows,
            unreadableNumericFields: built.unreadableNumericFields,
        });
    } catch (err) {
        console.error("[uploadEmployeeDrawsAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Unknown error while processing the upload.");
    }
}
