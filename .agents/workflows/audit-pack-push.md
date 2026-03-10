---
description: un flujo que siempre se repita cuando lo invoque. uditará todas las capacidades con cambios no migradas en front, back funcionalidades y SQLs para cambios en base de datos, y enviará la migración, esperando a que yo autorice en Github
---

# 🚀 PROTOCOLO DE AUDITORÍA TOTAL Y EMPAQUETADO (PRE-PRODUCCIÓN)

**Contexto para el Agente (AG):**
Cuando el Director invoque este flujo (ej. "AG, ejecuta el Protocolo de Auditoría y Empaquetado"), significa que el desarrollo de una funcionalidad ha concluido en local. Tu deber es buscar, consolidar y enviar **ABSOLUTAMENTE TODOS** los cambios pendientes (Front, Back y BD) a la aduana (GitHub) para su revisión final.

## 🛠️ Instrucciones de Ejecución Estricta para AG

Al recibir la orden de este protocolo, debes ejecutar estos 4 pasos en orden, sin requerir confirmación intermedia:

### 1. Auditoría 360° (Búsqueda de huérfanos)
* **SQL y Base de Datos:** Escanea la carpeta `/sql` y la raíz del proyecto. Identifica cualquier script DDL/DML, parches, o alteraciones de tablas que no hayan sido convertidos a migraciones oficiales.
* **Frontend y Backend:** Ejecuta `git status` para detectar cualquier archivo modificado (Layouts, Vistas `.tsx`, Server Actions `.ts`, lógica de Zustand, etc.) que no haya sido añadido al control de versiones.

### 2. Oficialización y Migración (SIMO-DEV)
* **Regla:** Si hallaste código SQL suelto, empaquétalo inmediatamente en `supabase/migrations/` dándole el número consecutivo correspondiente (ej. `00014_feature_name.sql`).
* **Acción:** Ejecuta `npx supabase db push` para inyectar estos cambios en el laboratorio (DEV).
* **Tipado:** Inmediatamente después del push, ejecuta `npm run generate-types` para sincronizar los tipos de TypeScript con la nueva estructura de base de datos.
* *Garantía:* Asegúrate de que las llaves foráneas y el esquema sean estables. Si no hay cambios de BD, documenta que la BD ya estaba sincronizada.

### 3. Empaquetado de Código (Control de Versiones)
* Verifica rápidamente que no haya errores de compilación (`build`) que rompan el sistema.
* Empaqueta todo el trabajo funcional y visual con la siguiente secuencia:
  * `git add .`
  * `git commit -m "chore(release): auditoria total y consolidacion de cambios (Front/Back/DB) para pase a Produccion"`
  * `git push` (a la rama de trabajo actual).

### 4. Entrega de Mando (Handoff al Director)
* Una vez que el `push` finalice, detén cualquier otra acción y responde exactamente con este formato de reporte:

> 📦 **PAQUETE TOTAL SELLADO Y EN LA ADUANA**
> Director, la Auditoría 360° ha finalizado con éxito.
> 
> **Reporte de Empaquetado:**
> - **Base de Datos:** [Indica si creaste una nueva migración y si el `db push` a DEV fue exitoso].
> - **Front/Back:** [Indica brevemente el número de archivos o módulos empaquetados].
> - **Estatus del Código:** Enviado a la rama remota.
> 
> **Su turno (Pase a Producción):**
> El sistema está en pausa. Por favor, vaya a **GitHub**, revise el código empaquetado y presione el botón verde de **Merge**. Al hacerlo, el Robot desplegará esta versión en Producción (Vercel y Supabase).