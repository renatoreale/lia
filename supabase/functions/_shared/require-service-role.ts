/**
 * classify-email and generate-email-draft are internal pipeline steps --
 * only ever invoked server-to-server (by sync-gmail/sync-outlook, or by
 * each other) using the service-role key, never directly by a signed-in
 * user or the anon key. This guards against an anon-key holder invoking
 * them directly to spend OpenAI credits on arbitrary email_ids.
 */
export function requireServiceRole(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Non autenticato.");

  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { role?: string };
    if (claims.role !== "service_role") throw new Error("Non autorizzato.");
  } catch {
    throw new Error("Non autorizzato.");
  }
}
