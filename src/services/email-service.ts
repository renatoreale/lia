import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EmailAttachmentRow, EmailDraftRow, EmailRow, EmailThreadRow } from "@/types/database.types";

const QUEUE_COLUMNS =
  "id, thread_id, condominium_id, provider, direction, from_address, to_addresses, subject, " +
  "snippet, category, urgency, status, ai_summary, ai_confidence, has_attachments, received_at, " +
  "condominiums(name)";

type QueueRow = Pick<
  EmailRow,
  | "id"
  | "thread_id"
  | "condominium_id"
  | "provider"
  | "direction"
  | "from_address"
  | "to_addresses"
  | "subject"
  | "snippet"
  | "category"
  | "urgency"
  | "status"
  | "ai_summary"
  | "ai_confidence"
  | "has_attachments"
  | "received_at"
> & { condominiums: { name: string } | null };

function withCondominiumName(row: QueueRow) {
  const { condominiums, ...rest } = row;
  return { ...rest, condominium_name: condominiums?.name ?? null };
}

/** Emails across every condominio the user can access, newest first -- the page groups these into
 * the "Da approvare / Urgenti / In attesa / Bozze / Inviate" queue columns client-side. */
export async function listEmailQueue() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select(QUEUE_COLUMNS)
    .is("deleted_at", null)
    .not("condominium_id", "is", null)
    .neq("status", "archived")
    .order("received_at", { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as QueueRow[]).map(withCondominiumName);
}

/** Inbound emails the sync/classification pipeline could not match to a condominio -- need a
 * human to pick one before a reply draft can be generated (email_drafts requires condominium_id
 * for its RLS policy, see supabase/migrations/0010_rls_policies.sql). */
export async function listUnclassifiedEmails() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select(QUEUE_COLUMNS)
    .is("deleted_at", null)
    .is("condominium_id", null)
    .order("received_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as QueueRow[]).map(withCondominiumName);
}

export async function getThreadWithEmails(threadId: string) {
  const supabase = await createClient();

  const { data: thread, error: threadError } = await supabase
    .from("email_threads")
    .select("*, condominiums(name)")
    .eq("id", threadId)
    .is("deleted_at", null)
    .single();

  if (threadError) throw new Error(threadError.message);

  const { data: emails, error: emailsError } = await supabase
    .from("emails")
    .select("*, email_attachments(*), email_drafts(*)")
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("received_at", { ascending: true, nullsFirst: true });

  if (emailsError) throw new Error(emailsError.message);

  return {
    thread: thread as unknown as EmailThreadRow & { condominiums: { name: string } | null },
    emails: (emails ?? []) as unknown as (EmailRow & {
      email_attachments: EmailAttachmentRow[];
      email_drafts: EmailDraftRow[];
    })[],
  };
}

export type PendingDraftRow = Pick<
  EmailDraftRow,
  "id" | "email_id" | "thread_id" | "condominium_id" | "ai_content" | "final_content" | "ai_confidence" | "citations" | "model" | "created_at"
> & {
  condominiums: { name: string } | null;
  emails: { subject: string | null; from_address: string; received_at: string | null } | null;
};

export async function listPendingDrafts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_drafts")
    .select(
      "id, email_id, thread_id, condominium_id, ai_content, final_content, ai_confidence, citations, " +
        "model, created_at, condominiums(name), emails(subject, from_address, received_at)",
    )
    .eq("status", "pending_review")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PendingDraftRow[];
}
