const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://oefcnmjugmhsctygmogl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('STARTING CHECK...');
  const { data: jobTitles, error: e1 } = await supabase.from('dim_job_title').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('--- DIM_JOB_TITLE ---');
  if (e1) console.log('ERROR:', e1);
  else console.log('DATA:', jobTitles);

  const { data: roleTitles, error: e2 } = await supabase.from('dim_role_title').select('*').limit(1);
  console.log('--- DIM_ROLE_TITLE ---');
  if (e2) console.log('ERROR:', e2);
  else console.log('DATA:', roleTitles);
}
check();
