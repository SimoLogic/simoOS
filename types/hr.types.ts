// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · HR Module · Data Types
// Mirrors the 5 DB tables defined in:
//   "HR Sub modulo Maestro HC. Esquema de Base de Datos HOMESI.xlsx"
// ─────────────────────────────────────────────────────────────────────────────

// ── Lookup / Enum Types ───────────────────────────────────────────────────────

export type TipoDocumento = "SSN" | "ID" | "PPT" | "PEP" | "PA" | "NIT" | "";
export type Genero = "M" | "F" | "X" | "";
export type TipoContrato = "Fixed Term" | "Indefinite Term" | "Project-Based" | "Service Provision" | "";
export type TipoSalario = "Fixed" | "Variable" | "Comprehensive" | "";
export type ProcedimientoRenta = 1 | 2 | 0;
export type NivelRiesgoARL = 1 | 2 | 3 | 4 | 5 | 0;
export type TallaCamisa = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "";
export type TallaPantalon = "28" | "30" | "32" | "34" | "36" | "38" | "40" | "42" | "";
export type TipoSangre = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";

// ── M1: Maestro de Empleados ──────────────────────────────────────────────────
// PK: numero_identificacion
// Stores immutable personal identity data

export interface EmpleadoMaestro {
    // PK
    numero_identificacion: string;           // VARCHAR – PK, sin puntos ni guiones
    tipo_documento_id: TipoDocumento;        // VARCHAR(5) – Códigos DIAN
    // Personal
    primer_nombre: string;                   // VARCHAR(50) – REQUIRED
    otros_nombres: string;                   // VARCHAR(50) – Optional
    primer_apellido: string;                 // VARCHAR(50) – REQUIRED
    segundo_apellido: string;                // VARCHAR(50) – REQUIRED
    fecha_nacimiento: string;                // DATE (ISO string) – REQUIRED
    genero: Genero;                          // VARCHAR(1) – REQUIRED
    email_personal: string;                  // VARCHAR(100) – REQUIRED
    municipio_dane: string;                  // VARCHAR(5) – Código DANE 5 dígitos
    direccion_residencia: string;            // TEXT – REQUIRED
    // Geography (linked to dim_continent, dim_country, dim_city)
    continent_id?: string | null;
    country_id?: string | null;
    city_id?: string | null;
    // System
    created_at: string;
    updated_at: string;
}

// ── M2 + M4: Historial Laboral ────────────────────────────────────────────────
// PK: id_historial (autoincremental)
// FK: empleado_id → EmpleadoMaestro.numero_identificacion
// Each row = one job/salary snapshot. New row on every change = full history.

export interface HistorialLaboral {
    id_historial?: number;                   // INT – PK autoincremental
    empleado_id: string;                     // FK → EmpleadoMaestro
    // Dates
    fecha_inicio: string;                    // DATE – REQUIRED
    fecha_fin: string;                       // DATE – null = current record
    // Contract
    tipo_contrato: TipoContrato;             // VARCHAR(20) – REQUIRED
    tipo_salario: TipoSalario;              // VARCHAR(20) – REQUIRED
    salario_base: number;                    // DECIMAL(18,2) – REQUIRED (mensual)
    procedimiento_renta: ProcedimientoRenta; // INT – 1 or 2
    // Org structure
    entidad_legal: string;                   // VARCHAR(100) – REQUIRED (e.g. HOMESI SAS)
    area: string;                            // VARCHAR(50) – REQUIRED
    sub_area: string;                        // VARCHAR(50) – REQUIRED
    centro_costo: string;                    // VARCHAR(10) – REQUIRED
    nombre_centro_costo: string;             // VARCHAR(100)
    sub_centro_costo: string;               // VARCHAR(10)
    nombre_sub_centro_costo: string;        // VARCHAR(100)
    branch: string;                          // VARCHAR(10) – Sede
    cliente: string;                         // VARCHAR(15)
    project: string;                         // VARCHAR(100)
    digito_dedicacion: number;               // INT – % dedicación (0-100)
    direct_leader: string;                   // VARCHAR(100) – REQUIRED
    direct_leader_id?: string | null;        // FK → dim_employee.eid (optional)
    job_title: string;                       // VARCHAR(100) – Optional, role label
    role_title: string;                      // VARCHAR(100) – Optional, granular role
    // Monetary
    salary_currency?: string | null;         // "COP", "USD", "EUR", "PEN"
    // System
    created_at?: string;
}

// ── M3: Afiliaciones de Seguridad Social ─────────────────────────────────────
// FK: empleado_id → EmpleadoMaestro.numero_identificacion
// Colombia mandatory social security affiliations

