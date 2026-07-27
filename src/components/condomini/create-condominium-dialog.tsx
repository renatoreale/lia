"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CondominiumForm } from "@/components/condomini/condominium-form";
import { createCondominium } from "@/app/(dashboard)/condomini/actions";
import type { CondominiumInput } from "@/lib/validators/condominium";

export function CreateCondominiumDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: CondominiumInput) {
    const condominium = await createCondominium(values);
    setOpen(false);
    router.push(`/condomini/${condominium.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus /> Nuovo condominio
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo condominio</DialogTitle>
        </DialogHeader>
        <CondominiumForm onSubmit={handleSubmit} submitLabel="Crea condominio" />
      </DialogContent>
    </Dialog>
  );
}
