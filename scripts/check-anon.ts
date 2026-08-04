import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseService = createClient(supabaseUrl, supabaseKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function main() {
  const TARGET_UUID = 'HOMESI';

  // 1. Check with ANON KEY using the exact query from the frontend
  const { data: anonData, error: anonErr } = await supabaseAnon
    .from('dim_employee')
    .select('eid')
    .eq('tenant_id', TARGET_UUID)
    .limit(5);
    
  console.log("ANON RESULT:", anonData, anonErr?.message);

  // 2. Check RLS Policies using service role
  let policies: any = null;
  let polErr: any = null;
  try {
    const response = await supabaseService.rpc('exec_sql', {
        query: `SELECT tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('dim_employee', 'dim_job_title');`
    });
    policies = response.data;
    polErr = response.error;
  } catch (err: any) {
    policies = 'RPC may not exist';
    polErr = err;
  }
  console.log("POLICIES (if rpc exists):", policies);
  
  // Try directly from pg_policies via REST if possible? Usually not accessible.
  
}

main().catch(console.error);
