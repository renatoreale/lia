import type { Metadata } from "next";

import { GlobalRagSearch } from "@/components/ricerca/global-rag-search";
import { listCondominiums } from "@/services/condominium-service";

export const metadata: Metadata = { title: "Ricerca AI" };

export default async function RicercaPage() {
  const condominiums = await listCondominiums();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ricerca AI</h1>
        <p className="text-sm text-muted-foreground">
          Fai una domanda in linguaggio naturale su verbali, delibere, bilanci e regolamenti — la
          risposta cita sempre i documenti da cui proviene.
        </p>
      </div>

      <GlobalRagSearch condominiums={condominiums} />
    </div>
  );
}
