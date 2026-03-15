# ARCHITECTURE.md — Memoria Persistente del Agente AI
# Módulo PMO · SIMO Intellisense · v2.0
# ⚠️ LEE ESTE ARCHIVO ANTES DE ESCRIBIR CUALQUIER LÍNEA DE CÓDIGO

---

## REGLAS DE ORO (leer antes de cada prompt)

### 1. 🔒 PROTECCIÓN TASKS (Shield Protocol)
- `task.sourcePlaybookId !== null` → `isProtected = true`.
- **NUNCA** mostrar UI de borrado (botones, menús) para tareas protegidas.
- **Doble Capa de Bloqueo**: Shield 1 (Service Layer) + Shield 3 (PostgreSQL Trigger).
- Registrar `SecurityEvent` en CADA intento de borrado bloqueado: `{userId, taskId, attemptedAt, ipAddress, vector}`.
- Vector de borrado incluye: UI, Proxy API, Acceso Directo SQL.

### 2. 📐 JERARQUÍA DE DATOS (Mirror Sync Protocol)
- **Simo IS** es fuente de verdad para: `title`, `description`, `dueDate`, `priority`
- **Empleado** es dueño exclusivo de: `subtasks[]`, `comments[]`, `attachments[]`, `customFieldValues[]`, `collaborators[]`
- **Campos mixtos** (ej. `status`): conflicto → Modal de resolución. NUNCA sobreescribir silenciosamente.
- `SyncEvent` log: `{taskId, syncedFields[], conflictsFound[], resolvedBy, timestamp}`

### 3. 🎨 VIBE DESIGN SYSTEM (Tokens mandatorios)
**Nunca hardcodear — siempre importar de `/packages/ui-kit/src/tokens.ts` (futuro) o variables CSS en este proyecto.**

| Token | Hex | Rol |
|---|---|---|
| `--vibe-purple` | `#6161FF` | Core brand, CTAs, links activos |
| `--vibe-pink` | `#FF3D57` | Alertas críticas, acciones destructivas |
| `--vibe-green` | `#00CA72` | Éxito, Done, confirmaciones |
| `--vibe-orange` | `#FDAB3D` | CTAs secundarios, items en progreso |
| `--vibe-blue` | `#0086C0` | Trust, info, Simo IS badges |
| `--vibe-mirage` | `#181B34` | Dark mode background, sidebar oscuro |
| `--vibe-surface` | `#FFFFFF` | Fondo principal modo claro |
| `--vibe-surface-2` | `#F5F6F8` | Hover states, fondos secundarios |
| `--vibe-border` | `#E6E9EF` | Bordes, divisores |
| `--vibe-text-prime` | `#323338` | Texto principal (Text2 = 14px mínimo) |
| `--vibe-text-muted` | `#676879` | Metadata, timestamps (Text3 = 12px) |

**Border Radius:** 4px (inputs/botones) · 8px (dropdowns/popovers) · 16px (modales/cards)
**Spacing:** Múltiplos de 4px
**Tipografía mínima CUERPO:** 14px — NUNCA menos en Text2

### 4. ⚡ MOTION TOKENS (Sin easing lineal — usar curvas físicas)
| Token CSS | Duración | Uso |
|---|---|---|
| `--motion-productive-short` | 70ms | Click feedback, toggle, hover celda |
| `--motion-productive-medium` | 100ms | Dropdowns, collapse de grupos, sidebar |
| `--motion-productive-long` | 150ms | Nueva columna, Side Peek, filtros |
| `--motion-expressive-short` | 250ms | Toasts, entrada de modales |
| `--motion-expressive-long` | 400ms | Celebración al completar task Playbook |

**PROHIBICIÓN ABSOLUTA:** `transition: all Xms linear` — SIEMPRE usar `cubic-bezier` o `ease-in-out`.

### 5. 📅 CALENDARIO COMERCIAL (WorkdayHelper)
- Usar `date-fns` + `date-fns-tz`. **NUNCA** `new Date()` directamente para cálculos de fechas de negocio.
- `DAILY×N` **salta** fines de semana + festivos de `org.settings.country`
- Festivos: tabla `public_holidays` por país (CO, MX, AR, ES seeded)
- Config por org: `org.settings.timezone` (ej: `'America/Bogota'`) y `org.settings.workdays`
- UI: indicador "X tareas ajustadas por fines de semana/festivos" al generar Playbook

