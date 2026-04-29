import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://eezzumwlucfidzyppllj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: tenants, error } = await supabase.from('dim_tenant').select('*');
  console.log("Tenants in DB:");
  console.log(tenants);
}

main().catch(console.error);
