import crypto from "crypto";
import { getPmoDB } from "./pmo-db";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ENCRYPTION_KEY = process.env.SIMO_VAULT_SECRET || "0123456789abcdef0123456789abcdef";
const ALGORITHM = "aes-256-gcm" as const;

// ─── STRICT TYPES ─────────────────────────────────────────────────────────────

/** Metadata stored alongside Salesforce tokens */
export interface SfTokenMetadata {
  instanceUrl: string;
  idUrl: string;
  issuedAt: string;
  signature: string;
}

/** Strict shape for all provider token payloads */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string | Date;
  /** Provider-specific metadata (e.g. instanceUrl for Salesforce) */
  metadata?: SfTokenMetadata | Record<string, string>;
}

// ─── ENCRYPTION CORE ─────────────────────────────────────────────────────────

/**
 * Encrypts a plain-text token using AES-256-GCM.
 * Returns a single string: `iv:authTag:ciphertext` (all hex-encoded).
 *
 * ⚠️ SERVER-SIDE ONLY — never call from Client Components.
 */
export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32), "utf8");
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a vault-encoded token back to plain text.
 * Throws if the format or auth tag is invalid (tamper detection).
 */
export function decryptToken(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) throw new Error("[TokenVault] Invalid encrypted token format");

  const [ivHex, authTagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32), "utf8");

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── VAULT OPERATIONS ─────────────────────────────────────────────────────────

/**
 * Encrypts and persists integration tokens for a user+provider pair.
 * Uses UPSERT to handle both initial save and token refresh scenarios.
 */
export async function saveIntegrationToken(
  orgId: string,
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
      { org_id: orgId, user_id: userId, provider, provider_user_id: providerUserId },
      { onConflict: "org_id, user_id, provider" }
    );
  if (uiError) throw new Error(`[TokenVault] UserIntegration upsert failed: ${uiError.message}`);

  // UPSERT IntegrationToken (the encrypted credentials)
  const { error: dtError } = await db
    .from("pmo_integration_tokens")
    .upsert(
      {
        org_id: orgId,
        user_id: userId,
        provider,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        expires_at: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
        metadata: tokens.metadata ?? null,
      },
      { onConflict: "org_id, user_id, provider" }
    );
  if (dtError) throw new Error(`[TokenVault] IntegrationToken upsert failed: ${dtError.message}`);
}

/**
 * Retrieves and decrypts tokens for a user+provider pair.
 * Returns null if the integration is not connected.
 *
 * ⚠️ SERVER-SIDE ONLY — decrypted tokens must never be sent to the client.
 */
export async function getIntegrationToken(
  orgId: string,
  userId: string,
  provider: string
): Promise<TokenData | null> {
  const db = getPmoDB();

  const { data, error } = await db
    .from("pmo_integration_tokens")
    .select("*")
    .eq("org_id", orgId)
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
  orgId: string,
  userId: string
): Promise<TokenData> {
  const current = await getIntegrationToken(orgId, userId, "salesforce");

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
  await saveIntegrationToken(orgId, userId, "salesforce", providerUserId, refreshed);

  return refreshed;
}
