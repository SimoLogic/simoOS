# Playbook Designer — Atomic Manifesto of Behavior & Fidelity

> **Source:** `Supporting Documents/APP_PLAYBOOK DESIGNER/playbook designer_MANIFIESTO DE COMPORTAMIENTO Y FIDELIDAD ATÓMICA.docx`  
> **Version:** 20 (BPMN White Edition)

---

## 1. Atomic Governance Rules

These rules are **inviolable**. Any component that deviates from them is defective.

### 1.1 Drag & Drop Governance

| Interaction | Rule |
|---|---|
| Step Reordering | Nodes can be dragged to change chronological order. Only **unlocked** steps are draggable. |
| Owners (RESPONSIBLES) | Multi-select cumulative from library. Roles accumulate — they are never replaced. |
| Stakeholder | Strict 1:1 replacement. Dropping a new role replaces the current one entirely. |
| Activity Type Zone | Drop target accepts `"activityType"` from sidebar. Only accepted on unlocked steps. |
| Repeatable Node Drop | Drop target on left column accepts `"repeatableActivity"` JSON. Triggers Replace Confirm modal. |

### 1.2 Visual State Logic (Must be precise)

| Element | Editing Mode (Unlocked) | Saved Mode (Locked) |
|---|---|---|
| Activity Type Square | `bg-slate-900 border-slate-900` (black) | `bg-slate-400 border-slate-400` (gray) |
| Activity Detail Text | `text-slate-800` | `text-amber-600` (vibrant amber) |
| Description Modal | Read-write textarea, DISCARD + SAVE buttons | Read-only textarea, opacity 60%, only CLOSE button |
| BPMN Eye Button | `cursor-not-allowed`, `text-slate-200` | `cursor-pointer`, `text-indigo-600 scale-110` |
| Lock Button | Pulsing indigo border (`animate-pulse`) | Gray background |

### 1.3 Process Flow Inspector (BPMN White Edition)

| Property | Value |
|---|---|
| Canvas Background | `bg-white` (Corporate White — max contrast) |
| Watermark | `BPMN` text at `text-[25vw]`, `text-slate-50` |
| Node Palette | Descending analogous harmony: Violet → Indigo → Blue → Cyan → Teal → Emerald |
| Node 1 | EXECUTORS — `bg-violet-600` — User Task |
| Node 2 | ACTIVITY TASK — `bg-indigo-600` — Main action |
| Node 3 | DATA DELIVERABLE — `bg-blue-600` — Data Object |
| Node 4 | RECIPIENT — `bg-cyan-600` — External pool |
| Node 5 | CADENCE TIMER — `bg-teal-600` — Timer Event |
| Node 6 | SUCCESS SLA — `bg-emerald-600` — End Event |
| Contingency Tandem | `bg-amber-500` node, dashed vertical branch (`border-r-2 border-dashed`) downward from ACTIVITY TASK |
| Description Reveal | Click node card to toggle expanded description (zero-scroll, inline expansion) |

### 1.4 System Integrity

| Rule | Implementation |
|---|---|
| 100% English UI | All labels, buttons, placeholders in English. Never Spanish in UI elements. |
| UID Isolation on Clone | `generateUID()` always called when cloning a step. Never reuse source UID. |
| Step Sequence | After reorder, `stepNum` is always recalculated sequentially with `String(index+1).padStart(2,'0')`. |
| Char Limit | All description textareas enforce `maxLength={1000}` with live counter display. |

---

## 2. Motion & Animation Tokens

| Token | Duration | Use |
|---|---|---|
| `animate-in fade-in` | ~200ms | Modal overlay appearance |
| `animate-in zoom-in` | ~200-500ms | Node cards, modal content |
| `transition-all` | 300ms | Hover states, node scaling |
| `animate-pulse` | Continuous | Unlocked save button |
| `active:scale-95` | Instant | Button press feedback |
| `active:scale-[0.99]` | Instant | "ADD NODE" button press |

**PROHIBITION:** No `transition: all Xms linear`. Always cubic-bezier or Tailwind's `ease-in-out`.

---

## 3. Component Responsibility Matrix

| Component | Single Responsibility |
|---|---|
| `PlaybookDesignerApp` | State orchestration, handlers, modal coordination |
| `EditorArea` | Step card rendering, drag-and-drop surface |
| `LibraryAssets` | Sidebar with draggable role/activity sources |
| `FlowInspectorBPMN` | Full-screen BPMN visual trace overlay |
| `DescriptionModal` | Rich text capture/view with read-only enforcement |
| `SystemModal` | Reusable warning/confirm dialog system |
| `DropArea` | Drop zone with visual feedback (indigo flash on hover) |
| `SolidNode` | Individual BPMN node card with click-to-expand |
| `NodeConnector` | Labeled arrow between BPMN nodes |

---

## 4. Business Logic Rules

### 4.1 Timeline (WorkdayHelper Integration)
- `schedulerValue` = number of workdays offset from the **previous step**.
- Step 0 (first step): `schedulerValue` is always 0 and controls are disabled.
- Timeline controller: ChevronUp increments, ChevronDown decrements (min 0).
- **Future:** Integrate with `WorkdayHelper.addWorkdays()` using `org.settings.timezone` for business-day accurate scheduling.

### 4.2 Repeatable Library Protocol
1. Step must be **locked** before it can become Repeatable.
2. Promoting to Repeatable creates a **deep clone** in `repeatableActivities[]` state.
3. Unchecking Repeatable removes the clone from the sidebar by matching `uid`.
4. Dragging a Repeatable Node onto a step triggers a **Replace Confirm** modal.
5. Confirmed replacement: clones the source step, generates new UID, preserves target's `stepNum` and `schedulerValue`.

### 4.3 Status Flow
```
DRAFT → (click "SAVE & PUBLISH") → SUBMITTED
```
- Future states (ARCHIVED, ACTIVE) should follow the same pattern from the `status` field.

---

## 5. Data Schema (Playbook Step)

```typescript
interface PlaybookStep {
  id: number;                    // Runtime ID (Date.now() for new steps)
  uid: string;                   // Permanent business UID (e.g. "HBT032")
  stepNum: string;               // "01", "02", ... (always recalculated after reorder)
  name: string;                  // UPPERCASE activity name
  typeOfActivity: string;        // From activity library
  purpose: string;               // Step mission
  activityDescription: string;  // What to do (modal field)
  deliverable: string;           // UPPERCASE output name
  deliverableDescription: string; // (modal field)
  stakeholder: string;           // UPPERCASE recipient role
  frequency: FrequencyOption;   // DAILY | WEEKLY | MONTHLY | YEARLY
  repetitions: number;           // How many times per frequency
  freqNotes: string;             // Execution window notes (modal field)
  schedulerValue: number;        // Days offset (WorkdayHelper key)
  supportingTask: string;        // UPPERCASE counteraction name
  counteractionDescription: string; // (modal field)
  requestedTo: string;           // Employee ID
  sla: string;                   // UPPERCASE success metric
  slaDescription: string;        // (modal field)
  isLocked: boolean;             // true = saved (Shield Protocol)
  isRepeatable: boolean;         // true = in library
}
```
