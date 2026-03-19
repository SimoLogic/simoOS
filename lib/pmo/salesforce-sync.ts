import { getIntegrationToken, refreshSalesforceToken, TokenData } from "./token-vault";
import { getPmoDB } from "./pmo-db";

const SF_API_VERSION = "v58.0";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getSfApiUrl(instanceUrl: string, endpoint: string) {
  return `${instanceUrl}/services/data/${SF_API_VERSION}/${endpoint}`;
}

/**
 * Executes a Salesforce API call. On 401 (expired token), auto-refreshes
 * the vault and retries ONCE. Enforces the Token Vault auto-refresh contract.
 */
async function sfFetch(
  orgId: string,
  userId: string,
  token: TokenData,
  url: string,
  options: RequestInit
): Promise<Response> {
  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    // Auto-refresh on expired token (Mirror Sync Protocol resilience)
    const refreshed = await refreshSalesforceToken(orgId, userId);
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${refreshed.accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  return res;
}

// ─── PUSH ─────────────────────────────────────────────────────────────────────

/**
 * Pushes a local PMO Task to Salesforce as a Task Object.
 * Returns the Salesforce Task ID created/updated.
 */
export async function pushTaskToSalesforce(
  orgId: string,
  userId: string,
  pmoTask: { id: string; title: string; status: string; description?: string }
): Promise<{ salesforceTaskId: string }> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected or missing instanceUrl");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  const payload = {
    Subject: pmoTask.title,
    Description: pmoTask.description ?? "",
    Status: pmoTask.status === "done" ? "Completed" : "In Progress",
  };

  const res = await sfFetch(orgId, userId, token, getSfApiUrl(instanceUrl, "sobjects/Task/"), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await res.json() as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Failed to push Task to Salesforce: ${JSON.stringify(data)}`);
  return { salesforceTaskId: data.id! };
}

// ─── PULL & CONFLICT DETECTION ────────────────────────────────────────────────

interface SfTask {
  Id: string;
  Subject: string;
  Description: string | null;
  Status: string;
  LastModifiedDate: string;
}

interface SfQueryResponse {
  records: SfTask[];
  done: boolean;
  totalSize: number;
}

/**
 * Pulls Salesforce Tasks modified in the last 24h, compares them with local
 * PMO tasks (matched by `external_id`), and for each discrepancy writes a
 * `conflict_detected` sync event — triggering the Mirror Sync Modal in the UI.
 *
 * This is the core of the Llave #4 (Mirror Sync Protocol).
 */
export async function pullTasksFromSalesforce(orgId: string, userId: string): Promise<{
  synced: number;
  conflicts: number;
}> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  // SOQL: fetch Tasks modified in the last 24 hours
  const soql = encodeURIComponent(
    "SELECT Id, Subject, Description, Status, LastModifiedDate FROM Task WHERE LastModifiedDate = LAST_N_DAYS:1 LIMIT 200"
  );

  const res = await sfFetch(orgId, userId, token, getSfApiUrl(instanceUrl, `query?q=${soql}`), {
    method: "GET",
  });

  if (!res.ok) {
    const err = await res.json() as Array<{ message: string }>;
    throw new Error(`SF pull query failed: ${err[0]?.message ?? res.statusText}`);
  }

  const { records } = await res.json() as SfQueryResponse;
  const db = getPmoDB();
  let synced = 0;
  let conflicts = 0;

  for (const sfTask of records) {
    // Find a matching local PMO task by external_id
    const { data: localTask } = await db
      .from("pmo_tasks")
      .select("id, title, description, status, updated_at")
      .eq("org_id", orgId)
      .eq("external_id", sfTask.Id)
      .single();

    if (!localTask) continue;

    const sfStatus = sfTask.Status === "Completed" ? "done" : "in_progress";
    const hasConflict = localTask.status !== sfStatus;

    if (hasConflict) {
      // Write a conflict event — UI will surface the Mirror Sync Modal
      await db.from("pmo_sync_events").insert({
        org_id: orgId,
        task_id: localTask.id,
        event_type: "salesforce_pull",
        status: "conflict_detected",
        synced_fields: ["status"],
        conflicts_found: [
          {
            field: "status",
            simoValue: localTask.status,
            externalValue: sfStatus,
            externalSource: "salesforce",
            externalId: sfTask.Id,
          },
        ],
        payload: sfTask as unknown as Record<string, unknown>,
      });
      conflicts++;
    } else {
      synced++;
    }
  }

  return { synced, conflicts };
}

/**
 * Fetches a single Salesforce Task by ID.
 * Used to populate the Mirror Sync comparison modal.
 */
export async function fetchSalesforceTaskForSync(
  orgId: string,
  userId: string,
  sfTaskId: string
): Promise<SfTask> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  const res = await sfFetch(orgId, userId, token, getSfApiUrl(instanceUrl, `sobjects/Task/${sfTaskId}`), {
    method: "GET",
  });

  if (!res.ok) throw new Error(`Failed to fetch Task from Salesforce: ${res.status}`);
  return await res.json() as SfTask;
}

// ─── UPDATE & COMPLETE ────────────────────────────────────────────────────────

type SfTaskPatch = Partial<{
  subject:      string;
  status:       string;
  activityDate: string;
  priority:     string;
  description:  string;
}>;

/**
 * PATCHes a Salesforce Task. Sends only the fields that are defined.
 * NEVER includes PMO_Task_ID__c (read-only in SF).
 * Updates pmo_sync_mappings and logs a pmo_sync_events record.
 */
export async function updateTaskInSalesforce(
  orgId:         string,
  userId:        string,
  pmoTaskId:     string,
  sfTaskId:      string,
  changedFields: SfTaskPatch
): Promise<void> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected or missing instanceUrl");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  // Build patch body — only defined keys, NEVER PMO_Task_ID__c
  const sfPatch: Record<string, string> = {};
  if (changedFields.subject      !== undefined) sfPatch.Subject      = changedFields.subject;
  if (changedFields.status       !== undefined) sfPatch.Status       = changedFields.status;
  if (changedFields.activityDate !== undefined) sfPatch.ActivityDate = changedFields.activityDate;
  if (changedFields.priority     !== undefined) sfPatch.Priority     = changedFields.priority;
  if (changedFields.description  !== undefined) sfPatch.Description  = changedFields.description;

  if (Object.keys(sfPatch).length === 0) return;

  const res = await sfFetch(orgId, userId, token, getSfApiUrl(instanceUrl, `sobjects/Task/${sfTaskId}`), {
    method: "PATCH",
    body:   JSON.stringify(sfPatch),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`[SF] updateTask PATCH failed (${res.status}): ${err}`);
  }

  const db = getPmoDB();
  // Update mirror mapping
  await db.from("pmo_sync_mappings").update({
    last_sync_direction: "PMO_TO_EXT",
    last_sync_at:        new Date().toISOString(),
    sync_status:         "OK",
  })
  .eq("pmo_entity_id", pmoTaskId)
  .eq("provider",      "SALESFORCE");

  // Audit log
  await db.from("pmo_sync_events").insert({
    org_id:        orgId,
    task_id:       pmoTaskId,
    event_type:    "salesforce_push",
    status:        "completed",
    synced_fields: Object.keys(sfPatch),
    payload:       { sfTaskId, patch: sfPatch } as unknown as Record<string, unknown>,
  });
}

/**
 * Marks a Salesforce Task as Completed.
 * If the local task is linked to a Playbook, also fires an outbound
 * webhook to Simo IS (Mirror Sync Protocol closure).
 */
export async function completeTaskInSalesforce(
  orgId:     string,
  userId:    string,
  pmoTaskId: string,
  sfTaskId:  string
): Promise<void> {
  await updateTaskInSalesforce(orgId, userId, pmoTaskId, sfTaskId, { status: "Completed" });

  const db = getPmoDB();
  const { data: task } = await db
    .from("pmo_tasks")
    .select("source_playbook_id, source_playbook_task_id, occurrence_index")
    .eq("id", pmoTaskId)
    .eq("org_id", orgId)
    .single();

  const simoWebhookUrl = process.env.SIMO_IS_WEBHOOK_URL;
  if (task?.source_playbook_id && simoWebhookUrl) {
    fetch(simoWebhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event:                "TASK_COMPLETED",
        orgId,
        sourcePlaybookId:     task.source_playbook_id,
        sourcePlaybookTaskId: task.source_playbook_task_id,
        occurrenceIndex:      task.occurrence_index,
        completedAt:          new Date().toISOString(),
        completedBy:          userId,
      }),
    }).catch((err) => console.error("[SF] Simo IS webhook dispatch failed:", err));
  }
}

// ─── CREATE EVENT ─────────────────────────────────────────────────────────────

interface PmoEventInput {
  id?:           string;
  title:         string;
  startDateTime: string;
  endDateTime:   string;
  description?:  string;
  attendees?:    string[];
  isZoom?:       boolean;
}

export interface CreateSfEventResult {
  sfEventId:     string;
  syncMappingId: string;
}

/**
 * Creates a Salesforce Event and writes a pmo_sync_mappings record.
 * If isZoom=true, sets IsOnlineMeeting=true so SF requests a Zoom meeting URL.
 * Returns sfEventId + syncMappingId (needed by ReadBackZoomUrlJob in SF-3).
 */
export async function createEventInSalesforce(
  orgId:    string,
  userId:   string,
  pmoEvent: PmoEventInput
): Promise<CreateSfEventResult> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected or missing instanceUrl");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  const sfPayload: Record<string, unknown> = {
    Subject:       pmoEvent.title,
    StartDateTime: pmoEvent.startDateTime,
    EndDateTime:   pmoEvent.endDateTime,
    Description:   pmoEvent.description ?? "",
  };
  if (pmoEvent.isZoom) sfPayload.IsOnlineMeeting = true;

  const res = await sfFetch(orgId, userId, token, getSfApiUrl(instanceUrl, "sobjects/Event/"), {
    method: "POST",
    body:   JSON.stringify(sfPayload),
  });

  const data = await res.json() as { id?: string; errors?: unknown[] };
  if (!res.ok || !data.id) {
    throw new Error(`[SF] createEvent POST failed (${res.status}): ${JSON.stringify(data)}`);
  }
  const sfEventId  = data.id;
  const pmoEntityId = pmoEvent.id ?? `ephemeral-event-${Date.now()}`;

  const db = getPmoDB();
  const { data: mapping } = await db
    .from("pmo_sync_mappings")
    .upsert(
      {
        org_id:              orgId,
        pmo_entity_type:     "EVENT",
        pmo_entity_id:       pmoEntityId,
        provider:            "SALESFORCE",
        external_id:         sfEventId,
        last_sync_direction: "PMO_TO_EXT",
        last_sync_at:        new Date().toISOString(),
        sync_status:         pmoEvent.isZoom ? "PENDING" : "OK",
        metadata:            pmoEvent.isZoom ? { awaiting_zoom_url: true } : null,
      },
      { onConflict: "pmo_entity_id, provider" }
    )
    .select("id")
    .single();

  const syncMappingId = (mapping as { id?: string } | null)?.id ?? "";

  // SF-3 will implement the actual BullMQ worker; this is the call site.
  if (pmoEvent.isZoom && syncMappingId) {
    console.log(`[SF] ReadBackZoomUrlJob enqueue pending (SF-3): syncMappingId=${syncMappingId}, sfEventId=${sfEventId}`);
  }

  return { sfEventId, syncMappingId };
}

/**
 * Fetches a single Salesforce Event by ID.
 * Specifically used to read back the Zoom meeting URL (Location or OnlineMeetingUrl).
 */
export async function fetchSalesforceEvent(
  orgId: string,
  userId: string,
  sfEventId: string
): Promise<any> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected or missing instanceUrl");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  const res = await sfFetch(orgId, userId, token, getSfApiUrl(instanceUrl, `sobjects/Event/${sfEventId}`), {
    method: "GET",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[SF] fetchSalesforceEvent failed (${res.status}): ${err}`);
  }

  return await res.json();
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

