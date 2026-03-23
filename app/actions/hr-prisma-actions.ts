"use server";

/**
 * HR SERVER ACTIONS — Prisma-Powered (New Sub-Modules)
 *
 * Architecture:
 *  • All queries filter by orgId (Key #1 — multi-tenant isolation)
 *  • Salaries & IDs encrypted/decrypted via lib/security/hr-vault.ts (Key #4)
 *  • isLocked enforced by assertNotLocked() before any write (Key #3)
 *  • WorkdayHelper used in payroll + vacation calculations (Key #2)
 *
 * This file coexists with the legacy hr-actions.ts (which handles dim_employee /
 * Supabase CRUD for the existing HCMaestro table). Migrate when ready.
 */

import { prisma } from "@/lib/database";
import { z } from "zod";
import {
    encryptSalary, decryptSalary,
    encryptIdentificacion, decryptIdentificacion,
    encryptObject, decryptObject,
    assertNotLocked,
} from "@/lib/security/hr-vault";
import {
    calculateMonthlyPayroll,
    PayrollInput,
} from "@/lib/hr/payroll-calculator";
import {
    calculateVacationDays,
} from "@/lib/hr/vacation-calculator";
import type { WorkdayOrgConfig } from "@/lib/workday-helper";

// ─── Return helpers ───────────────────────────────────────────────────────────

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}

function fail(error: unknown): ActionResult<never> {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[HR Action]", msg);
    return { success: false, error: msg };
}

// ─── Decrypted View Types ─────────────────────────────────────────────────────

export interface HrEmployeeProfile {
    id: string;
    orgId: string;
    eid: string;
    status: string;
    emailCorporate: string | null;
    photoUrl: string | null;
    // Decrypted identity
    identification: string;
    documentType: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    secondLastName: string;
    birthDate: string;
    gender: string;
    personalEmail: string;
    municipalityCode: string;
    address: string;
    // Deep fetch relations
    activeContract: HrContractView | null;
    recentPayrolls: HrPayrollView[];
    pendingVacations: HrVacationView[];
    latestReview: HrReviewView | null;
}

export interface HrContractView {
    id: string;
    startDate: string;
    endDate: string | null;
    contractType: string;
    salaryType: string;
    baseSalary: number;        // decrypted
    salaryCurrencyCode: string;
    area: string;
    subArea: string;
    legalEntity: string | null;
    jobTitle: string | null;
    directLeaderId: string | null;
    isLocked: boolean;
}

export interface HrPayrollView {
    id: string;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    workedDaysCount: number;
    baseAmount: number;          // decrypted
    netPay: number;              // decrypted
    isLocked: boolean;
    processedAt: Date | null;
}

export interface HrVacationView {
    id: string;
    startDate: Date;
    endDate: Date;
    calendarDays: number;
    workdayDays: number;
    status: string;
}

export interface HrReviewView {
    id: string;
    reviewPeriod: string;
    reviewDate: Date;
    scoreOverall: number;
    status: string;
    isLocked: boolean;
}

// ─── 1. DEEP FETCH — Employee Profile ─────────────────────────────────────────

/**
 * getEmployeeProfileAction
 *
 * Retrieves a complete employee dossier (all relations) in ONE Prisma query.
 * This is the Deep Fetch pattern — zero N+1, single roundtrip.
 */
