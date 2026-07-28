import { Badge } from "@/components/ui/badge";
import type { EmailStatus, EmailUrgency } from "@/types/database.types";

const STATUS_LABELS: Record<EmailStatus, string> = {
  to_review: "Da approvare",
  urgent: "Urgente",
  pending: "In attesa",
  draft: "Bozza pronta",
  sent: "Inviata",
  archived: "Archiviata",
};

const STATUS_VARIANTS: Record<EmailStatus, "default" | "secondary" | "destructive" | "outline"> = {
  to_review: "outline",
  urgent: "destructive",
  pending: "secondary",
  draft: "default",
  sent: "secondary",
  archived: "secondary",
};

export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

const URGENCY_LABELS: Record<EmailUrgency, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

export function EmailUrgencyBadge({ urgency }: { urgency: EmailUrgency }) {
  if (urgency === "low") return null;
  const variant = urgency === "critical" || urgency === "high" ? "destructive" : "secondary";
  return <Badge variant={variant}>{URGENCY_LABELS[urgency]}</Badge>;
}

export const CATEGORY_LABELS: Record<string, string> = {
  amministrativo: "Amministrativo",
  manutenzione: "Manutenzione",
  morosita: "Morosità",
  reclamo: "Reclamo",
  informazioni: "Informazioni",
  altro: "Altro",
};
