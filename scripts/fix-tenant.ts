import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Load ENV
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
  if (line.includes("=")) {
    const key = line.split("=")[0].trim();
    const val = line.substring(key.length + 1).trim().replace(/['"]/g, "");
    process.env[key] = val;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ORG_ID = "HOMESI-SEED-TENANT-2026";

async function main() {
  console.log("🔧 Reparando registro de Tenant para UI...");

  // Insertar en dim_tenant para que aparezca en el dropdown
  const { data, error } = await supabase.from('dim_tenant').upsert({
    tcode: ORG_ID,
    legal_name: "HOMESI Seed Testing 2026",
    dba_name: "HOMESI Seed Testing",
    reporting_currency: "USD",
    status: true,
    hq_address: { country: "US" },
    pocs: [],
    account_managers: []
  }, { onConflict: 'tcode' });

  if (error) {
    console.error("❌ Error insertando en dim_tenant:", error);
    process.exit(1);
  }

  console.log("✅ Tenant registrado exitosamente en dim_tenant.");
}

main();
