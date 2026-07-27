import Link from "next/link";
import { Building2, MapPin, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CondominiumRow } from "@/types/database.types";

export function CondominiumCard({ condominium }: { condominium: CondominiumRow }) {
  return (
    <Link href={`/condomini/${condominium.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4.5" />
            </div>
            <CardTitle className="text-base leading-tight">{condominium.name}</CardTitle>
          </div>
          {!condominium.is_active ? <Badge variant="secondary">Inattivo</Badge> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          {condominium.address || condominium.city ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">
                {[condominium.address, condominium.city].filter(Boolean).join(", ")}
              </span>
            </div>
          ) : null}
          {condominium.units_count ? (
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" />
              <span>{condominium.units_count} unità</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
