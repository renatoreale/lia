import "server-only";

/** Node-side mirror of supabase/functions/_shared/gmail-api.ts's refresh logic --
 * duplicated because Edge Functions (Deno) and Server Actions (Node) can't share
 * modules across the `@/` alias boundary. Only used to approve+send a reply
 * (src/app/(dashboard)/email/actions.ts); reading/parsing mail stays Edge-only. */

export async function refreshGmailAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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

function encodeMimeMessage({ to, subject, bodyText }: { to: string; subject: string; bodyText: string }): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const raw = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    bodyText,
  ].join("\r\n");

  return Buffer.from(raw, "utf8").toString("base64url");
}

export async function sendGmailReply(
  accessToken: string,
  { to, subject, bodyText, threadId }: { to: string; subject: string; bodyText: string; threadId: string },
): Promise<void> {
  const raw = encodeMimeMessage({ to, subject, bodyText });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw, threadId }),
  });

  if (!response.ok) {
    throw new Error(`Invio email Gmail fallito: ${await response.text()}`);
  }
}
