const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let supabaseUrl = '';
let supabaseKey = '';
for (let line of lines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace('\r', '').trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
     const parts = line.split('=');
     parts.shift(); // remove the key part
     supabaseKey = parts.join('=').replace('\r', '').trim();
  }
}

const { createClient } = require('@supabase/supabase-js');
console.log('Using URL:', supabaseUrl);
console.log('Using Key Length:', supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('STARTING CHECK...');
  const { data: jobTitles, error: e1 } = await supabase.from('dim_job_title').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('\n--- DIM_JOB_TITLE QUERY ---');
  if (e1) console.log('ERROR:', e1);
  else console.log(JSON.stringify(jobTitles, null, 2));

  console.log('\n--- INFORMATION SCHEMA.COLUMNS CHECK ---');
  // Since REST API cannot directly query information_schema.columns, let's just query the table definition via RPC if possible, or just trying to select from dim_role_title
  const { data: roleTitles, error: e2, status, statusText } = await supabase.from('dim_role_title').select('*').limit(1);
  if (e2 && e2.code === 'PGRST205') {
       console.log('Table dim_role_title DOES NOT EXIST (PGRST205 relation does not exist).');
  } else if (e2) {
       console.log('ERROR querying dim_role_title:', e2);
  } else {
       console.log('Table dim_role_title EXISTS! Data sample:', roleTitles);
  }
}
check();
