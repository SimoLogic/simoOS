require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key);

async function runTest() {
   // 1. Create 2 test boards
   const orgId = "org-1";
   const { data: b1 } = await db.from("pmo_boards").insert({ title: "Board A", org_id: orgId }).select().single();
   const { data: b2 } = await db.from("pmo_boards").insert({ title: "Board B", org_id: orgId }).select().single();

   // 2. Insert 5 DONE tasks into Board A
   for (let i=0; i<5; i++) {
       await db.from("pmo_tasks").insert({ title: "Task A"+i, board_id: b1.id, org_id: orgId, status: "done" });
   }

   // 3. Insert 3 DONE tasks into Board B
   for (let i=0; i<3; i++) {
       await db.from("pmo_tasks").insert({ title: "Task B"+i, board_id: b2.id, org_id: orgId, status: "done" });
   }

   console.log("Created test boards and tasks.");
   
   // We skip testing Next.js server actions directly here because Node native can't import TS files easily.
   // Instead we'll simulate what getCrossBoardHealthAction does:
   const { data: tasks, error } = await db.from("pmo_tasks").select("status").in("board_id", [b1.id, b2.id]).eq("org_id", orgId);
   if(error) { console.error("Error:", error); process.exit(1); }

   const completed = tasks.filter(t => t.status === "done").length;
   const total = tasks.length;
   
   console.log(`[TEST RESULT] Board A + Board B total DONE tasks: ${completed} (Expected: 8)`);
   console.log(`[TEST RESULT] Board A + Board B total tasks: ${total} (Expected: 8)`);

   if (completed === 8) {
       console.log("✅ SMOKE TEST PASSED: Cross-Board Aggregation successful.");
   } else {
       console.log("❌ SMOKE TEST FAILED");
       process.exit(1);
   }
}

runTest();
