// ─────────────────────────────────────────────────────────────────────────────
// HC Master Excel Import — Parser, Validator & Rejection Engine
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import {
    FullEmployeeRecord,
    TIPOS_DOCUMENTO, TIPOS_CONTRATO, TIPOS_SALARIO,
    EPS_OPTIONS, AFP_OPTIONS, ARL_OPTIONS, CCF_OPTIONS,
    ENTIDADES_LEGALES,
} from "./hr-types";
import { getEmployeesAction as getEmployees } from "../app/actions/hr-actions";
import { getLocalLegalEntitiesAction } from "../app/actions/legal-entity-actions";
import { JobTitleRef } from "./job-title-types";

// ─── Rejection Reason Bank ────────────────────────────────────────────────────

export const REJECTION_REASONS = {
    LOCKED_FIELD: (field: string) =>
        `"${field}" is an identity field that cannot be modified for existing employees.`,
    REQUIRED_MISSING: (field: string) =>
        `Required field missing: "${field}". This field must be populated before importing.`,
    INVALID_OPTION: (field: string, allowed: string) =>
        `Invalid value for "${field}". Allowed values are: ${allowed}.`,
    INVALID_EMAIL: (field: string) =>
        `Invalid email format in field "${field}". Expected format: name@domain.com`,
    SALARY_NEGATIVE: () =>
        `Base salary must be a positive number greater than zero.`,
    DEDICATION_RANGE: () =>
        `Dedication percentage must be a whole number between 1 and 100.`,
    INVALID_NAME: (field: string) =>
        `"${field}" contains invalid characters. Names must only contain letters, spaces, hyphens, or apostrophes.`,
    SHOE_SIZE_RANGE: () =>
        `Shoe size must be a number between 30 and 50 (Colombian sizing).`,
    BLOOD_TYPE_INVALID: () =>
        `Blood type is not a valid value. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-.`,
    EID_DUPLICATE: (eid: string) =>
        `EID "${eid}" is already assigned to another employee in the system.`,
    DOC_TYPE_INVALID: () =>
        `Document type is not recognized. Allowed values: CC, CE, PPT, PEP, PA.`,
    GENDER_INVALID: () =>
        `Gender value is not recognized. Allowed values: M (Male), F (Female), X (Non-binary).`,
    CONTRACT_TYPE_INVALID: () =>
        `Contract type is not recognized. Please use an exact value from the approved list.`,
    SALARY_TYPE_INVALID: () =>
        `Salary type is not recognized. Allowed: Fijo, Variable, Integral.`,
    ARL_RISK_RANGE: () =>
        `ARL risk level must be a number between 1 (Class I) and 5 (Class V).`,
    ENTITY_NOT_FOUND: (entity: string, field: string) =>
        `"${entity}" is not in the approved list for ${field}. Please use an entity from the official registry.`,
    PROC_RENTA_INVALID: () =>
        `Income tax procedure must be 1 (Procedure 1) or 2 (Procedure 2).`,
    SUBTIPO_COTIZANTE_INVALID: () =>
        `PILA contributor subtype is not recognized. Please use a valid PILA code (e.g., 01, 02, 12, 19).`,
    ID_FORMAT_INVALID: () =>
        `ID number contains invalid characters. Only alphanumeric characters are allowed (no dots or dashes).`,
    DATE_INVALID: (field: string) =>
        `"${field}" is not a valid date. Required format: YYYY-MM-DD.`,
    FUTURE_BIRTH_DATE: () =>
        `Date of birth cannot be in the future.`,
    SALARY_NOT_NUMBER: () =>
        `Base salary must be a numeric value (e.g., 1300000). Remove currency symbols or letters.`,
    MISSING_AREA: () =>
        `Area is required and must match an organizational area defined in the company structure.`,
    SUB_AREA_MISMATCH: () =>
        `Sub-area does not belong to the selected Area. Verify the area / sub-area combination.`,
    CANT_CHANGE_EID: () =>
        `The EID column for an existing employee cannot be overwritten with a different EID.`,
    TENANT_MISMATCH: (expected: string, found: string) =>
        `Security Violation: This employee belongs to tenant "${found}", but you are importing into "${expected}". Access denied.`,
    MISSING_CONTRACT: () => // Added
        `Contract type is required. Avoid blanks.`, // Added
    INVALID_ENTITY: (val: string) => // Added
        `"${val}" is not a recognized Local Entity. Must be one of: ${ENTIDADES_LEGALES.join(", ")}.`, // Added
    MISSING_SALARY_TYPE: () =>
        `Salary type is required. Avoid blanks.`,
    INVALID_JOB_TITLE: (val: string) =>
        `"${val}" is not a recognized Job Title in the Active library.`,
    INVALID_ROLE_TITLE: (val: string, jobTitle: string) =>
        `"${val}" is not a recognized Role Title for Job Title "${jobTitle}".`,
};

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type RejectionReason = string; // human-readable sentence from the bank above

