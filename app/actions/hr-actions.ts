"use server";

import { z } from "zod";
import { FullEmployeeRecord } from "@/lib/hr-types";
import { JobDescriptionData } from "@/lib/job-title-types";
import {
    getEmployeesService,
    addEmployeeService,
    updateEmployeeService,
    saveEmployeesService,
    processJobDescriptionAudioService
} from "@/lib/services/hr.service";

// ─── Zod Schemas (Triple Shield Validation) ─────────────────────────────────

const MaestroSchema = z.object({
    numero_identificacion: z.string().min(1).max(20),
    tipo_documento_id: z.string().min(1).max(10),
    primer_nombre: z.string().min(1).max(100),
    otros_nombres: z.string().max(100).optional().nullable(),
    primer_apellido: z.string().min(1).max(100),
    segundo_apellido: z.string().min(1).max(100),
    fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
    genero: z.string().max(1),
    email_personal: z.string().email().max(255),
    municipio_dane: z.string().max(10),
    direccion_residencia: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const HistorialLaboralSchema = z.object({
    empleado_id: z.string(),
    fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
    fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    tipo_contrato: z.string().max(50),
    tipo_salario: z.string().max(50),
    salario_base: z.number().min(0),
    procedimiento_renta: z.union([z.literal(1), z.literal(2), z.literal(0)]),
    entidad_legal: z.string().optional().nullable(),
    area: z.string().max(100),
    sub_area: z.string().max(100),
    centro_costo: z.string().max(20),
    nombre_centro_costo: z.string().max(255).optional().nullable(),
    sub_centro_costo: z.string().max(20).optional().nullable(),
    nombre_sub_centro_costo: z.string().max(255).optional().nullable(),
    branch: z.string().max(100).optional().nullable(),
    cliente: z.string().max(100).optional().nullable(),
    project: z.string().max(255).optional().nullable(),
    digito_dedicacion: z.number().min(0).max(100),
    direct_leader: z.string().max(255).optional().nullable(),
    job_title: z.string().max(255).optional().nullable(),
    created_at: z.string().optional()
});

const FullEmployeeSchema = z.object({
    eid: z.string(),
    tenant_id: z.string(),
    status: z.string(),
    email_corporativo: z.string().email().optional().nullable(),
    foto_url: z.string().url().optional().nullable(),
    maestro: MaestroSchema,
    historialLaboral: HistorialLaboralSchema,
    afiliaciones: z.any().optional(),
    sst: z.any().optional()
});

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function getEmployeesAction(tenantId: string): Promise<FullEmployeeRecord[]> {
    if (!tenantId?.trim()) return [];
    try {
        return await getEmployeesService(tenantId);
    } catch (error: any) {
        console.error('[HR Action] getEmployees error:', error);
        throw new Error(`Failed to fetch employees: ${error.message}`);
    }
}

export async function addEmployeeAction(employee: FullEmployeeRecord, tenantId: string): Promise<{ success: boolean; data?: FullEmployeeRecord[], error?: string }> {
    if (!tenantId?.trim()) throw new Error("Tenant ID is required to add an employee.");
    try {
        // Validation (Shield 2)
        const validatedEmployee = FullEmployeeSchema.parse({ ...employee, tenant_id: tenantId });

        const data = await addEmployeeService(validatedEmployee as FullEmployeeRecord, tenantId);
        return { success: true, data };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation Error: " + error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", ") };
        }
        console.error('[HR Action] addEmployee error:', error);
        throw new Error(`Critical Action Error (Add Employee): ${error.message}`);
    }
}

export async function updateEmployeeAction(employee: FullEmployeeRecord, tenantId: string): Promise<{ success: boolean; data?: FullEmployeeRecord[], error?: string }> {
    if (!tenantId?.trim()) throw new Error("Tenant ID is required to update an employee.");
    if (!employee.eid?.trim()) throw new Error("Employee EID is required for an update.");
    try {
        // Validation (Shield 2)
        const validatedEmployee = FullEmployeeSchema.parse({ ...employee, tenant_id: tenantId });

        const data = await updateEmployeeService(validatedEmployee as FullEmployeeRecord, tenantId);
        return { success: true, data };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation Error: " + error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", ") };
        }
        console.error('[HR Action] updateEmployee error:', error);
        throw new Error(`Critical Action Error (Update Employee): ${error.message}`);
    }
}

export async function saveEmployeesAction(employees: FullEmployeeRecord[], tenantId: string): Promise<{ success: boolean; error?: string }> {
    if (!tenantId?.trim() || employees.length === 0) return { success: false };
    try {
        // Validation (Shield 2)
        const validatedEmployees = z.array(FullEmployeeSchema).parse(
            employees.map(e => ({ ...e, tenant_id: tenantId }))
        );

        await saveEmployeesService(validatedEmployees as FullEmployeeRecord[], tenantId);
        return { success: true };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation Error: " + error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", ") };
        }
        console.error('[HR Action] saveEmployees error:', error);
        throw new Error(`Critical DB Error (Batch Save): ${error.message}`);
    }
}

// ─── AI Audio Processing (Gemini) ──────────────────────────────────────────

export async function processJobDescriptionAudio(base64Audio: string): Promise<{ success: boolean; data?: Partial<JobDescriptionData>; message?: string }> {
    try {
        const data = await processJobDescriptionAudioService(base64Audio);
        return { success: true, data };
    } catch (error: any) {
        console.error('[HR Action] processJobDescriptionAudio error:', error);
        return { success: false, message: error.message || "Failed to process audio with AI." };
    }
}
