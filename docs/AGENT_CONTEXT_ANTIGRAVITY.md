# 🧭 Contexto Maestro para Agente Antigravity — SIMO Intellisense

> **Cómo usar este archivo:** copia y pega el bloque de "PROMPT DE CONTEXTO" (más abajo) al inicio de **cada sesión nueva** con el agente de Antigravity, antes de darle cualquier tarea. Este documento NO reemplaza `ARCHITECTURE.md` ni `GLOBAL_RULES.md` — los complementa con el estado real de seguridad del proyecto y el plan de hardening en curso.

---

## 1. Estado actual auditado (2026-07-30)

Auditoría realizada sobre el repo `SimoLogic/simoOS` antes de iniciar nuevo desarrollo.

### ✅ Lo que ya está bien
- Arquitectura por capas clara: `app/actions` (Server Actions) → `lib/stores` → Supabase. Componentes no tocan DB directo.
- Estrategia de ramas Startup-Stream ya definida (`feat/ → staging → main → production`), con prohibición de push directo a `main`/`production`.
- Convenciones de commit (Conventional Commits) ya adoptadas.
- Documentación de diseño (Vibe tokens, motion, densidad) y reglas de negocio (WorkdayHelper, Trigger Guard, Mirror Sync) ya formalizadas.

### 🔴 Hallazgo crítico: RLS multitenant está DESACTIVADO
La migración `supabase/migrations/00009_patch_rls.sql` desactivó Row-Level Security en **todas** las tablas principales (`dim_tenant`, `dim_employee`, `dim_job_title`, `employee_approvers`, `dim_branch`, `dim_local_legal_entity`, `dim_proforma`, `dim_playbooks`, `bp_workflow`, `process_designs`, y todas las de Growthify).

Hoy el aislamiento entre tenants se hace **únicamente en el código de la aplicación** (filtros `.filter(e => e.tenant_code === currentTenant.tcode)` en los stores), documentado como "Simulated RLS" en `DATA_ISOLATION_MAP.md`. Esto significa que una query directa contra Supabase con la anon key, sin pasar por el store correcto, podría potencialmente leer datos de otro tenant.

El propio comentario en `00009_patch_rls.sql` ya indica la estrategia correcta:
```sql
-- RE-ENABLE STRATEGY FOR PRODUCTION:
--   Replace DISABLE with proper JWT-based policies using:
--   CREATE POLICY ... USING (tenant_id = auth.jwt()->>'tenant_id');
```

### 🟡 Otros hallazgos
- `lib/database.ts` usa `SUPABASE_SERVICE_ROLE_KEY` con fallback a `NEXT_PUBLIC_SUPABASE_ANON_KEY` en un **único cliente compartido**. Verificado: ningún componente `"use client"` lo importa hoy, pero el patrón es frágil (un import futuro mal ubicado expondría el service role).
- No existe `.github/workflows` — el build check (`npm run build`) que exige `BRANCH_STRATEGY.md` antes de mergear a `main` no está automatizado todavía.
- Existen archivos de diagnóstico temporales sueltos en la raíz (`check_conn.js`, `find_conn.js`, `tmp-test-*.ts`, etc.) que `GLOBAL_RULES.md` Regla #9 dice que NO deben commitearse.

---

## 2. Plan de Hardening RLS (a ejecutar por fases, en rama dedicada)

**Nunca en `main` directo. Rama sugerida: `feat/rls-hardening-phase-1`.**

1. **Separar clientes Supabase:**
   - `lib/database.ts` → cliente público (anon key), respeta RLS, usable desde Server Actions de lectura normal.
   - `lib/database-admin.ts` (nuevo) → cliente con service role, **solo** para scripts de migración/seed en `/scripts`, nunca importado desde `app/actions` de flujo normal de usuario.
2. **Definir políticas RLS reales**, tabla por tabla, empezando por las más sensibles (nómina, contratos, `dim_employee`), usando `auth.jwt()->>'tenant_id'` en vez de `current_setting`.
3. **Activar RLS incrementalmente** (una tabla a la vez), verificando en `staging` que cada Server Action ya envía el JWT/tenant correcto antes de habilitar.
4. **Mantener el doble filtro:** el filtro explícito por `tenant_id` en cada query se conserva (defensa en profundidad) — RLS es la segunda capa, no el reemplazo.
5. **Confirmar en cada PR** los 3 puntos que ya exige `GLOBAL_RULES.md` Regla #8: qué cambió en frontend, qué SQL se ejecutó en Supabase, y si la tabla refleja el cambio.

---

## 3. 🔽 PROMPT DE CONTEXTO — pegar al agente al inicio de cada sesión

