import ical, { ICalCalendarMethod } from "ical-generator";
import { getPmoDB } from "@/lib/pmo/pmo-db";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface IcalFilters {
  includeCompleted?: boolean;
  onlyPlaybook?: boolean;
  maxFutureDays?: number;
}

// ─── MAIN SERVICE ─────────────────────────────────────────────────────────────

/**
 * generateFeed — Generates an RFC 5545 iCal feed for a user's PMO tasks.
 * Validates the feed token, updates lastAccessAt, and builds a VTODO calendar.
 *
 * @param token - The unique iCal feed token (from URL)
 * @returns string — The full iCal text (BEGIN:VCALENDAR ... END:VCALENDAR)
 * @throws Error("ICAL_TOKEN_INVALID") if token not found or inactive
 */
export async function generateFeed(token: string): Promise<string> {
  const db = getPmoDB();

  // 1. Validate token
  const { data: feedToken, error: tokenErr } = await db
    .from("pmo_ical_feed_tokens")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (tokenErr || !feedToken) {
    throw new Error("ICAL_TOKEN_INVALID");
  }

  // 2. Update lastAccessAt
  await db
    .from("pmo_ical_feed_tokens")
    .update({ last_access_at: new Date().toISOString() })
    .eq("id", feedToken.id);

  // 3. Parse filters
  const filters: IcalFilters = (feedToken.filters as IcalFilters) || {};
  const maxFutureDays = filters.maxFutureDays ?? Number(process.env.ICAL_FEED_MAX_FUTURE_DAYS || "90");

  // 4. Build task query
  let query = db
    .from("pmo_tasks")
    .select("id, title, description, status, priority, due_date, is_protected, source_playbook_id, created_at, updated_at")
    .eq("tenant_id", feedToken.tenant_id);

  // Filter by assignee (the user who owns this feed)
  query = query.eq("assignee_id", feedToken.user_id);

  // Exclude completed unless specified
  if (!filters.includeCompleted) {
    query = query.neq("status", "done");
  }

  // Only playbook tasks filter
  if (filters.onlyPlaybook) {
    query = query.not("source_playbook_id", "is", null);
  }

  // Future date limit
  const futureLimit = new Date();
  futureLimit.setDate(futureLimit.getDate() + maxFutureDays);
  query = query.or(`due_date.lte.${futureLimit.toISOString()},due_date.is.null`);

  const { data: tasks, error: tasksErr } = await query;
  if (tasksErr) {
    console.error("[iCal] Failed to fetch tasks:", tasksErr.message);
    throw new Error("ICAL_FETCH_FAILED");
  }

  // 5. Build iCal calendar
  const cal = ical({
    name: "PMO — Simo Intellisense",
    method: ICalCalendarMethod.PUBLISH,
    prodId: { company: "Simo Intellisense PMO", product: "PMO", language: "ES" },
  });

  for (const task of tasks || []) {
    const isCompleted = task.status === "done";
    const isProtected = !!task.source_playbook_id;

    // Map priority: critical=1, high=3, medium=5, low=9
    let icalPriority = 0;
    switch (task.priority) {
      case "critical": icalPriority = 1; break;
      case "high": icalPriority = 3; break;
      case "medium": icalPriority = 5; break;
      case "low": icalPriority = 9; break;
    }

    const todo = cal.createEvent({
      id: `pmo-task-${task.id}@simo.is`,
      summary: `[PMO] ${task.title}`,
      description: task.description || undefined,
      stamp: new Date(task.updated_at || task.created_at),
      created: new Date(task.created_at),
      lastModified: task.updated_at ? new Date(task.updated_at) : undefined,
      start: task.due_date ? new Date(task.due_date) : new Date(task.created_at),
      allDay: true,
    });

    // Set priority if mapped
    if (icalPriority > 0) {
      todo.priority(icalPriority);
    }

    // Custom extension for protected/playbook tasks
    if (isProtected) {
      todo.x([{ key: "X-SIMO-IS-PLAYBOOK", value: "TRUE" }]);
    }
  }

  return cal.toString();
}
