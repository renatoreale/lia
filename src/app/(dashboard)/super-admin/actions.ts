"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin, setUserBanned } from "@/services/super-admin-service";

export async function toggleUserBanned(userId: string, banned: boolean) {
  const admin = await requireSuperAdmin();

  if (userId === admin.id) {
    throw new Error("Non puoi disabilitare il tuo stesso account.");
  }

  await setUserBanned(userId, banned);
  revalidatePath("/super-admin");
}
