import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: tenants, error } = await supabase.from('dim_tenant').select('*');
  console.log("Tenants in DB:");
  console.log(tenants);
}

main().catch(console.error);