export interface EmpleadoAfiliaciones {
    empleado_id: string;                     // FK – REQUIRED
    // Entidades
    eps_id: string;                          // FK → Maestro EPS – REQUIRED
    eps_nombre: string;                      // Denormalized for display
    afp_id: string;                          // FK → Maestro AFP – REQUIRED
    afp_nombre: string;
    arl_id: string;                          // FK → Maestro ARL – REQUIRED
    arl_nombre: string;
    ccf_id: string;                          // FK → Caja Compensación – REQUIRED
    ccf_nombre: string;
    // Risk & Contribution
    nivel_riesgo_arl: NivelRiesgoARL;        // INT – Clase I a V – REQUIRED
    subtipo_cotizante: string;               // VARCHAR(2) – Códigos PILA – REQUIRED
    // System
    updated_at?: string;
}

// ── M5: SST – Seguridad y Salud en el Trabajo ────────────────────────────────
// FK: empleado_id → EmpleadoMaestro.numero_identificacion

export interface EmpleadoSST {
    empleado_id: string;                     // FK – REQUIRED
    // Dotación
    talla_camisa: TallaCamisa;              // VARCHAR(5) – REQUIRED (legal)
    talla_pantalon: TallaPantalon;          // VARCHAR(5) – REQUIRED (legal)
    talla_calzado: number;                   // INT – REQUIRED (legal)
    // Medical
    tipo_sangre: TipoSangre;               // VARCHAR(5) – REQUIRED
    // Emergency contact
    contacto_emergencia: string;             // VARCHAR(100) – REQUIRED
    telefono_emergencia: string;             // VARCHAR(20) – REQUIRED
}

// ── Composite: Full Employee Record (all 5 tables joined) ─────────────────────
// This is what gets stored in the HC Maestro after onboarding is complete.

export interface FullEmployeeRecord {
    maestro: EmpleadoMaestro;
    historialLaboral: HistorialLaboral;
    afiliaciones: EmpleadoAfiliaciones;
    sst: EmpleadoSST;
    // Derived / system fields
    eid: string;                             // Auto-generated EID (e.g. EID-0042)
    status: "Active" | "Inactive" | "On Leave" | "Terminated";
    tenant_id?: string;                    // TCODE of the owning tenant (e.g. TNT-001)
    foto_url?: string;
    email_corporativo?: string;
    continent_id?: string | null;
    country_id?: string | null;
    city_id?: string | null;
    salary_currency?: string | null;
    direct_leader_id?: string | null;
}

// ── Reference Data (Lookup Tables) ───────────────────────────────────────────

/** Static fallback used when dim_local_legal_entity cannot be reached */
export const ENTIDADES_LEGALES = [
    "HOMESI SAS",
    "HOMESI BPO SAS",
];

/** Mirrors the dim_local_legal_entity DB table */
export interface LocalLegalEntity {
    id: string;
    entity_name: string;       // "Local Entity" — matches entidad_legal in dim_employee
    local_tax_id: string | null;   // NIT or equivalent tax ID
    local_ein: string | null;      // US EIN or local equivalent
    entity_country: string;    // Defaults to "Colombia"
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
    { value: "SSN", label: "Social Security Number (SSN)" },
    { value: "ID", label: "National ID (CC/CE)" },
    { value: "PPT", label: "Temporary Protection Permit (PPT)" },
    { value: "PEP", label: "Special Residence Permit (PEP)" },
    { value: "PA", label: "Passport (PA)" },
    { value: "NIT", label: "Tax ID (NIT)" },
];

export const TIPOS_CONTRATO: { value: TipoContrato; label: string }[] = [
    { value: "Fixed Term", label: "Fixed Term" },
    { value: "Indefinite Term", label: "Indefinite Term" },
    { value: "Project-Based", label: "Project-Based (Obra/Labor)" },
    { value: "Service Provision", label: "Service Provision" },
];

export const TIPOS_SALARIO: { value: TipoSalario; label: string }[] = [
    { value: "Fixed", label: "Fixed Salary" },
    { value: "Variable", label: "Variable Salary" },
    { value: "Comprehensive", label: "Comprehensive (Integral)" },
];

export const EPS_OPTIONS = [
    { id: "EPS001", nombre: "Sura EPS" },
    { id: "EPS002", nombre: "Sanitas EPS" },
    { id: "EPS003", nombre: "Nueva EPS" },
    { id: "EPS004", nombre: "Compensar EPS" },
    { id: "EPS005", nombre: "Famisanar EPS" },
    { id: "EPS006", nombre: "Salud Total EPS" },
    { id: "EPS007", nombre: "Coosalud EPS" },
    { id: "EPS008", nombre: "Medimás EPS" },
];

export const AFP_OPTIONS = [
    { id: "AFP001", nombre: "Porvenir" },
    { id: "AFP002", nombre: "Protección" },
    { id: "AFP003", nombre: "Colfondos" },
    { id: "AFP004", nombre: "Old Mutual (Skandia)" },
    { id: "AFP005", nombre: "Colpensiones (RPM)" },
];