export interface FieldError {
    field: string;       // column label
    reason: string;      // rejection reason text
}

export interface FieldDiff {
    key: string;         // dot-path key matching FullEmployeeRecord
    label: string;
    oldValue: string | number;
    newValue: string | number;
    isLocked: boolean;   // true → this change will be rejected
    rejectionReason?: string;
}

export type ImportRowStatus = "valid" | "rejected" | "partial"; // partial = some changes valid, some not

export interface AuditedExistingRow {
    eid: string;
    firstName: string;
    lastName: string;
    diffs: FieldDiff[];          // only changed fields
    overallStatus: ImportRowStatus;
    approvedByUser: boolean;
}

export interface AuditedNewRow {
    rowIndex: number;            // 1-based original row number in the Excel
    raw: Record<string, string>; // the raw parsed row for reference
    mapped: Partial<FullEmployeeRecord> | null;
    errors: FieldError[];
    overallStatus: "valid" | "rejected";
    approvedByUser: boolean;
    assignedEID?: string;        // auto-generated once HR approves
}

export interface ImportAuditResult {
    existingRows: AuditedExistingRow[];
    newRows: AuditedNewRow[];
    totalRows: number;
    validExisting: number;
    rejectedExisting: number;
    validNew: number;
    rejectedNew: number;
}

// ─── Locked Fields ────────────────────────────────────────────────────────────

const LOCKED_FIELD_KEYS = new Set<string>([
    "eid",
    "maestro.identificationNumber",
    "maestro.documentTypeId",
    "maestro.firstName",
    "maestro.lastName",
    "maestro.secondLastName",
    "maestro.birthDate",
]);

const LOCKED_FIELD_LABELS: Record<string, string> = {
    "eid": "EID",
    "maestro.identificationNumber": "ID Number",
    "maestro.documentTypeId": "Document Type",
    "maestro.firstName": "First Name",
    "maestro.lastName": "First Last Name",
    "maestro.secondLastName": "Second Last Name",
    "maestro.birthDate": "Date of Birth",
};

// ─── Excel Column → Field Mapping ─────────────────────────────────────────────

