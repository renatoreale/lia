import { NextResponse } from "next/server";

import { encryptToken } from "@/lib/crypto/token-cipher";
import { createClient } from "@/lib/supabase/server";
import { getOAuthAppOrigin } from "@/lib/oauth-app-origin";

const OAUTH_STATE_COOKIE = "gmail_oauth_state";

function decodeEmailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { email?: string };
    return claims.email ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectToIntegrations = (params: Record<string, string>) => {
    const target = new URL("/integrazioni", url.origin);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    const response = NextResponse.redirect(target);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  };

  const error = url.searchParams.get("error");
  if (error) {
    return redirectToIntegrations({ error: `gmail_${error}` });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);

  if (!code || !state || !stateCookie) {
    return redirectToIntegrations({ error: "gmail_missing_state" });
  }

  let companyId: string;
  try {
    const parsed = JSON.parse(decodeURIComponent(stateCookie)) as { companyId: string; nonce: string };
    if (parsed.nonce !== state) throw new Error("state mismatch");
    companyId = parsed.companyId;
  } catch {
    return redirectToIntegrations({ error: "gmail_invalid_state" });
  }

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_company_admin", { p_company_id: companyId });
  if (!isAdmin) {
    return redirectToIntegrations({ error: "gmail_unauthorized" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToIntegrations({ error: "gmail_not_configured" });
  }

  const redirectUri = `${getOAuthAppOrigin(url.origin)}/api/integrations/gmail/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return redirectToIntegrations({ error: "gmail_token_exchange_failed" });
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    id_token?: string;
  };

  const email = tokens.id_token ? decodeEmailFromIdToken(tokens.id_token) : null;
  if (!email) {
    return redirectToIntegrations({ error: "gmail_missing_email" });
  }

  const { data: existing } = await supabase
    .from("integrations")
    .select("id, refresh_token_encrypted")
    .eq("company_id", companyId)
    .eq("provider", "gmail")
    .eq("external_account_email", email)
    .is("deleted_at", null)
    .maybeSingle();

  const accessTokenEncrypted = await encryptToken(tokens.access_token);
  const refreshTokenEncrypted = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : (existing?.refresh_token_encrypted ?? null);

  if (!refreshTokenEncrypted) {
    // Google only returns a refresh_token on first-ever consent for this
    // account+app. Without one we can't sync in the background later.
    return redirectToIntegrations({ error: "gmail_missing_refresh_token" });
  }

  const { error: upsertError } = await supabase.from("integrations").upsert(
    {
      id: existing?.id,
      company_id: companyId,
      provider: "gmail",
      status: "connected",
      external_account_email: email,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope.split(" "),
      last_error: null,
    },
    { onConflict: "company_id,provider,external_account_email" },
  );

  if (upsertError) {
    return redirectToIntegrations({ error: "gmail_save_failed" });
  }

  return redirectToIntegrations({ connected: "gmail" });
}
