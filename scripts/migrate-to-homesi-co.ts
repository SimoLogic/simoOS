import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const SOURCE_TENANT = 'HOMESI';
  const TARGET_TENANT = 'HOMESI-CO';

  console.log(`\n🚀 INICIANDO MIGRACIÓN DE DATOS DE [${SOURCE_TENANT}] -> [${TARGET_TENANT}]...`);

  // Define tables and their specific primary keys for tracking
  const tablesTenantId = [
    { name: 'dim_job_title', pk: 'id' },
    { name: 'dim_role_title', pk: 'id' },
    { name: 'dim_employee', pk: 'eid' }
  ];

  const tablesOrgId = [
    { name: 'hr_employees', pk: 'id' },
    { name: 'hr_contracts', pk: 'id' },
    { name: 'bp_playbooks', pk: 'id' },
    { name: 'bp_playbook_steps', pk: 'id' },
    { name: 'pmo_boards', pk: 'id' },
    { name: 'pmo_tasks', pk: 'id' }
  ];

  let totalUpdated = 0;

  for (const table of tablesTenantId) {
    console.log(`🔄 Migrando [${table.name}]...`);
    const { data, error } = await supabase
      .from(table.name)
      .update({ tenant_id: TARGET_TENANT })
      .eq('tenant_id', SOURCE_TENANT)
      .select(table.pk);

    if (error) {
      console.error(`❌ Error en ${table.name}:`, error.message);
    } else {
      console.log(`✅ ${data?.length || 0} registros migrados en ${table.name}.`);
      totalUpdated += data?.length || 0;
    }
  }

  for (const table of tablesOrgId) {
    console.log(`🔄 Migrando [${table.name}]...`);
    const { data, error } = await supabase
      .from(table.name)
      .update({ org_id: TARGET_TENANT })
      .eq('org_id', SOURCE_TENANT)
      .select(table.pk); 

    if (error) {
      console.error(`❌ Error en ${table.name}:`, error.message);
    } else {
      console.log(`✅ ${data?.length || 0} registros migrados en ${table.name}.`);
      totalUpdated += data?.length || 0;
    }
  }

  // Double check HR Employees count exactly
  const { count } = await supabase
    .from('hr_employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', TARGET_TENANT);

  console.log(`\n🎉 MIGRACIÓN COMPLETADA. Total de registros afectados: ${totalUpdated}`);
  console.log(`📊 VERIFICACIÓN FINAL: Empleados en hr_employees para [${TARGET_TENANT}]: ${count}`);
}

main().catch(console.error);