// Maps spreadsheet column headers (case-insensitive) to FullEmployeeRecord dot paths
export const EXCEL_COLUMN_MAP: Record<string, { key: string; label: string }> = {
    "eid": { key: "eid", label: "EID" },
    "tenant code": { key: "tenant_id", label: "Tenant Code" },
    "first name": { key: "maestro.firstName", label: "First Name" },
    "middle name": { key: "maestro.middleNames", label: "Middle Name" },
    "first last name": { key: "maestro.lastName", label: "First Last Name" },
    "second last name": { key: "maestro.secondLastName", label: "Second Last Name" },
    "job title": { key: "historialLaboral.jobTitleName", label: "Job Title" },
    "role title": { key: "historialLaboral.roleTitleName", label: "Role Title" },
    "document type": { key: "maestro.documentTypeId", label: "Document Type" },
    "id number": { key: "maestro.identificationNumber", label: "ID Number" },
    "date of birth": { key: "maestro.birthDate", label: "Date of Birth" },
    "gender": { key: "maestro.gender", label: "Gender" },
    "personal email": { key: "maestro.personalEmail", label: "Personal Email" },
    "municipality": { key: "maestro.municipalityCode", label: "Municipality" },
    "address": { key: "maestro.residenceAddress", label: "Home Address" },
    "hire date": { key: "historialLaboral.startDate", label: "Hire Date" },
    "contract type": { key: "historialLaboral.contractType", label: "Contract Type" },
    "local entity": { key: "historialLaboral.legalEntity", label: "Local Entity" },
    "salary type": { key: "historialLaboral.salaryType", label: "Salary Type" },
    "base salary": { key: "historialLaboral.baseSalary", label: "Base Salary" },
    "tax procedure": { key: "historialLaboral.taxProcedure", label: "Tax Procedure" },
    "area": { key: "historialLaboral.area", label: "Area" },
    "sub-area": { key: "historialLaboral.subArea", label: "Sub-Area" },
    "cost center": { key: "historialLaboral.costCenter", label: "Cost Center" },
    "cost center name": { key: "historialLaboral.costCenterName", label: "Cost Center Name" },
    "branch": { key: "historialLaboral.branch", label: "Branch" },
    "client": { key: "historialLaboral.client", label: "Client" },
    "project": { key: "historialLaboral.project", label: "Project" },
    "dedication %": { key: "historialLaboral.dedicationPercentage", label: "Dedication %" },
    "direct leader": { key: "historialLaboral.directLeader", label: "Direct Leader" },
    "eps": { key: "afiliaciones.epsName", label: "EPS" },
    "afp": { key: "afiliaciones.afpName", label: "AFP" },
    "arl": { key: "afiliaciones.arlName", label: "ARL" },
    "ccf": { key: "afiliaciones.ccfName", label: "CCF" },
    "arl risk level": { key: "afiliaciones.arlRiskLevel", label: "ARL Risk Level" },
    "pila subtype": { key: "afiliaciones.contributorSubtype", label: "PILA Subtype" },
    "shirt size": { key: "sst.shirtSize", label: "Shirt Size" },
    "pants size": { key: "sst.pantsSize", label: "Pants Size" },
    "shoe size": { key: "sst.shoeSize", label: "Shoe Size" },
    "blood type": { key: "sst.bloodType", label: "Blood Type" },
    "emergency contact": { key: "sst.emergencyContact", label: "Emergency Contact" },
    "emergency phone": { key: "sst.emergencyPhone", label: "Emergency Phone" },
    "corporate email": { key: "email_corporativo", label: "Corporate Email" },
    "status": { key: "status", label: "Status" },
    "continent": { key: "continent_id", label: "Continent" },
    "country": { key: "country_id", label: "Country" },
    "city": { key: "city_id", label: "City" },
    "currency": { key: "salaryCurrency", label: "Salary Currency" },
    "direct leader id": { key: "historialLaboral.directLeaderId", label: "Direct Leader ID" },
};

// ─── Required Fields for New Hires ───────────────────────────────────────────

const REQUIRED_FOR_NEW: string[] = [
    "maestro.firstName",
    "maestro.lastName",
    "maestro.secondLastName",
    "maestro.documentTypeId",
    "maestro.identificationNumber",
    "maestro.birthDate",
    "maestro.gender",
    "maestro.personalEmail",
    "maestro.municipalityCode",
    "maestro.residenceAddress",
    "historialLaboral.startDate",
    "historialLaboral.contractType",
    "historialLaboral.legalEntity", // Added
    "historialLaboral.salaryType",
    "historialLaboral.baseSalary",
    "historialLaboral.area",
    "historialLaboral.subArea",
    "historialLaboral.costCenter",
    "historialLaboral.directLeader",
    "afiliaciones.epsName",
    "afiliaciones.afpName",
    "afiliaciones.arlName",
    "afiliaciones.ccfName",
    "afiliaciones.arlRiskLevel",
    "afiliaciones.contributorSubtype",
    "sst.shirtSize",
    "sst.pantsSize",
    "sst.shoeSize",
    "sst.bloodType",
    "sst.emergencyContact",
    "sst.emergencyPhone",
];

// ─── Valid Closed-List Values ─────────────────────────────────────────────────

