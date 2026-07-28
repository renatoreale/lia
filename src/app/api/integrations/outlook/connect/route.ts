import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const GRAPH_SCOPES = [
  "openid",
  "email",
  "offline_access",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.Send",
].join(" ");

const OAUTH_STATE_COOKIE = "outlook_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId mancante." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const { data: isAdmin } = await supabase.rpc("is_company_admin", { p_company_id: companyId });
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "MICROSOFT_CLIENT_ID non configurata." }, { status: 500 });
  }

  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const nonce = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/integrations/outlook/callback`;

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("scope", GRAPH_SCOPES);
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ companyId, nonce }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
