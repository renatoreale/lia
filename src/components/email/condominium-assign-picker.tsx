"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignCondominiumToEmail } from "@/app/(dashboard)/email/actions";

export function CondominiumAssignPicker({
  emailId,
  condominiums,
}: {
  emailId: string;
  condominiums: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  async function handleAssign() {
    if (!selected) return;
    setIsAssigning(true);
    try {
      await assignCondominiumToEmail(emailId, selected);
      toast.success("Condominio assegnato.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile assegnare il condominio.");
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Select value={selected ?? undefined} onValueChange={setSelected}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Condominio…" />
        </SelectTrigger>
        <SelectContent>
          {condominiums.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!selected || isAssigning} onClick={handleAssign}>
        {isAssigning ? <Loader2 className="size-3.5 animate-spin" /> : "Assegna"}
      </Button>
    </div>
  );
}
