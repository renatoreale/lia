"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CondominiumForm } from "@/components/condomini/condominium-form";
import { updateCondominium } from "@/app/(dashboard)/condomini/actions";
import type { CondominiumInput } from "@/lib/validators/condominium";
import type { CondominiumRow } from "@/types/database.types";

export function EditCondominiumForm({ condominium }: { condominium: CondominiumRow }) {
  const router = useRouter();

  async function handleSubmit(values: CondominiumInput) {
    await updateCondominium(condominium.id, values);
    toast.success("Condominio aggiornato");
    router.refresh();
  }

  return (
    <CondominiumForm
      defaultValues={{
        name: condominium.name,
        address: condominium.address ?? "",
        city: condominium.city ?? "",
        postal_code: condominium.postal_code ?? "",
        province: condominium.province ?? "",
        fiscal_code: condominium.fiscal_code ?? "",
        administrator_name: condominium.administrator_name ?? "",
        administrator_email: condominium.administrator_email ?? "",
        administrator_phone: condominium.administrator_phone ?? "",
        units_count: condominium.units_count ?? undefined,
        notes: condominium.notes ?? "",
      }}
      onSubmit={handleSubmit}
      submitLabel="Salva modifiche"
    />
  );
}
