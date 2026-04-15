/**
 * ============================================================================
 * PLAYBOOK DESIGNER — TYPE DEFINITIONS
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * USER STORIES (BACKLOG MAESTRO):
 * US-001: As a Designer, I can create a Playbook with name, type, strategy, family, and mission.
 * US-002: As a Designer, I can add operational nodes (steps) with full activity metadata.
 * US-003: As a Designer, I can lock/save a step to protect it from accidental edits.
 * US-004: As a Designer, I can mark a step as Repeatable to add it to the library.
 * US-005: As a Designer, I can drag-and-drop roles from the library onto steps.
 * US-006: As a Designer, I can view a BPMN flow trace for any locked step.
 * ============================================================================
 */

// ─── Core Step Entity ─────────────────────────────────────────────────────────

export interface PlaybookStep {
  id: number | string;
  uid: string;                   // Hard-generated unique ID (e.g. "HBT032")
  stepNum: string;               // Zero-padded sequence (e.g. "01", "02")
  name: string;                  // Activity name (UPPERCASE)
  typeOfActivity: string;        // e.g. "CALL", "EMAIL"
  purpose: string;               // Step purpose
  activityDescription: string;  // Description of what to do
  deliverable: string;           // Expected output (UPPERCASE)
  deliverableDescription: string;
  stakeholderId: string | null;  // DB UUID reference to dim_role_title | dim_external_role
  stakeholderName: string | null;// UI Display name
  frequency: FrequencyOption;    // Cadence
  repetitions: number;           // How many times per period
  freqNotes: string;             // Execution window notes
  schedulerValue: number;        // Days offset from previous step (WorkdayHelper key)
  supportingTask: string;        // Counteraction task name (UPPERCASE)
  counteractionDescription: string;
  requestedToId: string | null;  // DB UUID reference to dim_role_title | dim_external_role
  requestedToName: string | null;// UI Display name
  sla: string;                   // Success SLA (UPPERCASE)
  slaDescription: string;
  isLocked: boolean;             // TRUE = saved/protected (Shield Protocol Llave #3)
  isRepeatable: boolean;         // TRUE = added to Repeatable Nodes library
}

// ─── Playbook Container ────────────────────────────────────────────────────────

export interface PlaybookOwner {
  id: string;   // UUID
  name: string; // Role name
}

export interface PlaybookState {
  globalOwners: PlaybookOwner[];
  steps: PlaybookStep[];
}

// ─── Metadata Enums ───────────────────────────────────────────────────────────

export type FrequencyOption = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type PlaybookType = 'CORE' | 'GROWTH' | 'ELITE';
export type PlaybookFamily = 'COMMERCIAL' | 'OPERATIONAL';
export type PlaybookStrategy = 'B2B' | 'B2C' | 'NPPM';
export type PlaybookStatus = 'DRAFT' | 'PUBLISHED' | 'INACTIVE';
export type ActiveTab = 'editor' | 'visual';

// ─── UI Modal States ──────────────────────────────────────────────────────────

export type WarningModalType = 'alert' | 'uncheck' | 'edit_warning' | 'confirm';

// Name collision modal when saving with a duplicate playbook name
export interface OverwriteWarningState {
  open: boolean;
  conflictingName: string;
  nextVersion: number;
  onConfirm: () => void;
}

export interface WarningModalState {
  open: boolean;
  type: WarningModalType | '';
  data: PlaybookStep | null;
  message: string;
  title: string;
}

export interface ReplaceModalState {
  open: boolean;
  targetId: number | string | null;
  sourceData: PlaybookStep | null;
}

export interface DescModalState {
  open: boolean;
  stepId: number | string | null;
  field: string;
  title: string;
  value: string;
  isLocked: boolean;
}

// ─── Library ──────────────────────────────────────────────────────────────────

export interface ActivityLibraryItem {
  type: string;
  options: string[];
}

export interface EmployeeRef {
  id: string;
  name: string;
  role: string;
}
