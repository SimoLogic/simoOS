<!-- ⚠️ AGENT INSTRUCTION: Before any change, you MUST read /ARCHITECTURE.md and /GLOBAL_RULES.md to ensure Vibe standards. -->
<div align="center">

# SIMO Intellisense — Enterprise Operating System

**Enterprise BPO Operating Platform | Multi-Tenant | Offshore-Ready**

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss)

</div>

---

## Overview

SIMO Intellisense is a modular, multi-tenant enterprise operating system designed for HOMESI — a BPO company operating an offshore office in Colombia for clients in the USA and Europe. The platform provides HR management, Business Plan execution, Growthify sales performance tracking, Operations compliance, and Finance P&L oversight in a single cockpit.

**Design Philosophy:** "Éxito Ingenierial" — every action is engineered for certainty of results.

---

## Folder Architecture

```
/
├── app/                    → Next.js Pages (App Router) + Server Actions
│   ├── actions/            → Server Actions — the only bridge between UI and DB
│   ├── layout.tsx          → Global shell
│   └── page.tsx            → Landing page
│
├── components/             → UI Components (Pure React, no direct DB access)
│   ├── hr/                 → HR Module components
│   ├── business-plan/      → Business Plan + Growthify components
│   ├── admin/              → Admin Panel (Tenant management)
│   ├── dashboard/          → Dashboard widgets
│   └── layout/             → TopBar, Sidebar, Navigation
│
├── types/                  → [LAYER 1] TypeScript Interfaces — Shared across all layers
│   ├── hr.types.ts         → Employee, Maestro, Afiliaciones, SST
│   ├── branch.types.ts     → Branch, BranchNode, US States
│   ├── tenant.types.ts     → Tenant, POC, Account Managers
│   ├── growthify.types.ts  → Sales Strategy, Playbook, Reward Scheme
│   ├── bp.types.ts         → Business Plan Workflow, Playbook (BP)
│   ├── process-designer.types.ts → Process rows, KPIs, frequencies
│   ├── job-title.types.ts  → Job Title, JDF, approvals
│   └── index.ts            → Barrel export — import from '@/types'
│
├── services/               → [LAYER 2] Business Logic & Storage helpers
│   └── storage.service.ts  → Supabase Storage: upload, signed URLs, delete
│
├── lib/                    → [LAYER 3] Infrastructure — Client, Stores, Utils
│   ├── database.ts         → Supabase client singleton
│   ├── tenant-context.tsx  → React Context for active tenant
│   ├── stores/             → Supabase-backed data access functions (Zustand: session only)
│   │   ├── hr.store.ts     → Employee CRUD
│   │   ├── tenant.store.ts → Tenant CRUD
│   │   ├── session.store.ts→ Zustand: session tenant_id + user identity
│   │   ├── bp.store.ts     → Business Plan workflow
│   │   ├── growthify.store.ts → Playbooks, Assignments, Reward Schemes
│   │   ├── approval.store.ts  → Approver maps
│   │   ├── process-designer.store.ts → Process designs + KPI calculator
│   │   └── index.ts        → Barrel export — import from '@/lib/stores'
│   └── utils/
│       ├── sanitizers.ts   → Input sanitizers (str, num, date, json, currency)
│       └── excel-import.ts → Excel import/export helpers
│
├── sql/                    → SQL DDL & configuration scripts
│   ├── ddl_phase_2.sql     → Core schema
│   └── storage_setup.sql   → Supabase Storage bucket + RLS policies
│
├── docs/                   → Engineering documentation
│   └── BRANCH_STRATEGY.md  → Git branch policy (Startup-Stream)
│
└── SKILLS/                 → Antigravity workspace skills
```

---

## Layer Responsibilities

| Layer | Folder | Rule |
|---|---|---|
| **Views** | `/app`, `/components` | No direct DB calls. Uses Server Actions only. |
| **Bridge** | `/app/actions/` | `"use server"` + tenant_id injection. Only entry point to DB. |
| **Services** | `/services/` | Business logic, Storage helpers. No React, no UI. |
| **Stores** | `/lib/stores/` | Supabase queries. Called by Server Actions, NOT by components. |
| **Types** | `/types/` | Pure TypeScript interfaces. No logic, no imports from other layers. |
| **Client** | `/lib/database.ts` | Supabase client singleton. |

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project with the Phase 2 schema (`sql/ddl_phase_2.sql`) applied

### 2. Clone & Install

```bash
git clone https://github.com/your-org/simo-intellisense.git
cd simo-intellisense
npm install
```

### 3. Configure Environment

Create a `.env.local` file at the project root (do NOT commit this file):

```bash
# Copy the example and fill in your Supabase credentials
cp .env.example .env.local
```

`.env.local` must contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Run Development Server

```bash
npm run dev
# → http://localhost:3000
```

### 5. Supabase Storage Setup

Run the SQL in `sql/storage_setup.sql` in the Supabase SQL Editor to create the `avatars`, `legal-docs`, and `reports` buckets with their RLS policies.

---

## Branch Strategy (Startup-Stream)

See full policy → [`docs/BRANCH_STRATEGY.md`](./docs/BRANCH_STRATEGY.md)

| Branch | Purpose | Pushes Allowed? |
|---|---|---|
| `feat/name` | Feature development | ✅ Yes |
| `staging` | QA integration | Via PR only |
| `main` | Gold / Audited | **⛔ NEVER direct push** |
| `production` | Live clients | **⛔ NEVER direct push** |

> ⚠️ **Direct pushes to `main` or `production` are strictly prohibited.** All changes must pass through a Pull Request with at least one reviewer approval.

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| Next.js | 14 (App Router) | Framework |
| TypeScript | 5 | Type safety |
| Supabase | 2.x | Database + Auth + Storage |
| PostgreSQL | 15 | Relational DB with RLS |
| Tailwind CSS | 3.x | Styling |
| Zustand | 5.x | UI session state only |
| Lucide React | 0.37 | Icons |
| SheetJS (xlsx) | 0.18 | Excel import/export |

---

## Multi-Currency Logic

- **Data capture:** Always in **COP** (Colombian Peso) for local costs, payroll, and contracts
- **Reporting:** Dynamic multi-currency display (**USD, EUR, COP**) via tenant-level `reporting_currency` setting
- **Storage:** Raw COP values in DB. Conversion applied at display layer only

---

## Security

- **RLS (Row-Level Security):** Enforced at PostgreSQL level. All queries include `tenant_id` filter.
- **Server Actions:** Every data mutation happens server-side with `"use server"` directive.
- **No client-side secrets:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` has restricted Supabase permissions. Service Role key is never used client-side.
- **Signed URLs:** Private bucket files (`legal-docs`, `reports`) are never publicly accessible. Temporary signed URLs (1h expiry) are generated on-demand.

---

*SIMO Intellisense — Engineered for Certainty. Built for Scale.*
