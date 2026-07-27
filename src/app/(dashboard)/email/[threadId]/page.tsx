import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmailStatusBadge, EmailUrgencyBadge } from "@/components/email/email-badges";
import { DraftEditor, type DraftCitation } from "@/components/email/draft-editor";
import { getThreadWithEmails } from "@/services/email-service";
import { createClient } from "@/lib/supabase/server";
import type { EmailAttachmentRow } from "@/types/database.types";

export const metadata: Metadata = { title: "Thread email" };

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function AttachmentLinks({ attachments }: { attachments: EmailAttachmentRow[] }) {
  if (attachments.length === 0) return null;
  const supabase = await createClient();

  const links = await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(attachment.storage_bucket)
        .createSignedUrl(attachment.storage_path, 60);
      return { attachment, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {links.map(({ attachment, url }) =>
        url ? (
          <a
            key={attachment.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="size-3" />
            {attachment.filename}
          </a>
        ) : null,
      )}
    </div>
  );
}

export default async function EmailThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;

  const { thread, emails } = await getThreadWithEmails(threadId).catch(() => ({ thread: null, emails: [] }));
  if (!thread) notFound();

  const condominiumName = thread.condominiums?.name;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/email" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Torna alla coda
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{thread.subject || "(nessun oggetto)"}</h1>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary">{condominiumName ?? "Non classificata"}</Badge>
          <span className="text-sm text-muted-foreground">{emails.length} messaggi</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {emails.map((email) => {
          const attachments = email.email_attachments ?? [];
          const drafts = email.email_drafts ?? [];
          const pendingDraft = drafts.find((d) => d.status === "pending_review");
          const body = email.body_text || (email.body_html ? stripHtml(email.body_html) : "") || email.snippet || "";

          return (
            <Card key={email.id}>
              <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{email.from_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {email.direction === "outbound" ? "Inviata" : "Ricevuta"}
                      {email.received_at ? ` · ${new Date(email.received_at).toLocaleString("it-IT")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <EmailStatusBadge status={email.status} />
                    <EmailUrgencyBadge urgency={email.urgency} />
                  </div>
                </div>

                {email.ai_summary ? (
                  <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Riepilogo AI: </span>
                    {email.ai_summary}
                  </p>
                ) : null}

                <p className="whitespace-pre-wrap text-sm">{body}</p>

                <AttachmentLinks attachments={attachments} />

                {pendingDraft ? (
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <DraftEditor
                      draftId={pendingDraft.id}
                      initialContent={pendingDraft.final_content ?? pendingDraft.ai_content}
                      aiConfidence={pendingDraft.ai_confidence}
                      citations={(pendingDraft.citations as unknown as DraftCitation[]) ?? []}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
