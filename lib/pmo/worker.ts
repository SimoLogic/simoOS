import { Worker, Job } from "bullmq";
import { redisConnection, PLAYBOOK_QUEUE_NAME } from "./queue";
import { processPlaybookAssignment } from "./playbook-processor";

// ─────────────────────────────────────────────────────────────────────────────
// BullMQ Worker for Playbook Assignments
// ─────────────────────────────────────────────────────────────────────────────
console.log(`[BullMQ] Starting Worker for queue: ${PLAYBOOK_QUEUE_NAME}...`);

export const playbookWorker = new Worker(
  PLAYBOOK_QUEUE_NAME,
  async (job: Job) => {
    console.log(`[BullMQ] Processing Job ${job.id} (Idempotency Key)`);
    
    // El payload ya fue validado con Zod en el API Route
    const payload = job.data;
    
    // Llamar al procesador sincrónico que ahora corre en background
    const result = await processPlaybookAssignment(payload);
    
    if (!result.success) {
      // Lanzar error para que BullMQ lo marque como fallido y reintente
      throw new Error(`PlaybookProcessor failed: ${result.errors?.join(", ")}`);
    }

    return result;
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Procesar hasta 5 asignaciones en simultáneo
  }
);

playbookWorker.on("completed", (job) => {
  console.log(`[BullMQ] Job ${job.id} has completed!`);
});

playbookWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] Job ${job?.id} has failed with error: ${err.message}`);
});

process.on("SIGINT", async () => {
  console.log("[BullMQ] Closing worker gracefully...");
  await playbookWorker.close();
  process.exit(0);
});
