import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Home, Mail, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCondominium, getCondominiumStats } from "@/services/condominium-service";
import { listDocumentsForCondominium } from "@/services/document-service";
import { listOwnersForCondominium } from "@/services/owner-service";
import { EditCondominiumForm } from "@/components/condomini/edit-condominium-form";
import { ComingSoonPanel } from "@/components/condomini/coming-soon-panel";
import { OwnerDialog } from "@/components/condomini/owner-dialog";
import { OwnerList } from "@/components/condomini/owner-list";
import { DocumentList } from "@/components/documenti/document-list";
import { UploadDocumentDialog } from "@/components/documenti/upload-document-dialog";
import { RagSearchPanel } from "@/components/ricerca/rag-search-panel";

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

  const [stats, documents, owners] = await Promise.all([
    getCondominiumStats(id),
    listDocumentsForCondominium(id),
    listOwnersForCondominium(id),
  ]);

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
          <TabsTrigger value="proprietari">Proprietari</TabsTrigger>
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
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Documenti</CardTitle>
              <UploadDocumentDialog condominiumId={condominium.id} />
            </CardHeader>
            <CardContent>
              <DocumentList documents={documents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proprietari" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Proprietari</CardTitle>
              <OwnerDialog
                condominiumId={condominium.id}
                trigger={<Button>Aggiungi proprietario</Button>}
              />
            </CardHeader>
            <CardContent>
              <OwnerList owners={owners} condominiumId={condominium.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <ComingSoonPanel
            icon={Mail}
            title="Email AI"
            description="Sincronizzazione Gmail/Outlook, classificazione automatica e bozze di risposta arrivano nella Fase 3."
          />
        </TabsContent>

        <TabsContent value="ricerca-ai" className="mt-4">
          <Card>
            <CardContent className="py-4">
              <RagSearchPanel condominiumId={condominium.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
