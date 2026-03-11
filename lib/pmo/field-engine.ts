// ⚠️ LEER ARCHITECTURE.md §3 (VIBE TOKENS) antes de modificar
// field-engine.ts — Motor de resolución de tipos de campo PMO
//
// Tipos soportados en Sprint 2: text, status, person
// Tipos placeholder (Sprint 4+): date, number, formula, dropdown, etc.
//
// Función principal: resolveFieldValue(type, rawValue, context) → valor tipado
// Función de validación: validateFieldValue(type, value) → { valid, error? }

import type { PmoFieldType, TaskStatus } from "@/types/pmo.types";
import { VIBE_TOKENS } from "@/lib/pmo/utils/vibe-tokens";

// ─── TIPOS DE SALIDA DEL MOTOR ────────────────────────────────────────────────

export interface FieldResolveContext {
  orgId:   string;
  boardId: string;
}

export interface ResolvedTextField {
  type: "text";
  value: string;
  displayValue: string;
}

export interface StatusOption {
  value:     TaskStatus;
  label:     string;
  color:     string;    // Hex background
  textColor: string;    // Hex para el label
}

export interface ResolvedStatusField {
  type:    "status";
  value:   TaskStatus;
  option:  StatusOption;
}

export interface ResolvedPersonField {
  type:      "person";
  userId:    string | null;
  display:   string;       // Nombre completo o "Unassigned"
  avatarUrl: string | null;
  initials:  string;       // Para fallback de avatar
}

export type ResolvedFieldValue =
  | ResolvedTextField
  | ResolvedStatusField
  | ResolvedPersonField
  | { type: PmoFieldType; value: unknown; displayValue: string }; // Fallback genérico

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}

// ─── STATUS FIELD — Mapping Vibe completo ─────────────────────────────────────

/**
 * STATUS_OPTIONS — Mapa de estado → colores Vibe
 * ⚠️ NUNCA hardcodear colores aquí — siempre usar VIBE_TOKENS
 */
export const STATUS_OPTIONS: Record<TaskStatus, StatusOption> = {
  not_started:    {
    value:     "not_started",
    label:     "Not Started",
    color:     VIBE_TOKENS.border,        // #E6E9EF — neutral
    textColor: VIBE_TOKENS.textMuted,     // #676879
  },
  in_progress:    {
    value:     "in_progress",
    label:     "In Progress",
    color:     `${VIBE_TOKENS.orange}30`, // #FDAB3D con alpha
    textColor: VIBE_TOKENS.orange,        // #FDAB3D
  },
  done:           {
    value:     "done",
    label:     "Done",
    color:     `${VIBE_TOKENS.green}30`,  // #00CA72 con alpha
    textColor: VIBE_TOKENS.green,         // #00CA72
  },
  stuck:          {
    value:     "stuck",
    label:     "Stuck",
    color:     `${VIBE_TOKENS.pink}30`,   // #FF3D57 con alpha
    textColor: VIBE_TOKENS.pink,          // #FF3D57
  },
  pending_review: {
    value:     "pending_review",
    label:     "Pending Review",
    color:     `${VIBE_TOKENS.purple}25`, // #6161FF con alpha
    textColor: VIBE_TOKENS.purple,        // #6161FF
  },
};

const VALID_STATUSES = new Set<string>(Object.keys(STATUS_OPTIONS));

// ─── TEXT FIELD ───────────────────────────────────────────────────────────────

const TEXT_MAX_CHARS = 50_000;

function resolveText(rawValue: unknown): ResolvedTextField {
  const value = typeof rawValue === "string" ? rawValue.slice(0, TEXT_MAX_CHARS) : "";
  return { type: "text", value, displayValue: value };
}

function validateText(value: unknown): FieldValidationResult {
  if (typeof value !== "string") return { valid: false, error: "Text field must be a string" };
  if (value.length > TEXT_MAX_CHARS) return { valid: false, error: `Max ${TEXT_MAX_CHARS.toLocaleString()} characters` };
  return { valid: true };
}

// ─── STATUS FIELD ─────────────────────────────────────────────────────────────

