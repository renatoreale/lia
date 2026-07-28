import type { Metadata } from "next";
import { Mail, Plug, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IntegrationCard } from "@/components/integrazioni/integration-card";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCompany } from "@/services/company-service";
import { listIntegrationsForCompany } from "@/services/integration-service";

export const metadata: Metadata = { title: "Integrazioni" };

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_refresh_token:
    "Google/Microsoft non ha restituito un refresh token. Rimuovi l'accesso dell'app dal tuo account e riprova.",
  unauthorized: "Solo un amministratore dello studio può collegare una casella email.",
  invalid_state: "Sessione di autorizzazione scaduta o non valida. Riprova.",
  missing_state: "Sessione di autorizzazione scaduta o non valida. Riprova.",
  not_configured: "Le credenziali OAuth per questo provider non sono configurate sul server.",
  token_exchange_failed: "Impossibile completare l'autorizzazione con il provider.",
  missing_email: "Impossibile determinare l'indirizzo email dell'account collegato.",
  save_failed: "Impossibile salvare la connessione.",
};

function errorMessage(code: string | undefined) {
  if (!code) return null;
  const suffix = code.replace(/^(gmail|outlook)_/, "");
  return OAUTH_ERROR_MESSAGES[suffix] ?? "Si è verificato un errore durante il collegamento.";
}

export default async function IntegrazioniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorParam = typeof params.error === "string" ? params.error : undefined;
  const connectedParam = typeof params.connected === "string" ? params.connected : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const company = await getOrCreateDefaultCompany(
    supabase,
    user!.id,
    (user!.user_metadata?.company_name as string | undefined) ?? "Il mio studio",
  );

  const integrations = await listIntegrationsForCompany(company.id);
  const gmail = integrations.find((i) => i.provider === "gmail") ?? null;
  const outlook = integrations.find((i) => i.provider === "outlook") ?? null;
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);

  const errorText = errorMessage(errorParam);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrazioni</h1>
        <p className="text-sm text-muted-foreground">
          Collega la posta elettronica e i servizi AI usati da LIA.
        </p>
      </div>

      {errorText ? (
        <Alert variant="destructive">
          <AlertTitle>Collegamento non riuscito</AlertTitle>
          <AlertDescription>{errorText}</AlertDescription>
        </Alert>
      ) : null}

      {connectedParam ? (
        <Alert>
          <AlertTitle>Casella collegata</AlertTitle>
          <AlertDescription>
            {connectedParam === "gmail" ? "Gmail" : "Outlook"} è ora connesso. La prima sincronizzazione
            parte automaticamente ogni 15 minuti, oppure puoi avviarla subito con &quot;Sincronizza ora&quot;.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          icon={<Mail className="size-4.5 text-muted-foreground" />}
          name="Gmail"
          description="Sincronizza automaticamente le email in arrivo e in uscita."
          provider="gmail"
          companyId={company.id}
          integration={
            gmail
              ? {
                  id: gmail.id,
                  status: gmail.status,
                  externalAccountEmail: gmail.external_account_email,
                  lastSyncedAt: gmail.last_synced_at,
                  lastError: gmail.last_error,
                }
              : null
          }
        />
        <IntegrationCard
          icon={<Plug className="size-4.5 text-muted-foreground" />}
          name="Microsoft Outlook"
          description="Collega la posta aziendale via Microsoft Graph."
          provider="outlook"
          companyId={company.id}
          integration={
            outlook
              ? {
                  id: outlook.id,
                  status: outlook.status,
                  externalAccountEmail: outlook.external_account_email,
                  lastSyncedAt: outlook.last_synced_at,
                  lastError: outlook.last_error,
                }
              : null
          }
        />

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Sparkles className="size-4.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">OpenAI</CardTitle>
            </div>
            <Badge variant={openaiConfigured ? "default" : "secondary"}>
              {openaiConfigured ? "Configurato" : "Non configurato"}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Modello AI usato per classificazione, RAG e generazione delle bozze.
            </p>
            <p className="text-xs text-muted-foreground">
              {openaiConfigured
                ? "Configurato tramite la variabile d'ambiente OPENAI_API_KEY."
                : "Imposta OPENAI_API_KEY nelle variabili d'ambiente del server."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