export async function getEmployeeProfileAction(
    orgId: string,
    eid: string,
): Promise<ActionResult<HrEmployeeProfile>> {
    if (!orgId?.trim()) return fail("orgId is required");
    if (!eid?.trim()) return fail("eid is required");

    try {
        const emp = await prisma.hrEmployee.findFirst({
            where: { orgId, eid },
            include: {
                contracts: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                payrollPeriods: {
                    orderBy: { periodStart: "desc" },
                    take: 3,
                },
                vacationRequests: {
                    where: { status: "PENDING" },
                    orderBy: { startDate: "asc" },
                    take: 5,
                },
                performanceReviews: {
                    orderBy: { reviewDate: "desc" },
                    take: 1,
                },
            },
        });

        if (!emp) return fail(`Employee ${eid} not found in org ${orgId}`);

        // Decrypt sensitive fields
        const identificacion = await decryptIdentificacion(emp.identificacionEnc);

        const activeContract = emp.contracts[0]
            ? {
                id: emp.contracts[0].id,
                startDate: emp.contracts[0].fechaInicio,
                endDate: emp.contracts[0].fechaFin,
                contractType: emp.contracts[0].tipoContrato,
                salaryType: emp.contracts[0].tipoSalario,
                baseSalary: await decryptSalary(emp.contracts[0].salarioBaseEnc),
                salaryCurrencyCode: emp.contracts[0].salaryCurrencyCode,
                area: emp.contracts[0].area,
                subArea: emp.contracts[0].subArea,
                legalEntity: emp.contracts[0].entidadLegal,
                jobTitle: emp.contracts[0].jobTitle,
                directLeaderId: emp.contracts[0].directLeaderId,
                isLocked: emp.contracts[0].isLocked,
            }
            : null;

        const recentPayrolls = await Promise.all(
            emp.payrollPeriods.map(async (p) => ({
                id: p.id,
                periodLabel: p.periodLabel,
                periodStart: p.periodStart,
                periodEnd: p.periodEnd,
                workedDaysCount: p.workedDaysCount,
                baseAmount: await decryptSalary(p.baseAmountEnc),
                netPay: await decryptSalary(p.netPayEnc),
                isLocked: p.isLocked,
                processedAt: p.processedAt,
            })),
        );

        const pendingVacations: HrVacationView[] = emp.vacationRequests.map((v) => ({
            id: v.id,
            startDate: v.startDate,
            endDate: v.endDate,
            calendarDays: v.calendarDays,
            workdayDays: v.workdayDays,
            status: v.status,
        }));

        const latestReview = emp.performanceReviews[0]
            ? {
                id: emp.performanceReviews[0].id,
                reviewPeriod: emp.performanceReviews[0].reviewPeriod,
                reviewDate: emp.performanceReviews[0].reviewDate,
                scoreOverall: emp.performanceReviews[0].scoreOverall,
                status: emp.performanceReviews[0].status,
                isLocked: emp.performanceReviews[0].isLocked,
            }
            : null;

        return ok<HrEmployeeProfile>({
            id: emp.id,
            orgId: emp.orgId,
            eid: emp.eid,
            status: emp.status,
            emailCorporate: emp.emailCorporate,
            photoUrl: emp.photoUrl,
            identification: identificacion,
            documentType: emp.tipoDocumento,
            firstName: emp.primerNombre,
            middleName: emp.otrosNombres,
            lastName: emp.primerApellido,
            secondLastName: emp.segundoApellido,
            birthDate: emp.fechaNacimiento,
            gender: emp.genero,
            personalEmail: emp.emailPersonal,
            municipalityCode: emp.municipioDane,
            address: emp.direccionResidencia,
            activeContract,
            recentPayrolls,
            pendingVacations,
            latestReview,
        });
    } catch (e) {
        return fail(e);
    }
}

// ─── 2. PAYROLL — Create Period ───────────────────────────────────────────────

const CreatePayrollSchema = z.object({
    orgId: z.string().min(1),
    employeeId: z.string().uuid(),
    contractId: z.string().uuid(),
    periodLabel: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    vacationDaysDeducted: z.number().int().min(0).default(0),
    orgConfig: z.object({
        timezone: z.string(),
        tenantCountry: z.string().length(2),
        userCountry: z.string().length(2),
    }),
});

export type CreatePayrollInput = z.infer<typeof CreatePayrollSchema>;

export async function createPayrollPeriodAction(
    input: CreatePayrollInput,
): Promise<ActionResult<{ id: string; periodLabel: string }>> {
    const parsed = CreatePayrollSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.message);

    const {
        orgId, employeeId, contractId, periodLabel,
        periodStart, periodEnd, vacationDaysDeducted, orgConfig,
    } = parsed.data;

    try {
        // Verify contract belongs to this org and is not locked
        const contract = await prisma.hrContract.findFirst({
            where: { id: contractId, orgId },
        });
        if (!contract) return fail("Contract not found");
        assertNotLocked(contract.isLocked, "HrContract");

        // Decrypt salary for calculation
        const salarioBase = await decryptSalary(contract.salarioBaseEnc);

        // Calculate payroll using WorkdayHelper (Key #2)
        const calcInput: PayrollInput = {
            salarioBase,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            orgConfig: orgConfig as WorkdayOrgConfig,
            vacationDaysDeducted,
        };
        const result = calculateMonthlyPayroll(calcInput);

        // Encrypt all monetary values (Shield Protocol)
        const [baseAmountEnc, totalGrossEnc, deductionsEnc, netPayEnc] = await Promise.all([
            encryptSalary(result.baseAmount),
            encryptSalary(result.baseAmount),   // gross = base (no bonuses in MVP)
            encryptObject(result.deductions),
            encryptSalary(result.netPay),
        ]);

        const payroll = await prisma.hrPayroll.create({
            data: {
                orgId,
                employeeId,
                contractId,
                periodLabel,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                workedDaysCount: result.workedDaysCount,
                vacationDaysDeducted,
                baseAmountEnc,
                totalGrossEnc,
                deductionsEnc,
                netPayEnc,
                currencyCode: contract.salaryCurrencyCode,
            },
        });

        return ok({ id: payroll.id, periodLabel: payroll.periodLabel });
    } catch (e) {
        return fail(e);
    }
}

