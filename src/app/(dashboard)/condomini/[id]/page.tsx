import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Home, Mail, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCondominium, getCondominiumStats } from "@/services/condominium-service";
import { EditCondominiumForm } from "@/components/condomini/edit-condominium-form";
import { ComingSoonPanel } from "@/components/condomini/coming-soon-panel";

export default async function CondominiumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let condominium;
  try {
    condominium = await getCondominium(id);
  } catch {
    notFound();
  }

  const stats = await getCondominiumStats(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" nativeButton={false} render={<Link href="/condomini" />}>
          <ArrowLeft /> Condomini
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{condominium.name}</h1>
              {!condominium.is_active ? <Badge variant="secondary">Inattivo</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {[condominium.address, condominium.city, condominium.province]
                .filter(Boolean)
                .join(", ") || "Nessun indirizzo impostato"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documenti</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.documentsCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unità</CardTitle>
            <Home className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.apartmentsCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proprietari</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.ownersCount}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="panoramica">
        <TabsList>
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="ricerca-ai">Ricerca AI</TabsTrigger>
        </TabsList>

        <TabsContent value="panoramica" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Informazioni generali</CardTitle>
            </CardHeader>
            <CardContent>
              <EditCondominiumForm condominium={condominium} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documenti" className="mt-4">
          <ComingSoonPanel
            icon={FileText}
            title="Gestione documentale"
            description="Upload PDF, OCR automatico, chunking e indicizzazione vettoriale arrivano nella Fase 2 del progetto."
          />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <ComingSoonPanel
            icon={Mail}
            title="Email AI"
            description="Sincronizzazione Gmail/Outlook, classificazione automatica e bozze di risposta arrivano nella Fase 3."
          />
        </TabsContent>

        <TabsContent value="ricerca-ai" className="mt-4">
          <ComingSoonPanel
            icon={Sparkles}
            title="Ricerca semantica (RAG)"
            description="La ricerca su verbali, delibere e bilanci con citazioni verificabili arriva nella Fase 2, una volta indicizzati i documenti."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
