"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OwnerDialog } from "@/components/condomini/owner-dialog";
import { deleteOwner } from "@/app/(dashboard)/condomini/actions";
import type { OwnerRow } from "@/types/database.types";

function DeleteOwnerButton({ ownerId, condominiumId }: { ownerId: string; condominiumId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteOwner(ownerId, condominiumId);
      toast.success("Proprietario eliminato");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile eliminare il proprietario.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" disabled={isDeleting} onClick={handleDelete} aria-label="Elimina proprietario">
      {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

export function OwnerList({ owners, condominiumId }: { owners: OwnerRow[]; condominiumId: string }) {
  if (owners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Nessun proprietario</p>
          <p className="text-sm text-muted-foreground">
            Aggiungi i proprietari per collegare le loro email al condominio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefono</TableHead>
          <TableHead>Codice fiscale</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {owners.map((owner) => (
          <TableRow key={owner.id}>
            <TableCell className="font-medium">
              {owner.first_name} {owner.last_name}
            </TableCell>
            <TableCell className="text-muted-foreground">{owner.email ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{owner.phone ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{owner.fiscal_code ?? "—"}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <OwnerDialog
                  condominiumId={condominiumId}
                  owner={owner}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Modifica proprietario">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <DeleteOwnerButton ownerId={owner.id} condominiumId={condominiumId} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
