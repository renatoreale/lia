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
