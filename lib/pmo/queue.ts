import { Queue, QueueEvents, Job } from "bullmq";
import Redis from "ioredis";

// ─────────────────────────────────────────────────────────────────────────────
// Redis Connection (shared across all queues)
// ─────────────────────────────────────────────────────────────────────────────
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Queue 1: Playbook Assignments (existing)
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYBOOK_QUEUE_NAME = "pmo-playbook-assignments";

export const playbookQueue = new Queue(PLAYBOOK_QUEUE_NAME, {
  connection: redisConnection as never,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const playbookQueueEvents = new QueueEvents(PLAYBOOK_QUEUE_NAME, {
  connection: redisConnection as never,
});

export async function enqueuePlaybookAssignment(payload: Record<string, unknown>, idempotencyKey: string): Promise<string> {
  const job = await playbookQueue.add("process-playbook", payload, {
    jobId: idempotencyKey,
  });
  return job.id!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue 2: Salesforce Sync Jobs (NEW — SF-3)
// ─────────────────────────────────────────────────────────────────────────────
export type SfSyncJobData =
  | { type: "TASK_CREATE";   tenantId: string; userId: string; pmoTaskId: string }
  | { type: "TASK_UPDATE";   tenantId: string; userId: string; pmoTaskId: string; sfTaskId: string; changedFields: Record<string, string> }
  | { type: "TASK_COMPLETE"; tenantId: string; userId: string; pmoTaskId: string; sfTaskId: string }
  | { type: "EVENT_CREATE";  tenantId: string; userId: string; pmoEventId: string; isZoom: boolean; eventInput: {
      title: string; startDateTime: string; endDateTime: string; description?: string;
    }
  };

export const SF_SYNC_QUEUE_NAME = "sf-sync";

export const sfSyncQueue = new Queue(SF_SYNC_QUEUE_NAME, {
  connection: redisConnection as never,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function enqueueSfSync(data: SfSyncJobData, idempotencyKey?: string): Promise<string> {
  const job = await sfSyncQueue.add("sf-sync-job", data, {
    jobId: idempotencyKey,
  });
  return job.id!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue 3: ReadBack Zoom URL (NEW — SF-3)
// ─────────────────────────────────────────────────────────────────────────────
export interface ReadBackZoomJobData {
  tenantId:         string;
  userId:        string;
  sfEventId:     string;
  pmoEventId:    string;
  syncMappingId: string;
  attempt:       number; // 0 = first try (delays[0] = 1000ms), 1 = 3000ms, 2 = 8000ms
}

export const SF_READBACK_ZOOM_QUEUE_NAME = "sf-readback-zoom";

/** Manual retry delays (ms): 1s → 3s → 8s */
export const READBACK_ZOOM_DELAYS = [1000, 3000, 8000] as const;

export const sfReadBackZoomQueue = new Queue(SF_READBACK_ZOOM_QUEUE_NAME, {
  connection: redisConnection as never,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function enqueueReadBackZoomUrl(data: Omit<ReadBackZoomJobData, "attempt">): Promise<string> {
  const job = await sfReadBackZoomQueue.add("readback-zoom", { ...data, attempt: 0 }, {
    delay: READBACK_ZOOM_DELAYS[0], // initial 1s delay — SF needs time to request URL from Zoom
  });
  return job.id!;
}
