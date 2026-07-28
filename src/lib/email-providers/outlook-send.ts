import "server-only";

/** Node-side mirror of supabase/functions/_shared/graph-api.ts's refresh logic --
 * see gmail-send.ts for why this is duplicated instead of shared. */

export async function refreshOutlookAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
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

export async function sendOutlookReply(
  accessToken: string,
  { originalMessageId, bodyText }: { originalMessageId: string; bodyText: string },
): Promise<void> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${originalMessageId}/reply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ comment: bodyText }),
  });

  if (!response.ok) {
    throw new Error(`Invio email Outlook fallito: ${await response.text()}`);
  }
}
