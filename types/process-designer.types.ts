// ─────────────────────────────────────────────────────────────────────────────
// HOMESI H-OS · Business Plan → Performance · Process Designer — Data Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Enumerations ─────────────────────────────────────────────────────────────

export type TaskFrequency =
    | "Daily"
    | "Weekly"
    | "Biweekly"
    | "Monthly"
    | "Quarterly"
    | "Annual"
    | "On-Demand";

export type TaskValue =
    | "Value-Added"
    | "Necessary"
    | "Wait"
    | "Waste";

export type ProcessStatus = "Draft" | "Approved";

// ── Working-day multipliers per frequency ─────────────────────────────────────
// Converts a one-time occurrence (minutes) into minutes-per-standard-day
// Based on 22 working days/month, 5 per week.

export const FREQUENCY_DAILY_FACTOR: Record<TaskFrequency, number> = {
    "Daily": 1,
    "Weekly": 1 / 5,
    "Biweekly": 1 / 10,
    "Monthly": 1 / 22,
    "Quarterly": 1 / 66,
    "Annual": 1 / 264,
    "On-Demand": 0,
};

// ── Process Row (one task in the flow) ────────────────────────────────────────

export interface ProcessRow {
    id: string;                 // UUID / generated key
    process: string;            // e.g. "Loan Processing"
    subProcess: string;         // e.g. "Document Collection"
    stepNumber: number;         // Ordering within the sub-process
    task: string;               // Free text
    owner: string;              // Employee name → from HR roster
    ownerEid: string;           // EID reference
    deliverable: string;        // Free text (file, approval, etc.)
    stakeholder: string;        // Employee name → from HR roster
    stakeholderEid: string;     // EID reference
    pt: number;                 // Production Time (minutes)
    lt: number;                 // Lead Time (minutes)
    frequency: TaskFrequency;
    value: TaskValue;
    comments: string;
}

// ── Saved Process Design (persisted unit) ─────────────────────────────────────

export interface SavedProcess {
    id: string;                 // UUID
    name: string;               // User-given design name
    area: string;               // From AREAS_EMPRESA
    rows: ProcessRow[];
    status: ProcessStatus;
    createdAt: string;          // ISO string
    updatedAt: string;          // ISO string
}

// ── Employee reference (lightweight, pulled from HR store) ────────────────────

export interface EmployeeRef {
    eid: string;
    name: string;               // "First Last"
    area: string;
}

// ── Dashboard KPI aggregate ───────────────────────────────────────────────────

export interface ProcessKpis {
    totalTasks: number;
    totalFteMinDay: number;     // Sum of (PT × frequency_factor) for all tasks
    valueAddedPct: number;      // % of tasks classified as Value-Added
    wastePct: number;           // % classified as Waste or Wait
    workloadByOwner: { owner: string; minDay: number }[];
    tasksByValue: { value: TaskValue; count: number }[];
    tasksByFrequency: { freq: TaskFrequency; count: number }[];
}
