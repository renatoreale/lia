import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["administrator", "collaborator", "read_only"]),
  companyId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { email, role, companyId } = parsed.data;

  const { data: isAdmin } = await supabase.rpc("is_company_admin", { p_company_id: companyId });
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${new URL(request.url).origin}/auth/callback?next=/dashboard`,
  });

  if (inviteError || !invited.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Impossibile inviare l'invito." },
      { status: 400 },
    );
  }

  const { error: memberError } = await supabase.from("company_members").insert({
    company_id: companyId,
    user_id: invited.user.id,
    role,
    invited_by: user.id,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
