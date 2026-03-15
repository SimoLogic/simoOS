## 📝 NOMENCLATURA DE PROMPTS
* **Prompts con número (#00 al #66):** Pertenecen al Plan Maestro Original (Construcción del Core del PMO). Se leen de la FUENTE A.
* **Prompts con prefijo "C-" (ej. C-34 al C-46):** La "C" significa **Conectividad**. Son prompts exclusivos para integrar Salesforce, Outlook y Zoom. Se leen de la FUENTE B.

# SIMO INTELLISENSE — PLAN MAESTRO DE IMPLEMENTACIÓN UNIFICADO

Este documento es el ÍNDICE ESTRUCTURAL para el desarrollo. 

## 🚨 DIRECTIVA CRÍTICA PARA EL AGENTE 🚨
NUNCA programes ni asumas el contenido de un prompt basándote solo en este índice. Este archivo NO contiene las instrucciones de código. Para programar cada paso, DEBES leer OBLIGATORIAMENTE el detalle exacto en los documentos fuente:

* **FUENTE A (Core del Sistema):** `./Supporting Documents/Plan_Maestro_PMO_v2_Simo_Intellisense.docx`
* **FUENTE B (Conectividad):** `./Supporting Documents/PMO_Addendum_Conectividad_SF_Outlook_Zoom.docx`

---

## I. ARQUITECTURA Y REGLAS DE ORO
Antes de ejecutar cualquier prompt, asegúrate de que el archivo `ARCHITECTURE.md` refleje estas reglas extractadas de las Fuentes A y B:
1. **Protección:** `task.sourcePlaybookId !== null` → `isProtected=true`.
2. **Jerarquía:** Simo IS es fuente de verdad para `title/description/dueDate`.
3. **Calendario Comercial:** Uso estricto de WorkdayHelper.
4. **Token Vault:** NUNCA guardar tokens OAuth en texto plano. Usar cifrado AES-256-GCM.
5. **Sync Direction:** PMO manda en hijos; Salesforce manda en CRM. 
6. **Feature Flags:** `OUTLOOK_GRAPH_ENABLED` y `ZOOM_DIRECT_ENABLED` en `false`.
7. **iCal Feed:** Ruta `/ical/:token/tasks.ics` es pública. Seguridad vía token UUID.

---

## II. FORMACIÓN DE SPRINTS Y EJECUCIÓN

*Instrucción para el Agente: Revisa físicamente el código en el proyecto. Si un prompt marcado aquí no tiene su código correspondiente en el repositorio, debes detenerte y avisar al usuario.*

### FASE DE REVISIÓN Y AUDITORÍA
- [ ] **Auditoría de Sprints 1 al 12:** Verificar en el código base si las funciones Core, Vibe Design, HPC Render y AI Summaries existen físicamente. (Si faltan, ejecutar los Prompts del 00 al 45 desde la **FUENTE A**).

### SPRINT 13 — Cimientos de Conectividad y Seguridad
- [ ] **Prompt C-34** [LEER DETALLE EN: **FUENTE B**]: Token Vault — Cifrado AES-256-GCM y migración Prisma.
- [ ] **Prompt C-35** [LEER DETALLE EN: **FUENTE B**]: IntegrationController — Endpoints OAuth y Estado.
- [ ] **Prompt C-36** [LEER DETALLE EN: **FUENTE B**]: SalesforceService — CRUD de Objetos y CRM.

### SPRINT 14 — iCal Feed y Sincronización Salesforce
- [ ] **Prompt C-37** [LEER DETALLE EN: **FUENTE B**]: SalesforceSyncJob — Bidireccional PMO ↔ SF.
- [ ] **Prompt C-38** [LEER DETALLE EN: **FUENTE B**]: Salesforce Inbound — Outbound Messages.
- [ ] **Prompt C-39** [LEER DETALLE EN: **FUENTE B**]: ICalFeedService — Generador RFC 5545.
- [ ] **Prompt C-40** [LEER DETALLE EN: **FUENTE B**]: UI iCal Settings + Instrucciones.

### SPRINT 15 — Interfaz de Integraciones (UI)
- [ ] **Prompt C-44** [LEER DETALLE EN: **FUENTE B**]: Panel Central de Integraciones UI.
- [ ] **Prompt C-45** [LEER DETALLE EN: **FUENTE B**]: CRM Sidebar en Task Detail.

### SPRINT 16 — Retorno al Core y Finalización
- [ ] **Prompt #46 al #66** [LEER DETALLE EN: **FUENTE A**]: Ejecutar secuencialmente los prompts restantes del plan maestro original (Vistas avanzadas, Tests E2E, CI/CD).