export const ARL_OPTIONS = [
    { id: "ARL001", nombre: "Sura ARL" },
    { id: "ARL002", nombre: "Positiva ARL" },
    { id: "ARL003", nombre: "Colmena ARL" },
    { id: "ARL004", nombre: "Axa Colpatria ARL" },
    { id: "ARL005", nombre: "Liberty ARL" },
];

export const CCF_OPTIONS = [
    { id: "CCF001", nombre: "Compensar" },
    { id: "CCF002", nombre: "Colsubsidio" },
    { id: "CCF003", nombre: "Cafam" },
    { id: "CCF004", nombre: "Comfama" },
    { id: "CCF005", nombre: "Comfenalco" },
];

export const SUBTIPO_COTIZANTE_OPTIONS = [
    { value: "01", label: "01 – Employee" },
    { value: "02", label: "02 – Working Pensioner" },
    { value: "12", label: "12 – Apprentice (Productive Stage)" },
    { value: "19", label: "19 – Part-time Worker" },
    { value: "23", label: "23 – Suspended Worker" },
    { value: "40", label: "40 – Additional UPC Beneficiary" },
    { value: "51", label: "51 – Voluntary Contributor" },
];

export const MUNICIPIOS_DANE = [
    { code: "11001", name: "Bogotá D.C." },
    { code: "05001", name: "Medellín" },
    { code: "76001", name: "Cali" },
    { code: "08001", name: "Barranquilla" },
    { code: "13001", name: "Cartagena" },
    { code: "17001", name: "Manizales" },
    { code: "18001", name: "Florencia" },
    { code: "19001", name: "Popayán" },
    { code: "23001", name: "Montería" },
    { code: "25001", name: "Agua de Dios" },
    { code: "41001", name: "Neiva" },
    { code: "44001", name: "Riohacha" },
    { code: "47001", name: "Santa Marta" },
    { code: "50001", name: "Villavicencio" },
    { code: "52001", name: "Pasto" },
    { code: "54001", name: "Cúcuta" },
    { code: "63001", name: "Armenia" },
    { code: "66001", name: "Pereira" },
    { code: "68001", name: "Bucaramanga" },
    { code: "70001", name: "Sincelejo" },
    { code: "73001", name: "Ibagué" },
];

export const AREAS_EMPRESA = [
    "Operations",
    "Human Resources",
    "Finance",
    "Technology",
    "Commercial",
    "Compliance",
    "Executive",
    "Legal",
    "Marketing",
];

export const SUB_AREAS: Record<string, string[]> = {
    "Operations": ["BPO Delivery", "Client Success", "Quality", "Process Improvement"],
    "Human Resources": ["Talent Management", "Payroll", "Recruitment", "Training & Development"],
    "Finance": ["Controlling", "Accounts Payable", "Accounts Receivable", "Treasury"],
    "Technology": ["Infrastructure", "Development", "Security", "Support"],
    "Commercial": ["New Business", "Account Management", "Marketing"],
    "Compliance": ["Regulatory", "Audit", "Data Security"],
    "Executive": ["Leadership", "Strategy"],
    "Legal": ["Contracts", "Labor Law"],
    "Marketing": ["Digital", "Brand", "Content"],
};

// ── Blank form initializers ───────────────────────────────────────────────────

export const blankMaestro = (): Omit<EmpleadoMaestro, "created_at" | "updated_at"> => ({
    numero_identificacion: "",
    tipo_documento_id: "",
    primer_nombre: "",
    otros_nombres: "",
    primer_apellido: "",
    segundo_apellido: "",
    fecha_nacimiento: "",
    genero: "",
    email_personal: "",
    municipio_dane: "",
    direccion_residencia: "",
    continent_id: null,
    country_id: null,
    city_id: null,
});

export const blankHistorial = (empleado_id = ""): Omit<HistorialLaboral, "id_historial" | "created_at"> => ({
    empleado_id,
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    tipo_contrato: "",
    tipo_salario: "",
    salario_base: 0,
    procedimiento_renta: 0,
    entidad_legal: "",
    area: "",
    sub_area: "",
    centro_costo: "",
    nombre_centro_costo: "",
    sub_centro_costo: "",
    nombre_sub_centro_costo: "",
    branch: "",
    cliente: "",
    project: "",
    digito_dedicacion: 100,
    direct_leader: "",
    direct_leader_id: null,
    job_title: "",
    role_title: "",
    salary_currency: null,
});

export const blankAfiliaciones = (empleado_id = ""): EmpleadoAfiliaciones => ({
    empleado_id,
    eps_id: "",
    eps_nombre: "",
    afp_id: "",
    afp_nombre: "",
    arl_id: "",
    arl_nombre: "",
    ccf_id: "",
    ccf_nombre: "",
    nivel_riesgo_arl: 0,
    subtipo_cotizante: "",
});

export const blankSST = (empleado_id = ""): EmpleadoSST => ({
    empleado_id,
    talla_camisa: "",
    talla_pantalon: "",
    talla_calzado: 0,
    tipo_sangre: "",
    contacto_emergencia: "",
    telefono_emergencia: "",
});
