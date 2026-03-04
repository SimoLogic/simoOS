import { Tenant } from "./tenant-types";
import { supabase } from "./database";
import { sanitizeStr, sanitizeOptStr } from "./utils/sanitizers";

// ─── TCODE Generation ─────────────────────────────────────────────────────────

export const generateTCODE = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('dim_tenant')
        .select('tcode')
        .order('tcode', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) return "TNT-001";

    const last = data[0].tcode;
    const num = parseInt(last.split("-")[1], 10);
    return `TNT-${String(num + 1).padStart(3, "0")}`;
};

// ─── Tenant Mapping ────────────────────────────────────────────────────────────

const mapTenantFromDb = (dbRow: any): Tenant => {
    return {
        ...dbRow,
        tenant_id: dbRow.tcode,
        pocs: dbRow.pocs || [],
        account_managers: dbRow.account_managers || [],
        hq_address: dbRow.hq_address || {}
    };
};

const mapTenantToDb = (tenant: Tenant): any => {
    return {
        tcode: sanitizeStr(tenant.tenant_id, 15),
        legal_name: (tenant.legal_name ?? "").slice(0, 255),
        dba_name: sanitizeStr(tenant.dba_name, 255),
        reporting_currency: tenant.reporting_currency,
        status: tenant.status ?? true,
        hq_address: tenant.hq_address ?? {},
        pocs: tenant.pocs ?? [],
        account_managers: tenant.account_managers ?? [],
        created_at: tenant.created_at,
    };
};



// ─── Tenant CRUD ──────────────────────────────────────────────────────────────

export const getTenants = async (): Promise<Tenant[]> => {
    const { data, error } = await supabase
        .from('dim_tenant')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error fetching tenants: ${error.message}`);
    }
    return (data || []).map(mapTenantFromDb);
};

export const addTenant = async (tenant: Tenant): Promise<Tenant[]> => {
    const { error } = await supabase
        .from('dim_tenant')
        .insert([mapTenantToDb(tenant)]);

    if (error) {
        throw new Error(`Error adding tenant: ${error.message}`);
    }
    return getTenants();
};

export const updateTenant = async (tenant: Tenant): Promise<Tenant[]> => {
    const { error } = await supabase
        .from('dim_tenant')
        .update(mapTenantToDb(tenant))
        .eq('tcode', tenant.tenant_id);

    if (error) {
        throw new Error(`Error updating tenant: ${error.message}`);
    }
    return getTenants();
};

export const getActiveTenants = async (): Promise<Tenant[]> => {
    const { data, error } = await supabase
        .from('dim_tenant')
        .select('*')
        .eq('status', true);

    if (error) {
        throw new Error(`Error fetching active tenants: ${error.message}`);
    }
    return (data || []).map(mapTenantFromDb);
};

export const getTenantByTcode = async (tcode: string): Promise<Tenant | undefined> => {
    const { data, error } = await supabase
        .from('dim_tenant')
        .select('*')
        .eq('tcode', tcode)
        .single();

    if (error || !data) {
        console.error(`Error fetching tenant by tcode: ${error?.message}`);
        return undefined;
    }
    return mapTenantFromDb(data);
};
