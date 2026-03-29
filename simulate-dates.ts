import { addWorkdays, expandFrequency, isWorkday, toISODate } from "./lib/workday-helper";
import { addDays, startOfDay } from "date-fns";

// Replicating subtractWorkdays from pmo-actions for the simulation
function subtractWorkdays(
  start: Date | string,
  workdays: number,
  tenantCountry: string = "US",
  userCountry: string = "CO",
  timezone: string = "UTC",
  extraHolidays: string[] = []
): Date {
  let current = startOfDay(typeof start === "string" ? new Date(start) : start);
  while (!isWorkday(current, tenantCountry, userCountry, timezone, extraHolidays)) {
    current = addDays(current, -1);
  }
  let remaining = workdays;
  while (remaining > 0) {
    current = addDays(current, -1);
    if (isWorkday(current, tenantCountry, userCountry, timezone, extraHolidays)) {
      remaining--;
    }
  }
  return current;
}

const orgConfig = {
  timezone: "America/Bogota",
  tenantCountry: "US",
  userCountry: "CO",
  extraHolidays: [],
};

// Simulation scenario based on user request:
// Today = Tuesday, March 24, 2026 
const startDate = new Date("2026-03-24T12:00:00Z");

const steps = [
  { name: "Step 1 (DAILYx3)", frequency: "DAILY" as any, repetitions: 3, scheduler_value: 0, is_blocking: false },
  { name: "Step 2 (WEEKLYx2, timeline 2 blocked)", frequency: "WEEKLY" as any, repetitions: 2, scheduler_value: 2, is_blocking: true }
];

const results: any[] = [];
let lastStepMaxDate = startOfDay(startDate);

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  let stepStartDate: Date;

  if (i === 0) {
    // 1 día de buffer
    stepStartDate = addWorkdays(startDate, 1, orgConfig.tenantCountry, orgConfig.userCountry, orgConfig.timezone, orgConfig.extraHolidays);
  } else {
    // Timeline shift tras el paso anterior
    stepStartDate = addWorkdays(lastStepMaxDate, step.scheduler_value, orgConfig.tenantCountry, orgConfig.userCountry, orgConfig.timezone, orgConfig.extraHolidays);
  }

  const occurrences = expandFrequency(
    { type: step.frequency, occurrences: step.repetitions }, 
    stepStartDate, 
    orgConfig
  );

  if (occurrences.length > 0) {
    lastStepMaxDate = occurrences[occurrences.length - 1].date;
  }

  for (const occ of occurrences) {
    results.push({
      Task: `${step.name} (${occ.occurrenceIndex + 1}/${step.repetitions})`,
      Type: "PLAYBOOK_TASK",
      DueDate: toISODate(occ.date, orgConfig.timezone),
      DayOfWeek: occ.date.toLocaleDateString('es-CO', { weekday: 'long' }),
      Status: step.is_blocking ? "blocked" : "not_started"
    });

    if (step.is_blocking) {
      const supportDate = subtractWorkdays(occ.date, 1, orgConfig.tenantCountry, orgConfig.userCountry, orgConfig.timezone, orgConfig.extraHolidays);
      results.push({
        Task: `Soporte para: ${step.name} (${occ.occurrenceIndex + 1}/${step.repetitions})`,
        Type: "SUPPORT_REQUEST",
        DueDate: toISODate(supportDate, orgConfig.timezone),
        DayOfWeek: supportDate.toLocaleDateString('es-CO', { weekday: 'long' }),
        Status: "not_started"
      });
    }
  }
}

console.log("\n==== SQL VERIFICATION MOCK (WorkdayHelper Engine) ====");
console.table(results.sort((a, b) => new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime()));
