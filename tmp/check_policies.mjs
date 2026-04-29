import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('run_sql', { query: `
    SELECT polname, polrelid::regclass as table_name, pg_get_expr(polqual, polrelid) as qual
    FROM pg_policy
    WHERE polqual::text LIKE '%job_title_id%' OR polqual::text LIKE '%role_title_id%';
  `});
  
  if (error) {
     console.error("RPC failed, pulling via standard query if possible.");
     // If run_sql is not available, we can't directly query pg_policy from JS easily 
     // without an RPC. Let's just create an RPC temporarily.
     console.log("Error:", error);
  } else {
     console.log("Policies:", data);
  }
}

check();
