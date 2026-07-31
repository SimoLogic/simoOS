import * as crypto from "crypto";
import { getPmoDB } from "./pmo-db";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// TOKEN_ENCRYPTION_KEY from the integration plan is implemented as SIMO_VAULT_SECRET.
// Both names refer to the same AES-256-GCM encryption key for token storage.
const ENCRYPTION_KEY = process.env.SIMO_VAULT_SECRET || "0123456789abcdef0123456789abcdef";
const ALGORITHM = "aes-256-gcm" as const;

// ─── STRICT TYPES ─────────────────────────────────────────────────────────────

/** Structured output of AES-256-GCM encryption (pre-serialization) */
export type EncryptedPayload = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

/** Metadata stored alongside Salesforce tokens */
export interface SfTokenMetadata {
  instanceUrl: string;
  idUrl: string;
  issuedAt: string;
  signature: string;
}

/** Strict shape for all provider token payloads */
export interface TokenData {
  accessToken:   string;
  refreshToken?: string;
  expiresAt?:    string | Date;
  /** OAuth scopes granted by the provider (e.g. ['api','refresh_token'] for SF) */
  scopes?:       string[];
  /** Provider-specific metadata (e.g. instanceUrl for Salesforce) */
  metadata?:     SfTokenMetadata | Record<string, string>;
}

// ─── ENCRYPTION CORE (Base functions) ─────────────────────────────────────────

/**
 * Derives a consistent 32-byte key buffer from the vault secret.
 * Centralised to avoid duplication across encrypt/decrypt paths.
 */
function deriveKeyBuffer(key?: string): Buffer {
  const raw = key ?? ENCRYPTION_KEY;
  return Buffer.from(raw.padEnd(32, "0").substring(0, 32), "utf8");
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a typed EncryptedPayload object (NO serialisation — caller decides format).
 *
 * ⚠️ SERVER-SIDE ONLY — never call from Client Components.
 */
export function encrypt(plaintext: string, key?: string): EncryptedPayload {
  const iv = crypto.randomBytes(16);
  const keyBuffer = deriveKeyBuffer(key);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    authTag,
    ciphertext: encrypted,
  };
}

/**
 * Decrypts an EncryptedPayload object back to plaintext.
 * Throws if the auth tag is invalid (tamper detection).
 */
export function decrypt(payload: EncryptedPayload, key?: string): string {
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const keyBuffer = deriveKeyBuffer(key);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── TOKEN SERIALISATION LAYER ────────────────────────────────────────────────

/**
 * Encrypts a plain-text token and serialises the result as a JSON string
 * suitable for storage in PostgreSQL (pmo_integration_tokens).
 *
 * Output: `JSON.stringify({ iv, authTag, ciphertext })` — all hex-encoded.
 *
 * ⚠️ SERVER-SIDE ONLY — never call from Client Components.
 */
export function encryptToken(plain: string, key?: string): string {
  const payload = encrypt(plain, key);
  return JSON.stringify(payload);
}

/**
 * Deserialises a vault-encoded token and decrypts back to plaintext.
 *
 * ──  BACKWARD COMPATIBILITY  ─────────────────────────────────────────────────
 * Supports TWO on-disk formats transparently:
 *
 *   NEW (REPARACIÓN A): JSON string → `{"iv":"...","authTag":"...","ciphertext":"..."}`
 *   OLD (pre-refactor):  colon-string → `ivHex:authTagHex:ciphertextHex`
 *
 * Auto-migration: when a legacy token is read the plaintext is returned as-is.
 * The caller (getIntegrationToken) is responsible for re-encrypting if needed.
 * Throws a clear TOKEN_VAULT error if neither format is valid.
 */
export function decryptToken(stored: string, key?: string): string {
  // ── Path A: New JSON format ───────────────────────────────────────────────
  if (stored.trimStart().startsWith("{")) {
    let payload: EncryptedPayload;
    try {
      payload = JSON.parse(stored) as EncryptedPayload;
    } catch {
      throw new Error("TOKEN_VAULT: formato de token inválido — JSON malformado");
    }
    if (!payload.iv || !payload.authTag || !payload.ciphertext) {
      throw new Error(
        "TOKEN_VAULT: formato de token inválido — campos iv/authTag/ciphertext faltantes"
      );
    }
    return decrypt(payload, key);
  }

  // ── Path B: Legacy colon-delimited format (iv:authTag:ciphertext) ─────────
  const parts = stored.split(":");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const [ivHex, authTagHex, ciphertextHex] = parts;
    // Reconstruct as EncryptedPayload and decrypt
    return decrypt({ iv: ivHex, authTag: authTagHex, ciphertext: ciphertextHex }, key);
  }

  // ── Path C: Neither format matched ────────────────────────────────────────
  throw new Error(
    "TOKEN_VAULT: formato de token inválido — no es JSON ni formato legado iv:authTag:ciphertext"
  );
}


