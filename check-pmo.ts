import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
      console.log("Missing credentials.");
      return;
  }
  const db = createClient(url, key);
  
  // Try to query pmo_groups table with a limit 1
  const { data, error } = await db.from("pmo_groups").select("id").limit(1);
  if (error) {
      console.error("Error querying pmo_groups:", error.message);
      
      // Let's try to reload the postgrest schema
      // This requires postgres execution which might not be possible via REST API without rpc, but let's see.
      console.log("Checking if we can reload schema cache...");
  } else {
      console.log("Table pmo_groups found successfully!", data);
  }
}

main().catch(console.error);
