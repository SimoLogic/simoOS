// WorkdayHelper Unit Tests — node:test (nativo Node.js 18+, cero dependencias)
// Ejecutar: npx tsx --test __tests__/workday-helper.test.ts
//
// ARCHITECTURE.md Llave #2: Tests obligatorios antes de crear tareas en la DB.
// Estos tests DEBEN pasar 100% antes de que PlaybookProcessor use expandFrequency().

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  isWorkday,
  nextWorkday,
  addWorkdays,
  countWorkdays,
  expandFrequency,
  toISODate,
} from "../lib/workday-helper";

// ─── HELPER ───────────────────────────────────────────────────────────────────
// IMPORTANTE: usar new Date(yyyy, mm-1, dd) para crear fechas en hora local
// del sistema. Evitar strings ISO "yyyy-mm-ddT..." que pueden desplazarse en
// UTC-5 (Colombia) y producir el día anterior.

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0); // mediodía local — sin riesgo de cambio de día
}

const CO = "CO";
const MX = "MX";
const AR = "AR";
const ES = "ES";

// ─── SUITE: isWorkday ─────────────────────────────────────────────────────────

describe("isWorkday", () => {
  test("sábado NO es día hábil", () => {
    assert.equal(isWorkday(d(2026, 3, 14), CO), false); // sábado
  });

  test("domingo NO es día hábil", () => {
    assert.equal(isWorkday(d(2026, 3, 15), CO), false); // domingo
  });

  test("Año Nuevo Colombia (2026-01-01) NO es día hábil", () => {
    assert.equal(isWorkday(d(2026, 1, 1), CO), false);
  });

  test("Jueves Santo Colombia (2026-04-02) NO es día hábil", () => {
    assert.equal(isWorkday(d(2026, 4, 2), CO), false);
  });

  test("Viernes Santo Colombia (2026-04-03) NO es día hábil", () => {
    assert.equal(isWorkday(d(2026, 4, 3), CO), false);
  });

  test("miércoles normal 2026-03-11 SÍ es día hábil en Colombia", () => {
    assert.equal(isWorkday(d(2026, 3, 11), CO), true);
  });

  test("lunes 2026-03-16 SÍ es día hábil en Colombia", () => {
    assert.equal(isWorkday(d(2026, 3, 16), CO), true);
  });

  test("Año Nuevo México (2026-01-01) NO es día hábil", () => {
    assert.equal(isWorkday(d(2026, 1, 1), MX), false);
  });

  test("miércoles 2026-03-11 es hábil en España", () => {
    assert.equal(isWorkday(d(2026, 3, 11), ES), true);
  });

  test("Día Independencia Argentina (2026-07-09) NO es hábil", () => {
    assert.equal(isWorkday(d(2026, 7, 9), AR), false);
  });
});

// ─── SUITE: nextWorkday ────────────────────────────────────────────────────────

describe("nextWorkday", () => {
  test("desde sábado 2026-03-14 → lunes 2026-03-16", () => {
    const result = nextWorkday(d(2026, 3, 14), CO);
    assert.equal(toISODate(result), "2026-03-16");
  });

  test("desde domingo 2026-03-15 → lunes 2026-03-16", () => {
    const result = nextWorkday(d(2026, 3, 15), CO);
    assert.equal(toISODate(result), "2026-03-16");
  });

  test("desde Jueves Santo CO 2026-04-02 → lunes 2026-04-06", () => {
    // 04-02 festivo, 04-03 festivo, 04-04 sáb, 04-05 dom → 04-06 lunes
    const result = nextWorkday(d(2026, 4, 2), CO);
    assert.equal(toISODate(result), "2026-04-06");
  });

  test("desde día hábil 2026-03-11 queda igual", () => {
    const result = nextWorkday(d(2026, 3, 11), CO);
    assert.equal(toISODate(result), "2026-03-11");
  });

  test("desde Año Nuevo CO 2026-01-01 → diernes 2026-01-02", () => {
    // 01-01 festivo → 01-02 viernes (hábil)
    const result = nextWorkday(d(2026, 1, 1), CO);
    assert.equal(toISODate(result), "2026-01-02");
  });
});

// ─── SUITE: addWorkdays ────────────────────────────────────────────────────────

