// Supabase Edge Function: sync-outlook
// Mirrors sync-gmail/index.ts using Microsoft Graph's delta query on the
// Inbox folder (see _shared/graph-api.ts for why this is inbound-only).

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { assertCanAccessIntegration } from "../_shared/authorize-integration.ts";
import { decryptToken, encryptToken } from "../_shared/token-cipher.ts";
import { matchCondominium } from "../_shared/match-condominium.ts";
import { stripHtml } from "../_shared/strip-html.ts";
import { fetchOutlookDelta, getOutlookAttachments, refreshOutlookAccessToken } from "../_shared/graph-api.ts";

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
      .eq("provider", "outlook")
      .is("deleted_at", null)
      .single();

    if (fetchError || !integration) throw new Error("Integrazione Outlook non trovata.");
    await assertCanAccessIntegration(req, integration.company_id);

    // See sync-gmail/index.ts for why this isn't gated on integration.status.
    if (!integration.refresh_token_encrypted) {
      throw new Error("Integrazione Outlook non connessa.");
    }

    const refreshToken = await decryptToken(integration.refresh_token_encrypted);
    const { accessToken, expiresIn } = await refreshOutlookAccessToken(refreshToken);

    await admin
      .from("integrations")
      .update({
        access_token_encrypted: await encryptToken(accessToken),
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      })
      .eq("id", integration.id);

    const storedDeltaLink = (integration.metadata as { delta_link?: string } | null)?.delta_link ?? null;
    const { messages, deltaLink } = await fetchOutlookDelta(accessToken, storedDeltaLink);

    const messageIds = messages.map((m) => m.id);
    const { data: existingEmails } = await admin
      .from("emails")
      .select("external_message_id")
      .eq("provider", "outlook")
      .in("external_message_id", messageIds.length > 0 ? messageIds : [""]);
    const known = new Set((existingEmails ?? []).map((e) => e.external_message_id));
    const newMessages = messages.filter((m) => !known.has(m.id));

    const threadCondominiumCache = new Map<string, string | null>();
    let importedCount = 0;

    for (const message of newMessages) {
      let { data: thread } = await admin
        .from("email_threads")
        .select("id, condominium_id, message_count")
        .eq("provider", "outlook")
        .eq("external_thread_id", message.conversationId)
        .maybeSingle();

      const participants = [message.from, ...message.to, ...message.cc];

      if (!thread) {
        let condominiumId = threadCondominiumCache.get(message.conversationId);
        if (condominiumId === undefined) {
          condominiumId = await matchCondominium(admin, integration.company_id, {
            participants,
            text: [
              message.subject,
              message.bodyText || (message.bodyHtml ? stripHtml(message.bodyHtml) : ""),
            ]
              .filter(Boolean)
              .join("\n"),
          });
          threadCondominiumCache.set(message.conversationId, condominiumId);
        }

        const { data: newThread, error: threadError } = await admin
          .from("email_threads")
          .insert({
            condominium_id: condominiumId,
            provider: "outlook",
            external_thread_id: message.conversationId,
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
          .update({ message_count: thread.message_count + 1, last_message_at: message.receivedAt })
          .eq("id", thread.id);
      }

      const condominiumId = thread.condominium_id;

      const { data: insertedEmail, error: emailError } = await admin
        .from("emails")
        .upsert(
          {
            thread_id: thread.id,
            condominium_id: condominiumId,
            provider: "outlook",
            external_message_id: message.id,
            direction: "inbound",
            from_address: message.from,
            to_addresses: message.to,
            cc_addresses: message.cc,
            subject: message.subject,
            body_text: message.bodyText,
            body_html: message.bodyHtml,
            snippet: message.snippet,
            status: "to_review",
            has_attachments: message.hasAttachments,
            received_at: message.receivedAt,
          },
          { onConflict: "provider,external_message_id" },
        )
        .select("id")
        .single();

      if (emailError || !insertedEmail) throw new Error(`Impossibile salvare l'email: ${emailError?.message}`);
      importedCount++;

      if (condominiumId && message.hasAttachments) {
        const attachments = await getOutlookAttachments(accessToken, message.id);
        for (const { attachment, bytes } of attachments) {
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

      if (condominiumId) {
        await admin.functions.invoke("classify-email", { body: { email_id: insertedEmail.id } });
      }
    }

    await admin
      .from("integrations")
      .update({
        status: "connected",
        last_synced_at: new Date().toISOString(),
        last_error: null,
        metadata: { delta_link: deltaLink },
      })
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
