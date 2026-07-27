import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface TeamMember {
  id: string;
  role: string;
  accepted_at: string | null;
  invited_at: string;
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  email: string | null;
}

export async function listTeamMembers(companyId: string): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("company_members")
    .select("id, role, accepted_at, invited_at, user_id")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("invited_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return members.map((member) => ({
    id: member.id,
    role: member.role,
    accepted_at: member.accepted_at,
    invited_at: member.invited_at,
    profile: profileMap.get(member.user_id) ?? null,
    email: null,
  }));
}
