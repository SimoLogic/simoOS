# Growthify: Strategy Activation & Logic Proof

## 1. Objective
To document the enforcement logic for **High-Stakes Sales Orchestration & Governance** within the Growthify sub-module. The goal is to ensure that no human capital or sales assignments can be made under a mathematical reward framework that has not been peer-reviewed and authorized by the required delegates.

## 2. The "Smart Lock" Concept
The application implements a "Smart Lock" system on the `RewardScheme` and `SalesStrategy` entities. 

By default, any newly created strategy or recently edited strategy is placed in a `Pending` state. The mathematical compensation parameters (such as `override_closed_loan_pct`, `fixed_bonus`, and `recruitment_override_pct`) are highly sensitive and require Dual Approval.

### Activation Logic:
A Strategy becomes `Active` **IF AND ONLY IF**:
```javascript
const isActive = rewardScheme.approver1_check === true && rewardScheme.approver2_check === true;
```

## 3. Edit Reset Mechanism
Any modification to an existing `RewardScheme` triggers an immediate suspension of the strategy's active status:
- `approver1_check` is reset to `false`.
- `approver2_check` is reset to `false`.
- `isActive` is set to `false`.

New dual approval requisitions are automatically dispatched to the global `ApprovalQueue` notifying the respective delegate roles (e.g., Legal, Finance).

## 4. Restriction on Assignment
The `SalesHC` (Human Capital) application queries the available reward schemes to allow mapping an employee to a strategic role.

The backend/store actively filters out strategies where `isActive === false`:
```javascript
const activeSchemes = getRewardSchemes(assignment.tenant_code).filter(r => r.isActive);
const strategyIsActive = activeSchemes.some(r => r.id === assignment.reward_scheme_id);

if (!strategyIsActive) {
    return { success: false, message: "Estrategia No Autorizada: Requiere aprobación dual del esquema de Reward." };
}
```

This effectively creates a **hard-block** preventing execution unless the rigorous governance protocol is fully satisfied.

## 5. RLS and Multi-Tenant Context
Every piece of data, including pending requisitions, employee assignments, and reward schemes, inherently carries the `tenant_code` (`TCODE`). The global context filters all views and operations at the data access level, ensuring cross-tenant contamination is impossible.