const VALID_VALUES: Record<string, Set<string>> = {
    "maestro.documentTypeId": new Set(TIPOS_DOCUMENTO.filter(t => t.value).map(t => t.value)),
    "maestro.gender": new Set(["M", "F", "X"]),
    "historialLaboral.contractType": new Set(TIPOS_CONTRATO.filter(t => t.value).map(t => t.value)),
    "historialLaboral.salaryType": new Set(TIPOS_SALARIO.filter(t => t.value).map(t => t.value)),
    "afiliaciones.epsName": new Set(EPS_OPTIONS.map(o => o.nombre)),
    "afiliaciones.afpName": new Set(AFP_OPTIONS.map(o => o.nombre)),
    "afiliaciones.arlName": new Set(ARL_OPTIONS.map(o => o.nombre)),
    "afiliaciones.ccfName": new Set(CCF_OPTIONS.map(o => o.nombre)),
    "sst.shirtSize": new Set(["XS", "S", "M", "L", "XL", "XXL"]),
    "sst.pantsSize": new Set(["28", "30", "32", "34", "36", "38", "40", "42"]),
    "sst.bloodType": new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
    // historialLaboral.legalEntity is validated dynamically in parseImportFile (see below)
    "status": new Set(["Active", "Inactive", "On Leave", "Terminated"]),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getVal = (obj: any, path: string): unknown =>
    path.split(".").reduce((a, p) => (a != null ? a[p] : undefined), obj);

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isName = (s: string) => /^[A-Za-zÁÉÍÓÚÑáéíóúñüÜ\s'\-]+$/.test(s.trim());

export const genEID = (() => {
    let counter = Date.now() % 10000;
    return () => `EID-${String(++counter).padStart(4, "0")}`;
})();

// ─── Core Validator ───────────────────────────────────────────────────────────

function validateNewHireRow(row: Record<string, string>, validEntities?: Set<string>, jobTitles?: JobTitleRef[]): FieldError[] {
    const errors: FieldError[] = [];

    const get = (key: string): string => {
        const col = Object.entries(EXCEL_COLUMN_MAP).find(([, v]) => v.key === key);
        if (!col) return "";
        return row[col[0]] ?? "";
    };

    // Required fields
    for (const req of REQUIRED_FOR_NEW) {
        const colEntry = Object.entries(EXCEL_COLUMN_MAP).find(([, v]) => v.key === req);
        const label = colEntry?.[1].label ?? req;
        const val = get(req).trim();
        if (!val) {
            errors.push({ field: label, reason: REJECTION_REASONS.REQUIRED_MISSING(label) });
            continue; // skip further validation for this field
        }

        // Closed-list validation
        if (VALID_VALUES[req] && !VALID_VALUES[req].has(val)) {
            const allowed = Array.from(VALID_VALUES[req]).join(", ");
            errors.push({ field: label, reason: REJECTION_REASONS.INVALID_OPTION(label, allowed) });
        }
    }

    // Name characters
    for (const nameKey of ["maestro.primer_nombre", "maestro.primer_apellido", "maestro.segundo_apellido"]) {
        const v = get(nameKey).trim();
        if (v && !isName(v)) {
            const label = EXCEL_COLUMN_MAP[Object.keys(EXCEL_COLUMN_MAP).find(k => EXCEL_COLUMN_MAP[k].key === nameKey) ?? ""]?.label ?? nameKey;
            errors.push({ field: label, reason: REJECTION_REASONS.INVALID_NAME(label) });
        }
    }

    // Email format
    const email = get("maestro.email_personal").trim();
    if (email && !isEmail(email)) {
        errors.push({ field: "Personal Email", reason: REJECTION_REASONS.INVALID_EMAIL("Personal Email") });
    }

    // Date of birth
    const dob = get("maestro.fecha_nacimiento").trim();
    if (dob) {
        if (!isDate(dob)) {
            errors.push({ field: "Date of Birth", reason: REJECTION_REASONS.DATE_INVALID("Date of Birth") });
        } else if (new Date(dob) > new Date()) {
            errors.push({ field: "Date of Birth", reason: REJECTION_REASONS.FUTURE_BIRTH_DATE() });
        }
    }

    // Hire date
    const hire = get("historialLaboral.fecha_inicio").trim();
    if (hire && !isDate(hire)) {
        errors.push({ field: "Hire Date", reason: REJECTION_REASONS.DATE_INVALID("Hire Date") });
    }

    // Local Entity validation (Added)
    const localEntity = get("historialLaboral.entidad_legal").trim();
    const entitySet = validEntities ?? new Set(ENTIDADES_LEGALES);
    if (localEntity && !entitySet.has(localEntity)) {
        errors.push({ field: "Local Entity", reason: REJECTION_REASONS.INVALID_ENTITY(localEntity) });
    }

    // Salary
    const sal = get("historialLaboral.salario_base").trim().replace(/[$,. ]/g, "");
    if (sal) {
        const n = Number(sal);
        if (isNaN(n)) {
            errors.push({ field: "Base Salary", reason: REJECTION_REASONS.SALARY_NOT_NUMBER() });
        } else if (n <= 0) {
            errors.push({ field: "Base Salary", reason: REJECTION_REASONS.SALARY_NEGATIVE() });
        }
    }

    // Dedication
    const ded = get("historialLaboral.digito_dedicacion").trim();
    if (ded) {
        const n = parseInt(ded);
        if (isNaN(n) || n < 1 || n > 100) {
            errors.push({ field: "Dedication %", reason: REJECTION_REASONS.DEDICATION_RANGE() });
        }
    }

    // Shoe size
    const shoe = get("sst.talla_calzado").trim();
    if (shoe) {
        const n = parseInt(shoe);
        if (isNaN(n) || n < 30 || n > 50) {
            errors.push({ field: "Shoe Size", reason: REJECTION_REASONS.SHOE_SIZE_RANGE() });
        }
    }

    // ARL risk level
    const arlRisk = get("afiliaciones.nivel_riesgo_arl").trim();
    if (arlRisk) {
        const n = parseInt(arlRisk);
        if (isNaN(n) || n < 1 || n > 5) {
            errors.push({ field: "ARL Risk Level", reason: REJECTION_REASONS.ARL_RISK_RANGE() });
        }
    }

    // ID number format
    const idNum = get("maestro.numero_identificacion").trim();
    if (idNum && /[^a-zA-Z0-9]/.test(idNum)) {
        errors.push({ field: "ID Number", reason: REJECTION_REASONS.ID_FORMAT_INVALID() });
    }

    // Job Title validation
    if (jobTitles) {
        const jtStr = get("historialLaboral.jobTitleName").trim();
        if (jtStr) {
            const foundJt = jobTitles.find(j => j.title.toLowerCase() === jtStr.toLowerCase());
            if (!foundJt) {
                errors.push({ field: "Job Title", reason: REJECTION_REASONS.INVALID_JOB_TITLE(jtStr) });
            } else {
                const rtStr = get("historialLaboral.roleTitleName").trim();
                if (rtStr && !foundJt.role_titles?.find(r => r.role_title.toLowerCase() === rtStr.toLowerCase())) {
                    errors.push({ field: "Role Title", reason: REJECTION_REASONS.INVALID_ROLE_TITLE(rtStr, foundJt.title) });
                }
            }
        }
    }

    return errors;
}

// ─── Diff Computation for Existing Employees ──────────────────────────────────

function computeDiffs(existing: FullEmployeeRecord, incoming: Record<string, string>, jobTitles?: JobTitleRef[]): FieldDiff[] {
    const diffs: FieldDiff[] = [];

    for (const [colHeader, { key, label }] of Object.entries(EXCEL_COLUMN_MAP)) {
        if (key === "eid") continue;
        const rawIncoming = incoming[colHeader]?.trim() ?? "";
        if (!rawIncoming) continue;

        const currentVal = getVal(existing, key);
        const currentStr = String(currentVal ?? "").trim();
        if (currentStr === rawIncoming) continue; // no change

        const isLocked = LOCKED_FIELD_KEYS.has(key);
        let rejectionReason = isLocked ? REJECTION_REASONS.LOCKED_FIELD(LOCKED_FIELD_LABELS[key] ?? key) : undefined;

        if (key === "historialLaboral.jobTitleName" && jobTitles) {
            const foundJt = jobTitles.find(j => j.title.toLowerCase() === rawIncoming.toLowerCase());
            if (!foundJt) rejectionReason = REJECTION_REASONS.INVALID_JOB_TITLE(rawIncoming);
        }
        if (key === "historialLaboral.roleTitleName" && jobTitles) {
            const newJtStr = incoming["job title"]?.trim() || existing.historialLaboral.jobTitleName || "";
            const foundJt = jobTitles.find(j => j.title.toLowerCase() === newJtStr.toLowerCase());
            if (!foundJt || !foundJt.role_titles?.find(r => r.role_title.toLowerCase() === rawIncoming.toLowerCase())) {
                rejectionReason = REJECTION_REASONS.INVALID_ROLE_TITLE(rawIncoming, newJtStr);
            }
        }

        diffs.push({
            key,
            label,
            oldValue: currentStr,
            newValue: rawIncoming,
            isLocked: isLocked || !!rejectionReason,
            rejectionReason,
        });
    }

    return diffs;
}

// ─── Main Parse Function ──────────────────────────────────────────────────────

export async function parseImportFile(file: File, currentTenantId?: string): Promise<ImportAuditResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        raw: false,
        defval: "",
    });

    const existingStore = await getEmployees(currentTenantId || "");
    const storeByEID = new Map(existingStore.map((e) => [e.eid.toLowerCase(), e]));

    // Load valid entities dynamically from DB; fall back to static list if unavailable
    const dbEntities = await getLocalLegalEntitiesAction();
    const validEntities = new Set(
        (dbEntities.length > 0 ? dbEntities.map(e => e.entity_name) : ENTIDADES_LEGALES)
    );
    const { getActiveJobTitlesAction } = await import("../app/actions/job-title-actions");
    const jobTitles = await getActiveJobTitlesAction(currentTenantId || "");

    const existingRows: AuditedExistingRow[] = [];
    const newRows: AuditedNewRow[] = [];

    raw.forEach((rawRow, idx) => {
        // Normalize keys to lowercase
        const row: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawRow)) {
            row[k.toLowerCase().trim()] = String(v ?? "").trim();
        }

        const eid = row["eid"] ?? "";

        if (eid) {
            // ─── Existing employee row
            const existing = storeByEID.get(eid.toLowerCase());

            // 1. Check existence
            if (!existing) {
                newRows.push({
                    rowIndex: idx + 2,
                    raw: row,
                    mapped: null,
                    errors: [{ field: "EID", reason: REJECTION_REASONS.EID_DUPLICATE(eid) }],
                    overallStatus: "rejected",
                    approvedByUser: false,
                });
                return;
            }

            // 2. Check tenant isolation
            if (currentTenantId && existing.tenant_id !== currentTenantId) {
                existingRows.push({
                    eid: existing.eid,
                    firstName: existing.maestro.firstName,
                    lastName: existing.maestro.lastName,
                    diffs: [{
                        key: "tenant_id",
                        label: "Tenant Code",
                        oldValue: existing.tenant_id ?? "",
                        newValue: currentTenantId,
                        isLocked: true, // Treat as locked for rejection purposes
                        rejectionReason: REJECTION_REASONS.TENANT_MISMATCH(currentTenantId, existing.tenant_id ?? "N/A"),
                    }],
                    overallStatus: "rejected",
                    approvedByUser: false,
                });
                return;
            }

            const diffs = computeDiffs(existing, row, jobTitles);
            const hasLockedChanges = diffs.some((d) => d.isLocked);

            existingRows.push({
                eid: existing.eid,
                firstName: existing.maestro.firstName,
                lastName: existing.maestro.lastName,
                diffs,
                overallStatus: diffs.length === 0
                    ? "valid"
                    : hasLockedChanges && diffs.every((d) => d.isLocked)
                        ? "rejected"
                        : hasLockedChanges
                            ? "partial"
                            : "valid",
                approvedByUser: false,
            });
        } else {
            // ─── New hire row
            const errors = validateNewHireRow(row, validEntities, jobTitles);
            newRows.push({
                rowIndex: idx + 2,
                raw: row,
                mapped: null,
                errors,
                overallStatus: errors.length === 0 ? "valid" : "rejected",
                approvedByUser: false,
            });
        }
    });

    return {
        existingRows,
        newRows,
        totalRows: raw.length,
        validExisting: existingRows.filter((r) => r.overallStatus !== "rejected").length,
        rejectedExisting: existingRows.filter((r) => r.overallStatus === "rejected").length,
        validNew: newRows.filter((r) => r.overallStatus === "valid").length,
        rejectedNew: newRows.filter((r) => r.overallStatus === "rejected").length,
    };
}

