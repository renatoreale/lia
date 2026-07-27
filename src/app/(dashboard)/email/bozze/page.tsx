import type { Metadata } from "next";
import { PenSquare } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Bozze" };

export default function BozzePage() {
  return (
    <PlaceholderPage
      icon={PenSquare}
      title="Bozze"
      description="Risposte generate dall'AI in attesa di revisione: mai inviate automaticamente."
      phase="Arriva nella Fase 3 — Email AI, insieme al flusso di approvazione e all'apprendimento dalle correzioni (Fase 4)."
    />
  );
}
