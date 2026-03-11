import { Queue, Worker, QueueEvents, Job } from "bullmq";
import Redis from "ioredis";

// ─────────────────────────────────────────────────────────────────────────────
// Redis Connection
// ─────────────────────────────────────────────────────────────────────────────
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

// ─────────────────────────────────────────────────────────────────────────────
// Playbook Queue Definition
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYBOOK_QUEUE_NAME = "pmo-playbook-assignments";

export const playbookQueue = new Queue(PLAYBOOK_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true, // Auto-cleanup
    removeOnFail: false,    // Keep failed jobs for inspection
  },
});

export const playbookQueueEvents = new QueueEvents(PLAYBOOK_QUEUE_NAME, {
  connection: redisConnection as any,
});

// ─────────────────────────────────────────────────────────────────────────────
// Enqueue Function Helper
// ─────────────────────────────────────────────────────────────────────────────
export async function enqueuePlaybookAssignment(payload: any, idempotencyKey: string): Promise<string> {
  const job = await playbookQueue.add("process-playbook", payload, {
    jobId: idempotencyKey, // Prevents exact duplicate jobs based on idempotency key
  });
  return job.id!;
}
