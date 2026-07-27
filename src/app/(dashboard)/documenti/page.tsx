import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Documenti" };

export default function DocumentiPage() {
  return (
    <PlaceholderPage
      icon={FileText}
      title="Documenti"
      description="Archivio documentale trasversale su tutti i condomini."
      phase="Upload, OCR automatico, chunking e indicizzazione vettoriale arrivano nella Fase 2 — Gestione documentale e RAG."
    />
  );
}
