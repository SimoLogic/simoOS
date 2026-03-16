// ⚠️ SERVER-ONLY — Do not import from Client Components
// hr-vault.ts — Encryption utilities for the HR module (Shield Protocol, Llave #3)
// NOTE: This is a helper library, NOT a Server Action file.
// It is called from Server Actions (hr-prisma-actions.ts) and API routes.
import { encryptToken, decryptToken } from "./token-vault";

// ─── Salary Encryption ────────────────────────────────────────────────────────

/**
 * Encrypts a salary amount (number → encrypted string).
 * Internally converts to COP cents (integer) for precision.
 */
export async function encryptSalary(amountCOP: number): Promise<string> {
    if (isNaN(amountCOP) || amountCOP < 0) {
        throw new Error("[HR Vault] encryptSalary: amount must be a non-negative number");
    }
    return encryptToken(String(Math.round(amountCOP)));
}

/**
 * Decrypts a salary amount back to a number (in COP).
 */
export async function decryptSalary(enc: string): Promise<number> {
    if (!enc?.trim()) return 0;
    const plain = await decryptToken(enc);
    const val = Number(plain);
    if (isNaN(val)) throw new Error("[HR Vault] decryptSalary: decrypted value is not a number");
    return val;
}

// ─── Identity Encryption ──────────────────────────────────────────────────────

/**
 * Encrypts a national ID (Cédula, SSN, Passport number, etc.)
 */
export async function encryptIdentificacion(id: string): Promise<string> {
    if (!id?.trim()) throw new Error("[HR Vault] encryptIdentificacion: ID cannot be blank");
    return encryptToken(id.trim());
}

/**
 * Decrypts a national ID.
 */
export async function decryptIdentificacion(enc: string): Promise<string> {
    if (!enc?.trim()) return "";
    return decryptToken(enc);
}

// ─── JSON-Object Encryption (for deductions) ─────────────────────────────────

/**
 * Encrypts a JSON-serialisable object (e.g. payroll deductions breakdown).
 */
export async function encryptObject<T>(obj: T): Promise<string> {
    return encryptToken(JSON.stringify(obj));
}

/**
 * Decrypts an encrypted JSON object.
 */
export async function decryptObject<T>(enc: string): Promise<T> {
    const plain = await decryptToken(enc);
    return JSON.parse(plain) as T;
}

// ─── Shield Protocol Guard ────────────────────────────────────────────────────

/**
 * assertNotLocked — Throws a typed error if isLocked === true.
 * Call this at the TOP of every update/delete Server Action for HR entities.
 *
 * @example
 *   assertNotLocked(contract.isLocked, "HrContract");
 */
export function assertNotLocked(isLocked: boolean, entityName: string): void {
    if (isLocked) {
        throw new Error(
            `[Shield Protocol] ❌ Cannot modify a locked ${entityName}. ` +
            `This record is immutable after signing/processing.`
        );
    }
}
