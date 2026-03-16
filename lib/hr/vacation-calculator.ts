/**
 * VACATION CALCULATOR — WorkdayHelper Integration (Llave #2)
 * Computes net vacation days, correctly excluding weekends AND holidays
 * from both the tenant country (US) and employee country (CO).
 */

import { countWorkdays, WorkdayOrgConfig } from "@/lib/workday-helper";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VacationInput {
    /** First day of vacation (inclusive) */
    startDate: Date;
    /** Last day of vacation (inclusive) */
    endDate: Date;
    /** WorkdayHelper org config */
    orgConfig: WorkdayOrgConfig;
}

export interface VacationResult {
    /** Total calendar days in the requested period (inclusive) */
    calendarDays: number;
    /** Net business days (excludes weekends + CO + US holidays) */
    workdayDays: number;
    /** Holidays that fell within the vacation range (non-worked) */
    holidaysSkipped: number;
    /** Valid = endDate >= startDate */
    isValid: boolean;
}

// ─── Calculator ───────────────────────────────────────────────────────────────

/**
 * calculateVacationDays
 *
 * Returns a breakdown of calendar vs. business days for a vacation request.
 * The `workdayDays` value is what gets deducted from the employee's payroll.
 *
 * Holidays in EITHER country (CO legislated holidays OR US federal holidays)
 * are excluded from workday_days per the globalized WorkdayHelper.
 *
 * @example
 *   const result = calculateVacationDays({
 *     startDate: new Date('2026-04-02'),  // Semana Santa
 *     endDate:   new Date('2026-04-05'),
 *     orgConfig: { tenantCountry: 'US', userCountry: 'CO', timezone: 'America/Bogota' },
 *   });
 *   // CO Jueves/Viernes Santo are holidays → workdayDays < calendarDays
 */
export function calculateVacationDays(input: VacationInput): VacationResult {
    const { startDate, endDate, orgConfig } = input;

    const isValid = endDate >= startDate;
    if (!isValid) {
        return {
            calendarDays: 0,
            workdayDays: 0,
            holidaysSkipped: 0,
            isValid: false,
        };
    }

    // Calendar days (inclusive)
    const msPerDay = 1000 * 60 * 60 * 24;
    const calendarDays =
        Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    // Business days (WorkdayHelper: skips weekends + CO + US holidays)
    const workdayDays = countWorkdays(
        startDate,
        endDate,
        orgConfig.tenantCountry,
        orgConfig.userCountry,
        orgConfig.timezone,
        orgConfig.extraHolidays
    );

    // Approximate weekend count
    const fullWeeks = Math.floor(calendarDays / 7);
    const remainingDays = calendarDays % 7;
    let weekends = fullWeeks * 2;
    // Count weekend days in the remainder
    for (let i = 0; i < remainingDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (calendarDays - remainingDays) + i);
        const dow = d.getDay();
        if (dow === 0 || dow === 6) weekends++;
    }

    const holidaysSkipped = Math.max(0, calendarDays - weekends - workdayDays);

    return {
        calendarDays,
        workdayDays,
        holidaysSkipped,
        isValid: true,
    };
}
