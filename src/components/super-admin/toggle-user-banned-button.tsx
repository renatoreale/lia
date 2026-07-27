"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleUserBanned } from "@/app/(dashboard)/super-admin/actions";

export function ToggleUserBannedButton({
  userId,
  isBanned,
  disabled,
}: {
  userId: string;
  isBanned: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      await toggleUserBanned(userId, !isBanned);
      toast.success(isBanned ? "Utente riabilitato" : "Utente disabilitato");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Si è verificato un errore.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button
      variant={isBanned ? "outline" : "destructive"}
      size="sm"
      disabled={disabled || isSubmitting}
      onClick={handleClick}
    >
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
      {isBanned ? "Riabilita" : "Disabilita"}
    </Button>
  );
}
