"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OwnerForm } from "@/components/condomini/owner-form";
import { createOwner, updateOwner } from "@/app/(dashboard)/condomini/actions";
import type { OwnerInput } from "@/lib/validators/owner";
import type { OwnerRow } from "@/types/database.types";

export function OwnerDialog({
  condominiumId,
  owner,
  trigger,
}: {
  condominiumId: string;
  owner?: OwnerRow;
  trigger: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: OwnerInput) {
    if (owner) {
      await updateOwner(owner.id, condominiumId, values);
      toast.success("Proprietario aggiornato");
    } else {
      await createOwner(condominiumId, values);
      toast.success("Proprietario aggiunto");
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{owner ? "Modifica proprietario" : "Aggiungi proprietario"}</DialogTitle>
        </DialogHeader>
        <OwnerForm
          defaultValues={
            owner
              ? {
                  first_name: owner.first_name,
                  last_name: owner.last_name,
                  email: owner.email ?? "",
                  phone: owner.phone ?? "",
                  fiscal_code: owner.fiscal_code ?? "",
                  notes: owner.notes ?? "",
                }
              : undefined
          }
          onSubmit={handleSubmit}
          submitLabel={owner ? "Salva modifiche" : "Aggiungi"}
        />
      </DialogContent>
    </Dialog>
  );
}
