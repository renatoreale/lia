"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RagSearchPanel } from "@/components/ricerca/rag-search-panel";
import type { CondominiumRow } from "@/types/database.types";

export function GlobalRagSearch({ condominiums }: { condominiums: Pick<CondominiumRow, "id" | "name">[] }) {
  const [condominiumId, setCondominiumId] = useState<string | undefined>(condominiums[0]?.id);

  if (condominiums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Building2 className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Nessun condominio</p>
          <p className="text-sm text-muted-foreground">
            Crea un condominio e carica dei documenti per iniziare a fare domande.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Condominio:</span>
        <Select value={condominiumId} onValueChange={(value) => setCondominiumId(value ?? undefined)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleziona un condominio" />
          </SelectTrigger>
          <SelectContent>
            {condominiums.map((condo) => (
              <SelectItem key={condo.id} value={condo.id}>
                {condo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {condominiumId ? <RagSearchPanel key={condominiumId} condominiumId={condominiumId} /> : null}
    </div>
  );
}
