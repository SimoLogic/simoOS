"use server";

import { getRequiredSession } from "@/lib/pmo/auth-utils";
import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface IcalFilters {
  includeCompleted?: boolean;
  onlyPlaybook?: boolean;
  maxFutureDays?: number;
}

interface IcalTokenResult {
  id: string;
  token: string;
  isActive: boolean;
  lastAccessAt: string | null;
  filters: IcalFilters | null;
  feedUrl: string;
}

// ─── SERVER ACTIONS ──────────────────────────────────────────────────────────

/**
 * getOrCreateIcalToken — Returns the user's active iCal feed token.
 * If none exists, creates a new one. Always returns a usable token.
 */
export async function getOrCreateIcalToken(): Promise<IcalTokenResult> {
  const session = await getRequiredSession();
  const db = getPmoDB();

  // Check for existing active token
  const { data: existing } = await db
    .from("pmo_ical_feed_tokens")
    .select("*")
    .eq("user_id", session.userId)
    .eq("org_id", session.orgId)
    .eq("is_active", true)
    .single();

  if (existing) {
    return formatTokenResult(existing);
  }

  // Create new token
  const { data: newToken, error } = await db
    .from("pmo_ical_feed_tokens")
    .insert({
      user_id: session.userId,
      org_id: session.orgId,
    })
    .select("*")
    .single();

  throwIfDbError(error, "getOrCreateIcalToken");
  return formatTokenResult(newToken);
}

/**
 * regenerateIcalToken — Deactivates the current token and creates a new one.
 * The old URL will immediately stop working (404).
 */
export async function regenerateIcalToken(): Promise<IcalTokenResult> {
  const session = await getRequiredSession();
  const db = getPmoDB();

  // Deactivate current tokens
  await db
    .from("pmo_ical_feed_tokens")
    .update({ is_active: false })
    .eq("user_id", session.userId)
    .eq("org_id", session.orgId);

  // Create fresh token
  const { data: newToken, error } = await db
    .from("pmo_ical_feed_tokens")
    .insert({
      user_id: session.userId,
      org_id: session.orgId,
    })
    .select("*")
    .single();

  throwIfDbError(error, "regenerateIcalToken");
  return formatTokenResult(newToken);
}

/**
 * updateIcalFilters — Updates the feed filters (what tasks appear in the feed).
 */
export async function updateIcalFilters(filters: IcalFilters): Promise<void> {
  const session = await getRequiredSession();
  const db = getPmoDB();

  const { error } = await db
    .from("pmo_ical_feed_tokens")
    .update({ filters })
    .eq("user_id", session.userId)
    .eq("org_id", session.orgId)
    .eq("is_active", true);

  throwIfDbError(error, "updateIcalFilters");
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatTokenResult(row: any): IcalTokenResult {
  const baseUrl = process.env.ICAL_FEED_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    id: row.id,
    token: row.token,
    isActive: row.is_active,
    lastAccessAt: row.last_access_at,
    filters: row.filters,
    feedUrl: `${baseUrl}/api/ical/${row.token}/tasks.ics`,
  };
}
