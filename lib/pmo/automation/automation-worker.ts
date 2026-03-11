// Sprint 10: Trigger Engine Worker
// Listens to "evaluate_triggers" on "pmo-automations" queue.
// Objective: Proactive Notifications & Logic resolution

import { Worker, type Job } from "bullmq";
import { getPmoDB } from "@/lib/pmo/pmo-db";

const connection = {
  url: process.env.REDIS_URL,
  tls: process.env.REDIS_URL?.startsWith("rediss") ? { rejectUnauthorized: false } : undefined
};

// Start the worker immediately upon import/boot
export const automationWorker = new Worker(
  "pmo-automations",
  async (job: Job) => {
    if (job.name === "evaluate_triggers") {
      const { taskId, orgId, userId, changes } = job.data;
      const db = getPmoDB();

      // Rule Example 1: If Task became "done" -> Notify Creator/Assignee visually
      if (changes.oldStatus !== "done" && changes.newStatus === "done") {
        
        // Fetch task details securely
        const { data: task } = await db
          .from("pmo_tasks")
          .select("title, assignee_id")
          .eq("id", taskId)
          .eq("org_id", orgId)
          .single();

        if (task && task.assignee_id && task.assignee_id !== userId) {
          // It was done by someone else, notify the assignee!
          await db.from("pmo_notifications").insert({
            org_id: orgId,
            user_id: task.assignee_id,
            title: "Task Completed",
            message: `The task "${task.title}" was marked as done by another user.`,
            type: "status_changed",
            related_entity_id: taskId,
            related_entity_type: "pmo_task"
          });
        }
      }

      // Rule Example 2 (Future): If Task delayed X days -> Auto Move Group.
      // This logic will sit here in the background safely.
    }
  },
  { connection }
);

automationWorker.on("completed", (job) => console.log(`[PMO Automation] Job ${job.id} completed.`));
automationWorker.on("failed", (job, err) => console.error(`[PMO Automation] Job ${job?.id} failed:`, err));