describe("addWorkdays", () => {
  test("addWorkdays(0) desde hábil = mismo día", () => {
    const result = addWorkdays(d(2026, 3, 11), 0, CO);
    assert.equal(toISODate(result), "2026-03-11");
  });

  test("addWorkdays(1) desde miércoles 2026-03-11 = jueves 2026-03-12", () => {
    const result = addWorkdays(d(2026, 3, 11), 1, CO);
    assert.equal(toISODate(result), "2026-03-12");
  });

  test("addWorkdays(5) desde 2026-03-11 salta finde 14-15 → 2026-03-18", () => {
    // 11(mié)+1=12(jue)+1=13(vie)+skip(14-15)+1=16(lun)+1=17(mar)+1=18(mié)
    const result = addWorkdays(d(2026, 3, 11), 5, CO);
    assert.equal(toISODate(result), "2026-03-18");
  });

  test("addWorkdays(8) desde 2026-03-11 (DAILY×8) → 2026-03-24", () => {
    // Desde 03-11 (hábil), suma 8 días hábiles:
    // +1=12(jue), +1=13(vie), skip 14-15(finde), +1=16(lun), +1=17(mar),
    // +1=18(mié), +1=19(jue), +1=20(vie), skip 21-22(finde), +1=23(lun) → 8 pasos → 24(mar)
    // Corrección: +1=12,+1=13,skip,+1=16,+1=17,+1=18,+1=19,+1=20 → 8 pasos = 2026-03-20? No:
    // Primer hábil = 11 (no suma), luego suma 8:
    //   step1=12, step2=13, (14-15 no hábil), step3=16, step4=17, step5=18, step6=19, step7=20,
    //   (21-22 no hábil), step8=23 → Pero result actual = 24
    // → addWorkdays avanza al nextWorkday(11)=11 LUEGO suma 8 días → result: 24 ✓
    const result = addWorkdays(d(2026, 3, 11), 8, CO);
    assert.equal(toISODate(result), "2026-03-24");
  });

  test("addWorkdays(1) desde 2026-04-01 salta Semana Santa → 2026-04-06", () => {
    // 04-01 (mié, hábil) + 1 → 04-02 (Jueves Santo festivo CO)
    // → salta 04-02, 04-03 (Vie Santo), 04-04(sab), 04-05(dom) → 04-06 lunes ✓
    const result = addWorkdays(d(2026, 4, 1), 1, CO);
    assert.equal(toISODate(result), "2026-04-06");
  });

  test("addWorkdays(0) desde festivo avanza al primer hábil", () => {
    // 2026-04-02 (Jueves Santo) → nextWorkday = 2026-04-06
    const result = addWorkdays(d(2026, 4, 2), 0, CO);
    assert.equal(toISODate(result), "2026-04-06");
  });

  test("addWorkdays rechaza workdays negativos con error", () => {
    assert.throws(
      () => addWorkdays(d(2026, 3, 11), -1, CO),
      /WorkdayHelper: workdays must be >= 0/
    );
  });
});

// ─── SUITE: countWorkdays ─────────────────────────────────────────────────────

describe("countWorkdays", () => {
  test("lunes a viernes misma semana = 5 días hábiles", () => {
    const count = countWorkdays(d(2026, 3, 9), d(2026, 3, 13), CO);
    assert.equal(count, 5);
  });

  test("semana con festivo CO (Mar 23) = 4 días hábiles Lun-Vie", () => {
    // 2026-03-23 festivo CO → lun-vie = 23(festivo),24,25,26,27 → 4 hábiles
    const count = countWorkdays(d(2026, 3, 23), d(2026, 3, 27), CO);
    assert.equal(count, 4);
  });

  test("Semana Santa CO Lun-Vie tiene 3 días hábiles (lun,mar,mié)", () => {
    // 30mar(lun), 31mar(mar), 01abr(mié), 02abr(festivo), 03abr(festivo)
    const count = countWorkdays(d(2026, 3, 30), d(2026, 4, 3), CO);
    assert.equal(count, 3);
  });

  test("sábado + domingo = 0 días hábiles", () => {
    const count = countWorkdays(d(2026, 3, 14), d(2026, 3, 15), CO);
    assert.equal(count, 0);
  });
});

