// ⚠️ LEER ARCHITECTURE.md §3 (VIBE TOKENS) antes de modificar
// field-engine.ts — Motor de resolución de tipos de campo PMO
//
// Tipos soportados en Sprint 2: text, status, person
// Tipos placeholder (Sprint 4+): date, number, formula, dropdown, etc.
//
// Función principal: resolveFieldValue(type, rawValue, context) → valor tipado
// Función de validación: validateFieldValue(type, value) → { valid, error? }

import type { PmoFieldType, TaskStatus } from "../../types/pmo.types";
import { VIBE_TOKENS } from "./utils/vibe-tokens";

import { evaluate } from "mathjs";
import DOMPurify from "isomorphic-dompurify";

// ─── TIPOS DE SALIDA DEL MOTOR ────────────────────────────────────────────────

export interface FieldResolveContext {
  task: import("@/types/pmo.types").PmoTask;
  allColumns?: Array<{ title: string; id: string }>;
}

export interface ResolvedTextField {
  type: "text";
  value: string;
  displayValue: string;
  error?: string;
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
  displayValue: string;
  error?: string;
}

export interface ResolvedPersonField {
  type:      "person";
  userId:    string | null;
  display:   string;       // Nombre completo o "Unassigned"
  avatarUrl: string | null;
  initials:  string;       // Para fallback de avatar
  displayValue: string;
  error?: string;
}

export interface ResolvedFormulaField {
  type: "formula";
  value: number | string | null;
  displayValue: string;
  error?: string;
}

export type ResolvedFieldValue =
  | ResolvedTextField
  | ResolvedStatusField
  | ResolvedPersonField
  | ResolvedFormulaField
  | { type: PmoFieldType; value: unknown; displayValue: string; error?: string }; // Fallback genérico

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
  // Shield 2: Validar y sanitizar XSS
  const rawString = typeof rawValue === "string" ? rawValue : "";
  const sanitized = DOMPurify.sanitize(rawString, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload']
  });
  
  const value = sanitized.slice(0, TEXT_MAX_CHARS);
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
  const option = STATUS_OPTIONS[value];
  return { type: "status", value, option, displayValue: option.label };
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
      displayValue: "Unassigned",
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
      displayValue: cached.name,
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
    displayValue: display,
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

// ─── FORMULA FIELD ────────────────────────────────────────────────────────────

function resolveFormula(expression: string, ctx: FieldResolveContext): ResolvedFormulaField {
  if (!expression || !ctx.task) return { type: "formula", value: null, displayValue: "-" };

  try {
    // 1. Preprocesar la expresión: Reemplazar tokens {Nombre Columna}
    let processedExpr = expression;
    
    // Regex para buscar tokens tipo {Columna}
    const tokenRegex = /\{([^}]+)\}/g;
    let match;
    
    // Mapa de valores para resolución rápida
    const taskData = {
      ...(ctx.task as any),
      ...(ctx.task.customFieldValues || {})
    };

    // Reemplazo iterativo de tokens
    while ((match = tokenRegex.exec(expression)) !== null) {
      const fullToken = match[0];
      const colNameOrId = match[1];
      
      // Intentar encontrar el valor:
      // a) Búsqueda directa por ID o key en Task
      let val = taskData[colNameOrId];

      // b) Búsqueda por título de columna (si context tiene allColumns)
      if (val === undefined && ctx.allColumns) {
        const col = ctx.allColumns.find(c => 
          c.title.toLowerCase() === colNameOrId.toLowerCase()
        );
        if (col) {
          val = taskData[col.id] ?? taskData[col.title];
        }
      }

      // Default a 0 si no se encuentra (para evitar errores de cálculo)
      const numericVal = Number(val) || 0;
      processedExpr = processedExpr.replace(fullToken, numericVal.toString());
    }

    // 2. Evaluar con mathjs
    // Sanitizar: solo permitir caracteres matemáticos y números (seguridad extra)
    // Aunque mathjs es potente, limitamos el scope por ahora
    const result = evaluate(processedExpr);
    
    // 3. Formatear resultado
    const numResult = typeof result === "number" ? result : null;
    
    return {
      type: "formula",
      value: numResult,
      displayValue: numResult !== null 
        ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(numResult)
        : String(result),
    };

  } catch (err: any) {
    console.error("[FieldEngine] Formula Error:", err.message, "Expr:", expression);
    return {
      type: "formula",
      value: null,
      displayValue: "Error",
      error: `Math Error: ${err.message}`,
    };
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
  ctx?: FieldResolveContext
): ResolvedFieldValue {
  switch (type) {
    case "text":   return resolveText(rawValue);
    case "status": return resolveStatus(rawValue);
    case "person": return resolvePersonSync(rawValue);
    case "formula": 
      return resolveFormula(String(rawValue), ctx!);
    default:
      // Tipos pendientes de Sprint 4: date, number, dropdown, etc.
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
