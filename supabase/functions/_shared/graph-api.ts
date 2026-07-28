/** Thin REST wrapper around Microsoft Graph -- see supabase/functions/sync-outlook/index.ts.
 * Plain fetch instead of @microsoft/microsoft-graph-client (plan §1.2).
 *
 * Only the Inbox folder is synced (via Graph's delta query), so -- unlike
 * Gmail's flat "after:" search which naturally includes Sent mail --
 * Outlook sync only imports inbound messages for now.
 */

export interface GraphAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ParsedGraphMessage {
  id: string;
  conversationId: string;
  subject: string | null;
  from: string;
  to: string[];
  cc: string[];
  receivedAt: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  hasAttachments: boolean;
}

export async function refreshOutlookAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const tenant = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
      client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Rinnovo token Outlook fallito: ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

interface GraphRecipient {
  emailAddress?: { address?: string };
}

function addressOf(recipient: GraphRecipient | undefined): string | null {
  return recipient?.emailAddress?.address?.toLowerCase().trim() ?? null;
}

const MAX_PAGES = 4;

/** Follows @odata.nextLink for one sync run (capped), then returns the final
 * @odata.deltaLink to persist on integrations.metadata for the next sync. */
export async function fetchOutlookDelta(
  accessToken: string,
  storedDeltaLink: string | null,
): Promise<{ messages: ParsedGraphMessage[]; deltaLink: string }> {
  const initialUrl =
    storedDeltaLink ??
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?" +
      "$select=id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,hasAttachments";

  const messages: ParsedGraphMessage[] = [];
  let url: string | null = initialUrl;
  let deltaLink: string | null = null;
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Lettura delta Outlook fallita: ${await response.text()}`);

    const data = (await response.json()) as {
      value: Record<string, unknown>[];
      "@odata.nextLink"?: string;
      "@odata.deltaLink"?: string;
    };

    for (const raw of data.value) {
      if (raw["@removed"]) continue;
      const body = raw.body as { contentType?: string; content?: string } | undefined;
      messages.push({
        id: raw.id as string,
        conversationId: raw.conversationId as string,
        subject: (raw.subject as string) ?? null,
        from: addressOf(raw.from as GraphRecipient) ?? "",
        to: ((raw.toRecipients as GraphRecipient[]) ?? []).map(addressOf).filter((a): a is string => !!a),
        cc: ((raw.ccRecipients as GraphRecipient[]) ?? []).map(addressOf).filter((a): a is string => !!a),
        receivedAt: (raw.receivedDateTime as string) ?? null,
        snippet: (raw.bodyPreview as string) ?? null,
        bodyText: body?.contentType === "text" ? (body.content ?? null) : null,
        bodyHtml: body?.contentType === "html" ? (body.content ?? null) : null,
        hasAttachments: Boolean(raw.hasAttachments),
      });
    }

    url = data["@odata.nextLink"] ?? null;
    if (data["@odata.deltaLink"]) deltaLink = data["@odata.deltaLink"];
    pages++;
  }

  return { messages, deltaLink: deltaLink ?? storedDeltaLink ?? initialUrl };
}

export async function getOutlookAttachments(
  accessToken: string,
  messageId: string,
): Promise<{ attachment: GraphAttachment; bytes: Uint8Array }[]> {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Lettura allegati Outlook fallita: ${await response.text()}`);

  const data = (await response.json()) as {
    value: { id: string; name: string; contentType: string; size: number; contentBytes?: string }[];
  };

  return data.value
    .filter((item) => item.contentBytes)
    .map((item) => {
      const binary = atob(item.contentBytes!);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return {
        attachment: { id: item.id, filename: item.name, mimeType: item.contentType, size: item.size },
        bytes,
      };
    });
}
