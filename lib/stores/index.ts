// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · Stores Barrel Export
// Import from '@/lib/stores' for all Supabase-backed store functions.
//
// NOTE: Both bp.store and growthify.store expose a `getPlaybooks` function
// with different semantics. To avoid ambiguity, this barrel uses explicit
// named re-exports with module-prefixed aliases for the conflicting symbol.
// For direct access, import from the specific store file instead.
// ─────────────────────────────────────────────────────────────────────────────

// ─── HR ──────────────────────────────────────────────────────────────────────
export { getEmployees, addEmployee, updateEmployee, saveEmployees } from './hr.store';

// ─── Tenant ───────────────────────────────────────────────────────────────────
export {
    generateTCODE, getTenants, addTenant, updateTenant,
    getActiveTenants, getTenantByTcode
} from './tenant.store';

// ─── Session (Zustand) ────────────────────────────────────────────────────────
export { useSessionStore } from './session.store';

// ─── BP (Business Plan) ───────────────────────────────────────────────────────
export {
    getPlaybooks as getBPPlaybooks,
    getBPWorkflowEntries,
    saveBPWorkflowEntry,
    deleteBPWorkflowEntry
} from './bp.store';

// ─── Approval ─────────────────────────────────────────────────────────────────
export { getApproverMap, saveApproverMap } from './approval.store';
export type { EmployeeApproverMap } from './approval.store';

// ─── Growthify ────────────────────────────────────────────────────────────────
export {
    getSalesStrategies, saveSalesStrategy, toggleStrategyStatus, deleteSalesStrategy,
    getRewardSchemes, getRewardSchemesForStrategy, saveRewardScheme,
    evaluateRewardScheme, deleteRewardScheme,
    getPendingRequisitions, createApprovalRequisition, resolveRequisitionsForTarget,
    getSalesAssigments, saveSalesAssignment, evaluateSalesAssignment,
    getPlaybooks as getGrowthifyPlaybooks, savePlaybook, deletePlaybook,
    getSellerActivities, logSellerActivity,
    calculateCurrentPace, calculateProjectedRewards
} from './growthify.store';

// ─── Process Designer ─────────────────────────────────────────────────────────
export {
    getSavedProcesses, saveProcess, deleteProcess, approveProcess,
    generateId, computeKpis
} from './process-designer.store';