// ─── Apply Approved Existing Changes ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setVal = (obj: any, path: string, value: unknown) => {
    const parts = path.split(".");
    const last = parts.pop()!;
    const target = parts.reduce((a, p) => a[p], obj);
    if (target) target[last] = value;
};

export function applyApprovedExisting(
    row: AuditedExistingRow,
    store: FullEmployeeRecord[]
): FullEmployeeRecord[] {
    return store.map((emp) => {
        if (emp.eid !== row.eid) return emp;
        const clone = JSON.parse(JSON.stringify(emp)) as FullEmployeeRecord;
        for (const diff of row.diffs) {
            if (!diff.isLocked) setVal(clone, diff.key, diff.newValue);
        }
        return clone;
    });
}

// ─── Excel Date Coercion ─────────────────────────────────────────────────────
// Excel stores dates as numbers (days since 1900-01-01) or variant strings.
// This function normalises any date representation to YYYY-MM-DD or null.
function parseExcelDate(raw: string | number | undefined | null): string | null {
    if (raw === null || raw === undefined || raw === "") return null;
    // If xlsx gave us a number (serial date), convert via Date
    if (typeof raw === "number") {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split("T")[0];
    }
    const s = String(raw).trim();
    if (!s || s === "null" || s === "undefined") return null;
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // MM/DD/YYYY (Excel en-US export)
    const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
        const [, m, d, y] = usMatch;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // DD/MM/YYYY (European)
    const euMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
        // Same regex — try ISO parse to disambiguate
        const attempt = new Date(s);
        if (!isNaN(attempt.getTime())) return attempt.toISOString().split("T")[0];
    }
    // Try native Date parse as fallback
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    return null; // unrecognized format → null is safe, DB will apply NOT NULL constraints
}

