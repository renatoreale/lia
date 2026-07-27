import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm, ProfileSettingsForm } from "@/components/shared/settings-forms";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCompany } from "@/services/company-service";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function ImpostazioniPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, company] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    getOrCreateDefaultCompany(
      supabase,
      user!.id,
      (user!.user_metadata?.company_name as string | undefined) ?? "Il mio studio",
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Gestisci il tuo profilo e il tuo studio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm initialFullName={profile?.full_name ?? ""} email={user?.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Studio</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanySettingsForm companyId={company.id} initialName={company.name} />
        </CardContent>
      </Card>
    </div>
  );
}
