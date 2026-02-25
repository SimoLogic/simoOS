import { FullEmployeeRecord } from "./hr-types";
import { supabase } from "./database";
import {
    sanitizeDate, sanitizeStr, sanitizeOptStr, sanitizeNum
} from "./utils/sanitizers";

// ─── Mapping Helpers ──────────────────────────────────────────────────────────

const mapToDb = (record: FullEmployeeRecord) => {
    return {
        eid: sanitizeStr(record.eid),
        tenant_id: sanitizeStr(record.tenant_id),
        status: sanitizeStr(record.status) || "Active",
        email_corporativo: sanitizeOptStr(record.email_corporativo),
        foto_url: sanitizeOptStr(record.foto_url),

        // Identity (Maestro)
        numero_identificacion: sanitizeStr(record.maestro.numero_identificacion).slice(0, 20),
        tipo_documento_id: sanitizeStr(record.maestro.tipo_documento_id).slice(0, 10),
        primer_nombre: sanitizeStr(record.maestro.primer_nombre).slice(0, 100),
        otros_nombres: sanitizeOptStr(record.maestro.otros_nombres)?.slice(0, 100) ?? null,
        primer_apellido: sanitizeStr(record.maestro.primer_apellido).slice(0, 100),
        segundo_apellido: sanitizeStr(record.maestro.segundo_apellido).slice(0, 100),
        fecha_nacimiento: sanitizeDate(record.maestro.fecha_nacimiento),
        genero: sanitizeStr(record.maestro.genero).slice(0, 1),
        email_personal: sanitizeStr(record.maestro.email_personal).slice(0, 255),
        municipio_dane: sanitizeStr(record.maestro.municipio_dane).slice(0, 10),
        direccion_residencia: sanitizeStr(record.maestro.direccion_residencia),

        // Laboral Snapshot
        fecha_inicio: sanitizeDate(record.historialLaboral.fecha_inicio),
        fecha_fin: sanitizeDate(record.historialLaboral.fecha_fin),
        tipo_contrato: sanitizeStr(record.historialLaboral.tipo_contrato).slice(0, 50),
        tipo_salario: sanitizeStr(record.historialLaboral.tipo_salario).slice(0, 50),
        salario_base: sanitizeNum(record.historialLaboral.salario_base),
        procedimiento_renta: sanitizeNum(record.historialLaboral.procedimiento_renta, 1),
        entidad_legal: sanitizeOptStr(record.historialLaboral.entidad_legal),
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

        // JSONB Fields
        afiliaciones: record.afiliaciones,
        sst: record.sst,

        // Timestamps
        created_at: sanitizeDate(record.maestro.created_at),
        updated_at: sanitizeDate(record.maestro.updated_at),
    };
};


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
            otros_nombres: dbRow.otros_nombres,
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
            salario_base: dbRow.salario_base,
            procedimiento_renta: dbRow.procedimiento_renta,
            entidad_legal: dbRow.entidad_legal,
            area: dbRow.area,
            sub_area: dbRow.sub_area,
            centro_costo: dbRow.centro_costo,
            nombre_centro_costo: dbRow.nombre_centro_costo,
            sub_centro_costo: dbRow.sub_centro_costo,
            nombre_sub_centro_costo: dbRow.nombre_sub_centro_costo,
            branch: dbRow.branch,
            cliente: dbRow.cliente,
            project: dbRow.project,
            digito_dedicacion: dbRow.digito_dedicacion,
            direct_leader: dbRow.direct_leader,
            job_title: dbRow.job_title ?? "",
            created_at: dbRow.created_at
        },

        afiliaciones: dbRow.afiliaciones,
        sst: dbRow.sst
    };
};

// ─── Store Logic ─────────────────────────────────────────────────────────────

export const getEmployees = async (tenantCode: string): Promise<FullEmployeeRecord[]> => {
    if (!tenantCode) return [];

    const { data, error } = await supabase
        .from('dim_employee')
        .select('*')
        .eq('tenant_id', tenantCode)
        .order('eid', { ascending: true });

    if (error) {
        throw new Error(`Error fetching employees: ${error.message}`);
    }
    return (data || []).map(mapFromDb);
};

export const addEmployee = async (employee: FullEmployeeRecord, tenantCode: string) => {
    if (!tenantCode) throw new Error("Tenant code is required.");

    // Ensure tenant code is set on the record
    const recordToSave = { ...employee, tenant_id: tenantCode };

    const { error } = await supabase
        .from('dim_employee')
        .insert([mapToDb(recordToSave)]);

    if (error) {
        throw new Error(`Error adding employee: ${error.message}`);
    }
    return getEmployees(tenantCode);
};

export const updateEmployee = async (employee: FullEmployeeRecord, tenantCode: string) => {
    if (!tenantCode) throw new Error("Tenant code is required.");

    const recordToSave = { ...employee, tenant_id: tenantCode };

    const { error } = await supabase
        .from('dim_employee')
        .update(mapToDb(recordToSave))
        .eq('eid', employee.eid)
        .eq('tenant_id', tenantCode);

    if (error) {
        throw new Error(`Error updating employee: ${error.message}`);
    }
    return getEmployees(tenantCode);
};

// Helper for Batch Changes - allows passing a partial update
export const saveEmployees = async (employees: FullEmployeeRecord[], tenantCode: string) => {
    if (!tenantCode || employees.length === 0) return;

    // Ensure tenant code is set on all records
    const dbRows = employees.map(emp => mapToDb({ ...emp, tenant_id: tenantCode }));

    const { error } = await supabase
        .from('dim_employee')
        .upsert(dbRows, { onConflict: 'eid' });

    if (error) {
        throw new Error(`Error saving all employees: ${error.message}`);
    }
};