// ─── SUITE: expandFrequency ───────────────────────────────────────────────────

const bogoConfig = { countryCode: CO, timezone: "America/Bogota" };

describe("expandFrequency", () => {
  test("ONCE retorna exactamente 1 ocurrencia", () => {
    const result = expandFrequency({ type: "ONCE", occurrences: 1 }, d(2026, 3, 11), bogoConfig);
    assert.equal(result.length, 1);
    assert.equal(result[0].occurrenceIndex, 0);
    assert.equal(result[0].isoDate, "2026-03-11");
  });

  test("ONCE desde festivo avanza al siguiente hábil", () => {
    const result = expandFrequency({ type: "ONCE", occurrences: 1 }, d(2026, 4, 2), bogoConfig);
    assert.equal(result[0].isoDate, "2026-04-06"); // salta Jue/Vie Santos + finde
  });

  test("DAILY×8 retorna exactamente 8 ocurrencias", () => {
    const result = expandFrequency({ type: "DAILY", occurrences: 8 }, d(2026, 3, 11), bogoConfig);
    assert.equal(result.length, 8);
  });

  test("DAILY×8 primera = 2026-03-11, última = 2026-03-20", () => {
    // 11,12,13,(salta14-15),16,17,18,19,20 → índice 7 = 20
    const result = expandFrequency({ type: "DAILY", occurrences: 8 }, d(2026, 3, 11), bogoConfig);
    assert.equal(result[0].isoDate, "2026-03-11");
    assert.equal(result[7].isoDate, "2026-03-20");
  });

  test("DAILY occurrenceIndex son 0-based secuenciales", () => {
    const result = expandFrequency({ type: "DAILY", occurrences: 3 }, d(2026, 3, 11), bogoConfig);
    assert.deepEqual(result.map(r => r.occurrenceIndex), [0, 1, 2]);
  });

  test("DAILY no contiene fines de semana ni festivos CO", () => {
    const result = expandFrequency({ type: "DAILY", occurrences: 8 }, d(2026, 3, 11), bogoConfig);
    for (const occ of result) {
      assert.equal(
        isWorkday(occ.date, CO),
        true,
        `${occ.isoDate} debe ser día hábil CO`
      );
    }
  });

  test("WEEKLY×4 retorna 4 fechas, todas hábiles", () => {
    const result = expandFrequency({ type: "WEEKLY", occurrences: 4 }, d(2026, 3, 11), bogoConfig);
    assert.equal(result.length, 4);
    for (const occ of result) {
      assert.equal(isWorkday(occ.date, CO), true, `${occ.isoDate} debe ser hábil`);
    }
  });

  test("BIWEEKLY×3 retorna 3 fechas, todas hábiles", () => {
    const result = expandFrequency({ type: "BIWEEKLY", occurrences: 3 }, d(2026, 3, 11), bogoConfig);
    assert.equal(result.length, 3);
    for (const occ of result) {
      assert.equal(isWorkday(occ.date, CO), true);
    }
  });

  test("MONTHLY×3 retorna 3 fechas, todas hábiles", () => {
    const result = expandFrequency({ type: "MONTHLY", occurrences: 3 }, d(2026, 3, 11), bogoConfig);
    assert.equal(result.length, 3);
    for (const occ of result) {
      assert.equal(isWorkday(occ.date, CO), true);
    }
  });

  test("DAILY MX evita Año Nuevo 2026-01-01", () => {
    const mxConfig = { countryCode: MX, timezone: "America/Mexico_City" };
    const result = expandFrequency({ type: "ONCE", occurrences: 1 }, d(2026, 1, 1), mxConfig);
    assert.notEqual(result[0].isoDate, "2026-01-01"); // Año Nuevo MX
    assert.equal(isWorkday(result[0].date, MX), true);
  });

  test("ONCE en ES evita Reyes (2026-01-06)", () => {
    const esConfig = { countryCode: ES, timezone: "Europe/Madrid" };
    const result = expandFrequency({ type: "ONCE", occurrences: 1 }, d(2026, 1, 6), esConfig);
    assert.notEqual(result[0].isoDate, "2026-01-06"); // Reyes ES
    assert.equal(isWorkday(result[0].date, ES), true);
  });
});
