# HOPS Language Directive — English Only (Mandatory Compliance)

## Rule ID: `language-english-only`
## Scope: Global — All Modules, Sub-modules, Pages, and Components
## Priority: HIGH — This rule overrides any language present in incoming prompts or user requests.

---

## 1. Core Mandate

**ALL user-facing text rendered inside the HOPS application MUST be written in English.**

This applies universally to every element across every screen, regardless of the language in which the development prompt or user request was written. If a prompt arrives in Spanish (or any other language), the developer/AI agent MUST translate all UI-facing content to English before implementation.

---

## 2. Scope of Enforcement

The English-only rule applies to — but is not limited to — the following UI elements:

| Category | Examples |
|---|---|
| **Navigation** | Sidebar labels, top-bar links, breadcrumbs, tab names |
| **Buttons** | Action buttons, submit buttons, cancel buttons, icon tooltips |
| **Forms** | Field labels, placeholder text, helper text, validation messages, error messages |
| **Tables & Grids** | Column headers, empty-state messages, pagination labels |
| **Cards & Widgets** | KPI card titles, metric labels, chart axis labels, legend text |
| **Modals & Pop-ups** | Modal titles, body text, confirmation dialogs, warning messages |
| **Notifications & Toasts** | Success messages, error alerts, info banners |
| **Onboarding & Wizards** | Step titles, instructions, progress labels |
| **Empty States** | Descriptive text, call-to-action prompts |
| **Dropdowns & Selects** | Option labels, group headers, placeholder options |
| **Badges & Tags** | Status badges, category tags, role labels |
| **Tooltips & Popovers** | Hover text, contextual help content |
| **Page Titles & Headings** | H1, H2, H3, section headers |
| **Metadata & SEO** | `<title>` tags, meta descriptions, `aria-label` attributes |
| **Comments in UI strings** | Any string constant that is rendered to the user |

---

## 3. Permitted Exceptions

The following content is **exempt** from the English-only rule and may appear in its original language:

1. **Proper Nouns — Entity Names**: Legal company names, brand names, and registered trade names (e.g., "HOMESI", "Bancolombia", "Grupo Éxito").
2. **Proper Nouns — Person Names**: Full names of employees, clients, or contacts as stored in the database (e.g., "María García", "José Rodríguez").
3. **Explicit Prompt Instruction**: If a specific development prompt explicitly requests that a particular word, phrase, or label be displayed in Spanish (or another language), that specific element is exempt. The exemption is **narrow** — it applies only to the explicitly requested expression, not to surrounding UI text.
4. **User-Generated Content**: Data entered by users into free-text fields (e.g., notes, comments, descriptions) is not controlled by this rule.
5. **Code & Technical Strings**: Internal variable names, API keys, database field identifiers, and code comments are not UI-facing and are not subject to this rule.

---

## 4. Agent / Developer Behavior Rules

### 4.1 Prompt Translation Protocol
When a development prompt is received in Spanish or any non-English language:
- **DO NOT** copy-paste Spanish labels, button text, or UI strings directly into the code.
- **DO** translate all UI-facing strings to English before writing any component, page, or file.
- **DO** preserve the semantic intent of the original prompt while expressing it in English.

### 4.2 Code Review Checklist (Pre-Commit)
Before finalizing any component or page, verify:
- [ ] All `<button>`, `<label>`, `<span>`, `<p>`, `<h1>`–`<h6>`, `<th>`, `<td>` text is in English.
- [ ] All `placeholder`, `aria-label`, `title`, and `alt` attributes are in English.
- [ ] All toast/notification messages are in English.
- [ ] All modal titles and body text are in English.
- [ ] All form validation and error messages are in English.
- [ ] All navigation items (sidebar, top-bar, breadcrumbs) are in English.
- [ ] All chart labels, axis titles, and legend entries are in English.
- [ ] Exceptions (proper nouns, explicit overrides) are documented with an inline comment: `{/* EXCEPTION: proper noun / explicit override */}`.

### 4.3 Handling Ambiguous Cases
- If a term is a widely recognized industry acronym used in both languages (e.g., "KPI", "SLA", "BPO", "CRM"), use the English-standard form.
- If a term has no direct English equivalent and is a proper noun of a Colombian/Latin American legal concept, keep the original term and add an English descriptor in parentheses on first use (e.g., "Cesantías (Severance Fund)").

---

## 5. Module-Specific Application

This rule applies uniformly across all HOPS modules:

- **Module 1 — Business Plan**: All playbook names, KPI labels, milestone titles, and execution grid headers → English.
- **Module 2 — HR**: All recruitment stages, contract types, career plan labels, payroll novelty types, and approval flow statuses → English.
- **Module 3 — Finance**: All P&L line items, projection labels, currency selectors, and report headers → English.
- **Module 4 — Operations & Compliance**: All audit checklist items, compliance status labels, and workflow step names → English.
- **Module 5 — CEO Playground**: All strategic dashboard widgets, metric names, and control panel labels → English.

---

## 6. Enforcement Priority

This rule has **higher priority** than the language of the incoming user prompt. Even if the user writes a request entirely in Spanish, the AI agent must:

1. Understand the request in Spanish.
2. Plan the implementation in Spanish (internally, if needed).
3. **Output all UI code and user-facing strings exclusively in English.**

The only exception is if the user explicitly states: *"Show this text in Spanish"* for a specific element.

---

*Rule established: 2026-02-18 | HOPS Workspace | HOMESI Enterprise OS*
