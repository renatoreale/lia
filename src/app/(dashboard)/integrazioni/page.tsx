import type { Metadata } from "next";
import { Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Integrazioni" };

const integrations = [
  {
    name: "Gmail",
    description: "Sincronizza automaticamente le email in arrivo e in uscita.",
  },
  {
    name: "Microsoft Outlook",
    description: "Collega la posta aziendale via Microsoft Graph.",
  },
  {
    name: "OpenAI",
    description: "Modello AI usato per classificazione, RAG e generazione delle bozze.",
  },
];

export default function IntegrazioniPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrazioni</h1>
        <p className="text-sm text-muted-foreground">
          Collega la posta elettronica e i servizi AI usati da LIA.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Plug className="size-4.5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{integration.name}</CardTitle>
              </div>
              <Badge variant="secondary">Non connesso</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{integration.description}</p>
              <Button variant="outline" disabled className="w-fit">
                Connetti — Fase 3
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