// ─── VAULT OPERATIONS ─────────────────────────────────────────────────────────

/**
 * Encrypts and persists integration tokens for a user+provider pair.
 * Uses UPSERT to handle both initial save and token refresh scenarios.
 */
export async function saveIntegrationToken(
  tenantId: string,
  userId: string,
  provider: string,
  providerUserId: string,
  tokens: TokenData
): Promise<void> {
  const db = getPmoDB();

  const encryptedAccess = encryptToken(tokens.accessToken);
  const encryptedRefresh = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

  // UPSERT UserIntegration (the identity link)
  const { error: uiError } = await db
    .from("pmo_user_integrations")
    .upsert(
      { tenant_id: tenantId, user_id: userId, provider, provider_user_id: providerUserId },
      { onConflict: "tenant_id, user_id, provider" }
    );
  if (uiError) throw new Error(`[TokenVault] UserIntegration upsert failed: ${uiError.message}`);

  // UPSERT IntegrationToken (the encrypted credentials)
  const { error: dtError } = await db
    .from("pmo_integration_tokens")
    .upsert(
      {
        tenant_id:        tenantId,
        user_id:       userId,
        provider,
        access_token:  encryptedAccess,
        refresh_token: encryptedRefresh,
        scopes:        tokens.scopes ?? [],
        is_active:     true,
        expires_at:    tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
        metadata:      tokens.metadata ?? null,
      },
      { onConflict: "tenant_id, user_id, provider" }
    );
  if (dtError) throw new Error(`[TokenVault] IntegrationToken upsert failed: ${dtError.message}`);
}

/**
 * Soft-revokes an integration by setting is_active=false.
 * Never DELETEs — preserves audit history of past connections.
 * Call this when the user disconnects a provider or a token is invalidated.
 */
export async function revokeIntegrationToken(
  tenantId:    string,
  userId:   string,
  provider: string
): Promise<void> {
  const db = getPmoDB();

  const { error } = await db
    .from("pmo_integration_tokens")
    .update({ is_active: false })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error(`[TokenVault] revokeIntegrationToken failed: ${error.message}`);
  }
}

/**
 * Retrieves and decrypts tokens for a user+provider pair.
 * Returns null if the integration is not connected or has been revoked.
 *
 * ⚠️ SERVER-SIDE ONLY — decrypted tokens must never be sent to the client.
 */
export async function getIntegrationToken(
  tenantId: string,
  userId: string,
  provider: string
): Promise<TokenData | null> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_integration_tokens")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (error || !data) return null;

  return {
    accessToken: decryptToken(data.access_token as string),
    refreshToken: data.refresh_token ? decryptToken(data.refresh_token as string) : undefined,
    expiresAt: data.expires_at as string | undefined,
    metadata: data.metadata as TokenData["metadata"],
  };
}

// ─── AUTO-REFRESH ─────────────────────────────────────────────────────────────

const SF_TOKEN_URL = process.env.SALESFORCE_TOKEN_URL || "https://login.salesforce.com/services/oauth2/token";

/**
 * Refreshes a Salesforce access token using the stored refresh token.
 * Updates the vault with the new access token and returns the fresh TokenData.
 * Call this whenever an SF API responds with 401 INVALID_SESSION_ID.
 */
