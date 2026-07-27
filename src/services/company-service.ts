import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Returns the current user's primary company, creating one from their
 * signup metadata (`company_name`) if they don't belong to any yet.
 * Safe to call on every dashboard load -- idempotent.
 */
export async function getOrCreateDefaultCompany(
  supabase: SupabaseClient<Database, "public">,
  userId: string,
  fallbackCompanyName: string,
) {
  const { data: existingMembership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", existingMembership.company_id)
      .single();

    if (company) {
      return company;
    }
  }

  const { data: newCompany, error } = await supabase
    .from("companies")
    .insert({
      name: fallbackCompanyName || "Il mio studio",
      owner_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Impossibile creare l'account: ${error.message}`);
  }

  return newCompany;
}
