"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanyName, updateProfile } from "@/app/(dashboard)/impostazioni/actions";

export function ProfileSettingsForm({ initialFullName, email }: { initialFullName: string; email: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await updateProfile(fullName);
      toast.success("Profilo aggiornato");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full-name">Nome e cognome</Label>
        <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-end">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Salva
      </Button>
    </form>
  );
}

export function CompanySettingsForm({ companyId, initialName }: { companyId: string; initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await updateCompanyName(companyId, name);
      toast.success("Studio aggiornato");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-name">Nome studio / azienda</Label>
        <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-end">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Salva
      </Button>
    </form>
  );
}
