import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Statistiche" };

export default function StatistichePage() {
  return (
    <PlaceholderPage
      icon={BarChart3}
      title="Statistiche"
      description="Tempo risparmiato, richieste più frequenti e attività AI nel tempo."
      phase="Grafici avanzati e reportistica arrivano nella Fase 4 — Funzionalità avanzate. Le metriche di base sono già visibili in Dashboard."
    />
  );
}
