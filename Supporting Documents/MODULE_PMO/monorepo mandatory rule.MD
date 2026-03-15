# 🏛️ GLOBAL RULE: STRICT TURBOREPO ARCHITECTURE
**CRITICAL MANDATE:** SIMO Intellisense is an Enterprise ERP, NOT a simple web app. You are strictly forbidden from building monolithic applications. The project MUST adhere to a strict Turborepo (Monorepo) structure.

## 1. WORKSPACE ISOLATION (The "Firewalls")
All code must be strictly categorized into isolated workspaces. Never mix backend logic with frontend UI.
* `apps/simo-frontend/`: Next.js frontend ONLY. No direct database queries. No ORM logic. 
* `apps/simo-api/`: Node.js/NestJS/Next.js API ONLY. Handles all DB transactions, Token Vaults, and integrations (Salesforce/Zoom).
* `packages/ui-kit/`: Shared React components and Vibe Design tokens. No business logic.
* `packages/database/`: Shared Prisma/Supabase clients, schemas, and migrations.

## 2. IMPORT BOUNDARIES (Zero Coupling)
* The `frontend` CANNOT import directly from `database`. It must call the `api` via HTTP/tRPC.
* If you are asked to build a UI component, it goes into `ui-kit` and is imported into `frontend` as a package (e.g., `import { Button } from '@simo/ui-kit'`).

## 3. PENALTY FOR VIOLATION
If you attempt to write a monolithic API route inside `apps/simo-frontend/app/api/` that directly touches the database, you are violating the core architecture. Stop and create a proper service in `apps/simo-api/`.