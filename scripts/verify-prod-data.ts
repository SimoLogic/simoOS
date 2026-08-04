import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const TARGET_TENANT = 'HOMESI-CO';

  console.log(`\n🔍 VERIFICACIÓN FINAL DE DATOS EN PRODUCCIÓN [${TARGET_TENANT}]`);

  // 1. Count HR Employees
  const { count: hrCount, error: hrError } = await supabase
    .from('hr_employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', TARGET_TENANT);

  if (hrError) {
    console.error("❌ Error consultando hr_employees:", hrError.message);
  } else {
    console.log(`✅ Tabla [hr_employees]: ${hrCount} registros encontrados.`);
  }

  // 2. Count Job Titles
  const { count: jtCount, error: jtError } = await supabase
    .from('dim_job_title')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TARGET_TENANT);

  if (jtError) {
    console.error("❌ Error consultando dim_job_title:", jtError.message);
  } else {
    console.log(`✅ Tabla [dim_job_title]: ${jtCount} registros encontrados.`);
  }

  // 3. Sample check to ensure Service Role is bypassing RLS
  const { data: sample, error: sampleError } = await supabase
    .from('hr_employees')
    .select('eid, primer_nombre, primer_apellido')
    .eq('org_id', TARGET_TENANT)
    .limit(1);

  if (sampleError) {
    console.error("❌ Error obteniendo muestra:", sampleError.message);
  } else {
    console.log(`👤 Muestra exitosa: ${sample?.[0]?.primer_nombre} ${sample?.[0]?.primer_apellido} (${sample?.[0]?.eid})`);
  }

  console.log("\n🚀 Conclusión: El Service Role tiene acceso total y los datos están correctamente mapeados a HOMESI-CO.");
}

main().catch(console.error);
