# Playbook Designer — Master User Stories Backlog

> **Source:** `Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer_BACKLOG DE HISTORIAS DE USUARIO MAESTRAS.docx`  
> **Module:** Business Plan > Playbook Designer  
> **Version:** 20 (BPMN White Edition)

---

## Epic 1: Playbook Creation & Configuration

### US-001 · Create Playbook Header
**As a** Business Designer,  
**I want to** define a playbook's name, type, strategy, family, and mission purpose,  
**so that** the playbook is correctly categorized in the organizational repository.

**Acceptance Criteria:**
- [ ] Name field is editable inline (click pencil → convert to input, autoFocus, blur to save).
- [ ] Name is always stored and displayed in **UPPERCASE**.
- [ ] TYPE: `CORE | GROWTH | ELITE` — dropdown.
- [ ] STRATEGY: `B2B | B2C | NPPM` — dropdown.
- [ ] FAMILY: `COMMERCIAL | OPERATIONAL` — dropdown.
- [ ] MISSION PURPOSE opens a `DescriptionModal` (up to 1000 chars).
- [ ] Status badge shows `DRAFT` or `SUBMITTED` in colored pill.

---

## Epic 2: Operational Node Management

### US-002 · Add Operational Node
**As a** Designer,  
**I want to** add new steps (operational nodes) to my playbook,  
**so that** I can build the complete tactical recipe.

**Acceptance Criteria:**
- [ ] "ADD OPERATIONAL NODE" button appends a new step with auto-incremented `stepNum` (padded, e.g. "02").
- [ ] New step UID is auto-generated via `generateUID()`.
- [ ] New step starts **unlocked** (editing mode).
- [ ] Step card shows: Activity Type Zone, Activity Detail select, Timeline Controller, 5-column attribute grid, Counteraction column.

### US-003 · Lock / Save Step (Shield Protocol)
**As a** Designer,  
**I want to** lock (save) a step when I am done editing it,  
**so that** it is protected from accidental changes.

**Acceptance Criteria:**
- [ ] Unlocked step: Save button appears (animated pulse). Activity Type Square = **black**. Activity detail text = **dark slate**.
- [ ] Locked step: Edit button appears. Activity Type Square = **gray**. Activity detail text = **vibrant amber**.
- [ ] If step is locked AND repeatable: show `WarningModal` ("Local changes will not be synchronized with the library source") before allowing edit.
- [ ] Description modals are **fully read-only** when step is locked.

### US-004 · Repeatable Node Promotion
**As a** Designer,  
**I want to** mark a saved step as Repeatable,  
**so that** it is added to the Library Assets panel for reuse.

**Acceptance Criteria:**
- [ ] Step must be locked before becoming Repeatable. If not locked: show `WarningModal` ("Save first before promoting to library").
- [ ] Checking Repeatable → step appears in **REPEATABLE NODES** section of sidebar.
- [ ] Unchecking Repeatable → `WarningModal` ("This activity will be removed from library") → on confirm, removes from sidebar.

---

## Epic 3: Drag & Drop Governance

### US-005 · Role & Activity Drop
**As a** Designer,  
**I want to** drag roles and activity types from the Library onto step cards,  
**so that** I can assign them quickly without typing.

**Acceptance Criteria:**
- [ ] Internal/External roles are draggable from sidebar → `RESPONSIBLES` (cumulative multi-select) or `STAKEHOLDER` (1:1 strict replacement).
- [ ] Activity types are draggable from sidebar → `ACTIVITY TYPE ZONE` on any unlocked step.
- [ ] Locked steps **reject** all drops silently.
- [ ] Drop zone shows hover animation (`scale-105`, indigo background).

### US-007 · Step Reordering
**As a** Designer,  
**I want to** reorder steps by dragging them,  
**so that** the chronological sequence reflects the actual process flow.

**Acceptance Criteria:**
- [ ] Only **unlocked** steps can be dragged (`draggable={!step.isLocked}`).
- [ ] After drop, all `stepNum` values are recalculated sequentially with zero-padding.
- [ ] Drag uses HTML5 native events (`onDragStart`, `onDragEnter`, `onDragEnd`).

---

## Epic 4: Description Management

### US-009 · Rich Description Modals
**As a** Designer,  
**I want to** write rich descriptions for each field (activity, deliverable, frequency, SLA, counteraction, mission purpose),  
**so that** complex instructions are captured and accessible without cluttering the main card.

**Acceptance Criteria:**
- [ ] Each descriptive field has a "Describe" button with `FileText` icon.
- [ ] Modal opens with title, 1000-char limit textarea with counter, DISCARD and SAVE CHANGES buttons.
- [ ] When step is locked: textarea is `readOnly`, only CLOSE button shown.
- [ ] `DescriptionModal` uses `useState` locally to track text before confirming.

---

## Epic 5: BPMN Flow Inspector

### US-006 · Process Trace Engine
**As a** Designer,  
**I want to** view a full-screen BPMN narrative of a saved step,  
**so that** I can validate the complete flow from execution to SLA.

**Acceptance Criteria:**
- [ ] Eye icon is **only clickable** on **locked** steps. Cursor = `not-allowed` on unlocked.
- [ ] Opens full-screen overlay with white corporate canvas.
- [ ] Shows 6 BPMN nodes: EXECUTORS (violet), ACTIVITY TASK (indigo), DATA DELIVERABLE (blue), RECIPIENT (cyan), CADENCE TIMER (teal), SUCCESS SLA (emerald).
- [ ] Contingency Tandem: amber node, dashed vertical branch downward from ACTIVITY TASK.
- [ ] Click-to-reveal: nodes with descriptions show "Click to Expand" pill; clicking toggles expanded description.
- [ ] BPMN watermark background text visible behind canvas elements.
- [ ] Footer shows "BPMN 2.0 Narrative Protocol" badge.

---

## Epic 6: Library & System Integrity

### US-008 · Warning System
**As a** Designer,  
**I want to** receive confirmation dialogs before potentially destructive or integrity-breaking actions,  
**so that** no accidental data loss occurs.

**Acceptance Criteria:**
- [ ] `SystemModal` renders three types: `alert` (red), `confirm` (blue), `uncheck` (red confirm).
- [ ] Alert type: only UNDERSTOOD button (closes modal, no action).
- [ ] Confirm type: CANCEL + YES, REPLACE buttons.
- [ ] Uncheck type: CANCEL + CONFIRM (red) buttons.

### US-010 · Save & Publish
**As a** Designer,  
**I want to** publish my playbook when it's complete,  
**so that** it becomes available for assignment to employees.

**Acceptance Criteria:**
- [ ] "SAVE & PUBLISH" button sets `status = 'SUBMITTED'`.
- [ ] Status badge updates to emerald pill with "SUBMITTED" text.
- [ ] "DRAFT" button allows resetting to draft state.
