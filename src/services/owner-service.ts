import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listOwnersForCondominium(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owners")
    .select("*")
    .eq("condominium_id", condominiumId)
    .is("deleted_at", null)
    .order("last_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}
