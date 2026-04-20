# SIMO INTELLISENSE — PMO MASTER PLAN v1.0
## My Plan (Playbook Execution) + My Projects (Full Monday.com Clone)
### ⚠️ LEE ESTE DOCUMENTO COMPLETO ANTES DE ESCRIBIR UNA SOLA LÍNEA DE CÓDIGO

---

## ÍNDICE DE EJECUCIÓN

| Sprint | Alcance | Prioridad |
|--------|---------|-----------|
| S-01 | Dual Sidebar Architecture + PMO Shell | CRÍTICO |
| S-02 | Dynamic Schema Engine (DB + Field Engine) | CRÍTICO |
| S-03 | My Plan — Grid View completa | CRÍTICO |
| S-04 | My Plan — Kanban View | ALTA |
| S-05 | My Plan — Gantt View | ALTA |
| S-06 | My Plan — Calendar View | ALTA |
| S-07 | My Plan — Dashboard View (Widgets) | ALTA |
| S-08 | Item Detail / Side Peek | ALTA |
| S-09 | My Projects — Workspace Manager | ALTA |
| S-10 | My Projects — Board Builder | ALTA |
| S-11 | My Projects — Full Column Types | ALTA |
| S-12 | My Projects — All Views | ALTA |
| S-13 | Groups, Subitems, Batch Operations | MEDIA |
| S-14 | Automations Engine | MEDIA |
| S-15 | Dashboard Panels & Cross-board Widgets | MEDIA |
| S-16 | My Plan — Playbook Assignment Integration | CRÍTICO |
| S-17 | Presencia en tiempo real | MEDIA |
| S-18 | Performance (HPC Render, virtualización) | ALTA |

---

## REGLAS MAESTRAS — NUNCA VIOLAR

```
1. ARCHITECTURE.md existente en el repo TIENE precedencia. Léelo primero.
2. My Work y My Queue NO se modifican en este plan. Quedan intactos.
3. Vibe Design System obligatorio — tokens de ARCHITECTURE.md.
4. WorkdayHelper obligatorio para TODA fecha de negocio.
5. Shield Protocol (isProtected) para TODA tarea de playbook.
6. Multi-tenant: org_id en TODA query, TODA tabla.
7. TypeScript strict — npx tsc --noEmit debe pasar a 0 errores antes de cada push.
8. Regla de Git: rama feat/nombre → merge a main con autorización explícita.
9. Archivos tmp_*.js y query*.sql NUNCA en commits (ya en .gitignore).
10. Confirmar frontend + SQL en Supabase después de CADA tarea.
```

---

## MANIFIESTO DE ARQUITECTURA PMO

### La Dualidad de PMO

PMO tiene DOS naturalezas que deben coexistir en perfecta armonía:

**Naturaleza 1 — My Plan (Playbook Execution)**
El empleado NO crea la estructura. Le llega predefinida desde Business Plan. El tablero de My Plan es el cronograma de su playbook — columnas, grupos y tareas son generadas por `assignPlaybookAction`. El empleado puede agregar sus propias columnas y tareas personales, pero el esqueleto viene del playbook. Vistas disponibles: Grid, Kanban, Gantt, Calendar, Dashboard.

**Naturaleza 2 — My Projects (Free-form Workspace)**
El empleado crea todo desde cero. Workspaces, tableros, columnas, grupos — todo a voluntad, exactamente como Monday.com. Sin restricciones de estructura. Schema dinámico completo.

### El Dual Sidebar

Cuando el usuario entra a PMO, el layout cambia. Aparece un SEGUNDO sidebar subordinado al sidebar principal de SIMO. El sidebar principal NO desaparece. Ambos coexisten.

```
[SIMO Sidebar Principal]  [PMO Sidebar Secundario]  [Main Content Area]
     150px                  220px (expandido)           resto
                              60px (colapsado)
```

El PMO Sidebar secundario es retráctil: expandido muestra ícono + texto, colapsado muestra solo íconos. Comportamiento idéntico al sidebar de Monday.com.

---

## SPRINT S-01: DUAL SIDEBAR ARCHITECTURE + PMO SHELL

### Objetivo
Construir la arquitectura de navegación dual que envuelve TODOS los sub módulos de PMO.

### [NUEVO] `components/pmo/layout/PmoSidebar.tsx`

Estructura del sidebar PMO:
```
PMO SIDEBAR (secundario)
├── [Búsqueda] — input búsqueda global PMO
├── ── MY WORK ──
│   ├── 📋 My Plan         → activeSubModule = 'my-plan'
│   ├── 🔨 My Work         → activeSubModule = 'my-work'  (NO MODIFICAR)
│   └── 🔔 My Queue        → activeSubModule = 'my-queue' (NO MODIFICAR)
├── ── MY PROJECTS ──
│   ├── [Favoritos]
│   ├── [Recientes]
│   └── [Espacios de trabajo]
│       ├── Workspace 1
│       │   ├── Tablero A
│       │   ├── Tablero B
│       │   └── + Nuevo tablero
│       └── + Nuevo espacio de trabajo
└── ── INFERIOR ──
    ├── 🗑️ Papelera
    └── ⚙️ Configuración PMO
```

**Comportamiento del PmoSidebar:**
- Toggle colapso con botón chevron en borde derecho
- Estado persistido en `localStorage` key `pmo_sidebar_collapsed`
- Transición: `--motion-productive-medium` (100ms) ease-in-out
- Colapsado: solo iconos 20px + tooltips en hover
- Expandido: iconos 20px + texto, ancho 220px
- Workspaces colapsables con animación
- Tablero activo: highlight `--vibe-purple` + fondo `rgba(97,97,255,0.08)`
- Hover: fondo `--vibe-surface-2`
- Drag & drop para reordenar tableros dentro de workspace
- Click derecho en tablero → context menu: Renombrar, Duplicar, Mover, Eliminar, Favorito

### [MODIFICAR] `components/dashboard/DashboardContent.tsx`

Cuando `activeModule === 'pmo'`, renderizar layout dual:
```tsx
<div className="flex h-full">
  <PmoSidebar />
  <div className="flex-1 overflow-hidden">
    {activeSubModule === 'my-plan'     && <MyPlanShell />}
    {activeSubModule === 'my-work'     && <MyWorkView />}
    {activeSubModule === 'my-queue'    && <MyQueueView />}
    {activeSubModule === 'my-projects' && <MyProjectsShell boardId={activeBoardId} />}
    {!activeSubModule                  && <PmoDashboardHome />}
  </div>
</div>
```

