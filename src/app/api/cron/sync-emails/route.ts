import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/** Invoked by the Vercel Cron job configured in vercel.json (every 15 min).
 * Fans out sync-gmail/sync-outlook for every connected integration -- see
 * supabase/functions/_shared/authorize-integration.ts for why the
 * service-role key (used implicitly by createAdminClient here) is a
 * trusted caller for those functions. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: integrations, error } = await admin
    .from("integrations")
    .select("id, provider")
    .eq("status", "connected")
    .is("deleted_at", null)
    .in("provider", ["gmail", "outlook"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.allSettled(
    (integrations ?? []).map((integration) =>
      admin.functions.invoke(`sync-${integration.provider}`, { body: { integration_id: integration.id } }),
    ),
  );

  return NextResponse.json({
    synced: results.length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}
