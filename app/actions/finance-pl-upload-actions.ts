"use server";

/**
 * FINANCE P&L UPLOAD — Server Action
 *
 * Puerto 1:1 de la lógica de homesi-pl (normalize-pl.ts, enrich-transactions.ts)
 * -- no se modificó el algoritmo original, solo se adaptaron las rutas de
 * import y el destino final (finance_pl.pl_transactions en vez del Supabase
 * propio de homesi-pl).
 *
 * Flujo: Excel (GL Detail Report) -> normalizePL() -> enrichTransactions()
 * (join contra gl_mapping + dim_branch, ya cargados) -> INSERT en
 * finance_pl.pl_transactions.
 *
 * Protegido en la UI por AdminGate (rol admin) -- ver
 * components/finance/FinancePLUploadPage.tsx.
 */

import { supabase } from "@/lib/database";
import { supabaseFinancePl } from "@/lib/finance-pl/supabase-client";
import { normalizePL } from "@/lib/finance-pl/normalize-pl";
import { enrichTransactions } from "@/lib/finance-pl/enrich-transactions";
import type { GLMapping, Branch } from "@/lib/finance-pl/types";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}
function fail<T>(error: string): ActionResult<T> {
    return { success: false, error };
}

const INSERT_CHUNK_SIZE = 500;

export async function uploadPLFileAction(
    tenantId: string,
    fileName: string,
    fileBase64: string
): Promise<ActionResult<{ uploadId: string; rowCount: number; uncategorized: number; unknownBranch: number; warnings: number }>> {
    if (!tenantId?.trim()) return fail("Falta el tenant.");
    if (!fileBase64) return fail("Archivo vacío.");

    try {
        const buffer = Buffer.from(fileBase64, "base64");

        // Paso 1: normalizar el GL Detail Report (lógica original sin tocar)
        const { rows, warnings } = normalizePL(buffer);
        if (rows.length === 0) {
            return fail('No se encontraron filas en una hoja "GL Detail". Verifica el archivo.');
        }

        // Paso 2: traer el mapeo GL y las sucursales ya cargadas
        const { data: glMappingsRaw, error: glError } = await supabaseFinancePl
            .from("gl_mapping")
            .select("gl_code, gl_name, category_1, category_2, category_3, category_4, category_5, category_6, category_7, order_1, order_2, order_3")
            .eq("tenant_id", tenantId);
        if (glError) return fail(`Error leyendo gl_mapping: ${glError.message}`);

        const { data: branchesRaw, error: branchError } = await supabase
            .from("dim_branch")
            .select("branch_code, region, branch_manager_name")
            .eq("tenant_id", tenantId);
        if (branchError) return fail(`Error leyendo sucursales: ${branchError.message}`);

        const glMappings: GLMapping[] = (glMappingsRaw ?? []) as GLMapping[];
        const branches: Branch[] = (branchesRaw ?? []).map((b) => ({
            branch: b.branch_code,
            region: b.region,
            branch_manager: b.branch_manager_name,
        }));

        // Paso 3: borrar TODA la data anterior de este tenant (cada carga
        // reemplaza la anterior por completo). ON DELETE CASCADE en
        // pl_transactions.upload_id se encarga de las transacciones.
        const { error: deleteError } = await supabaseFinancePl
            .from("pl_uploads")
            .delete()
            .eq("tenant_id", tenantId);
        if (deleteError) return fail(`Error limpiando cargas anteriores: ${deleteError.message}`);

        // Paso 4: crear el registro de la nueva carga
        const { data: upload, error: uploadError } = await supabaseFinancePl
            .from("pl_uploads")
            .insert({ tenant_id: tenantId, file_name: fileName, row_count: rows.length, status: "processing" })
            .select("id")
            .single();
        if (uploadError || !upload) return fail(`Error creando la carga: ${uploadError?.message}`);

        // Paso 5: enriquecer (join contra gl_mapping/branches -- lógica original)
        const { transactions, uncategorizedCount, unknownBranchCount } = enrichTransactions(
            rows,
            glMappings,
            branches,
            upload.id,
            "original"
        );

        // Paso 6: insertar por lotes
        for (let i = 0; i < transactions.length; i += INSERT_CHUNK_SIZE) {
            const chunk = transactions.slice(i, i + INSERT_CHUNK_SIZE).map((t) => ({
                tenant_id: tenantId,
                upload_id: t.upload_id,
                gl_number_raw: t.gl_number_raw,
                gl_code: t.gl_code,
                branch: t.branch,
                gl_name: t.gl_name,
                check_description: t.check_description,
                loan_number: t.loan_number,
                loan_number_raw: t.loan_number_raw,
                borrower_name: t.borrower_name,
                journal_post_date: t.journal_post_date,
                year: t.year,
                month: t.month,
                vendor: t.vendor,
                invoice_numb: t.invoice_numb,
                ref_numb: t.ref_numb,
                doc_type: t.doc_type,
                debit: t.debit,
                credit: t.credit,
                movement: t.movement,
                category_1: t.category_1,
                category_2: t.category_2,
                category_3: t.category_3,
                category_4: t.category_4,
                category_5: t.category_5,
                category_6: t.category_6,
                category_7: t.category_7,
                order_1: t.order_1,
                order_2: t.order_2,
                order_3: t.order_3,
                region: t.region,
                branch_manager: t.branch_manager,
                manual_override: t.manual_override,
                source: t.source,
            }));

            const { error: insertError } = await supabaseFinancePl.from("pl_transactions").insert(chunk);
            if (insertError) {
                await supabaseFinancePl
                    .from("pl_uploads")
                    .update({ status: "error", error_message: insertError.message })
                    .eq("id", upload.id);
                return fail(`Error guardando transacciones: ${insertError.message}`);
            }
        }

        await supabaseFinancePl
            .from("pl_uploads")
            .update({ status: "completed" })
            .eq("id", upload.id);

        return ok({
            uploadId: upload.id,
            rowCount: transactions.length,
            uncategorized: uncategorizedCount,
            unknownBranch: unknownBranchCount,
            warnings: warnings.length,
        });
    } catch (err) {
        console.error("[uploadPLFileAction] failed:", err);
        return fail(err instanceof Error ? err.message : "Error desconocido al procesar el archivo.");
    }
}
