import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Ricerca AI" };

export default function RicercaPage() {
  return (
    <PlaceholderPage
      icon={Sparkles}
      title="Ricerca AI"
      description="Fai una domanda in linguaggio naturale su verbali, delibere, bilanci e regolamenti."
      phase="La ricerca semantica basata su pgvector e RAG, con citazioni e livello di confidenza, arriva nella Fase 2."
    />
  );
}
