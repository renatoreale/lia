/** Thin REST wrapper around the Gmail API -- see supabase/functions/_shared/README notes
 * in sync-gmail/index.ts. Deliberately uses plain fetch instead of `googleapis` to keep
 * the Edge Function bundle light (see plan §1.2). */

export interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  isOutbound: boolean;
  subject: string | null;
  from: string;
  to: string[];
  cc: string[];
  receivedAt: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: GmailAttachment[];
}

export async function refreshGmailAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Rinnovo token Gmail fallito: ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

const MAX_PAGES = 4;
const PAGE_SIZE = 50;

export async function listNewGmailMessageIds(accessToken: string, afterUnixSeconds: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", `after:${afterUnixSeconds}`);
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Elenco messaggi Gmail fallito: ${await response.text()}`);

    const data = (await response.json()) as { messages?: { id: string }[]; nextPageToken?: string };
    ids.push(...(data.messages ?? []).map((m) => m.id));
    pageToken = data.nextPageToken;
    pages++;
  } while (pageToken && pages < MAX_PAGES);

  return ids;
}

function base64UrlDecodeToString(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function base64UrlDecodeToBytes(data: string): Uint8Array {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getHeader(headers: { name: string; value: string }[], name: string): string | null {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function splitAddressList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => {
      const match = entry.match(/<([^>]+)>/);
      return (match ? match[1] : entry).trim().toLowerCase();
    })
    .filter(Boolean);
}

interface GmailPart {
  mimeType: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
}

function walkParts(
  part: GmailPart,
  acc: { bodyText: string | null; bodyHtml: string | null; attachments: GmailAttachment[] },
) {
  if (part.filename && part.body?.attachmentId) {
    acc.attachments.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.body.size ?? 0,
    });
  } else if (part.mimeType === "text/plain" && part.body?.data && !acc.bodyText) {
    acc.bodyText = base64UrlDecodeToString(part.body.data);
  } else if (part.mimeType === "text/html" && part.body?.data && !acc.bodyHtml) {
    acc.bodyHtml = base64UrlDecodeToString(part.body.data);
  }

  for (const child of part.parts ?? []) walkParts(child, acc);
}

export async function getGmailMessage(accessToken: string, id: string): Promise<ParsedGmailMessage> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
  url.searchParams.set("format", "full");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Lettura messaggio Gmail fallita: ${await response.text()}`);

  const data = (await response.json()) as {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    internalDate?: string;
    payload: GmailPart & { headers: { name: string; value: string }[] };
  };

  const headers = data.payload.headers ?? [];
  const acc = { bodyText: null as string | null, bodyHtml: null as string | null, attachments: [] as GmailAttachment[] };
  walkParts(data.payload, acc);

  return {
    id: data.id,
    threadId: data.threadId,
    isOutbound: (data.labelIds ?? []).includes("SENT"),
    subject: getHeader(headers, "Subject"),
    from: splitAddressList(getHeader(headers, "From"))[0] ?? "",
    to: splitAddressList(getHeader(headers, "To")),
    cc: splitAddressList(getHeader(headers, "Cc")),
    receivedAt: data.internalDate ? new Date(Number(data.internalDate)).toISOString() : null,
    snippet: data.snippet ?? null,
    bodyText: acc.bodyText,
    bodyHtml: acc.bodyHtml,
    attachments: acc.attachments,
  };
}

export async function getGmailAttachmentBytes(
  accessToken: string,
  messageId: string,
  attachmentId: string,
): Promise<Uint8Array> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Download allegato Gmail fallito: ${await response.text()}`);

  const data = (await response.json()) as { data: string };
  return base64UrlDecodeToBytes(data.data);
}