IMPORTANTE: Las rutas `my-work` y `my-queue` deben seguir funcionando exactamente igual que antes. Solo agregar los casos nuevos.

### [NUEVO] `components/pmo/PmoDashboardHome.tsx`

Pantalla de bienvenida al entrar a PMO:
- Accesos rápidos: My Plan, My Work, My Queue, My Projects
- Últimos 5 tableros visitados
- Tareas con due_date hoy o vencidas
- Contador de pendientes en My Queue

### [MODIFICAR] `components/layout/SideMenu.tsx` y `components/dashboard/ModuleNavigation.tsx`

Agregar `my-projects` como cuarto sub módulo de PMO:
```ts
{id: 'my-plan',     label: 'My Plan',     icon: 'calendar'},
{id: 'my-work',     label: 'My Work',     icon: 'briefcase'},
{id: 'my-queue',    label: 'My Queue',    icon: 'bell'},
{id: 'my-projects', label: 'My Projects', icon: 'grid'},
```

### SQL S-01

```sql
CREATE TABLE IF NOT EXISTS public.pmo_user_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pmo_user_prefs ON public.pmo_user_preferences(org_id, user_id);
```

### Verificación S-01
- [ ] PmoSidebar visible cuando activeModule === 'pmo'
- [ ] Sidebar principal de SIMO sigue visible (ambos coexisten)
- [ ] Toggle colapso con animación correcta
- [ ] My Work y My Queue siguen funcionando igual
- [ ] My Projects aparece en el PmoSidebar
- [ ] npx tsc --noEmit sin errores

---

## SPRINT S-02: DYNAMIC SCHEMA ENGINE

### Objetivo
Motor de schema dinámico que permite tableros con columnas completamente personalizables.

### Arquitectura de datos

```
pmo_workspaces    → agrupa tableros del usuario
pmo_boards        → cada tablero (schema + config)
pmo_columns       → define QUÉ columnas tiene el tablero
pmo_groups        → agrupaciones visuales dentro del tablero
pmo_tasks         → cada fila/item (custom_field_values JSONB)
pmo_subtasks      → subitems de cada task
pmo_item_activity → log de auditoría
pmo_item_updates  → comentarios y actualizaciones
pmo_views         → vistas guardadas por tablero
pmo_automations   → reglas de automatización
pmo_panels        → dashboards cross-board
```

### SQL S-02

```sql
-- Workspaces
CREATE TABLE IF NOT EXISTS public.pmo_workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    owner_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT DEFAULT '🗂️',
    color       TEXT DEFAULT '#6161FF',
    position    INT NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_workspaces_org ON public.pmo_workspaces(org_id, owner_id);

-- Extender pmo_boards
ALTER TABLE public.pmo_boards
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.pmo_workspaces(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS description  TEXT,
    ADD COLUMN IF NOT EXISTS icon         TEXT DEFAULT '📋',
    ADD COLUMN IF NOT EXISTS color        TEXT DEFAULT '#6161FF',
    ADD COLUMN IF NOT EXISTS is_favorite  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS position     INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS view_type    TEXT NOT NULL DEFAULT 'grid',
    ADD COLUMN IF NOT EXISTS settings     JSONB NOT NULL DEFAULT '{}';

-- Extender pmo_columns con todos los tipos
ALTER TABLE public.pmo_columns
    ADD COLUMN IF NOT EXISTS field_key   TEXT,
    ADD COLUMN IF NOT EXISTS field_type  TEXT NOT NULL DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS config      JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS width       INT NOT NULL DEFAULT 150;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pmo_columns_field_key
    ON public.pmo_columns(board_id, field_key)
    WHERE field_key IS NOT NULL;

-- Trigger: genera field_key desde name
CREATE OR REPLACE FUNCTION public.fn_generate_field_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.field_key IS NULL THEN
        NEW.field_key := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '_', 'g'))
                         || '_' || substr(gen_random_uuid()::text, 1, 6);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_field_key ON public.pmo_columns;
CREATE TRIGGER trg_generate_field_key
    BEFORE INSERT ON public.pmo_columns
    FOR EACH ROW EXECUTE FUNCTION public.fn_generate_field_key();

-- Extender pmo_groups
ALTER TABLE public.pmo_groups
    ADD COLUMN IF NOT EXISTS color        TEXT NOT NULL DEFAULT '#0085FF',
    ADD COLUMN IF NOT EXISTS position     INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN NOT NULL DEFAULT FALSE;

-- Activity log por item
CREATE TABLE IF NOT EXISTS public.pmo_item_activity (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    task_id    TEXT NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    action     TEXT NOT NULL,
    field_name TEXT,
    old_value  TEXT,
    new_value  TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_item_activity_task ON public.pmo_item_activity(task_id);

-- Comentarios y updates por item
CREATE TABLE IF NOT EXISTS public.pmo_item_updates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    task_id    TEXT NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    body       TEXT NOT NULL,
    mentions   TEXT[] DEFAULT '{}',
    reactions  JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_item_updates_task ON public.pmo_item_updates(task_id);

-- Vistas guardadas por tablero
CREATE TABLE IF NOT EXISTS public.pmo_views (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    board_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    view_type  TEXT NOT NULL CHECK (view_type IN ('grid','kanban','gantt','calendar','dashboard','cards','form')),
    config     JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    position   INT NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_views_board ON public.pmo_views(board_id);

-- Automatizaciones por tablero
CREATE TABLE IF NOT EXISTS public.pmo_automations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      TEXT NOT NULL,
    board_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    trigger_def JSONB NOT NULL,
    conditions  JSONB NOT NULL DEFAULT '[]',
    actions     JSONB NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    run_count   INT NOT NULL DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_by  TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_automations_board ON public.pmo_automations(board_id, is_active);

-- Paneles cross-board
CREATE TABLE IF NOT EXISTS public.pmo_panels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     TEXT NOT NULL,
    owner_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    icon       TEXT DEFAULT '📊',
    config     JSONB NOT NULL DEFAULT '{"widgets": []}',
    position   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_panels_org ON public.pmo_panels(org_id, owner_id);
```

### Server Actions: `app/actions/pmo-workspace-actions.ts`

Crear TODOS estos Server Actions:

