import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const db = createClient(url, key);

  // Directly ask the REST API for a row to see what columns come back
  const { data, error } = await db.from("pmo_boards").select("*").limit(1);
  if (error) {
    console.error("Query error:", error);
  } else {
    console.log("Returned row (or empty array):", data);
  }
}
main();
