import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FullEmployeeRecord } from "@/lib/hr-types";
import { JobDescriptionData, blankJdfData } from "@/lib/job-title-types";
import {
    sanitizeDate, sanitizeStr, sanitizeOptStr, sanitizeNum
} from "@/lib/utils/sanitizers";

// ─── Supabase Client ───────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
        salaryCurrency: dbRow.salary_currency || null,
        directLeaderId: dbRow.direct_leader_id || null,

        maestro: {
            identificationNumber: dbRow.numero_identificacion,
            documentTypeId: dbRow.tipo_documento_id,
            firstName: dbRow.primer_nombre,
            middleNames: dbRow.otros_nombres ?? "",
            lastName: dbRow.primer_apellido,
            secondLastName: dbRow.segundo_apellido,
            birthDate: dbRow.fecha_nacimiento,
            gender: dbRow.genero,
            personalEmail: dbRow.email_personal,
            municipalityCode: dbRow.municipio_dane,
            residenceAddress: dbRow.direccion_residencia,
            created_at: dbRow.created_at,
            updated_at: dbRow.updated_at
        },

        historialLaboral: {
            employeeId: dbRow.numero_identificacion,
            startDate: dbRow.fecha_inicio,
            endDate: dbRow.fecha_fin,
            contractType: dbRow.tipo_contrato,
            salaryType: dbRow.tipo_salario,
            baseSalary: sanitizeNum(dbRow.salario_base),
            taxProcedure: sanitizeNum(dbRow.procedimiento_renta, 1) as 1 | 2 | 0,
            legalEntity: dbRow.afiliaciones?.entidad_legal ?? dbRow.entidad_legal ?? "",
            area: dbRow.area,
            subArea: dbRow.sub_area,
            costCenter: dbRow.centro_costo,
            costCenterName: dbRow.nombre_centro_costo ?? "",
            subCostCenter: dbRow.sub_centro_costo ?? "",
            subCostCenterName: dbRow.nombre_sub_centro_costo ?? "",
            branch: dbRow.branch ?? "",
            client: dbRow.cliente ?? "",
            project: dbRow.project ?? "",
            dedicationPercentage: sanitizeNum(dbRow.digito_dedicacion, 100),
            directLeader: dbRow.direct_leader ?? "",
            directLeaderId: dbRow.direct_leader_id ?? null,
            jobTitleId: dbRow.job_title_id ?? null,
            jobTitleName: dbRow.dim_job_title?.title ?? "",
            roleTitleId: dbRow.role_title_id ?? null,
            roleTitleName: dbRow.dim_role_title?.role_title ?? "",
            salaryCurrency: dbRow.salary_currency ?? null,
            created_at: dbRow.created_at
        },

        afiliaciones: {
            employeeId: dbRow.numero_identificacion,
            eps_id: dbRow.afiliaciones?.eps_id ?? "",
            epsName: dbRow.afiliaciones?.eps_nombre ?? "",
            afp_id: dbRow.afiliaciones?.afp_id ?? "",
            afpName: dbRow.afiliaciones?.afp_nombre ?? "",
            arl_id: dbRow.afiliaciones?.arl_id ?? "",
            arlName: dbRow.afiliaciones?.arl_nombre ?? "",
            ccf_id: dbRow.afiliaciones?.ccf_id ?? "",
            ccfName: dbRow.afiliaciones?.ccf_nombre ?? "",
            arlRiskLevel: sanitizeNum(dbRow.afiliaciones?.nivel_riesgo_arl, 0) as 1 | 2 | 3 | 4 | 5 | 0,
            contributorSubtype: dbRow.afiliaciones?.subtipo_cotizante ?? "",
            updated_at: dbRow.afiliaciones?.updated_at
        },

        sst: {
            employeeId: dbRow.numero_identificacion,
            shirtSize: dbRow.sst?.talla_camisa ?? "",
            pantsSize: dbRow.sst?.talla_pantalon ?? "",
            shoeSize: sanitizeNum(dbRow.sst?.talla_calzado, 0),
            bloodType: dbRow.sst?.tipo_sangre ?? "",
            emergencyContact: dbRow.sst?.contacto_emergencia ?? "",
            emergencyPhone: dbRow.sst?.telefono_emergencia ?? "",
        }
    };
};