```typescript
// WORKSPACES
export async function createWorkspaceAction(name, icon, color, orgId, userId)
export async function updateWorkspaceAction(id, fields)
export async function deleteWorkspaceAction(id)
export async function getWorkspacesAction(orgId, userId)
export async function reorderWorkspacesAction(orderedIds)

// BOARDS
export async function createBoardAction(workspaceId, name, icon, orgId, userId)
  // → crea automáticamente 4 columnas default:
  //   Name (text, field_key='name'), Status (status), Person (person), Date (date)
  // → crea grupo default "Grupo 1" con color aleatorio
export async function updateBoardAction(id, fields)
export async function deleteBoardAction(id)
export async function duplicateBoardAction(id)
export async function getBoardAction(boardId, orgId)
export async function reorderBoardsAction(workspaceId, orderedIds)
export async function toggleBoardFavoriteAction(boardId)

// COLUMNS
export async function addColumnAction(boardId, name, field_type, config)
export async function updateColumnAction(id, fields)
export async function deleteColumnAction(id)
export async function reorderColumnsAction(boardId, orderedFieldKeys)
export async function duplicateColumnAction(id)
export async function hideColumnAction(id, isHidden)

// GROUPS
export async function createGroupAction(boardId, name, color)
export async function updateGroupAction(id, fields)
export async function deleteGroupAction(id)
export async function collapseGroupAction(id, isCollapsed)
export async function reorderGroupsAction(boardId, orderedIds)

// ITEMS
export async function createItemAction(boardId, groupId, title, customFieldValues)
export async function updateItemAction(id, fields)
export async function updateItemFieldAction(taskId, fieldKey, value)
export async function deleteItemAction(id)  // respeta Shield Protocol
export async function duplicateItemAction(id)
export async function moveItemToGroupAction(taskId, newGroupId)
export async function moveItemToBoardAction(taskId, newBoardId)
export async function batchUpdateItemsAction(taskIds, fields)
export async function batchDeleteItemsAction(taskIds)  // respeta Shield Protocol
export async function reorderItemsAction(groupId, orderedIds)

// SUBITEMS
export async function createSubitemAction(parentTaskId, title)
export async function updateSubitemAction(id, fields)
export async function deleteSubitemAction(id)

// ACTIVITY & UPDATES
export async function logActivityAction(taskId, action, fieldName, oldValue, newValue)
export async function addUpdateAction(taskId, body, mentions)
export async function editUpdateAction(updateId, body)
export async function deleteUpdateAction(updateId)
export async function addReactionAction(updateId, emoji, userId)

// VIEWS
export async function createViewAction(boardId, name, viewType, config)
export async function updateViewAction(id, config)
export async function deleteViewAction(id)
export async function setDefaultViewAction(boardId, viewId)
```

### Verificación S-02
- [ ] Todas las tablas creadas en Supabase
- [ ] Trigger fn_generate_field_key funciona
- [ ] Server Actions compilan sin errores TypeScript
- [ ] createBoardAction crea 4 columnas default automáticamente

---

## SPRINT S-03: MY PLAN — GRID VIEW COMPLETA

### Objetivo
Vista Grid réplica exacta de Monday.com. Es la vista principal y más compleja.

### [NUEVO] `components/pmo/views/GridView.tsx`

Props:
```typescript
interface GridViewProps {
  boardId: string
  mode: 'my-plan' | 'my-projects'
  columns: PmoColumn[]
  groups: PmoGroup[]
  tasks: PmoTask[]
  onItemUpdate: (taskId: string, fieldKey: string, value: unknown) => void
}
```

**Estructura visual del Grid (réplica Monday.com):**
```
[Breadcrumb] Nombre del Tablero ↓
[Tabs] [Vista principal ···] [Tarjetas] [+ Nueva vista]
[Toolbar] [+ Agregar item ↓] [🔍 Buscar] [👤 Persona] [🔽 Filtrar] [⊞ Agrupar por] [···]

[Grid]
[Checkbox] [Item Name - FIXED]  [Col1] [Col2] [Col3] ... [+]

▼ Grupo "Contactos activos" (borde izq color del grupo) ────────────
  ☐  Item 1                     val1   val2   val3
  ☐  Item 2                     val1   val2   val3
  + Agregar item
  [Summary row: conteos, sumas]

▼ Grupo "Inactivos" ────────────────────────────────────────────────
  + Agregar item

+ Agregar grupo nuevo
```

**Comportamiento de columnas:**
- Header click: ordena ASC/DESC
- Header `···`: Configuración | Filtrar | Ordenar | Contraer | Duplicar | Agregar col derecha | Ocultar | Renombrar | Eliminar
- Drag header: reordenar columnas
- Double click header: inline rename
- Drag borde derecho: resize de columna
- `+` al final: ColumnTypeSelector

**Comportamiento de filas:**
- Click celda: edición inline por tipo
- Hover fila: muestra `···` + checkbox
- Checkbox: selección múltiple → batch toolbar
- Click nombre item: abre Side Peek
- Flecha `→` en nombre: pantalla completa
- `⊕` inicio de fila: agregar subitem
- Enter: crear item siguiente
- Tab: mover al siguiente campo

**Comportamiento de grupos:**
- `▼/▶`: colapsar/expandir
- Color stripe: color picker (8 colores)
- `···`: Renombrar | Agregar item | Colapsar todo | Duplicar | Mover a tablero | Eliminar
- Double click nombre: inline rename
- Drag grupos: reordenar
- Drag items entre grupos

**Batch toolbar (cuando hay items seleccionados):**
```
Banner: "X items seleccionados  [Duplicar] [Mover a] [Archivar] [Eliminar] [···]"
```

**Summary row por grupo:**
- Número/currency: suma, promedio, min, max
- Status: mini pills coloreados con count
- Person: avatares únicos con count
- Checkbox: X/Y marcados
- Click → cambia función de resumen

### [NUEVO] `components/pmo/cells/` — Un componente por tipo de columna

```
TextCell.tsx         → input texto inline
NumberCell.tsx       → input numérico con formato (int/decimal/%)
StatusCell.tsx       → pill coloreado + dropdown de opciones + "Editar etiquetas"
DateCell.tsx         → date picker usando WorkdayHelper
PersonCell.tsx       → avatar + nombre, dropdown de dim_employee activos
EmailCell.tsx        → link mailto + copiar
PhoneCell.tsx        → link tel + copiar
LinkCell.tsx         → href clickable
CheckboxCell.tsx     → toggle boolean
RatingCell.tsx       → 1-5 estrellas
CurrencyCell.tsx     → número con símbolo moneda configurable
TagsCell.tsx         → multi-select pills creables inline
DropdownCell.tsx     → single-select con opciones config
ProgressCell.tsx     → barra 0-100, rojo/amarillo/verde
TimelineCell.tsx     → rango fechas inicio → fin
FilesCell.tsx        → upload Supabase Storage + preview
AutoNumberCell.tsx   → secuencial read-only
```

