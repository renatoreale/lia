"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectIntegration, syncNow } from "@/app/(dashboard)/integrazioni/actions";
import type { EmailProvider, IntegrationStatus } from "@/types/database.types";

export interface IntegrationCardData {
  id: string;
  status: IntegrationStatus;
  externalAccountEmail: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export function IntegrationCard({
  icon,
  name,
  description,
  provider,
  companyId,
  integration,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  provider: EmailProvider;
  companyId: string;
  integration: IntegrationCardData | null;
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isConnected = integration?.status === "connected";

  async function handleSync() {
    if (!integration) return;
    setIsSyncing(true);
    try {
      await syncNow(integration.id, provider);
      toast.success("Sincronizzazione avviata.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sincronizzazione fallita.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!integration) return;
    setIsDisconnecting(true);
    try {
      await disconnectIntegration(integration.id);
      toast.success(`${name} disconnesso.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile disconnettere.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">{icon}</div>
          <CardTitle className="text-base">{name}</CardTitle>
        </div>
        <Badge variant={isConnected ? "default" : integration?.status === "error" ? "destructive" : "secondary"}>
          {isConnected ? "Connesso" : integration?.status === "error" ? "Errore" : "Non connesso"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>

        {isConnected && integration ? (
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{integration.externalAccountEmail}</p>
            <p>
              {integration.lastSyncedAt
                ? `Ultima sincronizzazione: ${new Date(integration.lastSyncedAt).toLocaleString("it-IT")}`
                : "Non ancora sincronizzato."}
            </p>
            {integration.lastError ? <p className="text-destructive">{integration.lastError}</p> : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          {isConnected && integration ? (
            <>
              <Button variant="outline" size="sm" disabled={isSyncing} onClick={handleSync} className="w-fit">
                {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Sincronizza ora
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDisconnecting}
                onClick={handleDisconnect}
                className="w-fit"
              >
                Disconnetti
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              nativeButton={false}
              render={<a href={`/api/integrations/${provider}/connect?companyId=${companyId}`} />}
            >
              Connetti
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
