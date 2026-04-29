import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eezzumwlucfidzyppllj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA"; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Probe ALL tables in public schema and their columns
async function probeSchema() {
  // Use Supabase's RPC to run a raw SQL query
  const { data, error } = await supabase.rpc('', {}).maybeSingle();
  
  // Fallback: probe each critical table by inserting a fake column and reading the error
  const tables = [
    'hr_employees', 'dim_employee', 'bp_playbooks', 'bp_playbook_steps',
    'pmo_tasks', 'pmo_boards', 'pmo_groups', 'pmo_workspaces',
    'pmo_activity_logs', 'pmo_security_events', 'pmo_events',
    'pmo_user_integrations', 'pmo_integration_tokens', 'pmo_sync_mappings',
    'pmo_ical_feed_tokens', 'simo_notifications',
    'hr_contracts', 'hr_payroll_periods', 'hr_vacation_requests', 'hr_performance_reviews',
    'dim_tenant', 'dim_job_title', 'dim_role_title', 'dim_branch',
    'organizations', 'users'
  ];

  console.log("=== PRODUCTION SCHEMA PROBE ===\n");
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST205') {
        console.log(`❌ TABLE MISSING: ${table}`);
      } else {
        console.log(`⚠️  TABLE ${table}: ${error.message}`);
      }
    } else {
      if (data && data.length > 0) {
        console.log(`✅ TABLE ${table}: EXISTS — Columns: ${Object.keys(data[0]).join(', ')}`);
      } else {
        // Empty table — try to discover columns via a dummy insert
        const { error: insertErr } = await supabase.from(table).insert({ __probe__: 1 });
        if (insertErr && insertErr.code === 'PGRST204') {
          // The column '__probe__' doesn't exist, but the table does
          console.log(`✅ TABLE ${table}: EXISTS (empty) — Cannot list columns via REST`);
        } else if (insertErr) {
          // 23502 = not-null violation — shows us the column list in the error detail
          console.log(`✅ TABLE ${table}: EXISTS (empty) — Constraint hint: ${insertErr.details || insertErr.message}`);
        } else {
          // shouldn't happen but just in case
          await supabase.from(table).delete().eq('__probe__', 1);
          console.log(`✅ TABLE ${table}: EXISTS (empty)`);
        }
      }
    }
  }
}

probeSchema();