export function buildNewRecord(row: AuditedNewRow, tenantId?: string): FullEmployeeRecord {
    const now = new Date().toISOString();
    const eid = row.assignedEID ?? genEID();
    const r = row.raw;
    const firstName = r["first name"] ?? "";
    const lastName = r["first last name"] ?? "";

    return {
        eid,
        tenant_id: tenantId,
        status: (r["status"] as FullEmployeeRecord["status"]) || "Active",
        email_corporativo: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@homesi.co`,
        continent_id: r["continent"] ?? null,
        country_id: r["country"] ?? null,
        city_id: r["city"] ?? null,
        salaryCurrency: r["currency"] ?? null,
        directLeaderId: r["direct leader id"] ?? null,
        maestro: {
            identificationNumber: (r["id number"] ?? "").trim().slice(0, 20),
            documentTypeId: (r["document type"] ?? "").trim() as FullEmployeeRecord["maestro"]["documentTypeId"],
            firstName: firstName,
            middleNames: r["middle name"]?.trim() || "",
            lastName: lastName,
            secondLastName: (r["second last name"] ?? "").trim(),
            birthDate: parseExcelDate(r["date of birth"]) ?? "",
            gender: (r["gender"] ?? "").trim() as FullEmployeeRecord["maestro"]["gender"],
            personalEmail: (r["personal email"] ?? "").trim(),
            municipalityCode: (r["municipality"] ?? "").trim().slice(0, 5),
            residenceAddress: (r["address"] ?? "").trim(),
            created_at: now,
            updated_at: now,
        },
        historialLaboral: {
            employeeId: (r["id number"] ?? "").trim(),
            startDate: parseExcelDate(r["hire date"]) ?? "",
            endDate: "",          // new hire — no end date
            contractType: (r["contract type"] ?? "") as FullEmployeeRecord["historialLaboral"]["contractType"],
            salaryType: (r["salary type"] ?? "") as FullEmployeeRecord["historialLaboral"]["salaryType"],
            baseSalary: parseFloat(String(r["base salary"] ?? "0").replace(/[^0-9.]/g, "")) || 0,
            taxProcedure: parseInt(r["tax procedure"] ?? "1") as 1 | 2 | 0,
            legalEntity: r["local entity"] ?? "",
            area: r["area"] ?? "",
            subArea: r["sub-area"] ?? "",
            costCenter: r["cost center"] ?? "",
            costCenterName: r["cost center name"] ?? "",
            subCostCenter: "",
            subCostCenterName: "",
            branch: r["branch"] ?? "",
            client: r["client"] ?? "",
            project: r["project"] ?? "",
            dedicationPercentage: parseInt(r["dedication %"] ?? "100") || 100,
            directLeader: r["direct leader"] ?? "",
            jobTitleName: r["job title"] ?? "",
            roleTitleName: r["role title"] ?? "",
            created_at: now,
        },
        afiliaciones: {
            employeeId: r["id number"] ?? "",
            eps_id: "",
            epsName: r["eps"] ?? "",
            afp_id: "",
            afpName: r["afp"] ?? "",
            arl_id: "",
            arlName: r["arl"] ?? "",
            ccf_id: "",
            ccfName: r["ccf"] ?? "",
            arlRiskLevel: (parseInt(r["arl risk level"] ?? "0") || 0) as FullEmployeeRecord["afiliaciones"]["arlRiskLevel"],
            contributorSubtype: r["pila subtype"] ?? "",
            updated_at: now,
        },
        sst: {
            employeeId: r["id number"] ?? "",
            shirtSize: (r["shirt size"] ?? "") as FullEmployeeRecord["sst"]["shirtSize"],
            pantsSize: (r["pants size"] ?? "") as FullEmployeeRecord["sst"]["pantsSize"],
            shoeSize: parseInt(r["shoe size"] ?? "0") || 0,
            bloodType: (r["blood type"] ?? "") as FullEmployeeRecord["sst"]["bloodType"],
            emergencyContact: r["emergency contact"] ?? "",
            emergencyPhone: r["emergency phone"] ?? "",
        },
    };
}

// ─── Rejection Excel Export ───────────────────────────────────────────────────

export function exportRejectionReport(
    rejectedExisting: AuditedExistingRow[],
    rejectedNew: AuditedNewRow[]
) {
    const rows: Record<string, string>[] = [];

    for (const row of rejectedExisting) {
        const rejectedDiffs = row.diffs.filter((d) => d.isLocked);
        const reasons = rejectedDiffs.map((d) => d.rejectionReason ?? "").filter(Boolean).join(" | ");
        const changedFields = rejectedDiffs.map((d) => `${d.label}: "${d.oldValue}" → "${d.newValue}"`).join("; ");
        rows.push({
            "EID": row.eid,
            "First Name": row.firstName,
            "Last Name": row.lastName,
            "Type": "Change to Existing Employee",
            "Affected Fields": changedFields,
            "Rejection Reason": reasons || "One or more locked identity fields were modified.",
        });
    }

    for (const row of rejectedNew) {
        const reasons = row.errors.map((e) => `[${e.field}] ${e.reason}`).join(" | ");
        rows.push({
            "EID": "—",
            "First Name": row.raw["first name"] ?? "—",
            "Last Name": row.raw["first last name"] ?? "—",
            "Type": "New Hire Rejected",
            "Affected Fields": row.errors.map((e) => e.field).join(", "),
            "Rejection Reason": reasons || "Unknown validation error.",
        });
    }

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rejected Rows");

    // Export via Blob for reliable browser download
    const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `HC_Import_Rejections_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1000);
}
