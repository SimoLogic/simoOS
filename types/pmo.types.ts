// PMO types — Módulo PMO de Simo Intellisense
// ⚠️ Lee ARCHITECTURE.md antes de modificar este archivo

export type TaskStatus = 
    | 'not_started'
    | 'in_progress' 
    | 'done'
    | 'stuck'
    | 'pending_review';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type FrequencyType = 
    | 'ONCE'
    | 'DAILY'
    | 'WEEKLY' 
    | 'BIWEEKLY'
    | 'MONTHLY';

export type BoardView = 'grid' | 'kanban' | 'gantt' | 'calendar' | 'dashboard';

export interface WorkdayConfig {
    timezone: string;         // e.g. 'America/Bogota'
    workdays: number[];       // [1,2,3,4,5] = Mon-Fri
    countryCode: string;      // 'CO', 'MX', 'AR', 'ES'
}

export interface Frequency {
    type: FrequencyType;
    interval: number;         // e.g. 2 for DAILY×2
    workdayOnly: boolean;
    skipWeekends: boolean;
    respectPublicHolidays: boolean;
}

// ─── TASK ──────────────────────────────────────────────────────────
// REGLA DE ORO #1: isProtected=true → NUNCA DELETE, NUNCA UI de borrado
export interface PmoTask {
    id: string;
    orgId: string;            // Multi-tenant — SIEMPRE presente
    boardId: string;
    groupId: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;         // ISO string — almacenar UTC
    assigneeId?: string;
    
    // Protección Simo IS (Llave #3)
    isProtected: boolean;                // sourcePlaybookId !== null → true
    sourcePlaybookId?: string | null;    // Si != null → tarea del Playbook
    sourcePlaybookTaskId?: string | null;
    occurrenceIndex?: number;            // Para tareas repetidas (DAILY×N)
    
    // Campos del empleado — NUNCA sobreescribir con Mirror Sync (Regla #2)
    subtasks: PmoSubtask[];
    comments: PmoComment[];
    attachments: PmoAttachment[];
    customFieldValues: Record<string, unknown>;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    timeSpentMinutes?: number;
    
    // Modo de altura en Grid View (Vibe)
    itemHeight: 'simple' | 'double' | 'triple';
}

export interface PmoSubtask {
    id: string;
    taskId: string;
    title: string;
    isCompleted: boolean;
    isProtected: false;        // Subtasks NUNCA son protegidas
    createdAt: string;
}

export interface PmoComment {
    id: string;
    taskId: string;
    authorId: string;
    content: string;           // Rich text (Tiptap)
    createdAt: string;
    updatedAt: string;
}

export interface PmoAttachment {
    id: string;
    taskId: string;
    filename: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
}

// ─── GROUP ─────────────────────────────────────────────────────────
export interface PmoGroup {
    id: string;
    boardId: string;
    title: string;
    color: string;             // Vibe semantic color hex
    position: number;
    isCollapsed: boolean;
    tasks: PmoTask[];
}

// ─── BOARD ─────────────────────────────────────────────────────────
export interface PmoBoard {
    id: string;
    orgId: string;
    workspaceId: string;
    title: string;
    description?: string;
    
    // Simo IS integration
    simoPlaybookId?: string;   // Si viene de Simo IS → readonly
    isPlaybookBoard: boolean;
    
    activeView: BoardView;
    isViewLocked: boolean;
    
    groups: PmoGroup[];
    columns: PmoColumn[];
    
    createdAt: string;
    updatedAt: string;
    lastSyncedAt?: string;     // Última sync con Simo IS
}

export interface PmoColumn {
    id: string;
    boardId: string;
    title: string;
    type: PmoFieldType;
    position: number;
    width: number;             // px
    settings?: Record<string, unknown>;
}

export type PmoFieldType = 
    | 'text'
    | 'status'
    | 'person'
    | 'date'
    | 'date_range'
    | 'number'
    | 'formula'
    | 'checkbox'
    | 'dropdown'
    | 'file'
    | 'mirror'
    | 'link'
    | 'email'
    | 'phone'
    | 'rating'
    | 'progress';

// ─── WORKSPACE ─────────────────────────────────────────────────────
export interface PmoWorkspace {
    id: string;
    orgId: string;
    name: string;
    boards: PmoBoard[];
    createdAt: string;
}

// ─── INTEGRATION (Simo IS) ─────────────────────────────────────────
export interface PlaybookAssignmentPayload {
    employeeId: string;
    playbookId: string;
    playbookName: string;
    startDate: string;         // ISO string (Día 0)
    organizationTimezone: string;
    tasks: PlaybookTaskDefinition[];
}

export interface PlaybookTaskDefinition {
    id: string;
    name: string;
    type: string;
    frequency: Frequency;
    repetitions: number;
    dependsOn: string[];
    estimatedMinutes: number;
    priority: TaskPriority;
}

export interface SyncPatch {
    taskId: string;
    playbookId: string;
    // Solo campos padre sincronizables (Llave #4)
    updates: {
        title?: string;
        description?: string;
        dueDate?: string;
        priority?: TaskPriority;
    };
    idempotencyKey: string;
}

export interface SyncEvent {
    id: string;
    taskId: string;
    syncedFields: string[];
    conflictsFound: string[];
    resolvedBy?: 'employee' | 'simo_is' | 'pending';
    timestamp: string;
}

export interface SecurityEvent {
    id: string;
    userId: string;
    taskId: string;
    attemptedAt: string;
    ipAddress: string;
    vector: 'http_api' | 'prisma_direct' | 'sql_direct' | 'ui';
}

// ─── ZUSTAND STATE (solo UI — no datos de negocio masivos) ─────────
export interface PmoUIState {
    activeView: BoardView;
    itemHeightMode: 'simple' | 'double' | 'triple';
    isViewLocked: boolean;
    activeBoardId: string | null;
    activeWorkspaceId: string | null;
    widgetCount: number;       // Para mondayDB limits
    isHPCMode: boolean;        // >3000 items → virtualización agresiva
}
