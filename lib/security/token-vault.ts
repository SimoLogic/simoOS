"use server";

import crypto from "crypto";

/**
 * TOKEN VAULT SERVICE (Prompt #34 / Addendum)
 * Secure storage for third-party integration tokens (Salesforce, Outlook, etc.)
 * Algorithm: AES-256-GCM (Authenticated Encryption)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY = process.env.TOKEN_VAULT_KEY; // 32 bytes hex

export async function encryptToken(token: string): Promise<string> {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        throw new Error("[Vault] 🔐 CRITICAL: TOKEN_VAULT_KEY must be a 32-byte hex string (64 chars)");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY, "hex"),
        iv
    );

    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Store as IV : AuthTag : EncryptedData (hex)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export async function decryptToken(encryptedData: string): Promise<string> {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        throw new Error("[Vault] 🔐 CRITICAL: TOKEN_VAULT_KEY must be a 32-byte hex string (64 chars)");
    }

    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(":");
    
    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error("[Vault] Incorrect encryption format");
    }

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY, "hex"),
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}