**StatusCell — implementación crítica (réplica exacta Monday.com):**
- Click → dropdown con options del `config.options[]`
- Cada opción: label (texto) + color (hex) + group (sub-nivel opcional)
- Click opción → actualiza valor + llama onItemUpdate
- "Editar etiquetas" → modal de config de opciones
- Opciones guardadas en `pmo_columns.config.options[]`
- Footer de grupo: mini pills con count por status
- Config JSON:
```json
{
  "options": [
    {"id": "uuid", "label": "Working on it", "color": "#FDAB3D", "group": "In progress"},
    {"id": "uuid", "label": "Done", "color": "#00CA72", "group": "Done"},
    {"id": "uuid", "label": "Stuck", "color": "#DF2F4A", "group": "Needs attention"}
  ]
}
```

### [NUEVO] `components/pmo/columns/ColumnTypeSelector.tsx`

Modal al click en `+`. Grid de tipos con ícono + nombre + descripción:
- Esenciales: Texto, Número, Estado, Fecha, Persona
- Comunicación: Email, Teléfono, Link
- Selección: Checkbox, Dropdown, Tags, Valoración
- Avanzado: Progreso, Timeline, Moneda, Archivos, Fórmula
- Automático: Número auto, Creado por, Última actualización

### [NUEVO] `components/pmo/toolbar/GridToolbar.tsx`

```
[+ Agregar item ↓]  [🔍 Buscar]  [👤 Persona]  [🔽 Filtrar]  [⊞ Agrupar por]  [↕ Ordenar]  [···]
```

### [NUEVO] `components/pmo/filters/FilterPanel.tsx`

Panel lateral de filtros:
- Filtro = [columna] + [operador] + [valor]
- Operadores por tipo de columna (texto/número/status/fecha/persona)
- Múltiples filtros con AND/OR
- Aplicados client-side en `lib/pmo/filter-engine.ts`

### [NUEVO] `lib/pmo/filter-engine.ts`

```typescript
export function filterItems(
  items: PmoTask[],
  filters: FilterRule[],
  columns: PmoColumn[]
): PmoTask[]
```

### HPC Render Mode

```typescript
const VIRTUAL_THRESHOLD = 3000
const useVirtual = items.length > VIRTUAL_THRESHOLD
// Usar TanStack Virtual cuando items > 3000
// Bloquear con error cuando items > 20000
```

### Verificación S-03
- [ ] Grid renderiza columnas y grupos correctamente
- [ ] Inline editing funciona en todos los tipos de celda
- [ ] Drag & drop items entre grupos (sin Shield para PLAYBOOK_TASK en mode='my-plan')
- [ ] Drag & drop columnas para reordenar
- [ ] Context menu columna: ocultar, renombrar, eliminar
- [ ] Context menu item: open, move to, duplicate, copy name, delete
- [ ] Búsqueda inline filtra items
- [ ] Batch toolbar aparece al seleccionar múltiples items
- [ ] ColumnTypeSelector abre al click en `+`
- [ ] StatusCell muestra dropdown con opciones coloreadas
- [ ] PersonCell carga empleados activos de dim_employee
- [ ] DateCell usa WorkdayHelper

---

## SPRINT S-04: MY PLAN — KANBAN VIEW

### [NUEVO] `components/pmo/views/KanbanView.tsx`

Vista basada en columna Status. Cada opción del status = una columna Kanban.

**Estructura:**
```
[Selector de columna de agrupación] → por defecto: columna Status

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Working on it   │  │ Done            │  │ Stuck           │
│ 3 items         │  │ 7 items         │  │ 1 item          │
│─────────────────│  │─────────────────│  │─────────────────│
│ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │ Item title  │ │  │ │ Item title  │ │
│ │ 👤 Ana M.   │ │  │ │ Due: Mar 15 │ │
│ │ Due: Apr 1  │ │  │ └─────────────┘ │
│ └─────────────┘ │  │                 │
│ + Agregar item  │  │ + Agregar item  │
└─────────────────┘  └─────────────────┘
```

**Comportamiento:**
- Drag & drop con @dnd-kit/core
- Mover card → actualiza status del item automáticamente
- Click card → abre Side Peek
- Cards: título, assignee (avatar), due_date, prioridad (borde izq)
- Columnas colapsables con contador
- `+ Agregar item` en cada columna → item con ese status
- PLAYBOOK_TASKs (mode='my-plan'): drag deshabilitado + badge "Protegida"

### Verificación S-04
- [ ] Columnas Kanban generadas desde config.options de columna Status
- [ ] Drag & drop funciona entre columnas
- [ ] PLAYBOOK_TASKs no son arrastrables en mode='my-plan'
- [ ] Click card abre Side Peek

---

## SPRINT S-05: MY PLAN — GANTT VIEW

### [NUEVO] `components/pmo/views/GanttView.tsx`

**Estructura:**
```
[Zoom: Día | Semana | Mes | Trimestre]  [← Hoy →]  [rango visible]

LEFT PANEL (30%)           RIGHT PANEL / TIMELINE (70%)
Item Name                  MAR 2026
                           L  M  X  J  V  S  D  L  M  X
▼ Grupo 1
  Item A                      ████████████
  Item B                            ████████████████
  Item C                                     ██████
```

**Comportamiento:**
- Barras coloreadas por status
- Drag barra: mueve fechas (deshabilitado para PLAYBOOK_TASK en mode='my-plan')
- Drag extremo derecho: extiende duración
- Hover barra: tooltip con fechas y assignee
- Click barra: abre Side Peek
- Zoom: Día/Semana/Mes/Trimestre
- Línea "Hoy": color `--vibe-pink`
- Días no hábiles: fondo gris claro via WorkdayHelper
- Dependencias (blocking_task_id): línea flechas punteada entre tasks

