# SIMO INTELLISENSE — PLAN MAESTRO DE DESARROLLO
## MÓDULO PMO — VERSIÓN 2.0
### Guía Completa de Prompts para Agentes AI · State of the Art · Full Stack
### PROMPT #0 (MANIFIESTO) · 66 PROMPTS · 4 LLAVES MAESTRAS · SISTEMA VIBE COMPLETO · 14 FASES

| PROMPTS | FASES | SPRINTS | SEMANAS | INTEGRACIÓN |
|---------|-------|---------|---------|-------------|
| **66** | **14** | **7** | **16 semanas** | **Simo IS** |

---

## CHANGELOG — VERSIÓN 2.0

Esta versión incorpora el feedback de revisión técnica, las 4 Llaves Maestras, el Prompt #0 (Manifiesto de Arquitectura), el sistema de diseño Vibe completo del research de Monday.com, y toda nomenclatura actualizada de 'ERP' a 'Simo Intellisense'.

| TAG | CAMBIO | DESCRIPCIÓN |
|-----|--------|-------------|
| **★ NUEVO** | Prompt #0 — Manifiesto | Reglas de oro que el agente lee ANTES de cualquier prompt. ARCHITECTURE.md como memoria persistente del proyecto. |
| **★ NUEVO** | Llave #1 — ARCHITECTURE.md | Archivo de contexto continuo. Previene que el agente olvide reglas de protección de tareas entre prompts distantes. |
| **★ NUEVO** | Llave #2 — Calendario Comercial | Motor de frecuencias con WorkdayHelper (date-fns-tz). DAILY×N salta fines de semana y festivos por país. |
| **★ NUEVO** | Llave #3 — DB Trigger Guard | Doble capa: Middleware Prisma + Trigger PostgreSQL. Rechaza DELETE sobre sourcePlaybookId a nivel DB. |
| **★ NUEVO** | Llave #4 — Mirror Sync Protocol | Sincronización Simo IS → PMO que actualiza campos padre sin destruir trabajo del empleado. |
| **✏ UPDATE** | ERP → Simo Intellisense | Toda referencia a 'ERP' reemplazada. Endpoints, variables de entorno, comentarios, documentación. |
| **✏ UPDATE** | Paleta Vibe exacta | #6161FF purple, #FF3D57 pink, #00CA72 green, #FDAB3D orange, #0086C0 blue, #181B34 mirage. |
| **✏ UPDATE** | Motion Tokens Vibe | productive-short 70ms, productive-medium 100ms, expressive-long 400ms. Sin easing lineal. |
| **✏ UPDATE** | Tipografía Vibe | H1=32px, Text2=14px mínimo. Sin subrayado. Sin mezcla de tamaños en misma línea de base. |
| **✏ UPDATE** | mondayDB Limits | Warning 30 widgets, AI off >50, HPC render >3,000 items, error >20,000 items. |
| **✏ UPDATE** | Dark Mode + Temas | Soporte Luz/Oscuro (#181B34)/Noche. ThemeProvider con CSS custom properties. |
| **✏ UPDATE** | WorkloadWidget | Nuevo widget de capacidad del equipo (equivale al Workload de Monday.com). Rojo en sobreasignación. |

---

## A. SISTEMA DE DISEÑO VIBE — REFERENCIA OFICIAL

El sistema Vibe de Monday.com (basado en React.js) es la fuente de verdad para el look & feel del Módulo PMO de Simo Intellisense. TODOS los prompts de frontend DEBEN adherirse a estas especificaciones. Los Design Tokens están centralizados en `/packages/ui-kit/src/tokens.ts` — nunca hardcodear valores.

### A.1 Los 4 Principios Rectores del Work OS

- **Claridad:** Visuales despejados que eliminan fricción. Separación estricta entre tokens de UI y colores de contenido (estados de tareas). Los controles de interfaz nunca colisionan con datos del usuario.

- **Velocidad y Fiabilidad:** Feedback visual en 70ms (productive-short). El rendimiento estable otorga autonomía. Animaciones que NUNCA bloquean la acción siguiente del usuario.

- **Camino Intuitivo:** Continuidad espacial. Jerarquía 'muñeca rusa' siempre visible: Workspace › Board › Group › Item › Sub-item. El usuario siempre sabe dónde está.

- **Experiencia Placentera (Delight):** expressive-long 400ms para celebrar hitos. La gestión comercial con Simo IS debe sentirse energizante, no burocrática.

---

### A.2 Paleta Cromática Vibe — Especificaciones Técnicas

> 📌 **REGLA DE ORO VIBE:** Colores de Contenido (etiquetas de estado definidas por el usuario) NUNCA deben colisionar con Tokens de UI (colores primarios de la interfaz). Esta separación previene el 'ruido navegacional' — el usuario debe identificar instantáneamente qué es un control y qué es un dato.

| NOMBRE | HEX EXACTO | PANTONE / ROL | FUNCIÓN ARQUITECTÓNICA |
|--------|-----------|---------------|------------------------|
| Púrpura Primario | **#6161FF** | 2725 C — Core brand | Núcleo de marca, innovación, CTAs principales, links activos, selector de vistas |
| Rosa Primario | **#FF3D57** | 1787 C — Energy | Reconocimiento, acciones destructivas contextuales, energía, alertas críticas |
| Verde Acento | **#00CA72** | 354 C — Success | Estados Done, progreso completado, confirmaciones positivas, tareas completadas |
| Naranja Acento | **#FDAB3D** | 150 C — CTA sec | Dinamismo, ítems en progreso, CTAs secundarios, avisos suaves, motion tokens |
| Azul Acento | **#0086C0** | 7461 C — Trust | Profesionalismo, links, estados informativos, integración Simo IS badges |
| Mirage (Dark BG) | **#181B34** | 539 C — Hierarchy | Jerarquía superior, fondo Dark Mode, sidebar en modo oscuro |
| Surface (Light) | **#FFFFFF** | — Default BG | Fondo principal modo claro, celdas de tabla, cards |
| Surface 2 (Hover) | **#F5F6F8** | — Hover state | Hover de filas, fondos de secciones secundarias, prompt boxes |
| Border | **#E6E9EF** | — Dividers | Bordes de tabla, separadores, líneas divisorias entre celdas |
| Text Prime | **#323338** | — Body text | Texto estándar: celdas, labels, contenido principal (Text2 = 14px mínimo) |
| Text Muted | **#676879** | — Secondary | Metadatos, timestamps, micro-copia, Text3 = 12px |

---

### A.3 Escala Tipográfica Vibe

> ⚠ **Prohibiciones:** NO usar menos de 14px en cuerpo principal. NO subrayar texto (énfasis solo por peso). NO mezclar dos tamaños en la misma línea de base.

| ROL | TAMAÑO | PESOS | LINE-H | PROPÓSITO EN PMO |
|-----|--------|-------|--------|-----------------|
| **H1** | 32px | Bold/Medium/Normal/Light | 1.14 | Títulos de boards, nombre del Playbook Simo IS |
| **H2** | 24px | Bold/Medium/Normal/Light | 1.14 | Dashboards, subsecciones, headers de widget |
| **H3** | 18px | Bold/Medium/Normal/Light | 1.14 | Headers de grupo (color-coded), labels de sección |
| **Text1** | 16px | Bold/Medium/Normal | 1.5 | Cuerpo de texto, descripciones de tarea, comentarios |
| **Text2 ★** | 14px — MÍNIMO | Bold/Medium/Normal | 1.5 | Celdas de Grid, ítems de Kanban, etiquetas de campo |
| **Text3** | 12px | Medium/Normal | 1.5 | Timestamps, micro-copia, contadores, badges numéricos |

---

### A.4 Sistema de Geometría — Border Radius (Múltiplos de 4px)

- **4px** — inputs, botones, checkboxes, badges. Precisión y acción directa.
- **8px** — menús desplegables, popovers, tooltips, cuadros de atención. Sub-secciones informativas.
- **16px** — diálogos de sistema, modales, cards de dashboard. Contenedores principales.

> 📌 El espaciado usa múltiplos de 4px. El espacio vacío no es desperdicio — es el elemento que permite que la interfaz 'respire' y guíe el ojo sin saturación visual.

---

### A.5 Tokens de Movimiento Vibe (Sin Easing Lineal)

**Prohibición absoluta:** NO usar easing lineal en ninguna transición. TODAS deben usar curvas que imiten física real. El usuario nunca debe percibir que 'espera' una animación para actuar.

| TOKEN CSS | DURACIÓN | USO EN EL MÓDULO PMO |
|-----------|----------|----------------------|
| `--motion-productive-short` | 70ms | Feedback de clic, toggle checkbox, cambio de status, hover en celda |
| `--motion-productive-medium` | 100ms | Apertura de dropdowns, expansión de grupos, sidebar collapse/expand |
| `--motion-productive-long` | 150ms | Nueva columna apareciendo, Side Peek abriendo, filtros aplicándose |
| `--motion-expressive-short` | 250ms | Entrada de toasts, apertura de modales, notificaciones elásticas |
| `--motion-expressive-long` | 400ms | Completar tarea Playbook Simo IS (hito celebrado), Playbook generado exitosamente |

---

### A.6 Temas Visuales — Luz / Oscuro / Noche

- **Modo Luz (Default):** fondo #FFFFFF. Máxima claridad en entornos de alta iluminación. Colores semánticos en plena saturación.
- **Modo Oscuro:** fondo Mirage #181B34. Aumenta la vibración de los colores de estado. Reduce fatiga en sesiones largas de CRM/PMO.
- **Modo Noche:** fondo negro profundo. Contraste máximo, bajo consumo en OLED. Para entornos de baja luz.

> 📌 Selector de tema persiste en `user.settings.theme` en la base de datos. El ThemeProvider cambia CSS custom properties — NUNCA clases de Tailwind directamente.

---

### A.7 Arquitectura mondayDB 2.0 — Patrón Lambda para el PMO

- **Speed Layer (Redis 7):** captura cambios en tiempo real. Responde queries de datos recientes sin latencia. Usado por Socket.io y Bull Queue.
- **Batch Layer (PostgreSQL 16):** source of truth, queries analíticas, historial completo. Con RLS para aislamiento multi-tenant.
- **Serving Layer (React Query):** fusión dinámica — el cliente siempre ve datos frescos (Redis) con profundidad analítica (PostgreSQL).

> 📌 **Límites mondayDB 2.0 a respetar:** max 20,000 ítems en dashboard vinculado, warning visual a 30 widgets, AI features se desactivan >50 widgets, HPC render mode automático >3,000 ítems.

---

## B. LAS 4 LLAVES MAESTRAS

Estas cuatro salvaguardas son requisitos no negociables. El agente AI las implementa antes de cualquier feature visible al usuario. Son el 'cinturón de seguridad' de todo el proyecto.

---

### LLAVE MAESTRA #1 — ARCHITECTURE.md: Memoria de Largo Plazo del Agente

El mayor riesgo es que el agente 'olvide' las reglas de protección de tareas de Simo Intellisense cuando está construyendo el frontend en el Prompt #28 — 40 prompts después del Prompt #3 donde se definieron.

- **Solución:** `/ARCHITECTURE.md` en la raíz del monorepo creado en el Prompt #0. Todo prompt debe COMENZAR: 'Lee /ARCHITECTURE.md antes de escribir código'.
- **Contenido:** reglas de oro numeradas con su RAZÓN (no solo el qué, sino el por qué), contratos de API, schema de integración Simo IS, tokens Vibe, límites mondayDB.
- El agente ACTUALIZA el archivo cada vez que toma una decisión arquitectónica importante (cambio de schema, nuevo endpoint, decisión de diseño).

> 📌 Sin ARCHITECTURE.md: el Prompt #28 (Grid) podría agregar un botón Eliminar a tareas del Playbook sin saber que es una violación crítica. Con ARCHITECTURE.md: es imposible — el agente lee la Regla #1 antes de escribir una línea.

---

### LLAVE MAESTRA #2 — Calendario Comercial: Días Laborales y Zonas Horarias

El motor de frecuencias (PlaybookProcessor) debe operar en tiempo comercial, no en tiempo calendario. Sin esta llave, un vendedor colombiano que recibe un Playbook el viernes verá 8 tareas un sábado y domingo.

- **WorkdayHelper** (date-fns + date-fns-tz): `addWorkdays(start, n, holidays[], timezone)`, `isWorkday(date)`, `nextWorkday(date)`.
- Festivos en tabla `public_holidays` por país. Seed inicial: Colombia, México, Argentina, España. API para festivos custom por organización.
- Configuración por organización: `org.settings.timezone` (ej: `'America/Bogota'`), `org.settings.workdays` (`[1,2,3,4,5]` = lun-vie).
- En la UI: indicador 'X tareas ajustadas por fines de semana/festivos' al generar el Playbook. Días no laborales en el calendario con tono suave.

> ⚠ **Tests unitarios obligatorios:** 'Viernes + DAILY×8 = 8 días laborales correctos'. Casos edge: semana de Navidad, puentes. Prompt #20 es el más crítico del Sprint 2.

---

### LLAVE MAESTRA #3 — DB Trigger Guard: Seguridad de Grado Bancario

No basta ocultar el botón Eliminar. Un bug en el frontend, acceso directo a la API, o una petición curl maliciosa podrían destruir tareas del Playbook. La base de datos es el último guardián.

- **CAPA 1 — Middleware Prisma** (`prisma/middleware.ts`): intercepta operaciones `delete`/`deleteMany` sobre `Task`. Si `sourcePlaybookId !== null` → lanza error `'TASK_PLAYBOOK_PROTECTED'`.
- **CAPA 2 — PostgreSQL Trigger:** `BEFORE DELETE ON tasks` → `IF OLD.source_playbook_id IS NOT NULL THEN RAISE EXCEPTION`. Protege contra psql directo, scripts SQL, bypasses del ORM.
- **Audit log:** cada intento bloqueado genera `SecurityEvent {userId, taskId, attemptedAt, ipAddress, vector}` para análisis de seguridad.

> 📌 Doble capa garantiza que ni siquiera el developer con acceso directo a la DB puede borrar una tarea del Playbook por accidente. Nivel bancario.

---

### LLAVE MAESTRA #4 — Mirror Sync Protocol: Sincronización Bidireccional Inteligente

Cuando Simo Intellisense actualiza el Playbook, los cambios deben reflejarse en el PMO SIN destruir el trabajo del empleado (subtareas, comentarios, campos custom, adjuntos).

- **CAMPOS PADRE** (sincronizan desde Simo IS → PMO): `title`, `description`, `dueDate`, `priority` — fuente de verdad en Simo IS.
- **CAMPOS HIJO** (propiedad del empleado, NUNCA se sobrescriben): `subtasks[]`, `comments[]`, `attachments[]`, `customFieldValues[]`, `collaborators[]`.
- **CAMPOS MIXTOS** (merge con resolución de conflicto): `status` — si hay conflicto, modal de resolución: '¿Mantener tu status Done o aceptar el reset de Simo IS?'
- **SyncEvent log:** tabla `sync_events` registra `{taskId, syncedFields[], conflictsFound[], resolvedBy, timestamp}` para auditoría total.

> ⚠ Sin esta llave, una actualización de Simo IS podría borrar las subtareas que el vendedor pasó horas construyendo para gestionar su lead. Es el segundo fallo más catastrófico del sistema.

---

## C. PROMPT #0: EL MANIFIESTO DE ARQUITECTURA

> **EJECUTAR ESTE PROMPT ANTES QUE CUALQUIER OTRO — ES EL PUNTO DE PARTIDA ABSOLUTO**

> 📌 Este prompt tarda ~10-15 minutos. Es la inversión más rentable del proyecto. Una hora de setup del Manifiesto puede ahorrar días de refactoring.

| PROMPT | Descripción |
|--------|-------------|
| **#00** `[MANIF]` `★ V2` | **El Manifiesto de Arquitectura — ARCHITECTURE.md y Setup del Monorepo** |

Eres el arquitecto principal del Módulo PMO de Simo Intellisense. Tu primera tarea — antes de cualquier línea de código de features — es crear `/ARCHITECTURE.md` con este contenido:

```markdown
# ARCHITECTURE.md — Memoria Persistente del Agente AI

## REGLAS DE ORO (leer antes de cada prompt)

1. PROTECCIÓN TASKS: task.sourcePlaybookId !== null → isProtected=true. NUNCA UI de borrado. NUNCA DELETE en API. DB Trigger bloquea igualmente. SecurityEvent en cada intento.
2. JERARQUÍA: Simo IS es fuente de verdad para title/description/dueDate de tasks protegidas. Empleado es dueño de subtasks/comments/attachments/customFields.
3. VIBE DESIGN: #6161FF purple, #FF3D57 pink, #00CA72 green, #FDAB3D orange, #0086C0 blue, #181B34 mirage. Radius: 4px inputs, 8px menus, 16px modals. Min font 14px. Easing no-lineal siempre.
4. MOTION TOKENS: productive-short 70ms, productive-medium 100ms, expressive-long 400ms. Sin linear easing.
5. CALENDARIO COMERCIAL: WorkdayHelper con date-fns-tz. DAILY×N salta fines de semana + festivos de org.settings.country.
6. AUTH: JWT 15min + refreshToken httpOnly. Socket.io valida JWT. rbacMiddleware en cada endpoint.
7. MULTI-TENANT: TODA query filtra por orgId. RLS en PostgreSQL. Cero mezcla entre organizaciones.
8. MONDAYDB LIMITS: warning UI a 30 widgets, AI off >50 widgets, HPC render >3000 items, error >20000 items.
9. SIMO IS INTEGRATION: HMAC-SHA256 en header X-Simo-Signature. Idempotency-Key en cada request. Mirror Sync Protocol en updates.

## DECISIONES TOMADAS
[El agente actualiza esta sección con cada decisión arquitectónica importante]
```

Después de crear `ARCHITECTURE.md`, configura el monorepo Turborepo completo. Añade al `README.md` raíz: `'INSTRUCCIÓN PARA AGENTES AI: Lee /ARCHITECTURE.md antes de hacer cualquier cambio en este proyecto.'` Verifica que cada workspace puede correr su comando `dev` independientemente.

---

## 1. VISIÓN GENERAL DEL MÓDULO PMO

El Módulo PMO es un clon funcional completo de Monday.com integrado nativamente a Simo Intellisense. Recibe Playbooks comerciales desde el módulo Business Plan y los despliega automáticamente como proyectos con tareas, calendarios, Kanban, Gantt, dashboards y campos personalizados. El empleado gestiona su plan comercial sin poder eliminar las tareas madre, garantizando trazabilidad total hacia Simo IS.

### Flujo Completo: Simo Intellisense → Módulo PMO

| # | ACCIÓN | RESULTADO |
|---|--------|-----------|
| **1** | Simo IS: gerente asigna Playbook con fecha Día 0 y país del empleado | API Simo IS → `POST /api/integrations/simo/playbook-assignment` firmado HMAC-SHA256 |
| **2** | PMO valida payload con Zod + verifica Idempotency-Key | Si válido: encola `PlaybookProcessorJob` en Bull Queue. Retorna `202 + jobId` para polling. |
| **3** | WorkdayHelper expande frecuencias en días laborales + festivos del país | DAILY×8 = 8 fechas reales saltando sábados, domingos y festivos de Colombia/México/etc. |
| **4** | Board creado: grupos por semana, tasks con `isProtected=true`, badge Simo IS | Doble protección activa: Middleware Prisma + Trigger PostgreSQL listos. |
| **5** | Empleado abre PMO — proyecto completo desplegado en todas las vistas | Grid, Kanban, Gantt, Calendario muestran las tareas en sus fechas laborales calculadas. |
| **6** | Empleado crea subtareas, agrega campos custom, comenta, adjunta archivos | Trabajo del empleado es propiedad suya. Mirror Sync Protocol nunca lo tocará. |
| **7** | Empleado completa una tarea del Playbook — animación expressive-long 400ms | Webhook outgoing → Simo IS recibe: status, completedAt, timeSpent, notas, subtask count. |
| **8** | Simo IS actualiza el Playbook (nueva tarea o cambio de fecha) | Mirror Sync Protocol: actualiza solo campos padre. Preserva subtareas del empleado. |

---

## 2. STACK TECNOLÓGICO

| CAPA | TECNOLOGÍAS |
|------|-------------|
| **Frontend (Vibe)** | React 18+TS+Vite \| TailwindCSS + tokens Vibe \| Zustand + React Query \| react-beautiful-dnd \| @fullcalendar/react \| @dhx/gantt \| Recharts+Chart.js \| Framer Motion (tokens Vibe) \| Radix UI (WCAG AA) \| date-fns + date-fns-tz |
| **Backend** | Node.js 20 + Express 5 + TS \| Prisma ORM + Middleware Protect \| Zod \| Bull Queue \| Socket.io (rooms + presence) \| Multer + Sharp \| JWT + Refresh Tokens \| Helmet + CORS + Rate Limiter |
| **Base de Datos** | PostgreSQL 16 (principal + RLS multi-tenant + DB Trigger Guard) \| Redis 7 (Speed Layer: cache + queues) \| ElasticSearch 8 (full-text) \| MinIO/S3 (archivos) |
| **Integración Simo IS** | REST API + HMAC-SHA256 \| WorkdayHelper (date-fns-tz) \| PlaybookProcessor + WorkdayExpander \| Mirror Sync Protocol \| DB Trigger Guard + Prisma Middleware \| Webhook outgoing retry |
| **DevOps** | Docker + Docker Compose \| Nginx (Brotli, cache, SPA fallback) \| GitHub Actions CI/CD \| Jest + Playwright \| Sentry + Pino + Prometheus + Grafana \| OpenAPI 3.0 |

---

## 3. PROMPTS FASE 1 — ARQUITECTURA Y SCAFFOLDING

> 📌 Todos los prompts de esta fase comienzan con: 'Lee /ARCHITECTURE.md'.

---

| PROMPT | Descripción |
|--------|-------------|
| **#01** `[ARCH]` | **Scaffolding del Monorepo (Turborepo)** |

Crea el monorepo: `/apps/pmo-frontend` (React+Vite+TS), `/apps/pmo-api` (Express+TS), `/packages/shared-types` (incluye desde el día 1: `PlaybookTask`, `FrequencyType`, `WorkdayConfig`, `SyncPatch`, `VibeTokens`), `/packages/ui-kit` (componentes Vibe), `/packages/pmo-config` (ESLint, Prettier, tsconfig). Turborepo pipelines `build`/`dev`/`test`/`lint`. `.env.example` completo con `SIMO_HMAC_SECRET`, `SIMO_WEBHOOK_URL`, `SIMO_SSO_ENABLED`, `ORG_DEFAULT_TIMEZONE`, `SIMO_API_URL`.

---

| PROMPT | Descripción |
|--------|-------------|
| **#02** `[ARCH]` | **Docker Compose Dev + Prod** |

`docker-compose.yml`: `postgres:16` (PMO), `postgres-simo:16` (simulador Simo IS), `redis:7`, `elasticsearch:8`, `minio`, `mailhog`, `nginx`. Init SQL: extensiones `uuid-ossp`+`pg_trgm`, Trigger DB Protect (Llave #3), tabla `public_holidays` con festivos seeded de Colombia/México/Argentina/España 2024-2026. `docker-compose.override.yml` para hot-reload. `docker-compose.prod.yml` con resource limits y restart policies.

---

| PROMPT | Descripción |
|--------|-------------|
| **#03** `[DB]` | **Schema Prisma Completo V2** |

Todos los modelos con: `Organization` (settings JSON: timezone, country, workdays), `Task` (`isProtected`, `sourcePlaybookId`, `sourcePlaybookTaskId`, `occurrenceIndex`), `PublicHoliday` (country, date, name), `SyncEvent` (`taskId`, `syncedFields[]`, `conflictsFound[]`, `resolvedBy`), `SecurityEvent` (`userId`, `taskId`, `attemptedAt`, `vector`), `WebhookDelivery` (simoWebhook + status + retries). Middleware Prisma para protección. Todos los índices. RLS comment en cada modelo. Migración inicial.

---

| PROMPT | Descripción |
|--------|-------------|
| **#04** `[DB]` | **Seed Data — Organización Demo Simo IS** |

Seed: 1 organización timezone `'America/Bogota'`, festivos Colombia 2025, 5 usuarios. Board `'Playbook Ventas Q4 — Juan Pérez'`: Llamar Lead (DAILY×8 → 8 días laborales reales), Email Cold (BIWEEKLY×1 → día laboral +14), Follow-up (WEEKLY×4), Demo (1 vez), Propuesta (1 vez), Cierre (1 vez). Verificar en seed que NINGUNA tarea cae en fin de semana o festivo. Factories `@faker-js/faker` para tests.

---

## 4. PROMPTS FASE 2 — BACKEND API

---

| PROMPT | Descripción |
|--------|-------------|
| **#05** `[BACK]` | **Express App + Middleware Stack** |

Express 5: `helmet` (CSP, HSTS), rate-limit (5/15min en `/auth`, 100/min auth, 20 unauth), compression Brotli, `pino` logger (requestId, JSON), multer+MinIO. `GlobalErrorHandler` JSON API. `GET /health {db, redis, es, minio}`. Graceful shutdown: drain Bull queues, cierra Prisma pool, cierra Socket rooms. Socket.io adjunto al servidor HTTP.

---

| PROMPT | Descripción |
|--------|-------------|
| **#06** `[AUTH]` | **Autenticación JWT + SSO Simo IS** |

Auth: login, refresh, logout, forgot/reset password, `GET /me`. Middleware `authMiddleware` + `rbacMiddleware`. Si `SIMO_SSO_ENABLED`: validar JWT claims Simo IS (campo `simoUserId`), auto-crear usuario local en primer login. `SecurityEvent` en login fallido (5 intentos → bloqueo 15min). Scopes en JWT: `['pmo:read', 'pmo:write', 'pmo:admin']`.

---

| PROMPT | Descripción |
|--------|-------------|
| **#07** `[BACK]` | **API: Workspaces y Boards CRUD** |

CRUD Workspaces/Boards. Boards generados por Simo IS tienen `simoPlaybookId` readonly. `checkBoardAccess` middleware. Lock View: endpoint `PUT /api/boards/views/:id/lock` (solo manager+admin). Socket.io events. Folders y sub-carpetas para organización del sidebar (feature mondayDB). OpenAPI JSDoc.

---

| PROMPT | Descripción |
|--------|-------------|
| **#08** `[BACK]` | **API: Tasks — CRUD + Doble Protección (Llave #3)** |

CRUD tasks. REGLA (leer ARCHITECTURE.md regla #1): si `isProtected=true` → bloquear DELETE con `403 TASK_PLAYBOOK_PROTECTED` + registrar `SecurityEvent`. Bloquear PUT en campos padre (solo Simo IS sync los actualiza). Middleware Prisma + Trigger DB son capas 2 y 3. Subtareas: siempre `isProtected=false`. Item height en respuesta (Simple/Double/Triple per Vibe). Campos calculados. Socket.io events.

---

| PROMPT | Descripción |
|--------|-------------|
| **#09** `[FIELD]` | **API: Motor de Campos — 27 Tipos** |

CRUD `FieldDefinitions`. `FieldValueSerializer` para todos los tipos. `DATE`/`DATE_RANGE`: almacenar UTC, devolver en `org.timezone` (date-fns-tz). `FORMULA` con mathjs. `MIRROR`: query a board fuente con validación Mirror Sync awareness. `STATUS`: colores semánticos separados de tokens UI per Vibe Regla de Oro. `FILE`: magic bytes check.

---

| PROMPT | Descripción |
|--------|-------------|
| **#10** `[COLLAB]` | **API: Colaboradores, Comentarios, Notificaciones** |

Colaboradores + roles en tareas. Comentarios rich text Tiptap. @menciones → `CommentMention` + `Notification`. Comentarios PERMITIDOS en tareas protegidas (empleado registra avance). Notificación especial `SIMO_PLAYBOOK_UPDATED`. Centro notificaciones con Socket.io. Invitaciones por email via Bull Queue.

---

| PROMPT | Descripción |
|--------|-------------|
| **#11** `[BACK]` | **API: Archivos, Búsqueda, Vistas Guardadas** |

Archivos: presigned URLs MinIO, thumbnails sharp, `FileCleaupJob`. ES búsqueda full-text con aislamiento por `orgId`. `FilterEngine` con todos los operadores + filtro `isProtected` (Simo IS vs manual). Vistas guardadas con URL query params sync. Lock View compartible con token.

---

| PROMPT | Descripción |
|--------|-------------|
| **#12** `[BACK]` | **API: Dashboards (mondayDB Limits), Automatizaciones, WebSocket** |

Dashboards: `WidgetDataResolver` con `WorkloadWidget` (sobreasignación en `C.pink`). Límites mondayDB: warning banner a 30 widgets, AI off >50, HPC >3000, error >20000. Automation Engine con trigger `SIMO_PLAYBOOK_TASK_GENERATED`. WebSocket: rooms, presence Redis TTL 30s, evento `simo:playbook:synced`. Bull Queue completo: `SimoWebhookDeliveryJob`, `SyncPatchJob`, `WorkdayCalcJob`.

---

## 5. PROMPTS FASE 3 — INTEGRACIÓN SIMO INTELLISENSE

---

| PROMPT | Descripción |
|--------|-------------|
| **#13** `[INT]` `★ V2` | **Endpoint Receptor de Playbook** |

`POST /api/integrations/simo/playbook-assignment` (HMAC-SHA256, Idempotency-Key). Payload:
```json
{
  "employeeId": "",
  "playbookId": "",
  "playbookName": "",
  "startDate": "",
  "organizationTimezone": "",
  "tasks": [
    {
      "id": "",
      "name": "",
      "type": "",
      "frequency": { "type": "", "interval": "" },
      "repetitions": 0,
      "workdayOnly": true,
      "skipWeekends": true,
      "respectPublicHolidays": true,
      "dependsOn": [],
      "estimatedMinutes": 0,
      "priority": ""
    }
  ]
}
```
Zod validation. Bull Queue. Retorna `202 + jobId`. `GET /api/integrations/simo/jobs/:jobId` polling.

---

| PROMPT | Descripción |
|--------|-------------|
| **#14** `[INT]` `★ V2` | **WorkdayHelper — Motor de Calendario Comercial (Llave #2)** |

Implementa `WorkdayHelper` en `/packages/shared-types/src/workday.ts`. Métodos: `addWorkdays(start, n, holidays[], timezone)`, `isWorkday(date, holidays[], tz)`, `nextWorkday(date, holidays[], tz)`. Usa `date-fns-tz`. NUNCA `new Date()` directamente. Tests unitarios exhaustivos: Viernes Colombia + DAILY×8 = lunes-a-miércoles-semana-siguiente. Festivos: 8 dic Colombia = salta al 9. Semana Navidad. Estos tests deben pasar ANTES de avanzar.

---

| PROMPT | Descripción |
|--------|-------------|
| **#15** `[INT]` `★ V2` | **PlaybookProcessor V2 + Mirror Sync (Llaves #2, #3, #4)** |

`PlaybookProcessorJob`: usa `WorkdayHelper` con timezone de la org. Tasks con `isProtected=true`, `sourcePlaybookId`, `occurrenceIndex`. Board con grupos por semana. Emite `simo:playbook:synced`. `SyncPatchProcessor` (Llave #4): `POST /api/integrations/simo/playbook-task-update` → aplica SOLO campos padre (`title`/`description`/`dueDate`/`priority`), NUNCA toca `subtasks`/`comments`/`attachments`. `SyncEvent` log. Conflicto de status → Modal resolución en UI.

---

| PROMPT | Descripción |
|--------|-------------|
| **#16** `[INT]` | **Webhook Outgoing + Progress Report** |

`SimoWebhookDeliveryJob`: task protegida cambia status → `POST` a `SIMO_WEBHOOK_URL` firmado HMAC. Payload:
```json
{
  "playbookId": "",
  "playbookTaskId": "",
  "employeeId": "",
  "occurrenceIndex": 0,
  "newStatus": "",
  "completedAt": "",
  "timeSpentMinutes": 0,
  "notes": "",
  "subTasksCompleted": 0,
  "subTasksTotal": 0
}
```
Retry exponential 3x. `WebhookDelivery` log. `/admin/webhooks`. `GET /api/integrations/simo/progress/:playbookId` para reporte completo.

---

## 6. PROMPTS FASE 4 — FRONTEND: VIBE DESIGN SYSTEM

> 📌 REGLA: todos los prompts de frontend importan Design Tokens de `/packages/ui-kit/src/tokens.ts`. Nunca hardcodear colores o border-radius.

---

| PROMPT | Descripción |
|--------|-------------|
| **#17** `[FRONT]` | **Setup React + Design Tokens Vibe Completos** |

Vite+React+TS. Design Tokens: paleta exacta Vibe, border-radius (4/8/16px), spacing (múltiplos 4px), motion tokens CSS (70ms/100ms/150ms/250ms/400ms). `ThemeProvider` para 3 temas (Luz/Oscuro #181B34/Noche). `cn()` utility. Verifica token adherence: lint rule que detecta colores hardcodeados en componentes.

---

| PROMPT | Descripción |
|--------|-------------|
| **#18** `[FRONT]` `★ V2` | **UI Kit — Componentes Vibe Base** |

`Button` (primary #6161FF, danger #FF3D57, border-radius 4px), `Input` (14px mínimo, border-radius 4px), `Select`, `Badge` (Dot System: puntos de color como en Monday.com — shorthand visual de estados), `Avatar` (group stack), `Tooltip` (70ms delay), `Modal` (16px), `Popover` (8px), `Toast` (250ms entrada, 400ms en hito Playbook), `Spinner`, `Skeleton` shimmer, `StatusBadge` (colores semánticos separados de UI per Regla de Oro Vibe), `PlaybookBadge` (badge 'SI' para tareas Simo IS).

---

| PROMPT | Descripción |
|--------|-------------|
| **#19** `[FRONT]` | **Layout Principal — Sidebar + TopBar Vibe** |

Sidebar: 240px↔56px, transición productive-medium 100ms, fondo #181B34 en dark mode. Workspaces + Boards con `PlaybookBadge` para boards Simo IS. Item height selector (Simple/Double/Triple — feature nativo del Work OS). Lock View toggle en top bar. 3 temas visuales accesibles desde el perfil. React Router v6. Breadcrumb con tipografía H3 18px.

---

| PROMPT | Descripción |
|--------|-------------|
| **#20** `[FRONT]` | **Zustand + React Query — Estado Global** |

Stores: `useAuthStore` (`simoUserId`), `useBoardStore` (`itemHeightMode`, `isViewLocked`), `useThemeStore` (persiste en DB), `usePresenceStore`. React Query: optimistic updates para DnD y status change. Sincronización con Socket.io events. Prefetching al hover. `usePermissions` con regla especial `isPlaybookTask` (anula `canDelete` siempre).

---

## 7. PROMPTS FASE 5 — VISTAS DEL MÓDULO

### 7.1 Vista Grid

---

| PROMPT | Descripción |
|--------|-------------|
| **#21** `[VIEW]` | **Grid View — Tabla Virtualizada Vibe** |

`@tanstack/react-virtual` para 10,000+ filas. Tipografía: celdas Text2 14px mínimo, headers Text3 12px bold (NUNCA menos per Vibe). Item height modes: Simple 40px, Double 80px, Triple 120px. Grupos con header color-coded (colapsable en productive-medium 100ms). Footer: suma/promedio numérico. DnD filas+columnas (productive-long 150ms). `HPCRenderMode` si >3,000 items. Columnas redimensionables.

---

| PROMPT | Descripción |
|--------|-------------|
| **#22** `[VIEW]` | **Grid View — Inline Editing + Side Peek** |

Editores por tipo con tokens Vibe: inputs border-radius 4px, dropdowns 8px, modales 16px. STATUS: colores semánticos (separados de UI tokens per Regla de Oro). Side Peek 480px: título H1 32px, badge 'Simo Intellisense' si `isProtected`. Delete desactivado para tareas protegidas. Comentarios en tareas protegidas: PERMITIDOS. Subtareas en mini-grid sin restricción `isProtected`.

---

### 7.2 Kanban + Gantt + Calendario

---

| PROMPT | Descripción |
|--------|-------------|
| **#23** `[VIEW]` | **Kanban — Cards, Swimlanes, WIP Limits** |

`react-beautiful-dnd`. Cards Vibe: Text2 14px, colores semánticos, avatars, due date en #FF3D57 si overdue. Drag: spring physics expressive-short 250ms. Swimlanes por PERSON o PRIORITY. WIP limits. Lock View bloquea DnD. Barras Simo IS en Kanban: borde punteado púrpura, no resizable, no movible entre columnas.

---

| PROMPT | Descripción |
|--------|-------------|
| **#24** `[VIEW]` | **Gantt Chart — Timeline con Baseline y Auto-Schedule** |

`@dhx/gantt`. Barras color-coded. Dependencias SVG. Baseline (plan vs real). Auto-scheduling. Para tasks `isProtected`: NO resizable, NO movible — tooltip 'Tarea gestionada por Simo Intellisense'. Lock View desactiva drag para todos. Exportar PNG/PDF.

---

| PROMPT | Descripción |
|--------|-------------|
| **#25** `[VIEW]` `★ V2` | **Calendar View — Calendario Comercial Simo IS** |

`@fullcalendar/react`. Vista default: Week para boards Playbook. Días no laborales (weekends + festivos) en tono suave usando `WorkdayHelper` data. Tareas Playbook: icono 'SI' + tooltip `'{nombre} — Tarea Playbook {n}/{total} — Simo Intellisense'`. Mini-dashboard: X completadas semana, X hoy. Animación expressive-long 400ms al completar task Playbook (celebración de hito).

---

### 7.3 Dashboard

---

| PROMPT | Descripción |
|--------|-------------|
| **#26** `[VIEW]` `★ V2` | **Dashboard — Widgets + mondayDB Limits + WorkloadWidget** |

`react-grid-layout`. Widgets: `DonutChart`, `BatteryWidget` (progreso proporcional — equivale al Battery de Monday.com), `WorkloadWidget` (capacidad del equipo en rojo si sobreasignado — equivale al Workload Widget), `NumberCard`, `ActivityFeed`, `TaskList`. LÍMITES V2: contador de widgets en toolbar, banner amarillo `'#FDAB3D'` a los 30 ('Acercándote al límite de performance'), AI features disabled badge >50, `HPCRenderMode` automático >3,000 items, error bloqueante >20,000 items.

---

## 8. PROMPTS FASES 6-10 — INTERACCIONES, PMO, TESTING, DEPLOY, AVANZADO

### Fase 6 — Interacciones Avanzadas

---

| PROMPT | Descripción |
|--------|-------------|
| **#27** `[FRONT]` | **Command Palette + Filter Bar** |

Ctrl+K: modal 16px border-radius, entrada expressive-short 250ms. Categoría 'Simo IS' con acciones: ver estado Playbook, force sync, ver festivos. Filter Bar: `FilterPill` border-radius 4px. Filtro nuevo 'Solo tareas Simo IS'. `FilterEngine` soporte campo `isProtected`. Sort multi-columna. GroupBy por DATE (semana/mes).

---

| PROMPT | Descripción |
|--------|-------------|
| **#28** `[FIELD]` | **Field Creator + Rich Text + Permisos + Presencia** |

Field Creator: galería 27 tipos, STATUS con separación colores semánticos vs UI tokens. Tiptap: @menciones, slash commands, paste de imágenes. Permisos: regla especial `isPlaybookTask` nunca `canDelete` sin importar rol. `PlaybookBadge` siempre visible. Presencia: avatars en top bar, 'Juan está editando...' productive-short 70ms.

---

### 9. Fase 7 — PMO Específico

---

| PROMPT | Descripción |
|--------|-------------|
| **#29** `[BACK]` | **My Work + Activity Log + Automatizaciones + Settings** |

My Work: sección 'Mis Playbooks Simo IS' con % completación y próxima tarea pendiente. expressive-long 400ms al completar task Playbook. `ActivityLog`: nuevo tipo `SIMO_PLAYBOOK_SYNCED` + `BLOCKED_DELETE_ATTEMPT`. Automation template: 'Cuando tarea Simo IS Done → webhook a Simo Intellisense'. Board Settings: sección 'Simo IS Integration' con estado sync, último sync, log `SyncEvents`, botón Force Sync.

---

| PROMPT | Descripción |
|--------|-------------|
| **#30** `[BACK]` | **Import/Export + Búsqueda ES** |

Import CSV/Excel con mapping de columnas. Export: CSV/xlsx, Gantt PNG, Dashboard PDF. ES índex con aislamiento `orgId`. Autocomplete. CLI reindexación. Bulk import subtareas.

---

### 10. Fase 8 — Testing

---

| PROMPT | Descripción |
|--------|-------------|
| **#31** `[TEST]` `★ V2` | **Tests Unitarios — WorkdayHelper + Servicios Críticos** |

WorkdayHelper: 'Viernes + DAILY×8 Colombia = 8 días laborales sin fines de semana'. 'Lunes festivo 8 dic = salta al 9 dic'. `SyncPatchProcessor`: update título preserva subtareas. `TaskService`: `isProtected` bloquea DELETE 3 vectores (HTTP, Prisma directo, SQL directo). `FilterEngine`: todos los operadores. Cobertura 80%+.

---

| PROMPT | Descripción |
|--------|-------------|
| **#32** `[TEST]` `★ V2` | **Tests E2E Playwright — Flujo Simo IS Completo** |

Flujos:
1. login
2. crear board+campo+tarea+kanban drag
3. Simular payload Simo IS → verificar 8 tareas en fechas laborales en calendario → intentar borrar tarea protegida → verificar error 403 EN UI + Toast + SecurityEvent log
4. completar tarea protegida → verificar expressive-long 400ms + webhook outgoing
5. Mirror Sync: update Simo IS → verificar subtareas del empleado preservadas. Capturas en fallo.

---

### 11. Fase 9 — Deployment

---

| PROMPT | Descripción |
|--------|-------------|
| **#33** `[DEPLOY]` | **Docker Prod + CI/CD + Monitoring** |

Dockerfiles multi-stage (`node:20-alpine` + `nginx:alpine` Brotli). GitHub Actions: `ci.yml` (tests + WorkdayHelper con festivos múltiples países), `deploy-staging`, `deploy-prod` (manual+approval). Sentry. Prometheus: `http_request_duration`, `simo_webhook_delivery_success_rate`, `workday_calculation_duration`. Grafana. Alertas: error rate >1%, webhook failure >5%. OpenAPI 3.0. `docs/SIMO_INTEGRATION.md`.

---

### 12. Fase 10 — State of the Art

---

| PROMPT | Descripción |
|--------|-------------|
| **#34** `[ADV]` | **Undo/Redo + Offline + i18n + WCAG + Onboarding** |

Command Pattern (Ctrl+Z/Y). Offline: Workbox + Dexie.js, toast 'Trabajando offline — se sincronizará con Simo IS al reconectar'. i18n ES/EN con `react-i18next`. WCAG 2.1 AA: JAWS/NVDA support per spec Vibe, alt-text, aria-live para Socket events, focus trap, DnD con alternativa teclado. Onboarding: modal pregunta '¿Recibirás Playbooks de Simo Intellisense?'. Tour `react-joyride` expressive-short 250ms entre pasos. Simulación demo Playbook Simo IS.

---

## 13. ANÁLISIS DE RIESGOS — V2

| DESAFÍO | RIESGO | SOLUCIÓN V2 |
|---------|--------|-------------|
| Agente 'olvida' reglas entre prompts | **CRÍTICO** | ARCHITECTURE.md + Regla: leer antes de cada prompt. Prompt #0 crea esta memoria persistente. |
| Tareas Playbook borradas por accidente | **CRÍTICO** | Llave #3: Middleware Prisma + Trigger PostgreSQL + SecurityEvent log. 3 capas de defensa. |
| Tareas en fines de semana/festivos | **ALTO** | Llave #2: WorkdayHelper con date-fns-tz. Tests unitarios con casos edge de Colombia/viernes. |
| Sync Simo IS destruye trabajo empleado | **CRÍTICO** | Llave #4: Mirror Sync Protocol. Campos padre vs hijo. SyncEvent log. Modal conflictos. |
| Colores Vibe inconsistentes entre prompts | **ALTO** | Design Tokens centralizados en `tokens.ts`. Lint rule anti-hardcode. `PlaybookBadge` componente reutilizable. |
| Grid con virtualización + DnD complejo | **ALTO** | Separado en 2 prompts (#21 estructura, #22 editing). ARCHITECTURE.md como hilo conductor. |
| mondayDB limits no respetados | **MEDIO** | Límites implementados en Prompt #26 (Dashboard) y #12 (backend). Warnings automáticos en UI. |
| Tiempo real con muchos usuarios | **MEDIO** | Rooms por board. Redis presence TTL 30s. Rate limiting en Socket events. |

---

## 14. HOJA DE RUTA — ORDEN DE EJECUCIÓN V2

> ⚠ Sprint 0 NO es opcional. Si el agente salta el Prompt #0, el proyecto corre riesgo de inconsistencias estructurales acumuladas desde el primer día.

### Sprint 0 — DÍA 1: El Manifiesto (Obligatorio)

- **Prompt #0:** Crear ARCHITECTURE.md + Setup monorepo. Leer Sección B (4 Llaves) + Sección A (Vibe). Duración: ~1 hora.

### Sprint 1 — Semanas 1-2: Fundaciones

- Prompts 1-4: Monorepo, Docker con DB Trigger Guard, Prisma V2 con `public_holidays`, Seeds
- Prompts 5-6: Express App, Auth JWT + Simo IS SSO
- Prompts 17-18: React Setup, Design Tokens Vibe, UI Kit base con PlaybookBadge

### Sprint 2 — Semanas 3-4: Core Backend + WorkdayHelper

- **Prompt 14:** WorkdayHelper (Llave #2) — TESTAR EXHAUSTIVAMENTE antes de avanzar
- Prompts 7-12: CRUD completo, WebSocket, Bull Queue completo

### Sprint 3 — Semanas 5-6: Integración Simo Intellisense

- Prompts 13-16: Receptor Playbook, PlaybookProcessor V2, Mirror Sync Protocol, Webhooks
- Prompt 31 (parcial): Tests WorkdayHelper + integración Simo IS
- Objetivo: flujo completo Simo IS → PMO → Simo IS funcionando y testeado

### Sprint 4 — Semanas 7-9: Frontend Principal

- Prompts 19-20: Layout Vibe, Zustand + React Query
- Prompts 21-23: Grid + Kanban completos con todos los tokens Vibe
- Prompts 27-28: Command Palette + Filter Bar

### Sprint 5 — Semanas 10-12: Vistas Restantes

- Prompts 24-26: Gantt (barras no-resizables Simo IS), Calendario Comercial, Dashboard (mondayDB limits)

### Sprint 6 — Semanas 13-14: Funciones Avanzadas + PMO

- Prompts 29-30: My Work, Activity Log, Automatizaciones, Settings, Import/Export

### Sprint 7 — Semanas 15-16: Calidad, Deploy y State of the Art

- Prompts 31-34: Tests E2E completos, Docker prod, CI/CD, Monitoring, Undo/Redo, i18n, WCAG, Onboarding

---

> ## SIMO INTELLISENSE — MÓDULO PMO V2.0
> ### 35 PROMPTS · 14 FASES · 4 LLAVES MAESTRAS · SISTEMA VIBE COMPLETO · 7 SPRINTS · ~16 SEMANAS
>
> Un agente AI siguiendo este plan en orden puede tener un MVP sólido en 3-4 semanas. El Prompt #0 es la llave de bóveda.
>
> **El Manifiesto de Arquitectura protege la visión del proyecto desde el primer día hasta el último prompt.**
