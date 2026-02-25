# HOPSI Data Isolation Map (Multi-Tenant Architecture)

This document outlines how data isolation is enforced within the HOPSI Business Operating System to ensure that distinct client tenants (Offshore Offices) cannot access or modify each other's data.

## 1. Multi-Tenant Identifier (TCODE)
Every record in the system—from Employee Master data to Financial entries—is tagged with a `tenant_code` (TCODE), a unique identifier generated during tenant creation (e.g., `TNT-001`, `TNT-042`).

| Layer | Enforcement Mechanism |
| :--- | :--- |
| **Data Schema** | All core entities (Employees, Contracts, Payloads) contain a mandatory/non-nullable `tenant_code` field. |
| **Application State** | The `TenantContext` maintains the currently active tenant in session memory. |
| **Data Fetching** | Every query exported from the store filters by the globally active `currentTenant.tcode`. |

## 2. Row-Level Isolation (Simulated RLS)

In the current frontend implementation, Row-Level Security (RLS) is simulated using functional filters. In a production environment with a database (e.g., PostgreSQL + Firebase), this logic would be mirrored in the DB security rules.

### Employee Data Scoping
When an HR Professional accesses the Employee Roster or Batch Changes, the application automatically applies the following filter:

```typescript
// Scoped query logic
const employees = getEmployees().filter((e) => e.tenant_code === currentTenant.tcode);
```

### Automatic Assignment
New records created through **Employee Intake** or **Batch Import** automatically inherit the TCODE of the active session. This prevents cross-tenant assignment errors.

```typescript
// Injection logic
const record: FullEmployeeRecord = {
    ...formData,
    tenant_code: currentTenant.tcode // Injected at save-time
};
```

## 3. Administrative Safety Guards

### Session Awareness
Before a tenant can be deactivated in the **Admin Panel**, the system performs an "Active Session Audit". It identifies every user currently operating within that TCODE's scope.

### Target Messaging
The **Broadcast Alert System** allows administrators to send urgent notifications. These alerts are selectively displayed only to browser sessions currently bound to the targeted TCODE.

```typescript
// Targeted broadcast receipt
if (currentTenant && incomingAlert.tenant_id === currentTenant.tcode) {
    showBroadcast(incomingAlert.message);
}
```

## 4. Visual Identity & Verification
To maintain engineering precision and transparency, the TCODE is visible in high-level administrative views as a prefix to system IDs (e.g., `TNT-001-EID-1024`), ensuring that managers always know which client context they are operating in.
