# Playbook Designer — Production Deployment Guide

> **Source:** `Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer_GUÍA DE DESPLIEGUE EN PRODUCCIÓN.docx`  
> **Module:** Business Plan > Playbook Designer  
> **Version:** 20 (BPMN White Edition)

---

## 1. Architecture Overview

The Playbook Designer is a **client-side sub-module** of the Business Plan module within the SIMO Intellisense monorepo (`/HOPS`).

```
Business Plan Module
└── Playbook Designer Sub-Module
    ├── Route:      /business-plan/playbook-designer
    ├── Page:       app/(dashboard)/business-plan/playbook-designer/page.tsx
    └── Components: components/playbook-designer/
        ├── PlaybookDesignerApp.tsx    ← Main orchestrator
        ├── EditorArea.tsx             ← Step card grid
        ├── LibraryAssets.tsx          ← Right sidebar
        ├── FlowInspectorBPMN.tsx      ← BPMN overlay
        ├── Modals.tsx                 ← Modal system
        ├── SubComponents.tsx          ← Shared atoms
        └── types.ts                   ← TypeScript interfaces
```

---

## 2. Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `react` | 18.x | Core framework |
| `lucide-react` | Latest | Icon library |
| `tailwindcss` | 3.x | Utility CSS |
| `next` | 14.x | App Router, routing |
| `typescript` | 5.x | Type safety |

> **No additional dependencies required.** The component uses only native HTML5 Drag & Drop APIs.

---

## 3. Navigation Integration

The Playbook Designer is accessible via the **SideMenu** as a Business Plan sub-module:

```typescript
// SideMenu.tsx — business-plan sub-modules
const businessPlanSubModules = [
  { id: "overview",          label: "Overview",          icon: LayoutDashboard, href: "/business-plan" },
  { id: "playbook-designer", label: "Playbook Designer", icon: Zap,             href: "/business-plan/playbook-designer" },
];
```

To link to the page programmatically:
```typescript
router.push('/business-plan/playbook-designer');
```

---

## 4. Data Persistence (Current State & Roadmap)

### Current State (Phase 1 — Local State)
All playbook data lives in React `useState`. Data is **not persisted** between sessions.

### Roadmap (Phase 2 — Database Integration)

Following the **State vs. Database Protocol:**

1. **Zustand Store** (`lib/stores/playbook.store.ts`): Only stores `activePlaybookId`, UI state (activeTab, modal open/close).
2. **Server Actions** (`app/actions/business-plan-actions.ts`): CRUD for playbooks and steps.
3. **PostgreSQL Tables** (required):
   ```sql
   CREATE TABLE bp_playbooks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     org_id TEXT NOT NULL,
     name TEXT NOT NULL,
     type TEXT NOT NULL,          -- CORE | GROWTH | ELITE
     family TEXT NOT NULL,        -- COMMERCIAL | OPERATIONAL
     strategy TEXT NOT NULL,      -- B2B | B2C | NPPM
     purpose TEXT,
     status TEXT DEFAULT 'DRAFT', -- DRAFT | SUBMITTED
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE bp_playbook_steps (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     playbook_id UUID REFERENCES bp_playbooks(id) ON DELETE CASCADE,
     org_id TEXT NOT NULL,
     uid TEXT NOT NULL,
     step_num TEXT NOT NULL,
     name TEXT NOT NULL,
     type_of_activity TEXT,
     activity_description TEXT,
     deliverable TEXT,
     deliverable_description TEXT,
     stakeholder TEXT,
     frequency TEXT DEFAULT 'DAILY',
     repetitions INT DEFAULT 1,
     freq_notes TEXT,
     scheduler_value INT DEFAULT 0,
     supporting_task TEXT,
     counteraction_description TEXT,
     requested_to TEXT,          -- Employee ID
     sla TEXT,
     sla_description TEXT,
     is_locked BOOLEAN DEFAULT FALSE,
     is_repeatable BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Multi-Tenant Filter:** All queries MUST include `WHERE org_id = $orgId`.
5. **WorkdayHelper:** `scheduler_value` MUST be processed through `WorkdayHelper.addWorkdays()` when generating actual execution dates.

---

## 5. Shield Protocol Application

The Playbook Designer applies the **Shield Protocol (ARCHITECTURE.md Llave #3)**:

| Shield Layer | Implementation |
|---|---|
| **UI Layer** | Locked steps: no delete button rendered. Drag & drop disabled. Description modals read-only. |
| **Future Service Layer** | `PlaybookGuard` service verifies `isLocked=true` before any UPDATE/DELETE. |
| **Future DB Trigger** | `BEFORE DELETE ON bp_playbook_steps` rejects if `is_locked = TRUE`. |

---

## 6. Deployment Checklist

### Pre-Deploy
- [ ] `npx tsc --noEmit` — zero errors
- [ ] All component imports resolve correctly
- [ ] `SideMenu.tsx` reflects Business Plan sub-modules

### Post-Deploy Smoke Test
1. Navigate to `/business-plan` → hover sidebar → Business Plan expands showing sub-modules.
2. Click "Playbook Designer" → component renders with default step "COLD CALL TO NEW REALTOR".
3. Drag a role from INTERNAL ROLES → RESPONSIBLES area on the step card.
4. Click Eye icon on the locked step → BPMN Flow Inspector opens.
5. Click any colored BPMN node with a description → expands inline.
6. Click "ADD OPERATIONAL NODE" → new step appended below.
7. Click "SAVE & PUBLISH" → status badge changes to emerald "SUBMITTED".

### Rollback
If critical issues are found, revert `SideMenu.tsx` to remove Business Plan sub-modules, and the route page becomes inaccessible via navigation. Component files can remain for hotfix.

---

## 7. WorkdayHelper Integration (Mandatory for Phase 2)

Per `ARCHITECTURE.md` Llave #2, when converting `schedulerValue` to actual dates:

```typescript
import { addWorkdays } from '@/lib/workday-helper';

// Example: Step 2 starts 5 business days after Step 1
const step1StartDate = new Date('2026-03-15');
const step2StartDate = addWorkdays(step1StartDate, step.schedulerValue, holidays, timezone);
```

The UI already shows an indicator ("X days after previous step") via the Timeline Controller.  
The workday-aware calculation happens at **execution scheduling time**, not at design time.
