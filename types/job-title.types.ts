// ─────────────────────────────────────────────────────────────────────────────
// SIMO Intellisense H-OS · HR Module · Job Title + Role Title Types
// Mirrors dim_job_title + dim_role_title DB tables
// ─────────────────────────────────────────────────────────────────────────────

export type JobTitleStatus = "Draft" | "Active" | "Inactive";
export type ApprovalDecision = "Pending" | "Approved" | "Rejected";
export type RoleTitleStatus = "Active" | "Inactive";

// ── Role Title entity ─────────────────────────────────────────────────────────
export interface RoleTitle {
    id: string;
    tenant_id: string;
    job_title_id: string;
    role_title: string;         // max 60 chars
    describe_role: string;      // max 500 chars
    status: RoleTitleStatus;
    created_at: string;
    updated_at: string;
}

/** Lightweight reference used in dropdowns */
export interface RoleTitleRef {
    id: string;
    role_title: string;
    job_title_id: string;
    describe_role?: string;
}

export const blankRoleTitle = (tenant_id = "", job_title_id = ""): Omit<RoleTitle, "id" | "created_at" | "updated_at"> => ({
    tenant_id,
    job_title_id,
    role_title: "",
    describe_role: "",
    status: "Active",
});

// ── Language proficiency levels ───────────────────────────────────────────────
export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const;
export type LanguageLevel = typeof LANGUAGE_LEVELS[number];

export interface LanguageReq {
    language: string;
    level: LanguageLevel;
}

// ── Education levels ──────────────────────────────────────────────────────────
export const EDUCATION_LEVELS = [
    "High School / GED",
    "Associate Degree / Tecnólogo",
    "Bachelor's Degree",
    "Postgraduate / Specialization",
    "Master's Degree",
    "PhD / Doctorate",
    "No Formal Education Required",
] as const;
export type EducationLevel = typeof EDUCATION_LEVELS[number];

// ── Rich Job Description payload (stored as JSONB in DB) ─────────────────────
export interface JobDescriptionData {
    education_level: string;
    specific_profession: string;
    years_experience: number;
    exp_national_companies: number;     // years in national companies
    exp_multinationals: number;         // years in multinational companies
    exp_specific_sector: boolean;       // requires specific sector experience
    specific_sector_name: string;       // e.g. "Mortgage", "BPO"
    soft_skills: string[];
    specific_knowledge: string[];
    languages: LanguageReq[];
    certifications: string[];
    psychometric_tests: string[];
    skills_tests: string[];
    job_description: string;            // Full JD narrative text
}

export const blankJdfData = (): JobDescriptionData => ({
    education_level: "",
    specific_profession: "",
    years_experience: 0,
    exp_national_companies: 0,
    exp_multinationals: 0,
    exp_specific_sector: false,
    specific_sector_name: "",
    soft_skills: [],
    specific_knowledge: [],
    languages: [],
    certifications: [],
    psychometric_tests: [],
    skills_tests: [],
    job_description: "",
});

export const parseJdfData = (raw: any): JobDescriptionData => {
    const base = blankJdfData();
    if (!raw || typeof raw !== "object") return base;
    return {
        ...base,
        ...raw,
        languages: Array.isArray(raw.languages) ? raw.languages : base.languages,
        soft_skills: Array.isArray(raw.soft_skills) ? raw.soft_skills : base.soft_skills,
        specific_knowledge: Array.isArray(raw.specific_knowledge) ? raw.specific_knowledge : base.specific_knowledge,
        certifications: Array.isArray(raw.certifications) ? raw.certifications : base.certifications,
        psychometric_tests: Array.isArray(raw.psychometric_tests) ? raw.psychometric_tests : base.psychometric_tests,
        skills_tests: Array.isArray(raw.skills_tests) ? raw.skills_tests : base.skills_tests,
    };
};

// ── Main Job Title entity ─────────────────────────────────────────────────────
export interface JobTitle {
    id: string;
    tenant_id: string;
    title: string;
    area: string;
    sub_area: string;
    cost_center: string;
    sub_cost_center: string;
    direct_supervisor: string;
    status: JobTitleStatus;
    requester_id: string;
    approver1_id: string;
    approver1_status: ApprovalDecision;
    approver2_id: string;
    approver2_status: ApprovalDecision;
    jdf_data: JobDescriptionData;
    /** Role Titles associated with this Job Title */
    role_titles: RoleTitleRef[];
    created_at: string;
    updated_at: string;
}

export const blankJobTitle = (tenant_id = ""): Omit<JobTitle, "id" | "created_at" | "updated_at"> => ({
    tenant_id,
    title: "",
    area: "",
    sub_area: "",
    cost_center: "",
    sub_cost_center: "",
    direct_supervisor: "",
    status: "Draft",
    requester_id: "",
    approver1_id: "",
    approver1_status: "Pending",
    approver2_id: "",
    approver2_status: "Pending",
    jdf_data: blankJdfData(),
    role_titles: [],
});

// ── Lightweight reference (used in dropdowns) ─────────────────────────────────
export interface JobTitleRef {
    id: string;
    title: string;
    area?: string;
    status: JobTitleStatus;
    /** Active Role Titles associated, used to populate the Role Title dropdown */
    role_titles?: RoleTitleRef[];
}

// ── Common psychometric and skills tests ──────────────────────────────────────
export const PSYCHOMETRIC_TESTS = [
    "DISC Profile",
    "16PF",
    "Big Five (OCEAN)",
    "Wartegg Test",
    "Bender Test",
    "Ravens Progressive Matrices",
    "Wechsler Intelligence Scale",
    "Minnesota Multiphasic (MMPI)",
];

export const SKILLS_TESTS = [
    "Microsoft Excel – Intermediate",
    "Microsoft Excel – Advanced",
    "English Proficiency (Written)",
    "English Proficiency (Verbal)",
    "Mortgage Concepts",
    "CRM Software Proficiency",
    "Typing Speed (WPM)",
    "Customer Service Simulation",
    "Coding – JavaScript",
    "Coding – Python",
    "Data Analysis",
    "Critical Thinking Assessment",
];

export const SOFT_SKILLS_OPTIONS = [
    "Active Listening",
    "Communication",
    "Problem Solving",
    "Teamwork",
    "Adaptability",
    "Time Management",
    "Critical Thinking",
    "Empathy",
    "Leadership",
    "Negotiation",
    "Conflict Resolution",
    "Attention to Detail",
    "Self-Management",
    "Customer Focus",
    "Resilience",
];

export const LANGUAGES_CATALOG = [
    "English", "Spanish", "Portuguese", "French", "German",
    "Mandarin", "Arabic", "Italian", "Dutch", "Korean",
];
