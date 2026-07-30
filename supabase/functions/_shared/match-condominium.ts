import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Heuristic used by sync-* and classify-email to auto-assign an inbound
 * email to a condominio: match its participants against owners.email
 * (supabase/migrations/0003_identity_and_tenants.sql). Returns null when
 * no owner matches -- the email then stays condominium_id = null and
 * surfaces in the "Non classificate" queue for manual assignment (see
 * README.md's plan notes on RLS: email_drafts can't be created for a
 * null condominium_id).
 */
export async function matchCondominiumByEmails(
  admin: SupabaseClient,
  companyId: string,
  emailAddresses: string[],
): Promise<string | null> {
  const addresses = [...new Set(emailAddresses.map((e) => e.toLowerCase().trim()))].filter(Boolean);
  if (addresses.length === 0) return null;

  const orFilter = addresses.map((address) => `email.ilike.${address.replace(/,/g, "")}`).join(",");

  const { data } = await admin
    .from("owners")
    .select("condominium_id, condominiums!inner(company_id)")
    .or(orFilter)
    .eq("condominiums.company_id", companyId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return (data?.condominium_id as string | undefined) ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fallback for when no owner email matches: looks for a condominio's exact
 * name mentioned in the email's subject/body (word-boundary match, case
 * insensitive). Only returns a match when exactly one condominio's name is
 * found -- an ambiguous or absent match is left null for manual assignment
 * rather than guessing wrong.
 */
export async function matchCondominiumByText(
  admin: SupabaseClient,
  companyId: string,
  text: string,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const { data: condominiums } = await admin
    .from("condominiums")
    .select("id, name")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  const matches = (condominiums ?? []).filter((c) => {
    if (!c.name || c.name.trim().length < 4) return false;
    const pattern = new RegExp(`\\b${escapeRegExp(c.name.trim())}\\b`, "i");
    return pattern.test(trimmed);
  });

  return matches.length === 1 ? (matches[0].id as string) : null;
}

/**
 * Combined heuristic for the sync pipeline: owners.email match first (cheap,
 * unambiguous), falling back to a condominio-name mention in the email text
 * only when no owner matched. Applies only to newly-imported inbound email
 * (sync-gmail/sync-outlook call this exactly once, at first import of a
 * thread) -- it never re-evaluates already-classified historical email.
 */
export async function matchCondominium(
  admin: SupabaseClient,
  companyId: string,
  { participants, text }: { participants: string[]; text: string },
): Promise<string | null> {
  const byEmail = await matchCondominiumByEmails(admin, companyId, participants);
  if (byEmail) return byEmail;
  return matchCondominiumByText(admin, companyId, text);
}
