import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { DocumentList } from "@/components/documenti/document-list";
import { listAllDocuments } from "@/services/document-service";

export const metadata: Metadata = { title: "Documenti" };

export default async function DocumentiPage() {
  const documents = await listAllDocuments();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documenti</h1>
        <p className="text-sm text-muted-foreground">
          Archivio documentale trasversale su tutti i condomini ({documents.length}). Per caricare un
          nuovo documento, apri la scheda del condominio.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <DocumentList documents={documents} showCondominium />
        </CardContent>
      </Card>
    </div>
  );
}