// ─── 3. PAYROLL — Lock (Process) ──────────────────────────────────────────────

export async function lockPayrollPeriodAction(
    orgId: string,
    payrollId: string,
    processedBy: string,
): Promise<ActionResult<{ id: string; isLocked: boolean }>> {
    if (!orgId?.trim() || !payrollId?.trim()) return fail("orgId and payrollId required");

    try {
        const payroll = await prisma.hrPayroll.findFirst({
            where: { id: payrollId, orgId },
        });
        if (!payroll) return fail("Payroll period not found");
        assertNotLocked(payroll.isLocked, "HrPayroll");

        const updated = await prisma.hrPayroll.update({
            where: { id: payrollId },
            data: {
                isLocked: true,
                processedAt: new Date(),
                processedBy,
            },
        });

        return ok({ id: updated.id, isLocked: updated.isLocked });
    } catch (e) {
        return fail(e);
    }
}

// ─── 4. VACATION — Create Request ─────────────────────────────────────────────

const CreateVacationSchema = z.object({
    orgId: z.string().min(1),
    employeeId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(500).optional(),
    orgConfig: z.object({
        timezone: z.string(),
        tenantCountry: z.string().length(2),
        userCountry: z.string().length(2),
    }),
});

export type CreateVacationInput = z.infer<typeof CreateVacationSchema>;

export async function createVacationRequestAction(
    input: CreateVacationInput,
): Promise<ActionResult<HrVacationView>> {
    const parsed = CreateVacationSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.message);

    const { orgId, employeeId, startDate, endDate, notes, orgConfig } = parsed.data;

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Use WorkdayHelper (Key #2) for accurate count
        const calc = calculateVacationDays({
            startDate: start,
            endDate: end,
            orgConfig: orgConfig as WorkdayOrgConfig,
        });

        if (!calc.isValid) return fail("endDate must be >= startDate");

        const vac = await prisma.hrVacationRequest.create({
            data: {
                orgId,
                employeeId,
                startDate: start,
                endDate: end,
                calendarDays: calc.calendarDays,
                workdayDays: calc.workdayDays,
                holidaysSkipped: calc.holidaysSkipped,
                status: "PENDING",
                notes: notes ?? null,
            },
        });

        return ok({
            id: vac.id,
            startDate: vac.startDate,
            endDate: vac.endDate,
            calendarDays: vac.calendarDays,
            workdayDays: vac.workdayDays,
            status: vac.status,
        });
    } catch (e) {
        return fail(e);
    }
}

// ─── 5. VACATION — Approve / Reject ──────────────────────────────────────────

export async function updateVacationStatusAction(
    orgId: string,
    vacationId: string,
    status: "APPROVED" | "REJECTED" | "CANCELLED",
    approvedById?: string,
): Promise<ActionResult<{ id: string; status: string }>> {
    if (!orgId?.trim()) return fail("orgId required");

    try {
        const vac = await prisma.hrVacationRequest.findFirst({
            where: { id: vacationId, orgId },
        });
        if (!vac) return fail("Vacation request not found");
        if (vac.status !== "PENDING") return fail(`Cannot change status from ${vac.status}`);

        const updated = await prisma.hrVacationRequest.update({
            where: { id: vacationId },
            data: {
                status,
                approvedById: approvedById ?? null,
                approvedAt: status === "APPROVED" ? new Date() : null,
            },
        });

        return ok({ id: updated.id, status: updated.status });
    } catch (e) {
        return fail(e);
    }
}

// ─── 6. PERFORMANCE — Create Review ──────────────────────────────────────────

