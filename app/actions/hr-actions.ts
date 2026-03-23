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
    identificationNumber: z.string().min(1).max(20),
    documentTypeId: z.string().min(1).max(10),
    firstName: z.string().min(1).max(100),
    middleNames: z.string().max(100).optional().nullable(),
    lastName: z.string().min(1).max(100),
    secondLastName: z.string().min(1).max(100),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
    gender: z.string().max(1),
    personalEmail: z.string().email().max(255),
    municipalityCode: z.string().max(10),
    residenceAddress: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const HistorialLaboralSchema = z.object({
    employeeId: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    contractType: z.string().max(50),
    salaryType: z.string().max(50),
    baseSalary: z.number().min(0),
    taxProcedure: z.union([z.literal(1), z.literal(2), z.literal(0)]),
    legalEntity: z.string().optional().nullable(),
    area: z.string().max(100),
    subArea: z.string().max(100),
    costCenter: z.string().max(20),
    costCenterName: z.string().max(255).optional().nullable(),
    subCostCenter: z.string().max(20).optional().nullable(),
    subCostCenterName: z.string().max(255).optional().nullable(),
    branch: z.string().max(100).optional().nullable(),
    cliente: z.string().max(100).optional().nullable(),
    project: z.string().max(255).optional().nullable(),
    dedicationPercentage: z.number().min(0).max(100),
    directLeader: z.string().max(255).optional().nullable(),
    jobTitleId: z.string().uuid("Invalid Job Title ID").optional().nullable(),
    jobTitleName: z.string().optional(),
    roleTitleId: z.string().uuid("Invalid Role Title ID").optional().nullable(),
    roleTitleName: z.string().optional(),
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

export async function updateRoleTitleAction(eid: string, tenantId: string, roleTitleId: string | null): Promise<{ success: boolean; message?: string }> {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
        const supabase = createClient(supabaseUrl, serviceKey);
        
        const { error } = await supabase
            .from('dim_employee')
            .update({ role_title_id: roleTitleId })
            .eq('eid', eid)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('[HR Action] updateRoleTitleAction error:', error);
        return { success: false, message: error.message };
    }
}
