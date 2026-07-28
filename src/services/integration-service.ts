import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { IntegrationProvider } from "@/types/database.types";

export async function listIntegrationsForCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, provider, status, external_account_email, scopes, last_synced_at, last_error, created_at",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("provider", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getIntegrationForProvider(companyId: string, provider: IntegrationProvider) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
