import { Worker, Job } from "bullmq";
import { 
  redisConnection, 
  PLAYBOOK_QUEUE_NAME, 
  SF_SYNC_QUEUE_NAME, 
  SF_READBACK_ZOOM_QUEUE_NAME,
  SfSyncJobData,
  ReadBackZoomJobData,
  sfReadBackZoomQueue,
  READBACK_ZOOM_DELAYS
} from "./queue";
import { processPlaybookAssignment } from "./playbook-processor";
import { 
  pushTaskToSalesforce, 
  updateTaskInSalesforce, 
  completeTaskInSalesforce, 
  createEventInSalesforce,
  fetchSalesforceEvent
} from "./salesforce-sync";
import { getPmoDB } from "./pmo-db";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Playbook Assignments Worker
// ─────────────────────────────────────────────────────────────────────────────
console.log(`[BullMQ] Starting Worker for queue: ${PLAYBOOK_QUEUE_NAME}...`);

export const playbookWorker = new Worker(
  PLAYBOOK_QUEUE_NAME,
  async (job: Job) => {
    console.log(`[BullMQ] Processing Playbook Job ${job.id}`);
    const result = await processPlaybookAssignment(job.data);
    if (!result.success) throw new Error(`PlaybookProcessor failed: ${result.errors?.join(", ")}`);
    return result;
  },
  { connection: redisConnection as any, concurrency: 5 }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Salesforce Sync Worker (SF-3)
// ─────────────────────────────────────────────────────────────────────────────
console.log(`[BullMQ] Starting Worker for queue: ${SF_SYNC_QUEUE_NAME}...`);

export const sfSyncWorker = new Worker(
  SF_SYNC_QUEUE_NAME,
  async (job: Job<SfSyncJobData>) => {
    const { type, orgId, userId } = job.data;
    console.log(`[BullMQ] Processing SF Sync Job: ${type} (JobId: ${job.id})`);

    switch (type) {
      case "TASK_CREATE":
        // pmoTaskId is enough to fetch the task inside the service usually, 
        // but pushTaskToSalesforce expects the object.
        const db = getPmoDB();
        const { data: pmoTask } = await db
          .from("pmo_tasks")
          .select("id, title, status, description")
          .eq("id", job.data.pmoTaskId)
          .single();
        if (!pmoTask) throw new Error(`Task ${job.data.pmoTaskId} not found for SF Push`);
        return await pushTaskToSalesforce(orgId, userId, pmoTask as any);

      case "TASK_UPDATE":
        return await updateTaskInSalesforce(orgId, userId, job.data.pmoTaskId, job.data.sfTaskId, job.data.changedFields as any);

      case "TASK_COMPLETE":
        return await completeTaskInSalesforce(orgId, userId, job.data.pmoTaskId, job.data.sfTaskId);

      case "EVENT_CREATE":
        const result = await createEventInSalesforce(orgId, userId, {
          id: job.data.pmoEventId,
          ...job.data.eventInput
        });
        
        // SF-3: If isZoom, we must now enqueue the readback with a delay (initial 1s)
        if (job.data.isZoom && result.sfEventId && result.syncMappingId) {
          console.log(`[BullMQ] Enqueuing READBACK_ZOOM for Mapping ${result.syncMappingId}`);
          await sfReadBackZoomQueue.add("readback-zoom", {
            orgId,
            userId,
            sfEventId: result.sfEventId,
            pmoEventId: job.data.pmoEventId,
            syncMappingId: result.syncMappingId,
            attempt: 0,
          }, { 
            delay: READBACK_ZOOM_DELAYS[0] 
          });
        }
        return result;

      default:
        throw new Error(`Unknown SfSyncJob type: ${type}`);
    }
  },
  { connection: redisConnection as any, concurrency: 5 }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. ReadBack Zoom URL Worker (SF-3)
// ─────────────────────────────────────────────────────────────────────────────
console.log(`[BullMQ] Starting Worker for queue: ${SF_READBACK_ZOOM_QUEUE_NAME}...`);

/**
 * Placeholder for Socket.io server. 
 * Reemplazar con el import real del proyecto una vez identificado.
 */
const socketServerPlaceholder = {
  to: (room: string) => ({
    emit: (event: string, data: any) => console.log(`[Socket.io] Emitting ${event} to ${room}:`, data)
  })
};

export const sfReadBackZoomWorker = new Worker(
  SF_READBACK_ZOOM_QUEUE_NAME,
  async (job: Job<ReadBackZoomJobData>) => {
    const { userId, orgId, sfEventId, pmoEventId, syncMappingId, attempt } = job.data;
    console.log(`[BullMQ] Zoom Readback Attempt ${attempt} for SF Event ${sfEventId}`);

    const sfEvent = await fetchSalesforceEvent(orgId, userId, sfEventId);
    const joinUrl = sfEvent?.Location || sfEvent?.OnlineMeetingUrl || null;

    if (joinUrl) {
      const db = getPmoDB();
      // Actualizar pmo_sync_mappings con el join_url en metadata
      await db.from("pmo_sync_mappings").update({
        metadata: { joinUrl, meetingId: sfEvent.Zoom_Meeting_ID__c },
        sync_status: "OK",
        last_sync_at: new Date().toISOString()
      }).eq("id", syncMappingId);

      // Emitir Socket.io via placeholder (o import real)
      socketServerPlaceholder.to(`board:${pmoEventId}`).emit("event:zoom_url_ready", { pmoEventId, joinUrl });
      return { success: true, joinUrl };
    }

    // Reintento manual
    const nextAttempt = attempt + 1;
    if (nextAttempt < READBACK_ZOOM_DELAYS.length) {
      await sfReadBackZoomQueue.add("readback-zoom-retry", 
        { ...job.data, attempt: nextAttempt },
        { delay: READBACK_ZOOM_DELAYS[nextAttempt] }
      );
      return { success: false, status: "retrying", nextAttempt };
    }

    // Agotado: loggear error
    const db = getPmoDB();
    await db.from("pmo_sync_events").insert({
      org_id: orgId,
      event_type: "zoom_readback",
      status: "error",
      payload: { sfEventId, pmoEventId, error: "Zoom URL not found after 3 attempts" }
    });

    throw new Error(`Zoom URL not found for Event ${sfEventId} after ${READBACK_ZOOM_DELAYS.length} attempts`);
  },
  { connection: redisConnection as any }
);

// Graceful Shutdown
const workers = [playbookWorker, sfSyncWorker, sfReadBackZoomWorker];

process.on("SIGINT", async () => {
  console.log("[BullMQ] Closing workers gracefully...");
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
});
