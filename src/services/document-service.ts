import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listDocumentsForCondominium(condominiumId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, category, status, page_count, processing_error, created_at, condominium_id")
    .eq("condominium_id", condominiumId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function listAllDocuments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, category, status, page_count, processing_error, created_at, condominium_id, condominiums(name)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []).map((doc) => ({
    ...doc,
    condominium_name: (doc as unknown as { condominiums: { name: string } | null }).condominiums?.name,
  }));
}