const CreateReviewSchema = z.object({
    orgId: z.string().min(1),
    employeeId: z.string().uuid(),
    reviewerId: z.string().min(1),
    reviewPeriod: z.string().regex(/^Q[1-4]-\d{4}$/, "Format: Q1-2026"),
    reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scoreDelivery: z.number().min(0).max(5),
    scoreAttitude: z.number().min(0).max(5),
    scoreCollaboration: z.number().min(0).max(5),
    scoreInnovation: z.number().min(0).max(5),
    strengthsNotes: z.string().max(1000).optional(),
    improvementNotes: z.string().max(1000).optional(),
    nextGoals: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export async function createPerformanceReviewAction(
    input: CreateReviewInput,
): Promise<ActionResult<{ id: string; scoreOverall: number }>> {
    const parsed = CreateReviewSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.message);

    const {
        orgId, employeeId, reviewerId, reviewPeriod, reviewDate,
        scoreDelivery, scoreAttitude, scoreCollaboration, scoreInnovation,
        strengthsNotes, improvementNotes, nextGoals,
    } = parsed.data;

    try {
        // Weighted average: Delivery 35%, Attitude 20%, Collaboration 25%, Innovation 20%
        const scoreOverall =
            scoreDelivery * 0.35 +
            scoreAttitude * 0.20 +
            scoreCollaboration * 0.25 +
            scoreInnovation * 0.20;

        const review = await prisma.hrPerformanceReview.create({
            data: {
                orgId,
                employeeId,
                reviewerId,
                reviewPeriod,
                reviewDate: new Date(reviewDate),
                scoreDelivery,
                scoreAttitude,
                scoreCollaboration,
                scoreInnovation,
                scoreOverall: Math.round(scoreOverall * 100) / 100,
                strengthsNotes: strengthsNotes ?? null,
                improvementNotes: improvementNotes ?? null,
                nextGoals: nextGoals ?? null,
                status: "DRAFT",
            },
        });

        return ok({ id: review.id, scoreOverall: review.scoreOverall });
    } catch (e) {
        return fail(e);
    }
}

// ─── 7. PERFORMANCE — Submit & Acknowledge (isLocked) ────────────────────────

export async function submitPerformanceReviewAction(
    orgId: string,
    reviewId: string,
): Promise<ActionResult<{ id: string; status: string }>> {
    try {
        const review = await prisma.hrPerformanceReview.findFirst({
            where: { id: reviewId, orgId },
        });
        if (!review) return fail("Review not found");
        assertNotLocked(review.isLocked, "HrPerformanceReview");
        if (review.status !== "DRAFT") return fail("Only DRAFT reviews can be submitted");

        const updated = await prisma.hrPerformanceReview.update({
            where: { id: reviewId },
            data: { status: "SUBMITTED" },
        });

        return ok({ id: updated.id, status: updated.status });
    } catch (e) {
        return fail(e);
    }
}

export async function acknowledgePerformanceReviewAction(
    orgId: string,
    reviewId: string,
): Promise<ActionResult<{ id: string; isLocked: boolean }>> {
    try {
        const review = await prisma.hrPerformanceReview.findFirst({
            where: { id: reviewId, orgId },
        });
        if (!review) return fail("Review not found");
        assertNotLocked(review.isLocked, "HrPerformanceReview");
        if (review.status !== "SUBMITTED") return fail("Only SUBMITTED reviews can be acknowledged");

        const updated = await prisma.hrPerformanceReview.update({
            where: { id: reviewId },
            data: { status: "ACKNOWLEDGED", isLocked: true },
        });

        return ok({ id: updated.id, isLocked: updated.isLocked });
    } catch (e) {
        return fail(e);
    }
}

// ─── 8. EMPLOYEE LIST (for dashboard KPIs) ────────────────────────────────────

export async function getHrKpiStatsAction(orgId: string) {
    if (!orgId?.trim()) return fail("orgId required");

    try {
        const [total, byStatus, pendingVacations, pendingReviews] = await Promise.all([
            prisma.hrEmployee.count({ where: { orgId } }),
            prisma.hrEmployee.groupBy({
                by: ["status"],
                where: { orgId },
                _count: { id: true },
            }),
            prisma.hrVacationRequest.count({ where: { orgId, status: "PENDING" } }),
            prisma.hrPerformanceReview.count({ where: { orgId, status: "SUBMITTED" } }),
        ]);

        const statusMap = Object.fromEntries(
            byStatus.map((r) => [r.status, r._count.id]),
        );

        return ok({
            totalEmployees: total,
            active: statusMap["Active"] ?? 0,
            onLeave: statusMap["On Leave"] ?? 0,
            inactive: statusMap["Inactive"] ?? 0,
            terminated: statusMap["Terminated"] ?? 0,
            pendingVacations,
            pendingReviews,
        });
    } catch (e) {
        return fail(e);
    }
}
