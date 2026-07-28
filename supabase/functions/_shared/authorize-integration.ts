import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Authorizes a caller of sync-gmail/sync-outlook. Two trusted paths:
 *  - the /api/cron/sync-emails route calls us with the service_role key
 *    (its JWT `role` claim is "service_role") -- always trusted;
 *  - a signed-in user calls us via the "Sincronizza ora" button
 *    (src/app/(dashboard)/integrazioni/actions.ts -> syncNow), whose JWT
 *    is forwarded by supabase.functions.invoke -- we re-check
 *    is_company_admin() for the integration's company under that user's
 *    own RLS context, so a user can't sync another company's integration
 *    by guessing its id.
 */
export async function assertCanAccessIntegration(req: Request, companyId: string): Promise<void> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Non autenticato.");

  const role = decodeJwtRole(token);
  if (role === "service_role") return;

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: isAdmin, error } = await userClient.rpc("is_company_admin", { p_company_id: companyId });
  if (error || !isAdmin) throw new Error("Non autorizzato a sincronizzare questa integrazione.");
}

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { role?: string };
    return claims.role ?? null;
  } catch {
    return null;
  }
}
