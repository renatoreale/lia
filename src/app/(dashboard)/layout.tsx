import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCompany } from "@/services/company-service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, company] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getOrCreateDefaultCompany(
      supabase,
      user.id,
      (user.user_metadata?.company_name as string | undefined) ?? "Il mio studio",
    ),
  ]);

  const [{ count: toReviewEmails }, { data: notifications }, { data: isSuperAdmin }] = await Promise.all([
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("status", "to_review"),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.rpc("is_super_admin"),
  ]);

  return (
    <div className="flex min-h-svh">
      <AppSidebar
        toReviewEmails={toReviewEmails ?? 0}
        companyName={company.name}
        isSuperAdmin={Boolean(isSuperAdmin)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          userId={user.id}
          fullName={profile?.full_name ?? null}
          email={user.email ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          toReviewEmails={toReviewEmails ?? 0}
          initialNotifications={notifications ?? []}
          isSuperAdmin={Boolean(isSuperAdmin)}
        />
        <main className="flex-1 bg-muted/30 p-4 sm:p-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
