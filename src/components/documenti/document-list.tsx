"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentStatusBadge } from "@/components/documenti/document-status-badge";
import { deleteDocument } from "@/app/(dashboard)/documenti/actions";
import { documentCategoryLabels } from "@/lib/validators/document";
import type { DocumentCategory, DocumentRow, DocumentStatus } from "@/types/database.types";

export interface DocumentListItem
  extends Pick<DocumentRow, "id" | "title" | "category" | "status" | "page_count" | "processing_error" | "created_at"> {
  condominium_id: string;
  condominium_name?: string;
}

function DeleteButton({ documentId, condominiumId }: { documentId: string; condominiumId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteDocument(documentId, condominiumId);
      toast.success("Documento eliminato");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile eliminare il documento.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" disabled={isDeleting} onClick={handleDelete} aria-label="Elimina documento">
      {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

export function DocumentList({
  documents,
  showCondominium = false,
}: {
  documents: DocumentListItem[];
  showCondominium?: boolean;
}) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <FileText className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Nessun documento</p>
          <p className="text-sm text-muted-foreground">Carica un PDF per iniziare l&apos;indicizzazione.</p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          {showCondominium ? <TableHead>Condominio</TableHead> : null}
          <TableHead>Categoria</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Pagine</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{doc.title}</span>
              </div>
            </TableCell>
            {showCondominium ? (
              <TableCell>
                <Link
                  href={`/condomini/${doc.condominium_id}`}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {doc.condominium_name ?? "—"}
                </Link>
              </TableCell>
            ) : null}
            <TableCell className="text-muted-foreground">
              {documentCategoryLabels[doc.category as DocumentCategory] ?? doc.category}
            </TableCell>
            <TableCell>
              {doc.status === "failed" && doc.processing_error ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-block" />}>
                    <DocumentStatusBadge status={doc.status as DocumentStatus} />
                  </TooltipTrigger>
                  <TooltipContent>{doc.processing_error}</TooltipContent>
                </Tooltip>
              ) : (
                <DocumentStatusBadge status={doc.status as DocumentStatus} />
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{doc.page_count ?? "—"}</TableCell>
            <TableCell className="text-right">
              <DeleteButton documentId={doc.id} condominiumId={doc.condominium_id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
