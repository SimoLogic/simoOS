/**
 * ============================================================================
 * usePlaybookSchedule — WorkdayHelper Integration for Playbook Designer
 * ============================================================================
 * Architecture Key #2 — Llave #2 (WorkdayHelper):
 * Computes projected execution dates for each step by adding schedulerValue
 * workdays to the playbook start date, respecting weekends and national
 * holidays in BOTH the tenant's country (e.g. US) and the user's country (CO).
 *
 * Design Principle:
 * - schedulerValue = workday offset from the PREVIOUS step's projected date
 *   (except step 0, which is always the playbookStartDate itself).
 * - Dates cascade: each step's date is derived from the previous step's date.
 * - Returns a map: stepUid → { projectedDate: Date, isoDate: string }
 *
 * WorkdayHelper functions used:
 * - addWorkdays(start, n, tenantCountry, userCountry, timezone)
 * - toISODate(date, timezone)
 * ============================================================================
 */

"use client";

import { useMemo } from "react";
import { addWorkdays, toISODate } from "@/lib/workday-helper";
import type { PlaybookStep } from "./types";

export interface StepSchedule {
  projectedDate: Date;
  isoDate: string;
}

interface UsePlaybookScheduleOptions {
  steps: PlaybookStep[];
  startDate: Date;
  /** ISO-3166-1 alpha-2 country of the tenant (client company). Default: "US" */
  tenantCountry?: string;
  /** ISO-3166-1 alpha-2 country of the offshore user. Default: "CO" */
  userCountry?: string;
  /** IANA timezone. Default: "America/Bogota" */
  timezone?: string;
}

/**
 * Returns a Map<stepUid, StepSchedule> with WorkdayHelper-computed projected dates.
 * Memoized: only recomputes when steps order, schedulerValues, or startDate change.
 */
export function usePlaybookSchedule({
  steps,
  startDate,
  tenantCountry = "US",
  userCountry = "CO",
  timezone = "America/Bogota",
}: UsePlaybookScheduleOptions): Map<string, StepSchedule> {
  return useMemo(() => {
    const scheduleMap = new Map<string, StepSchedule>();
    let previousDate = startDate;

    steps.forEach((step, index) => {
      let projectedDate: Date;

      if (index === 0) {
        // Step 0: schedulerValue is always 0; projected date = startDate
        projectedDate = startDate;
      } else {
        // All other steps: add schedulerValue workdays to the PREVIOUS step's date
        projectedDate = addWorkdays(
          previousDate,
          step.schedulerValue,
          tenantCountry,
          userCountry,
          timezone
        );
      }

      scheduleMap.set(step.uid, {
        projectedDate,
        isoDate: toISODate(projectedDate, timezone),
      });

      previousDate = projectedDate;
    });

    return scheduleMap;
  }, [steps, startDate, tenantCountry, userCountry, timezone]);
}
