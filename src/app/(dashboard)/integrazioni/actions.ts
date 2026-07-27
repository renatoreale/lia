"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { EmailProvider } from "@/types/database.types";

export async function disconnectIntegration(integrationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("integrations")
    .update({
      status: "disconnected",
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      scopes: [],
    })
    .eq("id", integrationId);

  if (error) throw new Error(error.message);

  revalidatePath("/integrazioni");
}

export async function syncNow(integrationId: string, provider: EmailProvider) {
  const supabase = await createClient();

  const { error } = await supabase.functions.invoke(`sync-${provider}`, {
    body: { integration_id: integrationId },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/integrazioni");
  revalidatePath("/email");
}
