"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/crypto/token-cipher";
import { refreshGmailAccessToken, sendGmailReply } from "@/lib/email-providers/gmail-send";
import { refreshOutlookAccessToken, sendOutlookReply } from "@/lib/email-providers/outlook-send";

export async function assignCondominiumToEmail(emailId: string, condominiumId: string) {
  const supabase = await createClient();

  const { data: canWrite } = await supabase.rpc("can_write_condominium", { p_condominium_id: condominiumId });
  if (!canWrite) throw new Error("Non autorizzato a scrivere su questo condominio.");

  // emails/email_threads RLS UPDATE policies require the row's *current*
  // condominium_id to already be in my_condominium_ids() -- structurally
  // impossible to satisfy for an unclassified row (condominium_id is
  // null). The can_write_condominium check above is the real
  // authorization; the admin client here just works around that RLS gap
  // for this one legitimate case.
  const admin = createAdminClient();

  const { data: email, error } = await admin
    .from("emails")
    .update({ condominium_id: condominiumId })
    .eq("id", emailId)
    .select("thread_id, category")
    .single();

  if (error || !email) throw new Error(error?.message ?? "Email non trovata.");

  if (email.thread_id) {
    await admin
      .from("email_threads")
      .update({ condominium_id: condominiumId, is_unclassified: false })
      .eq("id", email.thread_id);
  }

  if (!email.category) {
    await admin.functions.invoke("classify-email", { body: { email_id: emailId } });
  }

  revalidatePath("/email");
}

export async function updateDraftContent(draftId: string, content: string) {
  const supabase = await createClient();

  const { data: draft, error: fetchError } = await supabase
    .from("email_drafts")
    .select("ai_content, condominium_id")
    .eq("id", draftId)
    .single();

  if (fetchError || !draft) throw new Error(fetchError?.message ?? "Bozza non trovata.");

  const { error: updateError } = await supabase
    .from("email_drafts")
    .update({ final_content: content })
    .eq("id", draftId);

  if (updateError) throw new Error(updateError.message);

  if (content !== draft.ai_content) {
    await supabase.from("ai_feedback").insert({
      condominium_id: draft.condominium_id,
      email_draft_id: draftId,
      source_type: "email_draft",
      ai_content: draft.ai_content,
      final_content: content,
    });
  }

  revalidatePath("/email/bozze");
  revalidatePath("/email");
}

export async function discardDraft(draftId: string) {
  const supabase = await createClient();

  const { data: draft, error } = await supabase
    .from("email_drafts")
    .update({ status: "discarded" })
    .eq("id", draftId)
    .select("email_id")
    .single();
  if (error) throw new Error(error.message);

  // Without this the email stays stuck showing "Bozza pronta" in the queue
  // forever, even though the draft that made it true no longer exists.
  if (draft?.email_id) {
    await supabase.from("emails").update({ status: "to_review" }).eq("id", draft.email_id);
  }

  revalidatePath("/email/bozze");
  revalidatePath("/email");
}

export async function approveDraft(draftId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Devi effettuare l'accesso.");

  const { data: draft, error: draftError } = await supabase
    .from("email_drafts")
    .select("ai_content, final_content, email_id, thread_id, condominium_id")
    .eq("id", draftId)
    .single();

  if (draftError || !draft || !draft.email_id || !draft.thread_id || !draft.condominium_id) {
    throw new Error(draftError?.message ?? "Bozza non trovata.");
  }

  // Authorization check -- deliberately a read-only RPC rather than the
  // "prove it by updating the row" trick used elsewhere in this file: if
  // sending fails below, we don't want the draft stuck in an "approved"
  // limbo that vanishes from /email/bozze without ever actually being
  // sent. status only flips (to "sent") once the send has succeeded.
  const { data: canWrite } = await supabase.rpc("can_write_condominium", {
    p_condominium_id: draft.condominium_id,
  });
  if (!canWrite) throw new Error("Non autorizzato ad approvare questa bozza.");

  const content = draft.final_content ?? draft.ai_content;

  // Sending requires the integration's OAuth tokens, which live at the
  // company level (integrations RLS is is_company_admin-gated) -- the
  // can_write_condominium check above already proved this user may act on
  // this condominio, so it's safe to use the admin client for the send
  // step itself (same pattern as assignCondominiumToEmail above).
  const admin = createAdminClient();

  const { data: email, error: emailError } = await admin
    .from("emails")
    .select("id, subject, from_address, provider, external_message_id, thread_id")
    .eq("id", draft.email_id)
    .single();
  if (emailError || !email) throw new Error(emailError?.message ?? "Email originale non trovata.");

  const { data: thread } = await admin
    .from("email_threads")
    .select("integration_id, external_thread_id")
    .eq("id", draft.thread_id)
    .single();
  if (!thread?.integration_id) throw new Error("Nessuna integrazione collegata a questo thread.");

  const { data: integration, error: integrationError } = await admin
    .from("integrations")
    .select("*")
    .eq("id", thread.integration_id)
    .single();
  if (integrationError || !integration || !integration.refresh_token_encrypted) {
    throw new Error("Integrazione non disponibile per l'invio.");
  }

  const refreshToken = await decryptToken(integration.refresh_token_encrypted);

  if (email.provider === "gmail") {
    const { accessToken, expiresIn } = await refreshGmailAccessToken(refreshToken);
    await admin
      .from("integrations")
      .update({
        access_token_encrypted: await encryptToken(accessToken),
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      })
      .eq("id", integration.id);

    const subject = email.subject?.toLowerCase().startsWith("re:") ? email.subject : `Re: ${email.subject ?? ""}`;
    await sendGmailReply(accessToken, {
      to: email.from_address,
      subject,
      bodyText: content,
      threadId: thread.external_thread_id,
    });
  } else {
    const { accessToken, expiresIn } = await refreshOutlookAccessToken(refreshToken);
    await admin
      .from("integrations")
      .update({
        access_token_encrypted: await encryptToken(accessToken),
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      })
      .eq("id", integration.id);

    await sendOutlookReply(accessToken, { originalMessageId: email.external_message_id, bodyText: content });
  }

  const sentAt = new Date().toISOString();
  await admin
    .from("email_drafts")
    .update({ status: "sent", approved_by: user.id, approved_at: sentAt, sent_at: sentAt })
    .eq("id", draftId);
  await admin.from("emails").update({ status: "sent", sent_at: sentAt }).eq("id", email.id);

  revalidatePath("/email");
  revalidatePath("/email/bozze");
}
