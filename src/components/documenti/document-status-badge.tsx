import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/types/database.types";

const PROCESSING_STATUSES: DocumentStatus[] = ["uploaded", "extracting", "ocr_processing", "chunking", "embedding"];

const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "In coda",
  extracting: "Estrazione testo…",
  ocr_processing: "OCR in corso…",
  chunking: "Suddivisione…",
  embedding: "Indicizzazione…",
  indexed: "Indicizzato",
  failed: "Fallito",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  if (PROCESSING_STATUSES.includes(status)) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="size-3 animate-spin" />
        {STATUS_LABELS[status]}
      </Badge>
    );
  }

  if (status === "failed") {
    return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
  }

  return <Badge>{STATUS_LABELS[status]}</Badge>;
}
