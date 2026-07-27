import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Email" };

export default function EmailPage() {
  return (
    <PlaceholderPage
      icon={Inbox}
      title="Email"
      description="Da approvare, urgenti, in attesa, bozze e inviate — tutto in un'unica coda di lavoro."
      phase="L'integrazione Gmail/Outlook, la classificazione automatica e il flusso di approvazione arrivano nella Fase 3 — Email AI."
    />
  );
}
