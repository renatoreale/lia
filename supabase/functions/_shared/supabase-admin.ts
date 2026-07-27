import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Service-role Supabase client for Edge Functions. SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are reserved env vars auto-injected by the
 * Supabase platform into every Edge Function -- never set manually via
 * `supabase secrets set`. Mirrors src/lib/supabase/admin.ts.
 */
export function createAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
