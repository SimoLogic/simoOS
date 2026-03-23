// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · Branch Master — TypeScript Types & Reference Data
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type HierarchyLevel = "Division" | "Region" | "Branch";
export type FieldOfficeType = "Physical" | "Virtual";
export type LeaseRenewal =
    | "Monthly" | "3 Months" | "6 Months" | "Yearly"
    | "2 Years" | "3 Years" | "4 Years" | "5 Years" | "10 Years";

// ─── Sub-shapes ───────────────────────────────────────────────────────────────

export interface BranchLeaseData {
    landlord_name: string;
    sub_lease: boolean;
    monthly_rent: number;
    currency: string;        // tenant's reporting currency, e.g. "USD"
    renewal: LeaseRenewal;
    utilities_included: boolean;
}

// ─── Main Interface ───────────────────────────────────────────────────────────

export interface Branch {
    id: string;
    tenant_id: string;
    branch_code: string;
    branch_name: string | null;
    manager_employee_eid: string | null;
    manager_role_title: string | null;
    branch_manager_name?: string;          // denormalized for display
    states_licensed: string[];             // ["CA", "TX", "FL"]
    field_office_type: FieldOfficeType;
    office_address: string | null;
    has_lease: boolean;
    lease_data: BranchLeaseData | null;
    hierarchy_level: HierarchyLevel;
    parent_branch_id: string | null;
    parent_branch_code?: string | null;    // denormalized for display
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Computed for UI
    children?: Branch[];
    employee_count?: number;
}

/** Lean node shape used in the Hierarchy Map tree builder */
export interface BranchNode extends Branch {
    children: BranchNode[];
    employees: BranchEmployee[];
}

/** Employee mini-record shown inside branch cards in the Hierarchy Map */
export interface BranchEmployee {
    eid: string;
    full_name: string;
    position: string;   // from historialLaboral.sub_area or job_title
    status: string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function blankBranch(tenantId: string): Omit<Branch, "id" | "created_at" | "updated_at"> {
    return {
        tenant_id: tenantId,
        branch_code: "",
        branch_name: null,
        manager_employee_eid: null,
        manager_role_title: null,
        states_licensed: [],
        field_office_type: "Physical",
        office_address: null,
        has_lease: false,
        lease_data: null,
        hierarchy_level: "Branch",
        parent_branch_id: null,
        is_active: true,
    };
}

export function blankLeaseData(currency = "USD"): BranchLeaseData {
    return {
        landlord_name: "",
        sub_lease: false,
        monthly_rent: 0,
        currency,
        renewal: "Yearly",
        utilities_included: false,
    };
}

// ─── US States Reference ──────────────────────────────────────────────────────

export const US_STATES: { code: string; name: string }[] = [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "DC", name: "District of Columbia" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" },
];

// ─── Branch Manager Job Titles Filter ────────────────────────────────────────
export const BRANCH_MANAGER_TITLES = [
    "Branch Manager",
    "BM",
    "NPPM",
    "Non-Producing Producer Branch Manager",
    "Producing Branch Manager",
    "Producing Branch Manger (PBM)",
    "Non Producing Branch Manager",
    "Area Manager",
    "Division Manager",
    "Regional Manager",
];

// ─── Lease Renewal Options ────────────────────────────────────────────────────

export const LEASE_RENEWAL_OPTIONS: LeaseRenewal[] = [
    "Monthly", "3 Months", "6 Months", "Yearly",
    "2 Years", "3 Years", "4 Years", "5 Years", "10 Years",
];

// ─── Hierarchy Rules ──────────────────────────────────────────────────────────

/** Returns the valid parent level for a given child level */
export function validParentLevel(childLevel: HierarchyLevel): HierarchyLevel | null {
    if (childLevel === "Region") return "Division";
    if (childLevel === "Branch") return "Region";
    return null; // Division has no parent
}