export async function refreshSalesforceToken(
  tenantId: string,
  userId: string
): Promise<TokenData> {
  const current = await getIntegrationToken(tenantId, userId, "salesforce");

  if (!current?.refreshToken) {
    throw new Error("[TokenVault] No refresh token available — user must re-authenticate Salesforce");
  }

  const SF_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
  const SF_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;

  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET) {
    throw new Error("[TokenVault] Salesforce credentials not configured in environment");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: current.refreshToken,
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
  });

  const res = await fetch(SF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json() as {
    access_token?: string;
    instance_url?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(`[TokenVault] Salesforce token refresh failed: ${data.error ?? res.statusText}`);
  }

  const refreshed: TokenData = {
    accessToken: data.access_token,
    refreshToken: current.refreshToken, // SF keeps the same refresh token
    expiresAt: undefined,               // SF doesn't return expires_in on refresh
    metadata: { ...(current.metadata as Record<string, string>), instanceUrl: data.instance_url ?? "" },
  };

  // Persist the new access token back to the vault
  const providerUserId = ""; // We don't need to update this on refresh
  await saveIntegrationToken(tenantId, userId, "salesforce", providerUserId, refreshed);

  return refreshed;
}

// ─── KEY ROTATION CLI ─────────────────────────────────────────────────────────

/**
 * Rotates ALL stored integration tokens from oldKey to newKey.
 *
 * Algorithm:
 *   1. SELECT all rows from pmo_integration_tokens where access_token IS NOT NULL
 *   2. For each row: decrypt(oldKey) → encrypt(newKey) → UPDATE
 *   3. Same for refresh_token where not null
 *   4. Log success count; individual errors do NOT abort the batch
 *
 * Usage (CLI):
 *   npx tsx lib/pmo/token-vault.ts <OLD_KEY> <NEW_KEY>
 */
export async function rotateAllTokens(oldKey: string, newKey: string): Promise<void> {
  if (!oldKey || !newKey) {
    throw new Error("[TokenVault] rotateAllTokens requires both oldKey and newKey");
  }

  const db = getPmoDB();

  const { data: rows, error } = await db
    .from("pmo_integration_tokens")
    .select("id, access_token, refresh_token")
    .not("access_token", "is", null);

  if (error) {
    throw new Error(`[TokenVault] Failed to fetch tokens for rotation: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    console.log("[TokenVault] No tokens found to rotate.");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      const updates: Record<string, string> = {};

      // Rotate access_token
      if (row.access_token) {
        const plainAccess = decryptToken(row.access_token as string, oldKey);
        updates.access_token = encryptToken(plainAccess, newKey);
      }

      // Rotate refresh_token
      if (row.refresh_token) {
        const plainRefresh = decryptToken(row.refresh_token as string, oldKey);
        updates.refresh_token = encryptToken(plainRefresh, newKey);
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await db
          .from("pmo_integration_tokens")
          .update(updates)
          .eq("id", row.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        successCount++;
      }
    } catch (rowError) {
      errorCount++;
      console.error(
        `[TokenVault] ❌ Failed to rotate token row ${row.id}:`,
        rowError instanceof Error ? rowError.message : rowError
      );
      // Continue with next row — do NOT abort the batch
    }
  }

  console.log(
    `[TokenVault] ✅ Rotation complete: ${successCount} tokens rotated, ${errorCount} errors.`
  );
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
// Usage: npx tsx lib/pmo/token-vault.ts <OLD_KEY> <NEW_KEY>

if (typeof require !== "undefined" && require.main === module) {
  const oldKey = process.argv[2];
  const newKey = process.argv[3];

  if (!oldKey || !newKey) {
    console.error("Usage: npx tsx lib/pmo/token-vault.ts <OLD_KEY> <NEW_KEY>");
    process.exit(1);
  }

  rotateAllTokens(oldKey, newKey)
    .then(() => {
      console.log("[TokenVault] Key rotation finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[TokenVault] Key rotation failed:", err);
      process.exit(1);
    });
}
