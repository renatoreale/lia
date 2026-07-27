import "server-only";

import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface PlatformUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  isBanned: boolean;
  companiesCount: number;
  condominiumsCount: number;
}

/**
 * Verifies the current session belongs to a super admin using the
 * caller's own (RLS-respecting) client -- never trust the service role
 * client for authorization decisions, only for the privileged reads/
 * writes once authorization is already confirmed. Redirects/404s
 * otherwise so the existence of this area isn't revealed to non-admins.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) notFound();

  return user;
}

export async function isSuperAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_super_admin");
  return Boolean(data);
}

export async function listPlatformUsers(): Promise<PlatformUserRow[]> {
  // Authorization must already have been checked by the caller
  // (requireSuperAdmin) before this runs -- this uses the service role
  // and bypasses RLS entirely, on purpose, to see every tenant.
  const admin = createAdminClient();
  const supabase = await createClient();

  const [{ data: authUsers }, { data: profiles }, { data: stats }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, full_name, avatar_url"),
    supabase.rpc("admin_list_user_stats"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const statsMap = new Map((stats ?? []).map((s) => [s.user_id, s]));

  return (authUsers?.users ?? [])
    .map((u) => {
      const profile = profileMap.get(u.id);
      const stat = statsMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        isBanned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
        companiesCount: stat?.companies_count ?? 0,
        condominiumsCount: stat?.condominiums_count ?? 0,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function setUserBanned(userId: string, banned: boolean) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) throw new Error(error.message);
}