```
Antes de escribir cualquier código, lee y respeta:
- /ARCHITECTURE.md
- /GLOBAL_RULES.md
- /DATA_ISOLATION_MAP.md
- /docs/BRANCH_STRATEGY.md
- /docs/AGENT_CONTEXT_ANTIGRAVITY.md (este archivo)

Reglas no negociables para esta sesión:
1. NUNCA push directo a `main` o `production`. Todo cambio nace en una rama `feat/nombre-capacidad` creada desde `staging`.
2. El proyecto es multitenant. Este RLS está en proceso de hardening (ver sección 2 de este doc) — mientras tanto, TODA query nueva debe seguir filtrando explícitamente por tenant_id/org_id en el código, sin asumir que RLS ya protege.
3. Si tu tarea toca una tabla de Supabase, al final debes confirmar explícitamente: (a) qué cambió en frontend, (b) qué SQL se ejecutó, (c) si la tabla en Supabase refleja el cambio. Si no puedes confirmar los 3, detente y avísame.
4. No elimines ni renombres campos existentes sin preguntar primero (ver Regla #7 de GLOBAL_RULES.md).
5. UI 100% en inglés, sin excepción, aunque el prompt esté en español (Regla #10).
6. No commitees archivos de diagnóstico temporales (tmp_*, check_*.js, query.sql) — van en /tmp que está en .gitignore.
7. TypeScript estricto, prohibido `any`.
8. Toda mutación de estado relevante debe soportar undo/redo (Command Pattern / zundo).

Mi tarea de hoy es: [DESCRIBE AQUÍ LA TAREA ESPECÍFICA]
```

---

## 5. ⚠️ Hallazgo abierto: `staging` abandonada (2026-07-30)

Al preparar el PR del módulo Commercial Activity/Forecast se encontró que `origin/staging`:
- Está ~140 commits detrás de `main`.
- Le falta el **módulo PMO completo** (no es solo código viejo — faltan features enteras que sí están en `main`).

**Decisión temporal:** mientras esto no se resuelva, las ramas `feat/` se abren y mergean directo contra `main` (documentando la excepción en cada PR), en vez de pasar por `staging` como indica `BRANCH_STRATEGY.md`.

**Pendiente (backlog, no bloqueante):** sincronizar `staging` con `main` — probablemente lo más simple sea recrearla desde `main` (`git checkout -b staging-new main`, revisar con el equipo, y reemplazar la rama vieja) en vez de intentar mergear 140 commits de diferencia. Asignar a Tech Lead.

---

## 6. Excepción aplicada al módulo Commercial Activity/Forecast

- Rama: `feat/commercial-activity-forecast-module`, creada desde `main` (no desde `staging`, ver punto 5).
- PR objetivo: `feat/commercial-activity-forecast-module → main` directo.
- Motivo: `staging` no es un target viable hoy (ver hallazgo arriba).

## 4. Flujo de trabajo por rama (recordatorio operativo — ver excepción vigente en §5)

```bash
git checkout staging
git pull origin staging
git checkout -b feat/nombre-de-la-tarea

# ... trabajo con Antigravity ...

git add .
git commit -m "feat(modulo): descripción corta"
git push origin feat/nombre-de-la-tarea
# Abrir PR: feat/nombre-de-la-tarea → staging
```

Vercel generará automáticamente un **Preview Deployment** para esta rama (o para el PR) sin tocar producción. Solo al mergear a `main` (vía PR aprobado) se promueve a producción real.

---

## 7. Commercial Activity mergeado sin Forecast (2026-07-31)

Se confirmó con el usuario: el módulo "Forecast" (código de `homesi-reporte-actividad`,
incluso en su versión más reciente) sigue calculando todo en memoria del
navegador — no persiste snapshots reales. El schema `pipeline_forecast` en
producción ya existe con una estructura real distinta (`branches`,
`branch_managers`, `pipeline_snapshots`, `pipeline_loans`), pero
**`pipeline_snapshots` y `pipeline_loans` están vacías (0 filas)** — ninguna
app depende de ellas hoy, así que no hay riesgo de dato real en juego, pero
tampoco urgencia de resolverlo ya.

**Decisión:** mergear solo "Commercial Activity" (tab funcional, datos reales
en `activity_report`). El tab "Forecast" se deshabilitó explícitamente:
- `components/commercial-activity/CommercialActivityModule.tsx` ya no
  importa `ForecastPipelineView` — solo renderiza `ActivityReportView`.
- `components/dashboard/ModuleNavigation.tsx` solo expone el sub-módulo
  "activity" en la navegación.
- El código ya portado de Forecast sigue en
  `components/commercial-activity/forecast/` y
  `lib/commercial-activity/pipeline/` para cuando se retome — no se borró,
  solo no está conectado a la UI.
- La migración `00016_commercial_activity_module.sql` ya NO crea nada en
  `pipeline_forecast` (se quitó esa sección — chocaba con la estructura real).

**Al retomar Forecast:** decidir entre (a) usar el código actual de Heather
tal cual (cálculo en cliente + lectura de `branches`/`branch_managers`
reales — rápido, ya funciona) o (b) construir persistencia real sobre
`pipeline_snapshots`/`pipeline_loans` (más trabajo, pero es lo que esas
tablas ya vacías sugieren que alguien planeó).
