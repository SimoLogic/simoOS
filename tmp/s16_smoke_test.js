const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// Manual env loading
const envText = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envText.split(/\r?\n/).forEach(l => { const m = l.match(/^([^=]+)=(.*)$/); if (m) envVars[m[1].trim()] = m[2].trim(); });

const url = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const key = envVars["SUPABASE_SERVICE_ROLE_KEY"];
const db = createClient(url, key);

async function run() {
  let pass = 0, fail = 0;
  function check(name, ok, detail) {
    const s = ok ? "PASS" : "FAIL";
    if (ok) pass++; else fail++;
    console.log(`[${s}] ${name}: ${detail}`);
  }

  // 1. task_type column
  const { error: e1 } = await db.from("pmo_tasks").select("id, task_type, is_protected, blocking_task_id, assignee_id").limit(1);
  check("task_type column exists", !e1, e1 ? e1.message : "OK");

  // 2. pmo_panels table
  const { error: e2 } = await db.from("pmo_panels").select("id").limit(1);
  check("pmo_panels table exists", !e2, e2 ? e2.message : "OK");

  // 3. Count tasks by type
  const { data: allTasks } = await db.from("pmo_tasks").select("id, task_type, status, due_date, is_protected, blocking_task_id");
  const total = allTasks?.length ?? 0;
  const pbTasks = (allTasks ?? []).filter(t => t.task_type === "PLAYBOOK_TASK");
  const spTasks = (allTasks ?? []).filter(t => t.task_type === "SUPPORT_REQUEST");
  const protTasks = (allTasks ?? []).filter(t => t.is_protected === true);
  check("Total tasks", true, `${total} tasks`);
  check("PLAYBOOK_TASK count", true, `${pbTasks.length}`);
  check("SUPPORT_REQUEST count", true, `${spTasks.length}`);
  check("Protected tasks count", true, `${protTasks.length}`);

  // 4. Weekend check
  const withDates = (allTasks ?? []).filter(t => t.due_date);
  let weekendBad = 0;
  for (const t of withDates) {
    const dow = new Date(t.due_date).getUTCDay();
    if (dow === 0 || dow === 6) weekendBad++;
  }
  check("No weekend due_dates", weekendBad === 0, weekendBad === 0 ? `${withDates.length} dates checked — all weekdays` : `${weekendBad} VIOLATIONS`);

  // 5. Blocked integrity
  const blocked = (allTasks ?? []).filter(t => t.status === "blocked");
  const badBlocked = blocked.filter(t => !t.blocking_task_id);
  check("Blocked tasks integrity", badBlocked.length === 0, blocked.length === 0 ? "No blocked tasks yet" : `${blocked.length} blocked, ${badBlocked.length} without blocker`);

  // 6. Security events table
  const { error: e6 } = await db.from("pmo_security_events").select("id").limit(1);
  check("pmo_security_events table", !e6, e6 ? `MISSING: ${e6.message}` : "OK (Shield audit trail)");

  // 7. Notifications
  const { data: notifs, error: e7 } = await db.from("simo_notifications").select("id").limit(5);
  check("simo_notifications table", !e7, e7 ? e7.message : `${notifs?.length ?? 0} found`);

  console.log("\n================================");
  console.log(`S-16 SMOKE TEST: ${pass} passed, ${fail} failed / ${pass + fail} total`);
  console.log("================================");
  if (fail > 0) process.exit(1);
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
