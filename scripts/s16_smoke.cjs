const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const envText = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envText.split(/\r?\n/).forEach(l => { const m = l.match(/^([^=]+)=(.*)$/); if (m) envVars[m[1].trim()] = m[2].trim(); });
const db = createClient(envVars["NEXT_PUBLIC_SUPABASE_URL"], envVars["SUPABASE_SERVICE_ROLE_KEY"]);

async function run() {
  console.log("=== S-16 SMOKE TEST ===\n");

  // 1. pmo_tasks with S-16 columns
  const { data: tasks, error: e1 } = await db.from("pmo_tasks").select("id, task_type, is_protected, blocking_task_id, assignee_id, requested_by_eid, status, due_date");
  if (e1) { console.log("[FAIL] pmo_tasks query:", e1.message); } 
  else {
    console.log("[PASS] pmo_tasks accessible with S-16 columns");
    console.log("  Total tasks:", tasks.length);
    console.log("  PLAYBOOK_TASK:", tasks.filter(t=>t.task_type==="PLAYBOOK_TASK").length);
    console.log("  SUPPORT_REQUEST:", tasks.filter(t=>t.task_type==="SUPPORT_REQUEST").length);
    console.log("  Protected:", tasks.filter(t=>t.is_protected).length);
    
    // Weekend check
    const withDates = tasks.filter(t=>t.due_date);
    let bad = 0;
    for (const t of withDates) { const dow = new Date(t.due_date).getUTCDay(); if (dow===0||dow===6) bad++; }
    console.log("  Due dates checked:", withDates.length, bad===0 ? "- ALL WEEKDAYS" : "- "+bad+" WEEKEND VIOLATIONS!");
    
    // Blocked
    const blocked = tasks.filter(t=>t.status==="blocked");
    console.log("  Blocked tasks:", blocked.length, blocked.filter(t=>!t.blocking_task_id).length===0?"(integrity OK)":"(BROKEN: missing blocker!)");
  }

  // 2. pmo_panels
  const { data: panels, error: e2 } = await db.from("pmo_panels").select("id, name, owner_id");
  if (e2) console.log("[FAIL] pmo_panels:", e2.message);
  else console.log("[PASS] pmo_panels:", panels.length, "panels");

  // 3. pmo_security_events
  const { data: sec, error: e3 } = await db.from("pmo_security_events").select("id");
  if (e3) console.log("[INFO] pmo_security_events:", e3.message, "(table may need creation)");
  else console.log("[PASS] pmo_security_events:", sec.length, "events");

  // 4. simo_notifications  
  const { data: notifs, error: e4 } = await db.from("simo_notifications").select("id, type");
  if (e4) console.log("[INFO] simo_notifications:", e4.message);
  else console.log("[PASS] simo_notifications:", notifs.length, "notifications");

  console.log("\n=== DONE ===");
}
run().catch(e => console.error("Fatal:", e.message));