### Verificación S-05
- [ ] Barras en posición correcta basada en due_date
- [ ] Zoom funciona
- [ ] WorkdayHelper sombrea días no hábiles
- [ ] Dependencias mostradas como flechas
- [ ] PLAYBOOK_TASKs no arrastrables en mode='my-plan'

---

## SPRINT S-06: MY PLAN — CALENDAR VIEW

### [NUEVO] `components/pmo/views/CalendarView.tsx`

**Estructura (mes):**
```
[← Marzo 2026 →]  [Mes | Semana | Día]

Lu   Ma   Mi   Ju   Vi   Sa   Do
               ████████
     ███               ████████████
```

**Comportamiento:**
- Items como pills coloreados en su due_date
- Click pill → Side Peek
- Click día vacío → nuevo item con esa fecha
- Drag pill entre días → actualiza due_date (bloqueado para PLAYBOOK_TASK)
- Días no hábiles: fondo diferente via WorkdayHelper
- Overflow: "+N más" clickable
- Vista semana: hourly grid

### Verificación S-06
- [ ] Items en día correcto
- [ ] Click día vacío crea nuevo item
- [ ] PLAYBOOK_TASKs no arrastrables
- [ ] WorkdayHelper determina días no hábiles

---

## SPRINT S-07: MY PLAN — DASHBOARD VIEW (WIDGETS)

### [NUEVO] `components/pmo/views/DashboardView.tsx`

Layout de widgets configurables. El usuario puede:
- Agregar widgets con `+ Agregar widget`
- Arrastrar para reposicionar
- Redimensionar (drag en esquinas)
- Remover con `×`

**Tipos de widgets:**

```
1. CHART — Gráfico barras/dona/línea
   Config: tablero fuente, columna agrupación, columna valores
   Tipos: Barras, Barras apiladas, Dona, Línea

2. NUMBERS — KPI single metric
   Muestra: count de items, suma, promedio de columna numérica
   Ejemplo: "23 tareas completadas esta semana"

3. BATTERY — Barra de progreso circular
   Muestra: % completitud del tablero/grupo

4. TABLE — Mini tabla embebida
   Top N items de un tablero con columnas seleccionadas

5. CALENDAR — Mini calendario
   Próximos items con due_date

6. GANTT — Mini gantt embebida
   Rango de tiempo configurable

7. WORKLOAD — Carga de trabajo por persona
   Items asignados por persona, agrupados por status

8. TEXT — Texto libre / notas del dashboard

9. MY WEEK — Vista personal
   Items asignados a mí con due_date esta semana
```

