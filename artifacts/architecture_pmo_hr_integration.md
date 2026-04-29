# SIMO Intellisense: HR & PMO Integration Architecture (High-Fidelity)

Este documento centraliza todo el conocimiento arquitectónico, conceptual y de diseño acumulado sobre la integración crítica entre el módulo de **HR (HC Master)** y el ecosistema **PMO (My Plan, My Work, My Queue)**. 

La premisa de SimoOS es ser un "Sistema Operativo de Negocios" para el modelo BPO Offshore, no una lista de tareas aisladas. El éxito de las operaciones en EE. UU. depende de que las tácticas (PMO) sean ejecutadas por el talento correcto en Colombia (HR).

---

## 1. Conceptos Fundamentales de los Módulos

### 🧠 Módulo HR (HC Master)
Es la única "Fuente de Verdad" (Source of Truth) sobre el talento. Su esquema no perdona ausencias. Define quién trabaja en HOMESI, su rol y su linaje de reportes.
* **Componentes Clave**: `dim_employee` (HC Master), `dim_job_title`, `dim_role_title`.
* **Rol en SIMO**: Dictamina la elegibilidad de los usuarios. ¿Quién puede recibir un Playbook de ventas? Solo aquellos con un `Role Title` compatible. ¿Quién aprueba las novedades? Los `EmployeeApprover` que configuran la línea de reporte.

### 🎯 Módulo PMO (El Motor de Ejecución)
El PMO toma la estrategia de HOMESI y la convierte en **"Hitos Inevitables"**. Su estructura está blindada y fuertemente jerarquizada.

#### A. My Plan (Vista Gerencial / Estratégica)
* **Concepto**: Es la sede de control. Aquí los mánagers configuran y despliegan tácticas.
* **UI Esperada**: Dashboard tipo "Control Tower". Tiene vistas de Kanban de alto nivel, listas de Playbooks activos, y el famoso **Grid View** de alta fidelidad inspirado en Monday.com. 
* **Estructura**: Usa `pmo_workspaces` para aislar proyectos, `pmo_boards` (Tableros principales) y de manera *CRÍTICA* `pmo_groups`. Los `pmo_groups` ("Semana 1 - Prospección") crean los "carriles" o "fases" del Grid View. No existe el esquema plano.

#### B. My Work (Vista del Colaborador Diario)
* **Concepto**: Es el espacio focal del empleado. Solo ve las unidades atómicas (`pmo_tasks`) en las que **él (su EID)** figura como `assignee_id`.
* **UI Esperada**: Limpia, pragmática, sin "ruido". Una lista o sub-grid enfocada en "Today", "Overdue" y "Upcoming". Un panel lateral tipo "Side Peek" expansible para actualizar estados, llenar *Custom Fields* y adjuntar evidencia. No pueden borrar tareas protegidas (`is_protected = true`) ni saltarse SLAs.

#### C. My Queue (Flujos Rápidos y Aprobaciones)
* **Concepto**: Enfoque transaccional. Es un Inbox o Bandeja de Triage. A diferencia de "My Work" (que requiere concentración continua en tareas largas), "My Queue" contiene alertas del `Automation Worker`, notificaciones de SLAs caídos, y tickets rápidos de aprobaciones que requieren una respuesta casi binaria o una reasignación.
* **UI Esperada**: Un feed vertical ágil (similar a un inbox de correo súper cargado). Cuando haces clic en un ítem, el contexto se abre inmediatamente a la derecha, invitando al usuario a la acción ("Aprobar", "Comentar", "Reasignar").

---

## 2. Los Acuerdos de Datos (Relational Contracts)

El "Apretón de Manos" (Handshake) entre HR y PMO ocurre en la Base de Datos a través de llaves específicas. 

