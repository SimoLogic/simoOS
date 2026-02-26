"use server";

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FullEmployeeRecord } from "@/lib/hr-types";
import { JobDescriptionData, blankJdfData } from "@/lib/job-title-types";
import {
    sanitizeDate, sanitizeStr, sanitizeOptStr, sanitizeNum
} from "@/lib/utils/sanitizers";

// ─── Supabase Client (Server-side) ───────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
    }
    if (!supabaseKey || supabaseKey.includes('placeholder')) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
    }
    return createClient(supabaseUrl, supabaseKey);
}

// ─── DB Mapping ──────────────────────────────────────────────────────────────

const mapFromDb = (dbRow: any): FullEmployeeRecord => {
    return {
        eid: dbRow.eid,
        tenant_id: dbRow.tenant_id,
        status: dbRow.status,
        email_corporativo: dbRow.email_corporativo,
        foto_url: dbRow.foto_url,

        maestro: {
            numero_identificacion: dbRow.numero_identificacion,
            tipo_documento_id: dbRow.tipo_documento_id,
            primer_nombre: dbRow.primer_nombre,
            otros_nombres: dbRow.otros_nombres ?? "",
            primer_apellido: dbRow.primer_apellido,
            segundo_apellido: dbRow.segundo_apellido,
            fecha_nacimiento: dbRow.fecha_nacimiento,
            genero: dbRow.genero,
            email_personal: dbRow.email_personal,
            municipio_dane: dbRow.municipio_dane,
            direccion_residencia: dbRow.direccion_residencia,
            created_at: dbRow.created_at,
            updated_at: dbRow.updated_at
        },

        historialLaboral: {
            empleado_id: dbRow.numero_identificacion,
            fecha_inicio: dbRow.fecha_inicio,
            fecha_fin: dbRow.fecha_fin,
            tipo_contrato: dbRow.tipo_contrato,
            tipo_salario: dbRow.tipo_salario,
            salario_base: sanitizeNum(dbRow.salario_base),
            procedimiento_renta: sanitizeNum(dbRow.procedimiento_renta, 1) as 1 | 2 | 0,
            entidad_legal: dbRow.afiliaciones?.entidad_legal ?? dbRow.entidad_legal ?? "",
            area: dbRow.area,
            sub_area: dbRow.sub_area,
            centro_costo: dbRow.centro_costo,
            nombre_centro_costo: dbRow.nombre_centro_costo ?? "",
            sub_centro_costo: dbRow.sub_centro_costo ?? "",
            nombre_sub_centro_costo: dbRow.nombre_sub_centro_costo ?? "",
            branch: dbRow.branch ?? "",
            cliente: dbRow.cliente ?? "",
            project: dbRow.project ?? "",
            digito_dedicacion: sanitizeNum(dbRow.digito_dedicacion, 100),
            direct_leader: dbRow.direct_leader ?? "",
            job_title: dbRow.job_title ?? "",
            created_at: dbRow.created_at
        },

        afiliaciones: dbRow.afiliaciones,
        sst: dbRow.sst
    };
};

const mapToDb = (record: FullEmployeeRecord) => {
    return {
        eid: sanitizeStr(record.eid),
        tenant_id: sanitizeStr(record.tenant_id),
        status: sanitizeStr(record.status) || "Active",
        email_corporativo: sanitizeOptStr(record.email_corporativo),
        foto_url: sanitizeOptStr(record.foto_url),

        // ── Identity (Maestro) ──────────────────────────────────────────────
        numero_identificacion: sanitizeStr(record.maestro.numero_identificacion).slice(0, 20),
        tipo_documento_id: sanitizeStr(record.maestro.tipo_documento_id).slice(0, 10),
        primer_nombre: sanitizeStr(record.maestro.primer_nombre).slice(0, 100),
        otros_nombres: sanitizeOptStr(record.maestro.otros_nombres)?.slice(0, 100) ?? null,
        primer_apellido: sanitizeStr(record.maestro.primer_apellido).slice(0, 100),
        segundo_apellido: sanitizeStr(record.maestro.segundo_apellido).slice(0, 100),
        fecha_nacimiento: sanitizeDate(record.maestro.fecha_nacimiento),   // DATE — required
        genero: sanitizeStr(record.maestro.genero).slice(0, 1),
        email_personal: sanitizeStr(record.maestro.email_personal).slice(0, 255),
        municipio_dane: sanitizeStr(record.maestro.municipio_dane).slice(0, 10),
        direccion_residencia: sanitizeStr(record.maestro.direccion_residencia),

        // ── Laboral Snapshot ────────────────────────────────────────────────
        fecha_inicio: sanitizeDate(record.historialLaboral.fecha_inicio),  // DATE — required
        fecha_fin: sanitizeDate(record.historialLaboral.fecha_fin),         // DATE — nullable
        tipo_contrato: sanitizeStr(record.historialLaboral.tipo_contrato).slice(0, 50),
        tipo_salario: sanitizeStr(record.historialLaboral.tipo_salario).slice(0, 50),
        salario_base: sanitizeNum(record.historialLaboral.salario_base),
        procedimiento_renta: sanitizeNum(record.historialLaboral.procedimiento_renta, 1),
        area: sanitizeStr(record.historialLaboral.area).slice(0, 100),
        sub_area: sanitizeStr(record.historialLaboral.sub_area).slice(0, 100),
        centro_costo: sanitizeStr(record.historialLaboral.centro_costo).slice(0, 20),
        nombre_centro_costo: sanitizeOptStr(record.historialLaboral.nombre_centro_costo)?.slice(0, 255),
        sub_centro_costo: sanitizeOptStr(record.historialLaboral.sub_centro_costo)?.slice(0, 20),
        nombre_sub_centro_costo: sanitizeOptStr(record.historialLaboral.nombre_sub_centro_costo)?.slice(0, 255),
        branch: sanitizeOptStr(record.historialLaboral.branch)?.slice(0, 100),
        cliente: sanitizeOptStr(record.historialLaboral.cliente)?.slice(0, 100),
        project: sanitizeOptStr(record.historialLaboral.project)?.slice(0, 255),
        digito_dedicacion: sanitizeNum(record.historialLaboral.digito_dedicacion, 100),
        direct_leader: sanitizeOptStr(record.historialLaboral.direct_leader)?.slice(0, 255),
        job_title: sanitizeOptStr(record.historialLaboral.job_title)?.slice(0, 255),

        // ── JSONB (packing entidad_legal inside afiliaciones for Phase 1) ──
        afiliaciones: { ...record.afiliaciones, entidad_legal: record.historialLaboral.entidad_legal },
        sst: record.sst,

        // ── Timestamps ─────────────────────────────────────────────────────
        created_at: sanitizeDate(record.maestro.created_at),
        updated_at: sanitizeDate(record.maestro.updated_at),
    };
};

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function getEmployeesAction(tenantId: string): Promise<FullEmployeeRecord[]> {
    if (!tenantId?.trim()) return [];

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('dim_employee')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('eid', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapFromDb);
    } catch (error: any) {
        console.error('[HR Action] getEmployees error:', error);
        throw new Error(`Failed to fetch employees: ${error.message}`);
    }
}

