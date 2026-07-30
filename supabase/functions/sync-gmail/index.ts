// Supabase Edge Function: sync-gmail
// Invoked either by /api/cron/sync-emails (every ~15min, service role) or by
// the "Sincronizza ora" button (src/app/(dashboard)/integrazioni/actions.ts).
// Fetches new Gmail messages since the last sync, upserts email_threads /
// emails / email_attachments, and kicks off classify-email for new inbound
// messages that got matched to a condominio.

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { assertCanAccessIntegration } from "../_shared/authorize-integration.ts";
import { decryptToken, encryptToken } from "../_shared/token-cipher.ts";
import { matchCondominiumByEmails } from "../_shared/match-condominium.ts";
import {
  getGmailAttachmentBytes,
  getGmailMessage,
  listNewGmailMessageIds,
  refreshGmailAccessToken,
} from "../_shared/gmail-api.ts";

const FIRST_SYNC_LOOKBACK_DAYS = 30;

Deno.serve(async (req) => {
  const admin = createAdminClient();
  let integrationId: string | undefined;

  try {
    const { integration_id } = (await req.json()) as { integration_id: string };
    integrationId = integration_id;
    if (!integration_id) throw new Error("integration_id mancante.");

    const { data: integration, error: fetchError } = await admin
      .from("integrations")
      .select("*")
      .eq("id", integration_id)
      .eq("provider", "gmail")
      .is("deleted_at", null)
      .single();

    if (fetchError || !integration) throw new Error("Integrazione Gmail non trovata.");
    await assertCanAccessIntegration(req, integration.company_id);

    // Deliberately not gated on integration.status === "connected": that field
    // gets set to "error" by this same function's catch block on a prior
    // failed attempt, which would otherwise make "Sincronizza ora" unable to
    // ever retry after a single transient failure. The refresh token is the
    // only real precondition; disconnectIntegration() nulls it out, so a
    // disconnected integration is already excluded by this check alone.
    if (!integration.refresh_token_encrypted) {
      throw new Error("Integrazione Gmail non connessa.");
    }

    const refreshToken = await decryptToken(integration.refresh_token_encrypted);
    const { accessToken, expiresIn } = await refreshGmailAccessToken(refreshToken);

    await admin
      .from("integrations")
      .update({
        access_token_encrypted: await encryptToken(accessToken),
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      })
      .eq("id", integration.id);

    const after = integration.last_synced_at
      ? Math.floor(new Date(integration.last_synced_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - FIRST_SYNC_LOOKBACK_DAYS * 86400;

    const messageIds = await listNewGmailMessageIds(accessToken, after);

    const { data: existingEmails } = await admin
      .from("emails")
      .select("external_message_id")
      .eq("provider", "gmail")
      .in("external_message_id", messageIds.length > 0 ? messageIds : [""]);
    const known = new Set((existingEmails ?? []).map((e) => e.external_message_id));
    const newMessageIds = messageIds.filter((id) => !known.has(id));

    const threadCondominiumCache = new Map<string, string | null>();
    let importedCount = 0;

    for (const messageId of newMessageIds) {
      const message = await getGmailMessage(accessToken, messageId);

      let { data: thread } = await admin
        .from("email_threads")
        .select("id, condominium_id, message_count")
        .eq("provider", "gmail")
        .eq("external_thread_id", message.threadId)
        .maybeSingle();

      const participants = [message.from, ...message.to, ...message.cc];

      if (!thread) {
        let condominiumId = threadCondominiumCache.get(message.threadId);
        if (condominiumId === undefined) {
          condominiumId = await matchCondominiumByEmails(admin, integration.company_id, participants);
          threadCondominiumCache.set(message.threadId, condominiumId);
        }

        const { data: newThread, error: threadError } = await admin
          .from("email_threads")
          .insert({
            condominium_id: condominiumId,
            provider: "gmail",
            external_thread_id: message.threadId,
            integration_id: integration.id,
            subject: message.subject,
            participants,
            message_count: 1,
            last_message_at: message.receivedAt,
            is_unclassified: condominiumId === null,
          })
          .select("id, condominium_id, message_count")
          .single();

        if (threadError || !newThread) throw new Error(`Impossibile creare il thread: ${threadError?.message}`);
        thread = newThread;
      } else {
        await admin
          .from("email_threads")
          .update({
            message_count: thread.message_count + 1,
            last_message_at: message.receivedAt,
          })
          .eq("id", thread.id);
      }

      const condominiumId = thread.condominium_id;

      const { data: insertedEmail, error: emailError } = await admin
        .from("emails")
        .upsert(
          {
            thread_id: thread.id,
            condominium_id: condominiumId,
            provider: "gmail",
            external_message_id: message.id,
            direction: message.isOutbound ? "outbound" : "inbound",
            from_address: message.from,
            to_addresses: message.to,
            cc_addresses: message.cc,
            subject: message.subject,
            body_text: message.bodyText,
            body_html: message.bodyHtml,
            snippet: message.snippet,
            status: message.isOutbound ? "sent" : "to_review",
            has_attachments: message.attachments.length > 0,
            received_at: message.receivedAt,
            sent_at: message.isOutbound ? message.receivedAt : null,
          },
          { onConflict: "provider,external_message_id" },
        )
        .select("id")
        .single();

      if (emailError || !insertedEmail) throw new Error(`Impossibile salvare l'email: ${emailError?.message}`);
      importedCount++;

      if (condominiumId && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          const bytes = await getGmailAttachmentBytes(accessToken, message.id, attachment.attachmentId);
          const storagePath = `${condominiumId}/${insertedEmail.id}/${attachment.filename}`;

          const { error: uploadError } = await admin.storage
            .from("email-attachments")
            .upload(storagePath, bytes, { contentType: attachment.mimeType, upsert: true });

          if (!uploadError) {
            await admin.from("email_attachments").insert({
              email_id: insertedEmail.id,
              filename: attachment.filename,
              storage_path: storagePath,
              mime_type: attachment.mimeType,
              file_size: attachment.size,
            });
          }
        }
      }

      if (!message.isOutbound && condominiumId) {
        await admin.functions.invoke("classify-email", { body: { email_id: insertedEmail.id } });
      }
    }

    await admin
      .from("integrations")
      .update({ status: "connected", last_synced_at: new Date().toISOString(), last_error: null })
      .eq("id", integration.id);

    return Response.json({ ok: true, imported: importedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto.";
    if (integrationId) {
      await admin.from("integrations").update({ status: "error", last_error: message }).eq("id", integrationId);
    }
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
});