**Límites (ARCHITECTURE.md Regla #8):**
- 30 widgets: warning banner amarillo `#FDAB3D`
- 50 widgets: AI features desactivadas (badge visible)

**Config de widgets guardada en `pmo_views.config.widgets[]`:**
```json
{
  "id": "uuid",
  "type": "chart",
  "position": {"x": 0, "y": 0, "w": 6, "h": 4},
  "board_id": "...",
  "chart_type": "bar",
  "group_by_column": "status",
  "value_column": null
}
```

### Verificación S-07
- [ ] Widgets renderizan correctamente
- [ ] Drag & drop de widgets
- [ ] Resize de widgets
- [ ] Chart widget lee datos reales
- [ ] Numbers widget calcula KPIs
- [ ] Warning al superar 30 widgets

---

## SPRINT S-08: ITEM DETAIL / SIDE PEEK

### [NUEVO] `components/pmo/shared/ItemDetailPanel.tsx`

**Layout:**
```
[←] [→] [↗ Pantalla completa] [···] [×]
─────────────────────────────────────────
[Nombre del item — editable inline]

[Breadcrumb: Workspace > Board > Group]

CAMPOS (todos editables por tipo):
  Status: [pill]   Fecha: [picker]   Persona: [avatar]
  [cualquier columna del tablero]

SUBITEMS:
  ▼ Subitems (3)
    ☐ Subitem 1    [status] [person]
    ☐ Subitem 2    [status] [person]
    + Agregar subitem

UPDATES:
  [Input: Escribe una actualización...]
  [📎] [@ Mencionar]

  HOY
  👤 Fernando (hace 2h): "Material enviado..."
  [👍 2] [Responder]

  👤 Ana (hace 5h): "Necesita ajustes..."
  [Responder]

ACTIVIDAD:
  [Ver log de cambios]
```

**Comportamiento:**
- Ancho: 480px, posición: right panel
- Transición: slide-in desde derecha, `--motion-productive-long` (150ms)
- `Esc` cierra el panel
- "↗ Pantalla completa" → `/pmo/item/[id]`
- PLAYBOOK_TASKs: badge "Playbook Task — Protegida", sin botón eliminar
- Menciones @: dropdown empleados activos
- Updates en `pmo_item_updates`
- Activity log en `pmo_item_activity`

### Verificación S-08
- [ ] Panel abre desde Grid, Kanban, Gantt, Calendar
- [ ] Todos los campos editables en el panel
- [ ] Subitems se crean y persisten
- [ ] Updates con timestamps
- [ ] Activity log muestra cambios
- [ ] PLAYBOOK_TASKs sin botón eliminar + badge

---

## SPRINT S-09: MY PROJECTS — WORKSPACE MANAGER

### [NUEVO] `components/pmo/my-projects/WorkspaceManager.tsx`

**Empty state:**
```
[Ilustración]
"Tu espacio de trabajo personal"
"Crea workspaces para organizar tus proyectos."
[+ Crear primer workspace]
```

**Con workspaces:**
```
MY PROJECTS
[+ Nuevo workspace]  [🔍 Buscar tablero]

━━━ Workspace: CRM Personal ━━━ [···]
  [Card Tablero]  [Card Tablero]  [+ Nuevo tablero]

━━━ Workspace: Gestión de Proyectos ━━━ [···]
  [Card Tablero]  [+ Nuevo tablero]
```

**Cards de tablero:**
- Ícono + Nombre
- Número de grupos e items
- Última actualización
- Click → navega al tablero
- Hover → muestra opciones (···)

### Plantillas predefinidas al crear tablero

**Template CRM:**
- Grupos: Leads, Contactos activos, Clientes, Inactivos
- Columnas: Contacto (text), Email (email), Teléfono (phone), Empresa (text), Tipo (status: Lead/Cliente/Partner/Proveedor), Acuerdos (number), Valor (currency), Prioridad (status: Alta/Media/Baja), Comentarios (text)

**Template Gestión de Tareas:**
- Grupos: Por hacer, En progreso, Revisión, Completado
- Columnas: Tarea (text), Status (status), Responsable (person), Fecha límite (date), Prioridad (status), Progreso (progress), Notas (text)

**Template Pipeline:**
- Grupos: Etapa 1 Contacto, Etapa 2 Propuesta, Etapa 3 Negociación, Cerrado
- Columnas: Oportunidad (text), Empresa (text), Contacto (person), Valor (currency), Probabilidad (number), Fecha cierre (date), Status (status)

### Verificación S-09
- [ ] WorkspaceManager renderiza workspaces
- [ ] Crear workspace con modal
- [ ] Crear tablero desde plantilla
- [ ] PmoSidebar refleja nuevo workspace

---

## SPRINT S-10: MY PROJECTS — BOARD BUILDER

### Onboarding de tablero nuevo (réplica Monday.com)

Al entrar a un tablero nuevo por primera vez, mostrar tooltips secuenciales:
1. "Agrega tu primer item" → apunta al nombre
2. "Crea etiquetas de estado" → apunta a StatusCell
3. "Asigna un responsable" → apunta a PersonCell
4. "Agrega una columna" → apunta al `+`
5. "Duplica un elemento" → apunta al kebab del item
6. "Desglosa en subitems" → apunta al ▶

Cada tooltip: barra de progreso + "Volver" / "Siguiente" / `×` para saltar.
Estado guardado en `pmo_user_preferences`.

### Board Header completo

```
[Icono] Nombre del Tablero ↓    [Importar] [Integrar] [Automatizar] [Invitar] [···]
[Vista principal ···] [Tarjetas] [+ Nueva vista]
```

**`+ Nueva vista`:** dropdown de tipos de vista disponibles.
Múltiples vistas por tablero guardadas en `pmo_views`.

**Importar datos:**
- CSV: mapeo de columnas al crear
- Excel (.xlsx): usa SheetJS

### Verificación S-10
- [ ] Onboarding tooltips en tablero nuevo
- [ ] Board header con todas las acciones
- [ ] Múltiples vistas por tablero
- [ ] Import CSV con mapeo

---

## SPRINT S-11: MY PROJECTS — FULL COLUMN TYPES

### Implementación completa de cada tipo

**TEXT:** Input inline, max 500 chars, rich text en Side Peek

**NUMBER:**
- Input numérico, config: decimales 0-4, formato (número/porcentaje/unidad)
- Summary: suma, promedio, min, max, count

**STATUS:** Ver detalle en S-03. Config: options con label+color+group

**DATE:**
- DatePicker con WorkdayHelper
- Config: mostrar hora, formato de fecha
- Opciones rápidas: Hoy, Mañana, Próxima semana
- Alerta visual si fecha pasada (texto rojo)

**PERSON:**
- Dropdown de dim_employee filtrado por status='Active'
- Muestra: avatar (photo_url o inicial) + nombre
- Config: allow_multiple (multi-asignación)
- Opción "Yo": asignarse rápido

**EMAIL, PHONE, LINK:** Validados, clickables, con copiar

**CHECKBOX:** Toggle, summary: X/Y marcados

**RATING:** 1-5 estrellas, summary: promedio

**CURRENCY:** Número + símbolo configurable (USD/COP/MXN), summary: suma

**TAGS:** Multi-select, tags compartidas por tablero, crear inline

**DROPDOWN:** Single-select con opciones predefinidas (texto simple)

**PROGRESS:** Barra 0-100%, colores: rojo/amarillo/verde

**TIMELINE:** Rango de fechas, se refleja en Gantt

**FILES:** Upload a Supabase Storage, preview inline, max 50MB

**AUTO_NUMBER:** Secuencial autogenerado, read-only

**CREATION_LOG:** Creador + fecha, read-only

**LAST_UPDATED:** Último editor + cuándo, read-only

**FORMULA:**
- Expresión matemática con otras columnas: `{col_key} * 1.19`
- Evaluado client-side con mathjs

### Verificación S-11
- [ ] Todos los tipos seleccionables en ColumnTypeSelector
- [ ] Cada tipo tiene celda de edición correcta
- [ ] Config modal funciona por tipo
- [ ] Summary row con agregaciones
- [ ] Formula column evalúa expresiones

---

## SPRINT S-12: MY PROJECTS — ALL VIEWS

### Reutilización de componentes de My Plan

GridView, KanbanView, GanttView, CalendarView, DashboardView son EXACTAMENTE los mismos componentes que My Plan.

El prop `mode: 'my-plan' | 'my-projects'` controla:
- `my-plan`: Shield Protocol activo para PLAYBOOK_TASKs
- `my-projects`: Sin restricciones, todo editable y borrable

### Vista de Tarjetas (Cards View) — exclusiva My Projects

```
Grid de tarjetas tipo Trello:

┌──────────────────┐  ┌──────────────────┐
│ [Status pill]    │  │ [Status pill]    │
│ Nombre del item  │  │ Nombre del item  │
│ Due: Apr 1       │  │ Due: Apr 5       │
│ 👤 Ana Martinez  │  │ 👤 Carlos R.     │
└──────────────────┘  └──────────────────┘
```

### Verificación S-12
- [ ] Todas las vistas funcionan en My Projects sin restricciones Shield
- [ ] mode prop controla correctamente el Shield Protocol
- [ ] Cards view renderiza tarjetas correctamente

---

## SPRINT S-13: GROUPS, SUBITEMS, BATCH OPERATIONS

### Grupos — funcionalidad completa

**Context menu de grupo (click en `···`):**
- Renombrar grupo (inline)
- Cambiar color (color picker 8 opciones Vibe)
- Agregar ítem al inicio/fin
- Colapsar grupo
- Colapsar todos los grupos
- Duplicar grupo (copia items)
- Mover grupo a tablero diferente
- Eliminar grupo (modal: ¿mover items o eliminar?)

**Summary row al final de cada grupo:**
- Número/currency: suma/promedio/min/max (configurable por columna)
- Status: mini pills coloreados con count
- Person: avatares únicos + count
- Checkbox: X/Y marcados
- Click en valor → cambia función de resumen

### Subitems — funcionalidad completa

- Un item puede tener N subitems
- Subitems tienen sus propias columnas (compatibles con tipos del padre)
- Guardados en `pmo_subtasks`
- `▶` item → expande/colapsa subitems
- Cada subitem tiene: nombre, status, persona, fecha
- `+ Add subitem` al final
- Subitem tiene su propio Side Peek
- En Grid: indentados bajo el padre
- En Gantt: barras más delgadas

### Batch Operations

Al seleccionar múltiples items:
```
Banner: "X items seleccionados  [Duplicar] [Mover a] [Archivar] [Eliminar] [···]"
```
- Duplicar: copia todos
- Mover a: dropdown grupos/tableros
- Archivar: soft delete
- Eliminar: confirmación + Shield Protocol
- `···`: cambiar status, asignar persona a todos

### Verificación S-13
- [ ] Context menu de grupo con todas las opciones
- [ ] Summary row calcula correctamente
- [ ] Subitems bajo el padre con indent
- [ ] Batch toolbar con acciones
- [ ] Batch delete respeta Shield Protocol

---

## SPRINT S-14: AUTOMATIONS ENGINE

### [NUEVO] `components/pmo/automations/AutomationsPanel.tsx`

**UI:**
```
AUTOMATIZACIONES
[+ Crear automatización]

ACTIVAS (2)
  ━ Cuando Status cambia a "Done", notificar al responsable ━  [Toggle] [···]
  ━ Cuando Due Date llega, cambiar Status a "Vencido"       ━  [Toggle] [···]
```

**Constructor de automatizaciones:**
```
CUANDO...                    ENTONCES...
[Trigger selector]           [Acción selector]

Triggers:
- Estado cambia a [valor]
- Fecha llega
- Item creado
- Item asignado a mí
- Columna cambia a [valor]
- Item movido a grupo [X]

Acciones:
- Notificar a [persona/responsable]
- Cambiar [columna] a [valor]
- Crear item en [tablero]
- Mover item a [grupo]
- Asignar a [persona]
```

**Implementación técnica:**
- Guardadas en `pmo_automations` como JSONB
- Evaluadas en Server Actions cuando hay cambios en items
- "Notificar" → INSERT en `simo_notifications`
- Toggle activa/desactiva + incrementa `run_count`

### Verificación S-14
- [ ] Constructor funciona
- [ ] "Status cambia → notificar" dispara simo_notifications
- [ ] Toggle activa/desactiva
- [ ] run_count incrementa

---

## SPRINT S-15: DASHBOARD PANELS & CROSS-BOARD WIDGETS

### [NUEVO] Paneles en PmoSidebar

```
PMO SIDEBAR
├── MY WORK (my plan, my work, my queue)
├── MY PROJECTS (workspaces + tableros)
└── PANELES
    ├── Panel Ventas Q2
    └── + Nuevo Panel
```

**Paneles:** Dashboards que cruzan datos de múltiples tableros.
- Crear panel: nombre + agregar widgets de cualquier tablero
- Widgets pueden mezclar datos de tableros distintos
- Guardados en `pmo_panels`

### Verificación S-15
- [ ] Paneles en PmoSidebar
- [ ] Crear panel funciona
- [ ] Widgets cross-board cargan datos de múltiples tableros

---

## SPRINT S-16: MY PLAN — PLAYBOOK ASSIGNMENT INTEGRATION

### Lo que ya existe (de sprints anteriores)
- `assignPlaybookAction` — genera pmo_tasks con WorkdayHelper
- `PlaybookAssignmentPanel` — panel desde Business Plan
- Trigger `trg_unblock_dependent_task`

### Lo que falta

### [MODIFICAR] `MyPlanShell`

1. Primer ingreso sin playbooks → empty state: "No tienes playbooks asignados aún."
2. Con playbooks → cargar board personal `"My Plan — [EID]"`
3. Botón `+ Asignar Playbook` en toolbar (solo para usuarios con permiso)

**Visualización de task_type:**
- PLAYBOOK_TASK: badge azul `⚡ Playbook` + borde izq `--vibe-purple`
- SUPPORT_REQUEST: badge naranja `🤝 Soporte` + borde izq `--vibe-orange`
- PERSONAL_TASK: sin badge

**Tareas bloqueadas:**
- Status "blocked": pill gris `🔒 Bloqueada`
- Tooltip: "Esperando: [título de la SUPPORT_REQUEST]"
- En Gantt: barra con patrón rayas

**Grupos en My Plan:**
- Cada playbook asignado = un grupo
- Nombre: `[Nombre Playbook] — Asignado [fecha]`
- Color: CORE=azul, GROWTH=verde, ELITE=morado
- PERSONAL_TASKs → grupo "Mis Tareas Personales"

### [NUEVO] Server Action: `getMyPlanBoardAction(employeeEid, orgId)`

Retorna board personal del empleado con:
- Grupos (uno por playbook + "Mis Tareas Personales")
- Tasks con task_type, status, blocking_task_id
- Para SUPPORT_REQUESTs: requested_by_eid y nombre del solicitante
- Para bloqueadas: título de la tarea bloqueante

### Verificación S-16
- [ ] My Plan carga board personal
- [ ] PLAYBOOK_TASKs con badge y borde correcto
- [ ] SUPPORT_REQUESTs con badge correcto
- [ ] Bloqueadas muestran "blocked" + tooltip
- [ ] Cada playbook = un grupo separado
- [ ] Botón "+ Asignar Playbook" funcional

---

## SPRINT S-17: PRESENCIA EN TIEMPO REAL

### Usando Supabase Realtime (NO Socket.io)

```typescript
// Sincronizar cambios de items en tiempo real
const channel = supabase
  .channel(`board:${boardId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'pmo_tasks',
    filter: `board_id=eq.${boardId}`
  }, (payload) => {
    updateLocalItem(payload.new)
  })
  .subscribe()

