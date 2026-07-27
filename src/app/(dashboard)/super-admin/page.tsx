import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleUserBannedButton } from "@/components/super-admin/toggle-user-banned-button";
import { listPlatformUsers, requireSuperAdmin } from "@/services/super-admin-service";

export const metadata: Metadata = { title: "Super Admin" };

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function SuperAdminPage() {
  const currentAdmin = await requireSuperAdmin();
  const users = await listPlatformUsers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-4.5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
          <p className="text-sm text-muted-foreground">
            Tutte le utenze registrate sulla piattaforma ({users.length}).
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Condomini gestiti</TableHead>
                <TableHead>Ultimo accesso</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarImage src={user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {initials(user.fullName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.fullName ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.condominiumsCount}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({user.companiesCount} {user.companiesCount === 1 ? "studio" : "studi"})
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastSignInAt
                      ? formatDistanceToNow(new Date(user.lastSignInAt), { addSuffix: true, locale: it })
                      : "Mai effettuato l'accesso"}
                  </TableCell>
                  <TableCell>
                    {user.isBanned ? (
                      <Badge variant="destructive">Disabilitato</Badge>
                    ) : (
                      <Badge variant="secondary">Attivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ToggleUserBannedButton
                      userId={user.id}
                      isBanned={user.isBanned}
                      disabled={user.id === currentAdmin.id}
                    />
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
