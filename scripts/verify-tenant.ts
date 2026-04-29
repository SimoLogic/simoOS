import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
  if (line.includes("=") && !line.startsWith("#")) {
    const key = line.split("=")[0].trim();
    const val = line.substring(line.indexOf("=") + 1).trim().replace(/['"]/g, "");
    if (key) process.env[key] = val;
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTenants() {
  console.log("🔍 Checking dim_tenant table...");
  const { data, error } = await supabase.from('dim_tenant').select('*');
  
  if (error) {
    console.error("❌ ERROR fetching tenants:", error);
    return;
  }
  
  console.log(`✅ Found ${data.length} tenants:`);
  console.log(JSON.stringify(data, null, 2));

  const adminQuery = await supabase.from('users').select('*');
  console.log("Users:", adminQuery.data);

  // Check if there's any user mapping table by querying information_schema
  const { data: tables } = await supabase.rpc('get_tables_or_something'); // we can just do raw query or check data
}

checkTenants();
