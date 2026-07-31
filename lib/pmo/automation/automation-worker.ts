// Sprint 10: Trigger Engine Worker
// Listens to "evaluate_triggers" on "pmo-automations" queue.
// Objective: Proactive Notifications & Logic resolution
//
// LAZY INIT: Worker is NOT started at module load time.
// Call startAutomationWorker() from a background process or dedicated API route.
// This prevents ECONNREFUSED crashes during `next build` on Vercel.

import { Worker, type Job } from "bullmq";
import { getPmoDB } from "@/lib/pmo/pmo-db";

const getConnection = () => ({
  url: process.env.REDIS_URL,
  tls: process.env.REDIS_URL?.startsWith("rediss") ? { rejectUnauthorized: false } : undefined,
  lazyConnect: true,
});

let _worker: Worker | null = null;

export function startAutomationWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    "pmo-automations",
    async (job: Job) => {
      if (job.name === "evaluate_triggers") {
        const { taskId, tenantId, userId, changes } = job.data;
        const db = getPmoDB();

        // Rule: If Task became "done" → Notify Assignee
        if (changes.oldStatus !== "done" && changes.newStatus === "done") {
          const { data: task } = await db
            .from("pmo_tasks")
            .select("title, assignee_id")
            .eq("id", taskId)
            .eq("tenant_id", tenantId)
            .single();

          if (task && task.assignee_id && task.assignee_id !== userId) {
            await db.from("pmo_notifications").insert({
              tenant_id: tenantId,
              user_id: task.assignee_id,
              title: "Task Completed",
              message: `The task "${task.title}" was marked as done by another user.`,
              type: "status_changed",
              related_entity_id: taskId,
              related_entity_type: "pmo_task",
            });
          }
        }
        // Future: Rule 2 — If Task delayed X days → Auto Move Group
      }
    },
    { connection: getConnection() }
  );

  _worker.on("completed", (job) => console.log(`[PMO Automation] Job ${job.id} completed.`));
  _worker.on("failed", (job, err) => console.error(`[PMO Automation] Job ${job?.id} failed:`, err));

  return _worker;
}
