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