const mapToDb = (record: FullEmployeeRecord) => {
    return {
        eid: sanitizeStr(record.eid),
        tenant_id: sanitizeStr(record.tenant_id),
        status: sanitizeStr(record.status) || "Active",
        email_corporativo: sanitizeOptStr(record.email_corporativo),
        foto_url: sanitizeOptStr(record.foto_url),

        // ── Identity (Maestro) ──
        numero_identificacion: sanitizeStr(record.maestro.identificationNumber).slice(0, 20),
        tipo_documento_id: sanitizeStr(record.maestro.documentTypeId).slice(0, 10),
        primer_nombre: sanitizeStr(record.maestro.firstName).slice(0, 100),
        otros_nombres: sanitizeOptStr(record.maestro.middleNames)?.slice(0, 100) ?? null,
        primer_apellido: sanitizeStr(record.maestro.lastName).slice(0, 100),
        segundo_apellido: sanitizeStr(record.maestro.secondLastName).slice(0, 100),
        fecha_nacimiento: sanitizeDate(record.maestro.birthDate),
        genero: sanitizeStr(record.maestro.gender).slice(0, 1),
        email_personal: sanitizeStr(record.maestro.personalEmail).slice(0, 255),
        municipio_dane: sanitizeStr(record.maestro.municipalityCode).slice(0, 10),
        direccion_residencia: sanitizeStr(record.maestro.residenceAddress),

        // ── Laboral Snapshot ──
        fecha_inicio: sanitizeDate(record.historialLaboral.startDate),
        fecha_fin: sanitizeDate(record.historialLaboral.endDate),
        tipo_contrato: sanitizeStr(record.historialLaboral.contractType).slice(0, 50),
        tipo_salario: sanitizeStr(record.historialLaboral.salaryType).slice(0, 50),
        salario_base: sanitizeNum(record.historialLaboral.baseSalary),
        procedimiento_renta: sanitizeNum(record.historialLaboral.taxProcedure, 1),
        area: sanitizeStr(record.historialLaboral.area).slice(0, 100),
        sub_area: sanitizeStr(record.historialLaboral.subArea).slice(0, 100),
        centro_costo: sanitizeStr(record.historialLaboral.costCenter).slice(0, 20),
        nombre_centro_costo: sanitizeOptStr(record.historialLaboral.costCenterName)?.slice(0, 255),
        sub_centro_costo: sanitizeOptStr(record.historialLaboral.subCostCenter)?.slice(0, 20),
        nombre_sub_centro_costo: sanitizeOptStr(record.historialLaboral.subCostCenterName)?.slice(0, 255),
        branch: sanitizeOptStr(record.historialLaboral.branch)?.slice(0, 100),
        cliente: sanitizeOptStr(record.historialLaboral.client)?.slice(0, 100),
        project: sanitizeOptStr(record.historialLaboral.project)?.slice(0, 255),
        digito_dedicacion: sanitizeNum(record.historialLaboral.dedicationPercentage, 100),
        direct_leader: sanitizeOptStr(record.historialLaboral.directLeader)?.slice(0, 255),
        direct_leader_id: sanitizeOptStr(record.historialLaboral.directLeaderId),
        job_title_id: sanitizeOptStr(record.historialLaboral.jobTitleId),
        role_title_id: sanitizeOptStr(record.historialLaboral.roleTitleId),
        salary_currency: sanitizeOptStr(record.historialLaboral.salaryCurrency),

        // ── JSONB ──
        afiliaciones: {
            eps_id: record.afiliaciones.eps_id,
            eps_nombre: record.afiliaciones.epsName,
            afp_id: record.afiliaciones.afp_id,
            afp_nombre: record.afiliaciones.afpName,
            arl_id: record.afiliaciones.arl_id,
            arl_nombre: record.afiliaciones.arlName,
            ccf_id: record.afiliaciones.ccf_id,
            ccf_nombre: record.afiliaciones.ccfName,
            nivel_riesgo_arl: record.afiliaciones.arlRiskLevel,
            subtipo_cotizante: record.afiliaciones.contributorSubtype,
            entidad_legal: record.historialLaboral.legalEntity,
            updated_at: record.afiliaciones.updated_at
        },
        sst: {
            talla_camisa: record.sst.shirtSize,
            talla_pantalon: record.sst.pantsSize,
            talla_calzado: record.sst.shoeSize,
            tipo_sangre: record.sst.bloodType,
            contacto_emergencia: record.sst.emergencyContact,
            telefono_emergencia: record.sst.emergencyPhone
        },

        // ── Timestamps ──
        created_at: sanitizeDate(record.maestro.created_at),
        updated_at: sanitizeDate(record.maestro.updated_at),
    };
};

