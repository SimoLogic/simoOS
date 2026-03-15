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
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import Holidays from "date-holidays";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type FrequencyType =
  | "ONCE"        
  | "DAILY"       
  | "WEEKLY"      
  | "BIWEEKLY"    
  | "MONTHLY";    

export interface FrequencyConfig {
  type:        FrequencyType;
  occurrences: number;    
}

export interface WorkdayOrgConfig {
  timezone:       string;       
  tenantCountry:  string;       // e.g. 'US'
  userCountry:    string;       // e.g. 'CO'
  workdays?:      number[];     // [1,2,3,4,5]
  extraHolidays?: string[];     
}

export interface ExpandedOccurrence {
  occurrenceIndex: number;
  date:            Date;
  isoDate:         string;   
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

/** Formats date as 'YYYY-MM-DD' in target timezone */
export function toISODate(date: Date, timezone: string = "UTC"): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/** 
 * isPublicHoliday — Checks if a date is a holiday in EITHER country
 * USES date-holidays for dynamic lookup.
 */
function isPublicHoliday(
  date:           Date,
  tenantCountry:  string,
  userCountry:    string,
  timezone:       string      = "UTC",
  extraHolidays:  string[]    = []
): boolean {
  const iso = toISODate(date, timezone);
  
  // Rule: Check extra holidays first
  if (extraHolidays.includes(iso)) return true;

  // Rule: Check Tenant Country (e.g. US)
  const hdTenant = new Holidays(tenantCountry);
  if (hdTenant.isHoliday(date)) return true;

  // Rule: Check User Country (e.g. CO)
  const hdUser = new Holidays(userCountry);
  if (hdUser.isHoliday(date)) return true;

  return false;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * isWorkday — Verifies if a date is a business day (no weekend, no holiday in either country)
 */
export function isWorkday(
  date:           Date,
  tenantCountry:  string   = "US",
  userCountry:    string   = "CO",
  timezone:       string   = "UTC",
  extraHolidays:  string[] = []
): boolean {
  const zonedDate = toZonedTime(date, timezone);
  if (isWeekend(zonedDate)) return false;
  
  if (isPublicHoliday(date, tenantCountry, userCountry, timezone, extraHolidays)) {
    return false;
  }
  
  return true;
}

/**
 * nextWorkday — First business day from given date (inclusive)
 */
export function nextWorkday(
  date:           Date,
  tenantCountry:  string   = "US",
  userCountry:    string   = "CO",
  timezone:       string   = "UTC",
  extraHolidays:  string[] = []
): Date {
  let candidate = startOfDay(date);
  while (!isWorkday(candidate, tenantCountry, userCountry, timezone, extraHolidays)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/**
 * addWorkdays — Adds N business days to start date
 */
export function addWorkdays(
  start:          Date | string,
  workdays:       number,
  tenantCountry:  string   = "US",
  userCountry:    string   = "CO",
  timezone:       string   = "UTC",
  extraHolidays:  string[] = []
): Date {
  if (workdays < 0) throw new Error("WorkdayHelper: workdays must be >= 0");

  let current = startOfDay(
    typeof start === "string" ? new Date(start) : start
  );

  current = nextWorkday(current, tenantCountry, userCountry, timezone, extraHolidays);

  let remaining = workdays;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkday(current, tenantCountry, userCountry, timezone, extraHolidays)) {
      remaining--;
    }
  }

  return current;
}

/**
 * countWorkdays — Counts business days between two dates (both inclusive)
 */
export function countWorkdays(
  start:          Date | string,
  end:            Date | string,
  tenantCountry:  string   = "US",
  userCountry:    string   = "CO",
  timezone:       string   = "UTC",
  extraHolidays:  string[] = []
): number {
  let current = startOfDay(
    typeof start === "string" ? new Date(start) : start
  );
  const endDate = startOfDay(
    typeof end === "string" ? new Date(end) : end
  );
  let count = 0;

  while (current <= endDate) {
    if (isWorkday(current, tenantCountry, userCountry, timezone, extraHolidays)) count++;
    current = addDays(current, 1);
  }

  return count;
}

/**
 * expandFrequency — Globalized Transatlantic Engine
 */
export function expandFrequency(
  freq:       FrequencyConfig,
  startDate:  Date | string,
  orgConfig:  WorkdayOrgConfig
): ExpandedOccurrence[] {
  const { tenantCountry, userCountry, timezone = "UTC", extraHolidays = [] } = orgConfig;
  const results: ExpandedOccurrence[] = [];

  const base = startOfDay(
    typeof startDate === "string" ? new Date(startDate) : startDate
  );

  // ── ONCE ──────────────────────────────────────────────────────────────────
  if (freq.type === "ONCE") {
    const d = nextWorkday(base, tenantCountry, userCountry, timezone, extraHolidays);
    results.push({ occurrenceIndex: 0, date: d, isoDate: toISODate(d, timezone) });
    return results;
  }

  // ── DAILY ─────────────────────────────────────────────────────────────────
  if (freq.type === "DAILY") {
    let current = nextWorkday(base, tenantCountry, userCountry, timezone, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      if (i === 0) {
        results.push({ occurrenceIndex: 0, date: current, isoDate: toISODate(current, timezone) });
      } else {
        let next = addDays(current, 1);
        while (!isWorkday(next, tenantCountry, userCountry, timezone, extraHolidays)) {
          next = addDays(next, 1);
        }
        current = next;
        results.push({ occurrenceIndex: i, date: current, isoDate: toISODate(current, timezone) });
      }
    }
    return results;
  }

  // ── WEEKLY ────────────────────────────────────────────────────────────────
  if (freq.type === "WEEKLY") {
    let anchor = nextWorkday(base, tenantCountry, userCountry, timezone, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      const candidate = i === 0 ? anchor : addWeeks(anchor, i);
      const adjusted  = nextWorkday(candidate, tenantCountry, userCountry, timezone, extraHolidays);
      results.push({ occurrenceIndex: i, date: adjusted, isoDate: toISODate(adjusted, timezone) });
    }
    return results;
  }

  // ── BIWEEKLY ──────────────────────────────────────────────────────────────
  if (freq.type === "BIWEEKLY") {
    const anchor = nextWorkday(base, tenantCountry, userCountry, timezone, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      const candidate = addWeeks(anchor, i * 2);
      const adjusted  = nextWorkday(candidate, tenantCountry, userCountry, timezone, extraHolidays);
      results.push({ occurrenceIndex: i, date: adjusted, isoDate: toISODate(adjusted, timezone) });
    }
    return results;
  }

  // ── MONTHLY ───────────────────────────────────────────────────────────────
  if (freq.type === "MONTHLY") {
    const dayOfMonth = base.getDate();
    const anchor     = nextWorkday(base, tenantCountry, userCountry, timezone, extraHolidays);
    for (let i = 0; i < freq.occurrences; i++) {
      if (i === 0) {
        results.push({ occurrenceIndex: 0, date: anchor, isoDate: toISODate(anchor, timezone) });
      } else {
        const monthTarget = setDate(addMonths(anchor, i), dayOfMonth);
        const adjusted    = nextWorkday(monthTarget, tenantCountry, userCountry, timezone, extraHolidays);
        results.push({ occurrenceIndex: i, date: adjusted, isoDate: toISODate(adjusted, timezone) });
      }
    }
    return results;
  }

  return results;
}
