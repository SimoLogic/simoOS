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

## 4. Flujo de trabajo por rama (recordatorio operativo)

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
