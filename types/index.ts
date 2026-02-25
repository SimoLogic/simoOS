// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · Types Barrel Export
// Import from '@/types' instead of individual files for cleaner imports.
//
// NOTE: growthify.types and bp.types both define a `Playbook` interface with
// different shapes (Growthify vs BusinessPlan context). This barrel uses
// explicit re-exports with aliases for conflicting symbols.
// For direct use: import from '@/types/growthify.types' or '@/types/bp.types'.
// ─────────────────────────────────────────────────────────────────────────────

export * from './hr.types';
export * from './branch.types';
export * from './tenant.types';

// Growthify types — re-export Playbook as GrowthifyPlaybook to avoid conflict
export type {
    ApprovalStatus, RewardScheme, SalesStrategy, AllocationParam,
    StrategyAllocation, SalesHCAssignment, ApprovalRequisition, PlaybookFrequency,
    PlaybookStep, EscalationRule, SellerActivityLog, RewardTier, RewardDriver
} from './growthify.types';
export type { Playbook as GrowthifyPlaybook } from './growthify.types';
export * from './bp.types';
export * from './process-designer.types';
export * from './job-title.types';
