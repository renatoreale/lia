"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateProfile(fullName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Devi effettuare l'accesso.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/impostazioni");
}

export async function updateCompanyName(companyId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ name }).eq("id", companyId);

  if (error) throw new Error(error.message);

  revalidatePath("/impostazioni");
}
