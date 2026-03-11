// ⚠️ Lee ARCHITECTURE.md (Llave #2) antes de modificar
// WorkdayHelper PRO — Motor de Calendario Comercial para el PMO
//
// Dependencias: date-fns (^4.1.0) — ya en package.json
//
// REGLA ABSOLUTA: NUNCA usar `new Date()` directamente para cálculos de negocio.
// SIEMPRE usar estos métodos que respetan holidays del país de la organización.
//
// Tests obligatorios: __tests__/workday-helper.test.ts
// Ejecutar: npx tsx --test __tests__/workday-helper.test.ts

import { addDays, addWeeks, addMonths, isWeekend, startOfDay, setDate } from "date-fns";

// ─── FESTIVOS POR PAÍS ────────────────────────────────────────────────────────
// Seed built-in — Sprint 4: cargar desde tabla public_holidays en DB
const BUILT_IN_HOLIDAYS: Record<string, string[]> = {
  CO: [
    // 2025
    "2025-01-01","2025-01-06","2025-03-24","2025-04-17","2025-04-18",
    "2025-05-01","2025-05-29","2025-06-19","2025-06-23","2025-06-30",
    "2025-08-07","2025-08-18","2025-10-13","2025-11-03","2025-11-17",
    "2025-12-08","2025-12-25",
    // 2026
    "2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03",
    "2026-05-01","2026-05-14","2026-06-04","2026-06-08","2026-06-29",
    "2026-07-20","2026-08-07","2026-08-17","2026-10-12","2026-11-02",
    "2026-11-16","2026-12-08","2026-12-25",
  ],
  MX: [
    // 2025
    "2025-01-01","2025-02-03","2025-03-17","2025-04-17","2025-04-18",
    "2025-05-01","2025-09-16","2025-11-17","2025-12-25",
    // 2026
    "2026-01-01","2026-02-02","2026-03-16","2026-04-02","2026-04-03",
    "2026-05-01","2026-09-16","2026-11-16","2026-12-25",
  ],
  AR: [
    // 2025
    "2025-01-01","2025-03-03","2025-03-04","2025-03-24","2025-04-02",
    "2025-04-17","2025-04-18","2025-05-01","2025-05-25","2025-06-16",
    "2025-06-20","2025-07-09","2025-08-18","2025-10-13","2025-11-24",
    "2025-12-08","2025-12-25",
    // 2026
    "2026-01-01","2026-02-16","2026-02-17","2026-03-24","2026-04-02",
    "2026-04-03","2026-04-06","2026-05-01","2026-05-25","2026-06-15",
    "2026-06-20","2026-07-09","2026-08-17","2026-10-12","2026-11-23",
    "2026-12-08","2026-12-25",
  ],
  ES: [
    // 2025
    "2025-01-01","2025-01-06","2025-04-17","2025-04-18","2025-05-01",
    "2025-08-15","2025-10-12","2025-11-01","2025-12-06","2025-12-08","2025-12-25",
    // 2026
    "2026-01-01","2026-01-06","2026-04-02","2026-04-03","2026-05-01",
    "2026-08-15","2026-10-12","2026-11-01","2026-12-06","2026-12-08","2026-12-25",
  ],
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type FrequencyType =
  | "ONCE"        // Tarea única, fecha exacta
  | "DAILY"       // N ocurrencias en días hábiles consecutivos
  | "WEEKLY"      // N ocurrencias, una por semana
  | "BIWEEKLY"    // N ocurrencias, una cada 2 semanas
  | "MONTHLY";    // N ocurrencias, el mismo día del mes

export interface FrequencyConfig {
  type:        FrequencyType;
  occurrences: number;    // Número de repeticiones (ignorado para ONCE)
}

export interface WorkdayOrgConfig {
  timezone:       string;       // 'America/Bogota'
  countryCode:    string;       // 'CO' | 'MX' | 'AR' | 'ES'
  workdays?:      number[];     // [1,2,3,4,5] = Lun-Vie (default)
  extraHolidays?: string[];     // Festivos adicionales YYYY-MM-DD
}

export interface ExpandedOccurrence {
  occurrenceIndex: number;
  date:            Date;
  isoDate:         string;   // 'YYYY-MM-DD'
}

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────

/** Formatea una fecha como string 'YYYY-MM-DD' sin depender del timezone del sistema */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isPublicHoliday(
  date:          Date,
  countryCode:   string,
  extraHolidays: string[] = []
): boolean {
  const iso     = toISODate(date);
  const builtIn = BUILT_IN_HOLIDAYS[countryCode.toUpperCase()] ?? [];
  return builtIn.includes(iso) || extraHolidays.includes(iso);
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

/**
 * isWorkday — Verifica si una fecha es día hábil (no fin de semana, no festivo)
 */
export function isWorkday(
  date:          Date,
  countryCode:   string   = "CO",
  extraHolidays: string[] = []
): boolean {
  if (isWeekend(date)) return false;
  if (isPublicHoliday(date, countryCode, extraHolidays)) return false;
  return true;
}

/**
 * nextWorkday — Primer día hábil desde la fecha dada (inclusive si ya es hábil)
 */
export function nextWorkday(
  date:          Date,
  countryCode:   string   = "CO",
  extraHolidays: string[] = []
): Date {
  let candidate = startOfDay(date);
  while (!isWorkday(candidate, countryCode, extraHolidays)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/**
 * addWorkdays — Suma N días hábiles a una fecha de inicio.
 *
 * Si la fecha de inicio es no-hábil, avanza al primer hábil antes de contar.
 *
 * @example
 * // 2026-04-01 es miércoles (hábil) + 1 → pero 04-02 (Jue Santo CO) y 04-03 (Vie Santo CO) son festivos
 * addWorkdays('2026-04-01', 1, 'CO') → 2026-04-06 (lunes)
 */
export function addWorkdays(
  start:         Date | string,
  workdays:      number,
  countryCode:   string   = "CO",
  extraHolidays: string[] = []
): Date {
  if (workdays < 0) throw new Error("WorkdayHelper: workdays must be >= 0");

  let current = startOfDay(
    typeof start === "string" ? new Date(start) : start
  );

  // Avanzar al primer día hábil (inclusive)
  current = nextWorkday(current, countryCode, extraHolidays);

  let remaining = workdays;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkday(current, countryCode, extraHolidays)) {
      remaining--;
    }
  }

  return current;
}

/**
 * countWorkdays — Cuenta días hábiles entre dos fechas (ambas inclusive)
 */
export function countWorkdays(
  start:         Date | string,
  end:           Date | string,
  countryCode:   string   = "CO",
  extraHolidays: string[] = []
): number {
  let current = startOfDay(
    typeof start === "string" ? new Date(start) : start
  );
  const endDate = startOfDay(
    typeof end === "string" ? new Date(end) : end
  );
  let count = 0;

  while (current <= endDate) {
    if (isWorkday(current, countryCode, extraHolidays)) count++;
    current = addDays(current, 1);
  }

  return count;
}

/**
 * expandFrequency — 🗝️ LLAVE #2 CORE
 *
 * Expande una frecuencia de Playbook en una lista de fechas hábiles concretas.
 * Llamada por PlaybookProcessor para generar los pmo_tasks de un Playbook.
 *
 * @param freq      - Configuración de frecuencia (type + occurrences)
 * @param startDate - Fecha de inicio de la asignación
 * @param orgConfig - Config de la organización (país, holidays extra)
 *
 * @example
 * expandFrequency({ type: 'DAILY', occurrences: 8 }, '2026-03-11', { countryCode: 'CO', timezone: 'America/Bogota' })
 * // Returns 8 working day dates starting from 2026-03-11, skipping weekends and Colombian holidays
 */
export function expandFrequency(
  freq:       FrequencyConfig,
  startDate:  Date | string,
  orgConfig:  WorkdayOrgConfig
): ExpandedOccurrence[] {
  const { countryCode, extraHolidays = [] } = orgConfig;
  const results: ExpandedOccurrence[] = [];

  const base = startOfDay(
    typeof startDate === "string" ? new Date(startDate) : startDate
  );

  // ── ONCE ──────────────────────────────────────────────────────────────────
  if (freq.type === "ONCE") {
    const d = nextWorkday(base, countryCode, extraHolidays);
    results.push({ occurrenceIndex: 0, date: d, isoDate: toISODate(d) });
    return results;
  }

  // ── DAILY ─────────────────────────────────────────────────────────────────
  if (freq.type === "DAILY") {
    let current = nextWorkday(base, countryCode, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      if (i === 0) {
        results.push({ occurrenceIndex: 0, date: current, isoDate: toISODate(current) });
      } else {
        let next = addDays(current, 1);
        while (!isWorkday(next, countryCode, extraHolidays)) {
          next = addDays(next, 1);
        }
        current = next;
        results.push({ occurrenceIndex: i, date: current, isoDate: toISODate(current) });
      }
    }
    return results;
  }

  // ── WEEKLY ────────────────────────────────────────────────────────────────
  if (freq.type === "WEEKLY") {
    let anchor = nextWorkday(base, countryCode, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      const candidate = i === 0 ? anchor : addWeeks(anchor, i);
      const adjusted  = nextWorkday(candidate, countryCode, extraHolidays);
      results.push({ occurrenceIndex: i, date: adjusted, isoDate: toISODate(adjusted) });
    }
    return results;
  }

  // ── BIWEEKLY ──────────────────────────────────────────────────────────────
  if (freq.type === "BIWEEKLY") {
    const anchor = nextWorkday(base, countryCode, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      const candidate = addWeeks(anchor, i * 2);
      const adjusted  = nextWorkday(candidate, countryCode, extraHolidays);
      results.push({ occurrenceIndex: i, date: adjusted, isoDate: toISODate(adjusted) });
    }
    return results;
  }

  // ── MONTHLY ───────────────────────────────────────────────────────────────
  if (freq.type === "MONTHLY") {
    const dayOfMonth = base.getDate();
    const anchor     = nextWorkday(base, countryCode, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      if (i === 0) {
        results.push({ occurrenceIndex: 0, date: anchor, isoDate: toISODate(anchor) });
      } else {
        const monthTarget = setDate(addMonths(anchor, i), dayOfMonth);
        const adjusted    = nextWorkday(monthTarget, countryCode, extraHolidays);
        results.push({ occurrenceIndex: i, date: adjusted, isoDate: toISODate(adjusted) });
      }
    }
    return results;
  }

  return results;
}