### A. La Llave Foránea Híbrida (`assignee_id`)
* `pmo_tasks.assignee_id` conecta el PMO con la dimensión humana.
* **El Estándar:** Para mantener consistencia modular, el `assignee_id` almacena el **Employee ID (EID)** (ej. `EID-0001` de Michael Anderson) definido en `dim_employee` de HR, en lugar del simple `auth.uid()`. ¿Por qué? Porque `auth.uid()` es ciego al negocio operativo BPO, pero el EID sí sabe si ese talento pertenece a un "Branch" específico que puede facturarse a EE.UU.

### B. Ejecución Multi-Tenant Segura (`org_id`)
De acuerdo a las *4 Llaves Maestras* dictadas por el plan:
* TODO fetch a las tablas PMO (`pmo_boards`, `pmo_groups`, `pmo_tasks`, `pmo_notifications`) incluye forzosamente un filtro `tenant_id` (o `org_id` en la convención PMO).
* El Server Action recibe el `org_id` del Global State (Zustand) del cliente y la BD (PostgreSQL / RLS) garantiza que no haya fuga de datos entre corporaciones.

### C. El Playbook Assignment Engine (El Motor de Relojería)
Este motor materializa la relación entre los módulos:
1. **Entrada:** Un Mánager en "My Plan" elige un Playbook (ej. Sales Q4) y selecciona a qué empleados (EIDs validados en HR) se le aplica.
2. **Generación Jerárquica:** El motor no solo escupe tareas. Crea un `pmo_board` personal, construye los `pmo_groups` rígidos (Fases) basándose en la plantilla, y finalmente inserta las `pmo_tasks`.
3. **Workday Helper (Key Rule #2):** El motor jamás usa un `+ 1 day` ingenuo en PostgreSQL. Calcula los `due_dates` de las tareas ignorando fines de semana y festivos (Calendario Comercial Colombiano/USA).
4. **Protección (Key Rule #3):** A esas tareas se les inyecta `source_playbook_id` y `is_protected = true`. Un trigger en PostgreSQL prohibirá matemáticamente su eliminación, asegurando que la estrategia baje a la ejecución sin ser alterada.

---

## 3. Experiencia de Usuario "Vibe" para PMO (Resumen de UI)

Para garantizar la "Fidelidad Total" de SimoOS:
* **El Grid (Monday-style)**: Las tareas se organizan en los grupos (`pmo_groups`). Las cabeceras de columnas (`pmo_columns`) dictan los tipos de datos (Estado, Persona, Fecha, Dropdown).
* **Las Microinteracciones**: Los expansores de grupo, los dropdowns de Status (ej. '#0086C0' Blue, '#00CA72' Green) devuelven feedback en 100ms (Tokens de movimiento `Productive-Medium`).
* **Optimistic Updates (Zero Latency)**: En `My Work` y `My Queue`, cuando un agente del BPO marca una tarea como "Done", la interfaz se pinta de verde instantáneamente mediante Zustand; el Server Action en segundo plano actualiza `pmo_tasks` en Supabase.
* **Density & Navigation**: Uso del 100% de la pantalla sin scroll inútil (HPC Render). Si se cargan múltiples grupos con cientos de tareas en "My Plan", usamos *TanStack Virtual* para mantener los 60 FPS estables.

---

## 4. Estado de Salud y Arquitectura Presente (El Fallo de la Semilla)

* **El Conflicto Reciente**: Prisma intentó aplanar el esquema PMO borrando `pmo_groups` silenciosamente. Esto provocaba que las Views que requieren grupos lanzaran undefined (falla crítica estructural) y la semilla (seed) de demostración tronara al insertar las tareas protegidas en grupos inexistentes.
* **La Solución Arquitectónica Permanente**: Restituir la jerarquía estricta obligando al esquema a sostener tablas que son puramente estructurales (`pmo_groups`, `pmo_columns`), y reforzarlas en SQL para proteger el motor del PMO de "apoyos ingenuos". SimoOS es una sinfonía, y cada instrumento (tabla) tiene su partitura justificada.
