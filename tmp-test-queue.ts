import { enqueuePlaybookAssignment, playbookQueue } from "./lib/pmo/queue";

async function runQueueTest() {
  console.log("🚀 Testing BullMQ enqueueing...");
  
  const payload = {
    playbookId: "test-pb-async",
    assignmentId: "test-asn-async",
    orgId: "test-org-1",
    boardId: "test-brd-1",
    employeeId: "test-emp-1",
    startDate: "2026-03-11", // Miércoles
    countryCode: "CO",
    timezone: "America/Bogota",
    groupTitle: "🚀 Test Playbook Expandido (Async)",
    taskTemplates: [
      {
        sourcePlaybookTaskId: "task-tpl-async-1",
        title: "Tarea Async 1",
        description: "Test encolado",
        frequencyType: "DAILY",
        occurrences: 2,
        offsetWorkdays: 0,
        priority: "high"
      }
    ]
  };

  const jobId = await enqueuePlaybookAssignment(payload, "idem-test-queue-1");
  console.log(`✅ Job enqueued with ID: ${jobId}`);
  
  const job = await playbookQueue.getJob(jobId);
  if (job) {
    console.log(`✅ Job data successfully retrieved from Redis: ${job.name}`);
  } else {
    console.error("❌ Failed to retrieve job from Redis");
  }
  
  process.exit(0);
}

runQueueTest().catch(console.error);
