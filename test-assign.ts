import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { supabase } from "./lib/database";
import { assignPlaybookAction } from "./app/actions/pmo-actions";
import { v4 as uuidv4 } from "uuid";

async function runTest() {
  console.log("Setting up test...");
  
  const tenantId = "T-001";
  const employeeEid = "E-001";
  const supportRole = "Supervisor";

  // 4. Create dummy playbook
  const pbId = uuidv4();
  await supabase.from("bp_playbooks").insert({
    id: pbId,
    tenant_id: tenantId,
    name: "Autotest Playbook " + pbId.substring(0, 5),
    status: "PUBLISHED",
    type: "CORE",
    family: "OPERATIONAL",
    strategy: "B2B"
  });

  // 5. Create Steps
  await supabase.from("bp_playbook_steps").insert([
    {
      id: uuidv4(),
      playbook_id: pbId,
      tenant_id: tenantId,
      position: 1,
      step_num: "1",
      name: "Step 1 (Daily x3, timeline 0)",
      frequency: "DAILY",
      repetitions: 3,
      scheduler_value: 0
    },
    {
      id: uuidv4(),
      playbook_id: pbId,
      tenant_id: tenantId,
      position: 2,
      step_num: "2",
      name: "Step 2 (Weekly x2, timeline 2, with blocking support)",
      frequency: "WEEKLY",
      repetitions: 2,
      scheduler_value: 2,
      requested_to: supportRole,
      supporting_task: "Prepare report",
      is_blocking: true
    }
  ]);

  console.log("Running assignment action...");
  
  // 6. Run assignment
  try {
    const result = await assignPlaybookAction({
      playbookId: pbId,
      employeeEids: [employeeEid],
      startDate: new Date().toISOString(),
      tenantId,
      assignedByEid: "SYS-TEST-001"
    });
    console.log("Assignment Result:", result);
  } catch (err: any) {
    console.error("Assignment Failed:", err.message);
  }

  // 7. Query and output PMO Tasks
  console.log("\n==== RESULT THE USER WANTS TO SEE ====");
  const { data: tasks, error } = await supabase
    .from("pmo_tasks")
    .select("title, task_type, due_date, status, blocking_task_id")
    .eq("source_playbook_id", pbId)
    .order("due_date", { ascending: true });
    
  if (error) {
    console.error("Query Error:", error.message);
  } else {
    console.table(tasks);
  }
}

runTest();
