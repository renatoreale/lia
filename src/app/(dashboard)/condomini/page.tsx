import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { CondominiumCard } from "@/components/condomini/condominium-card";
import { CreateCondominiumDialog } from "@/components/condomini/create-condominium-dialog";
import { listCondominiums } from "@/services/condominium-service";

export const metadata: Metadata = {
  title: "Condomini",
};

export default async function CondominiPage() {
  const condominiums = await listCondominiums();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Condomini</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci gli edifici e l&apos;archivio documentale di ogni condominio.
          </p>
        </div>
        <CreateCondominiumDialog />
      </div>

      {condominiums.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Nessun condominio ancora</p>
            <p className="text-sm text-muted-foreground">
              Crea il tuo primo condominio per iniziare a caricare documenti e gestire le email.
            </p>
          </div>
          <CreateCondominiumDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {condominiums.map((condominium) => (
            <CondominiumCard key={condominium.id} condominium={condominium} />
          ))}
        </div>
      )}
    </div>
  );
}