export async function getEmployeesService(tenantId: string): Promise<FullEmployeeRecord[]> {
    if (!tenantId?.trim()) return [];

    try {
        const maskedKey = supabaseKey?.substring(0, 10) + "...";
        const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        console.log(`\n\n[Vercel Runtime Audit] getEmployeesService called!`);
        console.log(`=> tenantId recibida desde la UI: '${tenantId}'`);
        console.log(`=> Key detectada: ${maskedKey}`);
        console.log(`=> Usando SERVICE_ROLE_KEY? ${isServiceRole}\n\n`);

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('dim_employee')
            .select('*, dim_job_title(title), dim_role_title(role_title)')
            .eq('tenant_id', tenantId)
            .order('eid', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapFromDb);
    } catch (error: any) {
        console.error('[HR Service] getEmployees error:', error);
        throw new Error(`Failed to fetch employees: ${error.message}`);
    }
}

export async function addEmployeeService(employee: FullEmployeeRecord, tenantId: string): Promise<FullEmployeeRecord[]> {
    if (!tenantId?.trim()) throw new Error("Tenant ID is required to add an employee.");

    try {
        const supabase = getSupabase();
        const recordToSave = { ...employee, tenant_id: tenantId };
        const dbRow = mapToDb(recordToSave);

        const { error } = await supabase
            .from('dim_employee')
            .insert([dbRow]);

        if (error) throw error;

        return getEmployeesService(tenantId);
    } catch (error: any) {
        console.error('[HR Service] addEmployee error:', error);
        throw new Error(`Critical DB Error (Add Employee): ${error.message}`);
    }
}

export async function updateEmployeeService(employee: FullEmployeeRecord, tenantId: string): Promise<FullEmployeeRecord[]> {
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

        return getEmployeesService(tenantId);
    } catch (error: any) {
        console.error('[HR Service] updateEmployee error:', error);
        throw new Error(`Critical DB Error (Update Employee): ${error.message}`);
    }
}

export async function saveEmployeesService(employees: FullEmployeeRecord[], tenantId: string): Promise<void> {
    if (!tenantId?.trim() || employees.length === 0) return;

    try {
        const supabase = getSupabase();
        const dbRows = employees.map(emp => mapToDb({ ...emp, tenant_id: tenantId }));

        const { error } = await supabase
            .from('dim_employee')
            .upsert(dbRows, { onConflict: 'eid' });

        if (error) throw error;
    } catch (error: any) {
        console.error('[HR Service] saveEmployees error:', error);
        throw new Error(`Critical DB Error (Batch Save): ${error.message}`);
    }
}

export async function processJobDescriptionAudioService(base64Audio: string): Promise<Partial<JobDescriptionData>> {
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
        return JSON.parse(cleanJsonStr);

    } catch (error: any) {
        console.error('[HR Service] processJobDescriptionAudio error:', error);
        throw new Error(error.message || "Failed to process audio with AI.");
    }
}
