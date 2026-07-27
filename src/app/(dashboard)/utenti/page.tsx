import type { Metadata } from "next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberDialog } from "@/components/utenti/invite-member-dialog";
import { ROLE_LABELS } from "@/lib/validators/team";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCompany } from "@/services/company-service";
import { listTeamMembers } from "@/services/team-service";

export const metadata: Metadata = { title: "Utenti" };

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function UtentiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const company = await getOrCreateDefaultCompany(
    supabase,
    user!.id,
    (user!.user_metadata?.company_name as string | undefined) ?? "Il mio studio",
  );

  const members = await listTeamMembers(company.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci chi può accedere a {company.name} e con quale ruolo.
          </p>
        </div>
        <InviteMemberDialog companyId={company.id} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {initials(member.profile?.full_name ?? null)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.profile?.full_name ?? "Invito in sospeso"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.accepted_at ? "Attivo" : "In attesa di accettazione"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