export async function addEmployeeAction(employee: FullEmployeeRecord, tenantId: string): Promise<{ success: boolean; data?: FullEmployeeRecord[] }> {
    if (!tenantId?.trim()) throw new Error("Tenant ID is required to add an employee.");

    try {
        const supabase = getSupabase();
        const recordToSave = { ...employee, tenant_id: tenantId };
        const dbRow = mapToDb(recordToSave);

        const { error } = await supabase
            .from('dim_employee')
            .insert([dbRow]);

        if (error) throw error;

        const updated = await getEmployeesAction(tenantId);
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('[HR Action] addEmployee error:', error);
        throw new Error(`Critical DB Error (Add Employee): ${error.message}`);
    }
}

export async function updateEmployeeAction(employee: FullEmployeeRecord, tenantId: string): Promise<{ success: boolean; data?: FullEmployeeRecord[] }> {
    if (!tenantId?.trim()) throw new Error("Tenant ID is required to update an employee.");
    if (!employee.eid?.trim()) throw new Error("Employee EID is required for an update.");

    try {
        const supabase = getSupabase();
        const recordToSave = { ...employee, tenant_id: tenantId };

        const { error } = await supabase
            .from('dim_employee')
            .update(mapToDb(recordToSave))
            .eq('eid', employee.eid)
            .eq('tenant_id', tenantId);

        if (error) throw error;

        const updated = await getEmployeesAction(tenantId);
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('[HR Action] updateEmployee error:', error);
        throw new Error(`Critical DB Error (Update Employee): ${error.message}`);
    }
}

export async function saveEmployeesAction(employees: FullEmployeeRecord[], tenantId: string): Promise<{ success: boolean }> {
    if (!tenantId?.trim() || employees.length === 0) return { success: false };

    try {
        const supabase = getSupabase();
        const dbRows = employees.map(emp => mapToDb({ ...emp, tenant_id: tenantId }));

        const { error } = await supabase
            .from('dim_employee')
            .upsert(dbRows, { onConflict: 'eid' });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('[HR Action] saveEmployees error:', error);
        throw new Error(`Critical DB Error (Batch Save): ${error.message}`);
    }
}

// ─── AI Audio Processing (Gemini) ──────────────────────────────────────────

export async function processJobDescriptionAudio(base64Audio: string): Promise<{ success: boolean; data?: Partial<JobDescriptionData>; message?: string }> {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            throw new Error("Google Generative AI API Key is not configured.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are an expert HR compensation and recruitment analyst.
            I will provide you with an audio recording of a hiring manager describing a new job position.
            Your task is to extract the following information and return it strictly as a valid JSON object matching this structure:
            
            {
              "education_level": "string" (one of: High School, Technical/Associate, Bachelor's, Master's, PhD, None),
              "specific_profession": "string" (e.g. Industrial Engineer, Business Administration),
              "years_experience": number (total years required),
              "soft_skills": ["string", "string"],
              "specific_knowledge": ["string", "string"],
              "job_description": "string" (a well-written, professional summary of the role based on the audio)
            }

            If a piece of information is not mentioned, make your best professional guess based on the context, or leave it blank/0 if completely unknown. Ensure the output is ONLY the raw JSON object, without any markdown formatting or backticks.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: base64Audio
                }
            }
        ]);

        const responseText = result.response.text();
        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanJsonStr);

        return { success: true, data: extractedData };

    } catch (error: any) {
        console.error('[HR Action] processJobDescriptionAudio error:', error);
        return { success: false, message: error.message || "Failed to process audio with AI." };
    }
}
