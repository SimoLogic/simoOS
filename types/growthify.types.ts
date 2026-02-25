export type ApprovalStatus = "Pending" | "Active 1" | "Active 2" | "Active" | "Inactive 1" | "Inactive 2" | "Inactive";

export interface RewardScheme {
    id: string; // 4-digit ID generated on save
    tenant_id: string;
    strategy_id: string; // Link back to strategy
    name: string;
    override_closed_loan_pct: number;
    fixed_bonus: number;
    units_won_tier: number;
    recruitment_override_pct: number;
    compliance_gate?: boolean; // Linked to "Training Video Viewed"
    drivers: RewardDriver[]; // Advanced dynamic reward configurations

    // Approvers Configuration
    approver1_name: string;
    approver1_role: string;
    approver1_status: ApprovalStatus;

    approver2_name: string;
    approver2_role: string;
    approver2_status: ApprovalStatus;

    isActive: boolean; // computed: approver1_status === 'Active' && approver2_status === 'Active'
    created_at: string;
    updated_at: string;
}

export interface SalesStrategy {
    id: string;
    tenant_id: string;
    name: string; // e.g., "B2B", "Recruitment", "NPPM"
    purpose: string;
    isActive: boolean;
    created_at: string;
}

export interface AllocationParam {
    branch: string;
    loan_officer?: string; // Optional for non-B2B roles
    time_pct: number; // 0-100
}

export interface StrategyAllocation {
    strategy_id: string;
    reward_scheme_id: string;
    allocations: AllocationParam[];
}

export interface SalesHCAssignment {
    id: string;
    tenant_id: string;
    employee_id: string; // Employee ID (eid)
    sales_role: string;
    target_dedication: string; // e.g., "100%", "50%"
    strategies: StrategyAllocation[]; // Max 3

    // Approvers Configuration
    approver1_name: string;
    approver1_role: string;
    approver1_status: ApprovalStatus;

    approver2_name: string;
    approver2_role: string;
    approver2_status: ApprovalStatus;

    isApproved: boolean; // computed: approver1_status === 'Active' && approver2_status === 'Active'
    created_at: string;
}

export interface ApprovalRequisition {
    id: string;
    tenant_id: string;
    module: string;
    sub_module: string;
    app: string;
    description: string;
    link_url: string; // Deep link to sub-module for the "GO" button
    status: "Pending" | "Resolved";
    approver_role: string;
    created_at: string;
}

// --- NEW SYSTEM OF ACTION TYPES ---

export type PlaybookFrequency = "Daily" | "Weekly" | "Monthly" | "Once";

export interface PlaybookStep {
    id: string; // e.g. "STEP-001"
    title: string;
    description: string;
    frequency: PlaybookFrequency;
    kpi_type?: "Calls" | "Leads" | "Meetings" | "Placements" | string;
    target_count: number; // e.g. 10 leads, 5 meetings
    script_content?: string; // Optional phone script or email template
    training_url?: string; // Optional training video link
    is_mandatory: boolean;
}

export interface EscalationRule {
    id: string;
    trigger_metric: string; // e.g. "Calls Made", "Meetings Booked"
    threshold_pct: number; // e.g. 80 (meaning <80%)
    duration_days: number; // e.g. 3
    action_type: "Manager Alert" | "Coaching Lock" | "PIP Warning";
}

export interface Playbook {
    id: string;
    tenant_id: string;
    strategy_id: string; // Link to the broader SalesStrategy
    name: string;
    general_purpose: string;
    category: "commercial" | "supporting" | "special";
    strategy_type?: "B2B" | "NPPM" | "Recruitment" | "Brokered Out" | string;
    operational_framework?: {
        introduction?: string;
        purpose?: string;
        escalation_matrix_json?: string;
    };
    steps: PlaybookStep[];
    escalation_matrix: EscalationRule[];
    isActive: boolean;
    created_at: string;
}

export interface SellerActivityLog {
    id: string;
    tenant_id: string;
    employee_id: string;
    playbook_id: string;
    step_id: string;
    count_logged: number;
    log_date: string; // ISO Date "YYYY-MM-DD"
    timestamp?: string; // ISO Date Time tracking
    outcome?: "Connected" | "No Answer" | "Meeting Set" | string;
    connection_time_seconds?: number;
    notes?: string;
    created_at: string;
}

export interface RewardTier {
    min_units: number;
    max_units?: number;
    payout: number;
}

export interface RewardDriver {
    id: string;
    type: "Activity" | "Milestone" | "Volume" | "Per Lead" | "Per Placement" | "% Loan Amount" | "Bps";
    trigger_step_id?: string; // If Activity or Milestone, linked to PlaybookStep
    payout_amount: number; // Flat $ if Activity/Milestone, BPS if Volume
    min_completion_pct?: number; // E.g., Must hit 90% of calls to unlock
    tiers?: RewardTier[];
}
