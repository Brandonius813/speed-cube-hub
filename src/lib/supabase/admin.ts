import { createClient } from "@supabase/supabase-js";

// Service-role client for server actions that need to bypass RLS
// NEVER use this in client-side code
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
