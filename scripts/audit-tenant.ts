import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://eezzumwlucfidzyppllj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const TARGET_UUID = 'HOMESI';

  console.log(`\n🔍 AUDITORÍA DE DATOS DEL TENANT: ${TARGET_UUID}`);

  // 1. Check a sample Job Title to see its fields
  const { data: jobTitles, error: errJT } = await supabase.from('dim_job_title').select('*').eq('tenant_id', TARGET_UUID).limit(1);
  if (errJT) console.error("Error dim_job_title:", errJT);
  else console.log("\n📘 Muestra de Job Title:", JSON.stringify(jobTitles?.[0], null, 2));

  // 2. Check a sample Role Title
  const { data: roleTitles, error: errRT } = await supabase.from('dim_role_title').select('*').eq('tenant_id', TARGET_UUID).limit(1);
  if (errRT) console.error("Error dim_role_title:", errRT);
  else console.log("\n📗 Muestra de Role Title:", JSON.stringify(roleTitles?.[0], null, 2));

  // 3. Check a sample HR Employee
  const { data: hrEmps, error: errHR } = await supabase.from('hr_employees').select('*').eq('org_id', TARGET_UUID).limit(1);
  if (errHR) console.error("Error hr_employees:", errHR);
  else console.log("\n👤 Muestra de HR Employee:", JSON.stringify(hrEmps?.[0], null, 2));

  // 4. Check a sample Dim Employee
  const { data: dimEmps, error: errDim } = await supabase.from('dim_employee').select('*').eq('tenant_id', TARGET_UUID).limit(1);
  if (errDim) console.error("Error dim_employee:", errDim);
  else console.log("\n🧑‍💼 Muestra de Dim Employee:", JSON.stringify(dimEmps?.[0], null, 2));

  // 5. Count the active ones or check flags
  const { count: countActiveHr } = await supabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('org_id', TARGET_UUID).eq('is_active', true);
  console.log(`\n📊 Count HR Employees Activos (is_active=true): ${countActiveHr}`);

  const { count: countDeletedHr } = await supabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('org_id', TARGET_UUID).is('deleted_at', null);
  console.log(`📊 Count HR Employees no eliminados (deleted_at IS NULL): ${countDeletedHr}`);
  
  // 6. Inspect RLS impact by querying with Anon key (to emulate standard user interface behavior)
  const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { count: countAnon } = await anonSupabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('org_id', TARGET_UUID);
  console.log(`📊 Count HR Employees con ANON key (RLS Visibility Test): ${countAnon || '0 (Access Denied / RLS Blocked)'}`);
}

main().catch(console.error);