### 6. 🔐 AUTH
- JWT 15min + `refreshToken` httpOnly cookie
- Socket.io valida JWT en cada conexión
- `rbacMiddleware` en CADA endpoint de la API PMO
- Scopes: `['pmo:read', 'pmo:write', 'pmo:admin']`
- SSO Simo IS: si `SIMO_SSO_ENABLED=true` → validar JWT claims, campo `simoUserId`, auto-crear usuario
- Security: 5 intentos fallidos → bloqueo 15 min + `SecurityEvent`

### 7. 🏢 MULTI-TENANT
- **TODA** query en la API PMO filtra por `orgId`
- **RLS en PostgreSQL:** NO activar durante fase de desarrollo. **Solo al finalizar TODA la construcción del módulo PMO.** Cuando el módulo esté completo, el agente notificará para activar RLS.
- Cero mezcla entre organizaciones. Cada tenant tiene sus propios empleados y cada empleado su PMO.
- Schema: todas las tablas PMO tienen columna `org_id` indexada.

### 8. 📊 MONDAYDB LIMITS (Respetar en UI y backend)
| Umbral | Acción |
|---|---|
| 30 widgets | Banner warning amarillo `#FDAB3D` "Acercándote al límite de performance" |
| >50 widgets | AI features desactivadas (badge visible) |
| >3,000 items | HPCRenderMode automático (virtualización agresiva) |
| >20,000 items | Error bloqueante — no renderizar |

