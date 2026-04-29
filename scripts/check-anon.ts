import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://eezzumwlucfidzyppllj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA";
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