export interface SfSearchResult {
  id:       string;
  name:     string;
  company?: string;
  email?:   string;
  type:     "Lead" | "Contact" | "Opportunity";
}

interface SfGenericQueryResponse<T> { records: T[]; done: boolean; totalSize: number }
interface SfLeadRec        { Id: string; Name: string; Company?: string; Email?: string }
interface SfContactRec     { Id: string; FirstName?: string; LastName: string; Account?: { Name: string }; Email?: string }
interface SfOpportunityRec { Id: string; Name: string; StageName?: string }

/**
 * Searches Leads, Contacts, and Opportunities in Salesforce.
 * Sanitises the query (escapes single quotes) before interpolating into SOQL.
 * Returns a unified array with a discriminated `type` field.
 */
export async function searchSalesforceLeads(
  orgId:  string,
  userId: string,
  query:  string
): Promise<SfSearchResult[]> {
  const token = await getIntegrationToken(orgId, userId, "salesforce");
  if (!token?.accessToken || !(token.metadata as { instanceUrl?: string })?.instanceUrl) {
    throw new Error("Salesforce integration not connected or missing instanceUrl");
  }
  const instanceUrl = (token.metadata as { instanceUrl: string }).instanceUrl;

  // SOQL injection guard
  const safe    = query.replace(/'/g, "\\'").trim().slice(0, 100);
  const pattern = `%${safe}%`;

  const subQueries = [
    { soql: `SELECT Id, Name, Company, Email FROM Lead WHERE Name LIKE '${pattern}' LIMIT 10`,    type: "Lead"        as const },
    { soql: `SELECT Id, FirstName, LastName, Account.Name, Email FROM Contact WHERE FirstName LIKE '${pattern}' OR LastName LIKE '${pattern}' LIMIT 10`, type: "Contact" as const },
    { soql: `SELECT Id, Name, StageName FROM Opportunity WHERE Name LIKE '${pattern}' LIMIT 10`,  type: "Opportunity" as const },
  ];

  const results: SfSearchResult[] = [];

  await Promise.all(subQueries.map(async ({ soql, type }) => {
    const url = getSfApiUrl(instanceUrl, `query?q=${encodeURIComponent(soql)}`);
    const res = await sfFetch(orgId, userId, token, url, { method: "GET" });
    if (!res.ok) return;

    if (type === "Lead") {
      const { records } = await res.json() as SfGenericQueryResponse<SfLeadRec>;
      records.forEach((r) => results.push({ id: r.Id, name: r.Name, company: r.Company, email: r.Email, type }));
    } else if (type === "Contact") {
      const { records } = await res.json() as SfGenericQueryResponse<SfContactRec>;
      records.forEach((r) => results.push({ id: r.Id, name: `${r.FirstName ?? ""} ${r.LastName}`.trim(), company: r.Account?.Name, email: r.Email, type }));
    } else {
      const { records } = await res.json() as SfGenericQueryResponse<SfOpportunityRec>;
      records.forEach((r) => results.push({ id: r.Id, name: r.Name, company: r.StageName, type }));
    }
  }));

  return results;
}