// Presencia: quién está viendo el tablero
const presenceChannel = supabase.channel(`presence:${boardId}`)
presenceChannel.track({ user_id: currentUser.eid, name: currentUser.name })
presenceChannel.on('presence', { event: 'sync' }, () => {
  setActiveUsers(Object.values(presenceChannel.presenceState()).flat())
})
```

### [NUEVO] `components/pmo/shared/BoardPresenceStack.tsx`

Stack de avatares de usuarios activos en el board:
```
[Avatar Ana] [Avatar Carlos] [+2]
```
Aparece en el header del tablero.

### Verificación S-17
- [ ] BoardPresenceStack muestra usuarios activos
- [ ] Cambios de otro usuario se reflejan sin recargar
- [ ] Presencia desaparece al salir

---

## SPRINT S-18: PERFORMANCE (HPC RENDER)

### TanStack Virtual

```typescript
// Activar automáticamente cuando items > 3000
const rowVirtualizer = useVirtualizer({
  count: filteredItems.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 40,
  overscan: 10,
})
```

### Límites de rendimiento

| Umbral | Acción |
|--------|--------|
| > 3,000 items | TanStack Virtual automático |
| > 10,000 items | Desactivar Gantt (banner informativo) |
| > 20,000 items | Error bloqueante |
| > 30 widgets | Warning banner amarillo |
| > 50 widgets | AI features desactivadas |

### Lazy loading de vistas

```typescript
const GanttView     = dynamic(() => import('./GanttView'), { loading: () => <Skeleton /> })
const DashboardView = dynamic(() => import('./DashboardView'), { loading: () => <Skeleton /> })
const CalendarView  = dynamic(() => import('./CalendarView'), { loading: () => <Skeleton /> })
```

### Verificación S-18
- [ ] TanStack Virtual activo para tableros > 3000 items
- [ ] Scroll fluido a 60fps con 5,000+ items
- [ ] Lazy loading de vistas
- [ ] Warnings de límites visibles

---

## TIPOS TYPESCRIPT — `types/pmo-extended.types.ts`

Crear este archivo con todos los tipos:

```typescript
export interface PmoWorkspace {
  id: string; org_id: string; owner_id: string;
  name: string; icon: string; color: string;
  position: number; is_favorite: boolean;
  boards?: PmoBoard[];
  created_at: string; updated_at: string;
}

