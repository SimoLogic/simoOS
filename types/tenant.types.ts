// ─── Tenant Types ─────────────────────────────────────────────────────────────

export type ReportingCurrency = "USD" | "EUR" | "COP";

export type AMRole = "HR" | "Finance" | "Operations" | "General";

export type POCRole =
    | "CEO"
    | "CFO"
    | "COO"
    | "HR Manager"
    | "Finance Manager"
    | "Operations Manager"
    | "Primary Contact"
    | "Billing Contact"
    | "Other";

export interface TenantPOC {
    id: string; // uuid
    first_name: string;
    last_name: string;
    phone: string;
    corporate_email: string;
    role: POCRole | string;
}

export interface TenantAM {
    employee_eid: string; // references FullEmployeeRecord.eid
    employee_name: string; // cached display name
    am_role: AMRole;
}

export interface TenantHQAddress {
    country: string;
    city: string;
    state: string;
    street_address: string;
}

export interface Tenant {
    tenant_id: string;             // e.g. "TNT-001"
    legal_name: string;
    dba_name: string;          // Mandatory – "Doing Business As"
    hq_address: TenantHQAddress;
    reporting_currency: ReportingCurrency;
    status: boolean;           // true = Active
    pocs: TenantPOC[];         // Max 10
    account_managers: TenantAM[];
    created_at: string;        // ISO
}

// ─── Simulated Session (for deactivation safety guard) ───────────────────────

export interface SimulatedSession {
    session_id: string;
    tenant_id: string;         // Tenant.tcode
    user_ide: string;          // Employee ID or "ADMIN"
    user_name: string;
    active_module: string;
    active_submodule: string;
}

// ─── Blank factories ──────────────────────────────────────────────────────────

export const blankPOC = (): TenantPOC => ({
    id: crypto.randomUUID(),
    first_name: "",
    last_name: "",
    phone: "",
    corporate_email: "",
    role: "",
});

export const blankTenant = (): Omit<Tenant, "tenant_id" | "created_at"> => ({
    legal_name: "",
    dba_name: "",
    hq_address: { country: "", city: "", state: "", street_address: "" },
    reporting_currency: "USD",
    status: true,
    pocs: [blankPOC()],
    account_managers: [],
});

// ─── Constants ────────────────────────────────────────────────────────────────

export const REPORTING_CURRENCIES: { value: ReportingCurrency; label: string }[] = [
    { value: "USD", label: "USD – US Dollar" },
    { value: "EUR", label: "EUR – Euro" },
    { value: "COP", label: "COP – Colombian Peso" },
];

export const AM_ROLES: { value: AMRole; label: string }[] = [
    { value: "HR", label: "HR Matters" },
    { value: "Finance", label: "Finance Matters" },
    { value: "Operations", label: "Operations Matters" },
    { value: "General", label: "General Account Manager" },
];

export const POC_ROLES: string[] = [
    "CEO", "CFO", "COO", "HR Manager", "Finance Manager",
    "Operations Manager", "Primary Contact", "Billing Contact", "Other",
];

export const COUNTRIES: string[] = [
    "United States", "Colombia", "Spain", "France", "Germany",
    "United Kingdom", "Mexico", "Canada", "Brazil", "Other",
];