function resolveStatus(rawValue: unknown): ResolvedStatusField {
  const value: TaskStatus = VALID_STATUSES.has(rawValue as string)
    ? (rawValue as TaskStatus)
    : "not_started";
  return { type: "status", value, option: STATUS_OPTIONS[value] };
}

function validateStatus(value: unknown): FieldValidationResult {
  if (!VALID_STATUSES.has(value as string)) {
    return {
      valid: false,
      error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
    };
  }
  return { valid: true };
}

// ─── PERSON FIELD ─────────────────────────────────────────────────────────────

/**
 * getInitials — Genera iniciales de un nombre completo para avatares sin foto
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/**
 * PersonCache — Cache en memoria para resolución de usuarios durante una request.
 * Sprint 3: reemplazar con lookup en tabla dim_employee via Server Action.
 */
const PersonCache = new Map<string, { name: string; avatarUrl: string | null }>();

function resolvePersonSync(userId: unknown): ResolvedPersonField {
  if (!userId || typeof userId !== "string") {
    return {
      type:      "person",
      userId:    null,
      display:   "Unassigned",
      avatarUrl: null,
      initials:  "UA",
    };
  }

  const cached = PersonCache.get(userId);
  if (cached) {
    return {
      type:      "person",
      userId,
      display:   cached.name,
      avatarUrl: cached.avatarUrl,
      initials:  getInitials(cached.name),
    };
  }

  // Fallback cuando no se ha cargado el perfil aún (async load en Sprint 3)
  const display = `User ${userId.slice(0, 8)}`;
  return {
    type:      "person",
    userId,
    display,
    avatarUrl: null,
    initials:  display.slice(0, 2).toUpperCase(),
  };
}

/**
 * enrichPersonCache — Carga usuarios en la caché para resolución sync posterior.
 * Llamar desde Server Actions al cargar un board.
 */
export function enrichPersonCache(
  users: Array<{ id: string; name: string; avatarUrl?: string | null }>
): void {
  for (const u of users) {
    PersonCache.set(u.id, { name: u.name, avatarUrl: u.avatarUrl ?? null });
  }
}

function validatePerson(value: unknown): FieldValidationResult {
  if (value !== null && typeof value !== "string") {
    return { valid: false, error: "Person field must be a userId string or null" };
  }
  return { valid: true };
}

// ─── ENGINE API ───────────────────────────────────────────────────────────────

/**
 * resolveFieldValue — Transforma un valor raw de DB al tipo correcto con display info.
 * 
 * Uso:
 * ```ts
 * const resolved = resolveFieldValue("status", "in_progress", ctx);
 * // → { type: "status", value: "in_progress", option: { label: "In Progress", color: "#FDAB3D30", ... } }
 * ```
 */
export function resolveFieldValue(
  type: PmoFieldType,
  rawValue: unknown,
  _ctx?: FieldResolveContext
): ResolvedFieldValue {
  switch (type) {
    case "text":   return resolveText(rawValue);
    case "status": return resolveStatus(rawValue);
    case "person": return resolvePersonSync(rawValue);
    default:
      // Tipos pendientes de Sprint 4: date, number, formula, dropdown, etc.
      return {
        type,
        value: rawValue,
        displayValue: rawValue != null ? String(rawValue) : "",
      };
  }
}

/**
 * validateFieldValue — Valida un valor antes de guardarlo en DB.
 * Usar en Server Actions como Shield 2 de validación.
 */
export function validateFieldValue(
  type: PmoFieldType,
  value: unknown
): FieldValidationResult {
  switch (type) {
    case "text":   return validateText(value);
    case "status": return validateStatus(value);
    case "person": return validatePerson(value);
    default:
      return { valid: true }; // Tipos no implementados pasan por ahora
  }
}

/**
 * getStatusOptions — Retorna todos los estados con sus colores Vibe.
 * Usar para renderizar dropdowns de estado en Grid/Kanban.
 */
export function getStatusOptions(): StatusOption[] {
  return Object.values(STATUS_OPTIONS);
}
