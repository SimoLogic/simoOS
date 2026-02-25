# HOPSI – Startup-Stream Branch Strategy

**Versión:** 1.0 | **Fecha:** 2026-02-24 | **Autor:** HOMESI Engineering

---

## Estructura de Ramas

El flujo de trabajo de HOPSI sigue el modelo **Startup-Stream**: ágil en la creación, riguroso en la promoción.

```
feat/nombre-capacidad  →  staging  →  main  →  production
       (Trabajo)           (QA)      (Gold)    (Clientes)
```

---

## Jerarquía Ascendente (Obligatoria)

| Rama | Propósito | Quién trabaja aquí |
|---|---|---|
| `feat/nombre-capacidad` | Prototipar nueva funcionalidad | Desarrolladores |
| `staging` | Integración y QA. Tests de regresión | Tech Lead / QA |
| `main` | Rama Gold auditada. Solo código aprobado | Tech Lead (via PR) |
| `production` | Software en manos de clientes reales | DevOps (via PR aprobado) |

---

## ⚠️ Regla Agresiva — INQUEBRANTABLE

> **Queda estrictamente PROHIBIDO hacer push directo a `main` o `production`.**
>
> Todo cambio debe:
> 1. Nacer en una rama `feat/`
> 2. Pasar integración en `staging`
> 3. Promoverse a `main` a través de un **Pull Request (PR)** revisado
> 4. Desplegarse a `production` solo desde un PR aprobado en `main`
>
> **Cualquier violación de este flujo se considera un riesgo crítico de seguridad** y debe ser escalado inmediatamente al Tech Lead.

---

## Ciclo de Vida de una Feature

```bash
# 1. Crear feat branch desde staging
git checkout staging
git pull origin staging
git checkout -b feat/nombre-capacidad

# 2. Desarrollar y hacer commits atómicos
git add .
git commit -m "feat(modulo): descripción corta del cambio"

# 3. Push a origin
git push origin feat/nombre-capacidad

# 4. Abrir PR: feat/ → staging
# (Revisión de Tech Lead, CI checks)

# 5. Merge a staging aprobado.
# 6. Validar en staging environment.

# 7. Abrir PR: staging → main
# (Revisión obligatoria + aprobación CEO/CTO)

# 8. Merge a main. Tag de versión si aplica.
# git tag -a v1.x.x -m "Release: descripción"

# 9. Abrir PR: main → production
# (Deploy automático o manual a producción)
```

---

## Convenciones de Commit (Conventional Commits)

```
feat(modulo): nueva funcionalidad
fix(modulo): corrección de bug
refactor(modulo): mejora estructural sin cambio funcional
docs: actualización de documentación
chore: tareas de mantenimiento (deps, config)
```

**Ejemplos válidos:**
- `feat(hr): add job title approval flow`
- `fix(storage): correct signed URL expiry`
- `refactor(types): migrate to /types directory`

---

## Protección de Ramas (Configurar en GitHub)

En **Settings → Branches → Branch protection rules**, configurar para `main` y `production`:

- ✅ Require a pull request before merging
- ✅ Require approvals: **minimum 1** (ideally 2 for `production`)
- ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require status checks to pass before merging (`npm run build`)
- ✅ Restrict who can push to matching branches → Solo Tech Lead / DevOps
- ✅ Do not allow bypassing the above settings

---

## Naming Convention para Features

```
feat/descripcion-corta-en-lowercase
feat/hr-batch-import-validation
feat/growthify-playbook-designer
feat/storage-signed-url-service
feat/admin-tenant-deactivation-guard
```
