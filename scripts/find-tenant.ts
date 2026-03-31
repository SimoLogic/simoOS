import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const TARGET_UUID = 'HOMESI';
  const OLD_ID = 'HOMESI-CO';
  const FAILED_UUID = '02c3314d-6bdf-474b-9fb1-d53f8b803031';
  console.log(`🚀 Migrando cascada bi-direccional hacia la red troncal Vercel Auténtica: ${TARGET_UUID}`);

  // Asegurando cimiento estructural del tenant (aunque HOMESI ya existe, por si acaso)
  await supabase.from('organizations').insert({ id: TARGET_UUID, name: 'HOMESI Colombia SAS - Vercel', country_code: 'CO', updated_at: new Date().toISOString() });
  // dim_tenant con HOMESI ya existe de acuerdo al probe inicial. Ignoramos insert.

  // Limpiando playbooks previos en el UUID destino (Deja solo los 10 del plan original)
  console.log('🧹 Depurando playbooks y tareas obsoletas en el canal destino...');
  await supabase.from('pmo_boards').delete().eq('org_id', TARGET_UUID);
  await supabase.from('bp_playbooks').delete().eq('org_id', TARGET_UUID);

  console.log('🔄 Ejecutando Traslados Relacionales (Recogiendo ambos orígenes)...');
  
  // Update in explicit user-requested hierarchical order
  const migrate = async (table: string, col: string) => {
    // Primero intentamos recuperar del UUID fallido
    await supabase.from(table).update({ [col]: TARGET_UUID }).eq(col, FAILED_UUID);
    // Luego intentamos recuperar del HOMESI-CO original
    const { error } = await supabase.from(table).update({ [col]: TARGET_UUID }).eq(col, OLD_ID);
    console.log(error ? `❌ [${table}] Error: ${error.message}` : `✅ [${table}] Transferido correctamente a ${TARGET_UUID}.`);
  };

  await migrate('dim_job_title', 'tenant_id');
  await migrate('dim_role_title', 'tenant_id');
  await migrate('dim_employee', 'tenant_id');
  await migrate('hr_employees', 'org_id');
  await migrate('hr_contracts', 'org_id');
  await migrate('bp_playbooks', 'org_id');
  await migrate('bp_playbook_steps', 'org_id');
  await migrate('pmo_workspaces', 'org_id');
  await migrate('pmo_boards', 'org_id');
  await migrate('pmo_tasks', 'org_id');

  // Prueba de Cierre (Conteo Exacto)
  const { count } = await supabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('org_id', TARGET_UUID);
  console.log(`\n======================================================`);
  console.log(`📊 PRUEBA DE CIERRE | COUNT(hr_employees) = ${count}`);
  console.log(`======================================================`);
  if (count === 100) console.log(`🚀 Misión Completada: Todo el personal está listo para visualizarse en Vercel.`);
}

main().catch(console.error);