### 9. 🔗 SIMO IS INTEGRATION
- **HMAC-SHA256** en header `X-Simo-Signature` para cada request entrante/saliente
- **`Idempotency-Key`** en cada request (previene duplicados por retry)
- **Mirror Sync Protocol** en updates (ver Regla #2)
- Endpoint receptor: `POST /api/integrations/simo/playbook-assignment`
- Webhook outgoing firmado al completar task protegida

---

## STACK TECNOLÓGICO

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TS + Vite · TailwindCSS + tokens Vibe · Zustand + React Query · Framer Motion · Radix UI · date-fns + date-fns-tz |
| Backend | Node.js 20 + Express 5 + TS · Supabase Service Layer + TaskGuard Protect · Zod · Bull Queue · Socket.io · JWT |
| DB | PostgreSQL 16 (Supabase) · Redis 7 (Speed Layer) · ElasticSearch 8 (full-text) · MinIO/S3 (archivos) |
| Integración | REST API + HMAC-SHA256 · WorkdayHelper · PlaybookProcessor · Mirror Sync · DB Trigger Guard |
| DevOps | Docker + Docker Compose · Nginx · GitHub Actions · Jest + Playwright · Sentry + Pino + Prometheus |

---

## ARQUITECTURA DEL PROYECTO (Este monorepo Next.js)

> Nota: Este módulo PMO se construye DENTRO del monorepo Next.js existente de SIMO Intellisense (`/HOPS`), NO como un monorepo Turborepo separado. La estructura se integra a la arquitectura existente.

```
/
├── ARCHITECTURE.md          ← ESTE ARCHIVO (leer primero SIEMPRE)
├── app/
│   ├── (dashboard)/
│   │   └── pmo/             ← [NUEVO] Rutas del módulo PMO
│   │       ├── page.tsx     ← Redirect a /pmo/my-plan
│   │       └── my-plan/
│   │           └── page.tsx ← Motor de proyectos tipo Monday.com
│   └── actions/
│       └── pmo/             ← [NUEVO] Server Actions PMO
├── components/
│   ├── pmo/                 ← [NUEVO] Componentes PMO
│   │   ├── MyPlan/          ← Vista principal del motor
│   │   ├── views/           ← Grid, Kanban, Gantt, Calendar, Dashboard
│   │   ├── shared/          ← PlaybookBadge, StatusBadge, etc.
│   │   └── integrations/    ← Simo IS integration components
│   └── layout/
│       └── SideMenu.tsx     ← [MODIFICADO] Añadido módulo PMO
├── types/
│   └── pmo.types.ts         ← [NUEVO] Types PMO: Task, Board, Workspace, etc.
└── lib/
    ├── workday-helper.ts    ← [NUEVO] WorkdayHelper (Llave #2)
    └── stores/
        └── pmo.store.ts     ← [NUEVO] Zustand PMO (solo UI state)
```

---

## LAS 4 LLAVES MAESTRAS

### 🗝️ Llave #1 — ARCHITECTURE.md
Este archivo. Leer ANTES de cada prompt/cambio.

### 🗝️ Llave #2 — Calendario Comercial (WorkdayHelper)
- Implementado en `/lib/workday-helper.ts`
- Métodos: `addWorkdays(start, n, holidays[], timezone)`, `isWorkday(date, country, timezone)`, `nextWorkday(date, country, timezone)`
- Usa `date-fns-tz` para precisión en zonas horarias de organizaciones internacionales.
- Tests unitarios obligatorios: `__tests__/workday-helper.test.ts`

### 🗝️ Llave #3 — DB Trigger Guard
- **Capa 1 (Shield 1):** `TaskGuard` service (`/lib/pmo/task-guard.ts`) intercepta delete en Service Layer.
- **Capa 2 (Shield 2):** Trigger PostgreSQL `BEFORE DELETE ON pmo_tasks` rechaza si `source_playbook_id IS NOT NULL`.
- **Capa 3 (Shield 3):** API retorna 403 + `TASK_PLAYBOOK_PROTECTED` + registra `SecurityEvent` en DB.
- Protege contra: HTTP, Prisma directo, psql/scripts SQL, curl malicioso

### 🗝️ Llave #4 — Mirror Sync Protocol (Sincronización Bidireccional)
- Reflejado inteligente Simo IS → PMO sin destrucción de datos locales.
- **CAMPOS PADRE** (Simo IS es verdad): `title`, `description`, `dueDate`, `priority`.
- **CAMPOS HIJO** (Empleado es verdad): `subtasks[]`, `comments[]`, `attachments[]`, `customFieldValues[]`.
- **Conflictos Estructurales**: Conflictos en `status` disparan Modal de Resolución (comparación UI).
- Registro exhaustivo en `pmo_sync_events`.

---

## ESTRUCTURA DE NAVEGACIÓN PMO

```
Sidebar
└── PMO (módulo principal)
    └── My Plan (sub-módulo)         ← Motor de proyectos por empleado
        ├── Vista: Grid (tabla virtualizada)
        ├── Vista: Kanban
        ├── Vista: Gantt
        ├── Vista: Calendario Comercial 
        └── Vista: Dashboard (widgets)
```

---

## DECISIONES ARQUITECTÓNICAS TOMADAS

| # | Fecha | Decisión | Razón |
|---|---|---|---|
| 1 | 2026-03-11 | PMO integrado en monorepo Next.js existente (no Turborepo separado) | El proyecto ya corre en Next.js con Supabase. Crear un Turborepo separado sería over-engineering para la fase actual. Se mantiene la arquitectura probada. |
| 2 | 2026-03-11 | RLS desactivada durante desarrollo, activar solo al finalizar módulo PMO completo | Evitar bloqueos durante construcción. El agente notificará cuando sea momento de instaurar RLS. |
| 3 | 2026-03-11 | Vibe Design tokens integrados como CSS custom properties en globals.css | Compatibilidad con TailwindCSS existente sin romper estilos actuales. |
| 4 | 2026-03-11 | PMO module añadido como ModuleId "pmo" en SideMenu existente | Mantener UX consistente con módulos existentes (HR, Finance, etc.) |

---

## SCHEMA PMO (Referencia rápida — détalle en prompts 3+)

```prisma
model Task {
  id                   String    @id
  orgId                String    // Multi-tenant filter
  boardId              String
  title                String
  description          String?
  dueDate              DateTime?
  priority             String?
  status               String    @default("not_started")
  isProtected          Boolean   @default(false)  // ← REGLA DE ORO #1
  sourcePlaybookId     String?   // Si != null → isProtected OBLIGATORIO
  sourcePlaybookTaskId String?
  occurrenceIndex      Int?
  // Campos del empleado (propiedad suya — Regla #2):
  customFieldValues    Json
}
```

---

## ENDPOINTS CLAVE (Referencia rápida)

| Método | Ruta | Protección |
|---|---|---|
| POST | `/api/integrations/simo/playbook-assignment` | HMAC-SHA256 + Idempotency-Key |
| GET | `/api/integrations/simo/jobs/:jobId` | JWT |
| POST | `/api/integrations/simo/playbook-task-update` | HMAC-SHA256 (Mirror Sync) |
| DELETE | `/api/tasks/:id` | 403 si isProtected — SIEMPRE |

---

*⚠️ INSTRUCCIÓN FINAL: Si estás a punto de agregar un botón Eliminar, un DELETE endpoint, o cualquier operación destructiva sobre tasks — LEE LA REGLA #1 antes. Si sourcePlaybookId !== null, es una tarea protegida y cualquier operación destructiva es una violación crítica.*
