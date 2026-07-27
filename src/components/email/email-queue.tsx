"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmailStatusBadge, EmailUrgencyBadge, CATEGORY_LABELS } from "@/components/email/email-badges";
import { CondominiumAssignPicker } from "@/components/email/condominium-assign-picker";
import type { EmailStatus } from "@/types/database.types";

export interface EmailQueueRow {
  id: string;
  thread_id: string | null;
  condominium_id: string | null;
  from_address: string;
  subject: string | null;
  category: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  status: EmailStatus;
  received_at: string | null;
  condominium_name: string | null;
}

const STATUS_TABS: { value: EmailStatus; label: string }[] = [
  { value: "to_review", label: "Da approvare" },
  { value: "urgent", label: "Urgenti" },
  { value: "pending", label: "In attesa" },
  { value: "draft", label: "Bozze" },
  { value: "sent", label: "Inviate" },
];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Nessuna email in questa categoria.</p>
    </div>
  );
}

function EmailTable({ emails, showAssign, condominiums }: {
  emails: EmailQueueRow[];
  showAssign?: boolean;
  condominiums?: { id: string; name: string }[];
}) {
  if (emails.length === 0) return <EmptyState />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Oggetto</TableHead>
          <TableHead>Da</TableHead>
          <TableHead>Condominio</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Ricevuta</TableHead>
          {showAssign ? <TableHead className="text-right">Assegna</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {emails.map((email) => (
          <TableRow key={email.id} className="cursor-default">
            <TableCell className="max-w-xs">
              {email.thread_id ? (
                <Link href={`/email/${email.thread_id}`} className="font-medium hover:underline">
                  {email.subject || "(nessun oggetto)"}
                </Link>
              ) : (
                <span className="font-medium">{email.subject || "(nessun oggetto)"}</span>
              )}
              <div className="flex items-center gap-1.5 pt-0.5">
                <EmailStatusBadge status={email.status} />
                <EmailUrgencyBadge urgency={email.urgency} />
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{email.from_address}</TableCell>
            <TableCell className="text-muted-foreground">{email.condominium_name ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">
              {email.category ? (CATEGORY_LABELS[email.category] ?? email.category) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {email.received_at ? new Date(email.received_at).toLocaleString("it-IT") : "—"}
            </TableCell>
            {showAssign ? (
              <TableCell className="text-right">
                <CondominiumAssignPicker emailId={email.id} condominiums={condominiums ?? []} />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function EmailQueue({
  emails,
  unclassified,
  condominiums,
}: {
  emails: EmailQueueRow[];
  unclassified: EmailQueueRow[];
  condominiums: { id: string; name: string }[];
}) {
  const byStatus = (status: EmailStatus) => emails.filter((e) => e.status === status);

  return (
    <Tabs defaultValue={unclassified.length > 0 ? "unclassified" : "to_review"}>
      <TabsList>
        {unclassified.length > 0 ? (
          <TabsTrigger value="unclassified">Non classificate ({unclassified.length})</TabsTrigger>
        ) : null}
        {STATUS_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label} ({byStatus(tab.value).length})
          </TabsTrigger>
        ))}
      </TabsList>

      {unclassified.length > 0 ? (
        <TabsContent value="unclassified">
          <EmailTable emails={unclassified} showAssign condominiums={condominiums} />
        </TabsContent>
      ) : null}

      {STATUS_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <EmailTable emails={byStatus(tab.value)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