export type ColumnType =
  'text' | 'number' | 'status' | 'date' | 'person' | 'email' |
  'phone' | 'link' | 'checkbox' | 'rating' | 'currency' |
  'tags' | 'dropdown' | 'formula' | 'timeline' | 'files' |
  'progress' | 'auto_number' | 'creation_log' | 'last_updated';

export type ViewType = 'grid' | 'kanban' | 'gantt' | 'calendar' | 'dashboard' | 'cards' | 'form';

export type TaskType = 'PLAYBOOK_TASK' | 'SUPPORT_REQUEST' | 'PERSONAL_TASK';

export interface StatusOption {
  id: string; label: string; color: string; group?: string;
}

export interface ColumnConfig {
  options?: StatusOption[];
  currency?: string;
  decimals?: number;
  format?: string;
  allow_multiple?: boolean;
  formula?: string;
  [key: string]: unknown;
}

export interface PmoColumn {
  id: string; board_id: string; name: string;
  field_key: string; field_type: ColumnType;
  config: ColumnConfig; is_hidden: boolean;
  is_required: boolean; width: number; position: number;
}

export interface PmoGroup {
  id: string; board_id: string; name: string;
  color: string; position: number; is_collapsed: boolean;
}

export interface PmoTask {
  id: string; org_id: string; board_id: string; group_id: string;
  title: string; description?: string; status: string;
  priority?: string; due_date?: string; assignee_id?: string;
  is_protected: boolean; source_playbook_id?: string;
  source_playbook_task_id?: string; occurrence_index?: number;
  task_type: TaskType; blocking_task_id?: string;
  requested_by_eid?: string;
  custom_field_values: Record<string, unknown>;
  position: number; created_at: string; updated_at: string;
  completed_at?: string;
  subtasks?: PmoSubtask[];
  updates?: PmoItemUpdate[];
}

export type FilterOperator =
  'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty' |
  'eq' | 'neq' | 'gt' | 'lt' | 'between' | 'any_of' | 'none_of' |
  'before' | 'after' | 'in_range' | 'this_week' | 'this_month';

export interface FilterRule {
  id: string; column_field_key: string;
  operator: FilterOperator; value: unknown;
}

export type GridViewMode = 'my-plan' | 'my-projects';
```

---

## CHECKLIST DE VERIFICACIÓN GLOBAL

Antes de considerar completado cualquier sprint:

```
□ npx tsc --noEmit → 0 errores TypeScript
□ SQL ejecutado en Supabase confirmado con information_schema query
□ Vibe Design tokens usados (NUNCA hex hardcodeado)
□ WorkdayHelper para TODAS las fechas de negocio
□ Shield Protocol activo para PLAYBOOK_TASKs en mode='my-plan'
□ org_id en TODAS las queries (multi-tenant)
□ My Work y My Queue intactos (NO modificados)
□ Push a rama feat/nombre (NO directo a main sin autorización)
□ Walkthrough documentado con archivos modificados
□ Verificación manual de escenarios del sprint
□ Verificar que PmoSidebar y Sidebar principal coexisten correctamente
```

---

## NOTAS FINALES PARA EL AGENTE

1. **Orden de ejecución es crítico.** S-01 y S-02 son pre-requisitos absolutos de todo lo demás. No saltar sprints.

2. **My Work y My Queue NO se tocan.** Solo agregar casos nuevos en DashboardContent.tsx, nunca alterar las rutas existentes.

3. **Componentes compartidos.** GridView, KanbanView, GanttView, CalendarView, DashboardView, ItemDetailPanel son TODOS reutilizados en My Plan y My Projects. El prop `mode` controla las diferencias.

4. **PmoSidebar independiente.** Siempre visible cuando activeModule === 'pmo'. No reemplaza al sidebar principal de SIMO.

5. **Supabase Realtime.** NO usar polling. Usar Supabase channels para sincronización.

6. **WorkdayHelper para TODA fecha.** Sin excepciones. Nunca `new Date()` para fechas de negocio.

7. **Vibe Design System.** JAMÁS hardcodear colores hex. Siempre tokens del ARCHITECTURE.md existente.

8. **Antes de cada push.** `npx tsc --noEmit` debe pasar con 0 errores.

9. **El Schema Dinámico.** La flexibilidad de My Projects vive en `pmo_tasks.custom_field_values` JSONB y en `pmo_columns.config` JSONB. No crear nuevas tablas por cada tipo de tablero.

10. **PLAYBOOK_TASKs en My Plan.** Nunca mostrar botón eliminar. Nunca permitir arrastrar en Kanban/Gantt. Badge visual obligatorio. Shield Protocol se respeta siempre.

---

*SIMO Intellisense PMO Master Plan v1.0*
*Generado: 19/04/2026*
*Este documento es el contrato técnico de construcción entre Fernando (Director) y AG (Agente).*
*Toda desviación debe ser consultada ANTES de implementar.*
