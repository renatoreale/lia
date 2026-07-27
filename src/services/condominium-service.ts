import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listCondominiums() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("condominiums")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getCondominium(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("condominiums")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCondominiumStats(id: string) {
  const supabase = await createClient();

  const [{ count: documentsCount }, { count: apartmentsCount }, { count: ownersCount }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("condominium_id", id)
        .is("deleted_at", null),
      supabase
        .from("apartments")
        .select("id", { count: "exact", head: true })
        .eq("condominium_id", id)
        .is("deleted_at", null),
      supabase
        .from("owners")
        .select("id", { count: "exact", head: true })
        .eq("condominium_id", id)
        .is("deleted_at", null),
    ]);

  return {
    documentsCount: documentsCount ?? 0,
    apartmentsCount: apartmentsCount ?? 0,
    ownersCount: ownersCount ?? 0,
  };
}
