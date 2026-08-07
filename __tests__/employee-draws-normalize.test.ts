/**
 * Normalización del CSV EmployeeDraws (CompensaFe).
 *
 * Es la parte más frágil del pipeline de EE.UU. y la única que se puede probar
 * sin BigQuery: los encabezados exactos del export no están fijados en ningún
 * contrato, y los montos/fechas vienen con formato de nómina de EE.UU.
 *
 * Lo que NO cubre: los tipos reales de las columnas en BigQuery. Eso solo lo
 * confirma una carga real (si están mal, el insert falla ruidosamente con
 * skipInvalidRows: false y Supabase no se toca).
 */

import { describe, it, expect } from "vitest";
import {
    normalizeKey,
    toNumber,
    toDateOnly,
    buildEmployeeDrawRows,
    type RawEmployeeDrawRow,
} from "@/lib/hr/employee-draws-normalize";

const BATCH = "batch-1";
const AT = new Date("2026-08-07T18:00:00.000Z");

describe("normalizeKey", () => {
    it("iguala las variantes de escritura del mismo encabezado", () => {
        const variants = ["Employee Number", "employee_number", "EmployeeNumber", "EMPLOYEE  NUMBER"];
        const normalized = new Set(variants.map(normalizeKey));
        expect(normalized.size).toBe(1);
        expect([...normalized][0]).toBe("employeenumber");
    });
});

describe("toNumber", () => {
    it("lee los formatos de monto de un export de nómina", () => {
        expect(toNumber("1234.56")).toBe(1234.56);
        expect(toNumber("$1,234.56")).toBe(1234.56);
        expect(toNumber(" $ 1,234.56 ")).toBe(1234.56);
        expect(toNumber("(500.00)")).toBe(-500); // paréntesis = negativo
        expect(toNumber("-500")).toBe(-500);
        expect(toNumber(42)).toBe(42);
    });

    it("distingue vacío (null) de ilegible (undefined)", () => {
        // null = no venía nada; undefined = venía algo que no se pudo leer.
        expect(toNumber("")).toBeNull();
        expect(toNumber(null)).toBeNull();
        expect(toNumber(undefined)).toBeNull();
        expect(toNumber("-")).toBeNull();
        expect(toNumber("$")).toBeUndefined();
        expect(toNumber("Y")).toBeUndefined();
        expect(toNumber("N/A")).toBeUndefined();
    });
});

describe("toDateOnly", () => {
    it("normaliza a YYYY-MM-DD sin correr el día", () => {
        // El bug clásico: usar getUTC* corre la fecha un día atrás en Bogotá.
        expect(toDateOnly("3/15/2024")).toBe("2024-03-15");
        expect(toDateOnly("03/15/2024")).toBe("2024-03-15");
        expect(toDateOnly("2024-03-15")).toBe("2024-03-15");
        expect(toDateOnly("2024-03-15T00:00:00Z")).toBe("2024-03-15");
        expect(toDateOnly("03/15/2024 00:00:00")).toBe("2024-03-15");
    });

    it("devuelve null para vacío o basura", () => {
        expect(toDateOnly("")).toBeNull();
        expect(toDateOnly(null)).toBeNull();
        expect(toDateOnly("not a date")).toBeNull();
    });
});

describe("buildEmployeeDrawRows", () => {
    it("mapea una fila con encabezados legibles del export", () => {
        const rows: RawEmployeeDrawRow[] = [
            {
                "Branch Number": "1042",
                "Employee Number": "60123",
                "Employee Name": "Doe, Jane",
                "Hire Date": "3/15/2024",
                "Job Title": "Loan Officer",
                "Region Name": "Southeast",
                "Branch Name": "Miami Central",
                Type: "Draw",
                "Guar Min": "$2,000.00",
                "Draw Date": "6/30/2026",
                Amount: "$1,500.00",
                Waived: "(250.00)",
                Recaptured: "",
                "Draw Balance": "$750.00",
                "Waived Date": "",
                "Net Pay": "$1,250.00",
                "Recaptured Date": "",
                Notes: "first draw",
            },
        ];

        const { rows: out, skippedRows, unreadableNumericFields } = buildEmployeeDrawRows(
            "TNT-001",
            BATCH,
            AT,
            rows
        );

        expect(skippedRows).toBe(0);
        expect(unreadableNumericFields).toEqual([]);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({
            upload_batch_id: BATCH,
            tenant_code: "TNT-001",
            branch_number: "1042",
            employee_number: 60123,
            employee_name: "Doe, Jane",
            hire_date: "2024-03-15",
            job_title: "Loan Officer",
            region_name: "Southeast",
            branch_name: "Miami Central",
            type: "Draw",
            guar_min: 2000,
            draw_date: "2026-06-30",
            amount: 1500,
            waived: -250,
            recaptured: null,
            draw_balance: 750,
            waived_date: null,
            net_pay: 1250,
            recaptured_date: null,
            notes: "first draw",
        });
        expect(out[0].uploaded_at).toBe(AT.toISOString());
    });

    it("funciona igual con encabezados snake_case", () => {
        const { rows: out } = buildEmployeeDrawRows("TNT-001", BATCH, AT, [
            { employee_number: "77", employee_name: "Smith, Bob", amount: "10" },
        ]);
        expect(out[0].employee_number).toBe(77);
        expect(out[0].employee_name).toBe("Smith, Bob");
        expect(out[0].amount).toBe(10);
    });

    it("descarta filas sin empleado (totales, líneas en blanco del export)", () => {
        const { rows: out, skippedRows } = buildEmployeeDrawRows("TNT-001", BATCH, AT, [
            { "Employee Number": "1", "Employee Name": "Real, Person" },
            { "Employee Number": "", "Employee Name": "", Amount: "9999" }, // fila de total
            { Notes: "grand total" },
        ]);
        expect(out).toHaveLength(1);
        expect(skippedRows).toBe(2);
    });

    it("conserva la fila cuando solo falta el número de empleado", () => {
        const { rows: out, skippedRows } = buildEmployeeDrawRows("TNT-001", BATCH, AT, [
            { "Employee Name": "Nameonly, Person" },
        ]);
        expect(skippedRows).toBe(0);
        expect(out).toHaveLength(1);
        expect(out[0].employee_number).toBeNull();
    });

    it("reporta los campos numéricos ilegibles en vez de tragárselos", () => {
        // Si el export trajera "Y"/"N" en Waived, esto lo delata en la UI.
        const { rows: out, unreadableNumericFields } = buildEmployeeDrawRows("TNT-001", BATCH, AT, [
            { "Employee Number": "5", Waived: "Y", Amount: "100" },
        ]);
        expect(unreadableNumericFields).toEqual(["waived"]);
        expect(out[0].waived).toBeNull();
        expect(out[0].amount).toBe(100);
    });
});
