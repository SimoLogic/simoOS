---
trigger: always_on
---

# PROTOCOLO DE ARQUITECTURA: Global State vs. Database (SIMO Intellisense)

**Contexto:** SIMO Intellisense utiliza una arquitectura Híbrida basada en Next.js (App Router), PostgreSQL (Supabase RLS) y Zustand (Global State). Para garantizar el rendimiento (evitar lags), la seguridad (evitar fugas de memoria) y la integridad de los datos, todos los agentes de IA y desarrolladores deben respetar la siguiente frontera arquitectónica:

## 1. GLOBAL STATE MANAGER (Zustand / React Context)
**Propósito:** Manejo del "Contexto de Sesión" y "Reactividad de la Interfaz". Es la memoria a corto plazo.
**Reglas de Uso:**
* **SÍ usar para:** - Almacenar llaves de identificación cruzada (`tenant_id`, `user_id`, `active_role`).
  - Estados puramente visuales de la UI (`isSidebarOpen`, `activeTab`, `theme`).
  - Datos efímeros que requieren reacción en milisegundos (ej. notificaciones temporales, estados de carga).
* **PROHIBIDO usar para:**
  - Almacenar arreglos masivos de datos (ej. la lista completa de empleados).
  - Pasar información de negocio de un módulo a otro (Ej. HR no le pasa un JSON de empleados a Business Plan a través de Zustand).
  - Almacenar datos sensibles o calculados financieramente.

## 2. BASE DE DATOS (PostgreSQL + Next.js Server Actions)
**Propósito:** Es la única y absoluta "Fuente de Verdad" (Source of Truth). Es la memoria permanente e histórica del negocio.
**Reglas de Uso:**
* **SÍ usar para:**
  - Todas las operaciones CRUD (Crear, Leer, Actualizar, Borrar) de entidades de negocio (Empleados, Playbooks, Tenants, Novedades).
  - **Integración entre módulos:** Si el Módulo B (ej. Growthify) necesita datos creados por el Módulo A (ej. HR), el Módulo B DEBE hacer un `fetch` a la base de datos a través de una Server Action.
  - Almacenamiento a largo plazo y auditoría.
* **PROHIBIDO usar para:**
  - Consultar el estado de la interfaz gráfica (ej. no guardar en la base de datos si un menú desplegable está abierto o cerrado).
  - Hacer "polling" agresivo (preguntar a la BD cada segundo por cambios menores de UI), lo cual saturaría el servidor.

## 3. LA FÓRMULA DE INTEGRACIÓN (El Apretón de Manos)
Cuando un módulo requiere cargar datos, el flujo obligatorio es:
1. El componente Front-End lee el `tenant_id` desde el **Global State (Zustand)**.
2. El componente inyecta ese `tenant_id` como parámetro a una **Server Action**.
3. La Server Action consulta la **Base de Datos (PostgreSQL)** aplicando el filtro (RLS o `WHERE tenant_id = X`).
4. La Base de Datos devuelve la información pura al Front-End.