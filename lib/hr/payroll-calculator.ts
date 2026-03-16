/**
 * PAYROLL CALCULATOR — WorkdayHelper Integration (Llave #2)
 * Computes Colombian payroll amounts using real business-day counts.
 *
 * Rules:
 *  - Uses 30-day month convention (standard in Colombian labor law)
 *  - Health deduction: 4% employee share (EPS)
 *  - Pension deduction: 4% employee share (AFP/Colpensiones)
 *  - ARL contribution: paid 100% by employer (not deducted from employee)
 *
 * The WorkdayHelper integration ensures holidays in BOTH the tenant country
 * (e.g. US) AND the employee country (CO) are correctly excluded from
 * worked-day calculations.
 */

import { countWorkdays, WorkdayOrgConfig } from "@/lib/workday-helper";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayrollInput {
    /** Monthly base salary in COP */
    salarioBase: number;
    /** The calendar start of the payroll period */
    periodStart: Date;
    /** The calendar end of the payroll period */
    periodEnd: Date;
    /** WorkdayHelper org config (timezone, tenant + user country codes) */
    orgConfig: WorkdayOrgConfig;
    /** Pre-approved vacation days that should be deducted from worked days */
    vacationDaysDeducted?: number;
}

export interface PayrollDeductions {
    health: number;   // 4% EPS
    pension: number;  // 4% AFP / Colpensiones
}

export interface PayrollResult {
    /** Total business days in the period (per WorkdayHelper) */
    workedDaysCount: number;
    /** Pro-rated base salary for the actual workdays */
    baseAmount: number;
    /** Health & pension deductions (employee share only) */
    deductions: PayrollDeductions;
    /** Total deduction applied */
    totalDeductions: number;
    /** Net pay after deductions */
    netPay: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_CONVENTION = 30; // Colombian labor law: salaries are / 30
const HEALTH_RATE = 0.04;    // Employee share (art. 204 Ley 100/1993)
const PENSION_RATE = 0.04;   // Employee share (art. 20 Ley 100/1993)

// ─── Main Calculator ──────────────────────────────────────────────────────────

/**
 * calculateMonthlyPayroll
 *
 * Computes the net payroll for an employee for a given period using
 * WorkdayHelper to exclude weekends, Colombian holidays, and US holidays.
 *
 * @example
 *   const result = calculateMonthlyPayroll({
 *     salarioBase: 2_500_000,
 *     periodStart: new Date('2026-03-01'),
 *     periodEnd:   new Date('2026-03-31'),
 *     orgConfig: { tenantCountry: 'US', userCountry: 'CO', timezone: 'America/Bogota' },
 *   });
 *   // result.workedDaysCount = 22 (March 2026, skipping US/CO holidays)
 */
export function calculateMonthlyPayroll(input: PayrollInput): PayrollResult {
    const {
        salarioBase,
        periodStart,
        periodEnd,
        orgConfig,
        vacationDaysDeducted = 0,
    } = input;

    if (salarioBase < 0) {
        throw new Error("[PayrollCalculator] salarioBase must be ≥ 0");
    }

    const totalWorkdays = countWorkdays(
        periodStart,
        periodEnd,
        orgConfig.tenantCountry,
        orgConfig.userCountry,
        orgConfig.timezone,
        orgConfig.extraHolidays
    );

    // Clamp vacation days to not exceed total workdays
    const effectiveVacDays = Math.min(vacationDaysDeducted, totalWorkdays);
    const workedDaysCount = Math.max(0, totalWorkdays - effectiveVacDays);

    // Pro-rate salary — Colombian convention: salary / 30 * worked_days
    const dailyRate = salarioBase / MONTH_CONVENTION;
    const baseAmount = dailyRate * workedDaysCount;

    const health = baseAmount * HEALTH_RATE;
    const pension = baseAmount * PENSION_RATE;
    const totalDeductions = health + pension;
    const netPay = Math.max(0, baseAmount - totalDeductions);

    return {
        workedDaysCount,
        baseAmount: Math.round(baseAmount),
        deductions: {
            health: Math.round(health),
            pension: Math.round(pension),
        },
        totalDeductions: Math.round(totalDeductions),
        netPay: Math.round(netPay),
    };
}
