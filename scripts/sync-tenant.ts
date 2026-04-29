import { createClient } from "@supabase/supabase-js";

// Hardcoding Production Keys as instructed by user
const supabaseUrl = "https://eezzumwlucfidzyppllj.supabase.co";
const supabaseKey = "sb_publishable_07-1wQQ4PZu30ErUFrUdvQ_0vwVp2oa"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const OLD_ID = "HOMESI-SEED-TENANT-2026";
const NEW_ID = "TNT-SEED26";

async function verifyTenant() {
  console.log(`🔍 Verificando datos para TNT-SEED26 en Producción...`);

  const checkCount = async (table: string, col: string) => {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(col, "TNT-SEED26");
      
    if (error) {
      console.error(`❌ Error en ${table}:`, error);
    } else {
      console.log(`📊 Tabla ${table}: ${count} registros.`);
    }
  };

  await checkCount('organizations', 'id');
  await checkCount('dim_tenant', 'tcode');
  await checkCount('hr_employees', 'org_id');
  await checkCount('dim_employee', 'tenant_id');
  await checkCount('bp_playbooks', 'org_id');
  await checkCount('pmo_tasks', 'org_id');
}

verifyTenant();
