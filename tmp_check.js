const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://oefcnmjugmhsctygmogl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: jobTitles, error: e1 } = await supabase.from('dim_job_title').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('--- DIM_JOB_TITLE QUERY ---');
  if (e1) console.error(e1);
  else console.log(JSON.stringify(jobTitles, null, 2));

  const { data: roleTitles, error: e2 } = await supabase.from('dim_role_title').select('*').limit(1);
  console.log('\n--- DIM_ROLE_TITLE CHECK ---');
  if (e2) console.error(e2);
  else console.log('Exists! Data found:', JSON.stringify(roleTitles, null, 2));
}
check();
