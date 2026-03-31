import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oefcnmjugmhsctygmogl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testTrigger() {
  console.log("TESTING: Attempting to insert a playbook step with a Fake Stakeholder 'NINJA_MANAGER'...");
  
  const { data, error } = await supabase
    .from('bp_playbook_steps')
    .insert([
      {
        org_id: 'TNT-SEED26',
        playbook_id: '00000000-0000-0000-0000-000000000000', 
        step_number: 99,
        activity_title: 'Test Activity',
        stakeholder: 'NINJA_MANAGER', 
        status: 'Draft'
      }
    ]);

  if (error) {
    console.log("\n[SUCCESS! DB GUARD TRIGGERED]");
    console.log("The Database natively rejected the unauthorized Role insertion.");
    console.log("Error Message:", error.message);
    console.log("Error Details:", error.details);
  } else {
    console.log("\n[CRITICAL FAILURE]");
    console.log("The Database allowed the insertion. The trigger failed or missing.");
  }
}

testTrigger();
