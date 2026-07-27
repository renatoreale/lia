"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { condominiumSchema, type CondominiumInput } from "@/lib/validators/condominium";
import { getOrCreateDefaultCompany } from "@/services/company-service";

export async function createCondominium(input: CondominiumInput) {
  const parsed = condominiumSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Devi effettuare l'accesso.");
  }

  const company = await getOrCreateDefaultCompany(
    supabase,
    user.id,
    (user.user_metadata?.company_name as string | undefined) ?? "Il mio studio",
  );

  const { data, error } = await supabase
    .from("condominiums")
    .insert({
      company_id: company.id,
      name: parsed.name,
      address: parsed.address || null,
      city: parsed.city || null,
      postal_code: parsed.postal_code || null,
      province: parsed.province || null,
      fiscal_code: parsed.fiscal_code || null,
      administrator_name: parsed.administrator_name || null,
      administrator_email: parsed.administrator_email || null,
      administrator_phone: parsed.administrator_phone || null,
      units_count: parsed.units_count ?? null,
      notes: parsed.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/condomini");
  revalidatePath("/dashboard");

  return data;
}

export async function updateCondominium(id: string, input: CondominiumInput) {
  const parsed = condominiumSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("condominiums")
    .update({
      name: parsed.name,
      address: parsed.address || null,
      city: parsed.city || null,
      postal_code: parsed.postal_code || null,
      province: parsed.province || null,
      fiscal_code: parsed.fiscal_code || null,
      administrator_name: parsed.administrator_name || null,
      administrator_email: parsed.administrator_email || null,
      administrator_phone: parsed.administrator_phone || null,
      units_count: parsed.units_count ?? null,
      notes: parsed.notes || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/condomini");
  revalidatePath(`/condomini/${id}`);
}
