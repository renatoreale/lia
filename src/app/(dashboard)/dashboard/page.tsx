import type { Metadata } from "next";
import Link from "next/link";
import { Building2, FileCheck2, Inbox, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailsChart } from "@/components/dashboard/emails-chart";
import { getDashboardStats } from "@/services/dashboard-service";
import { listCondominiums } from "@/services/condominium-service";
import { CondominiumCard } from "@/components/condomini/condominium-card";
import { CreateCondominiumDialog } from "@/components/condomini/create-condominium-dialog";

export const metadata: Metadata = {
  title: "Dashboard",
};

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [stats, condominiums] = await Promise.all([getDashboardStats(), listCondominiums()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Panoramica sull&apos;attività dei tuoi condomini e dell&apos;assistente AI.
          </p>
        </div>
        <CreateCondominiumDialog />
      </div>

      {condominiums.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <div className="flex max-w-md flex-col gap-1">
              <p className="font-medium">Benvenuto in LIA</p>
              <p className="text-sm text-muted-foreground">
                Crea il tuo primo condominio per iniziare a caricare documenti, collegare la posta
                e lasciare che l&apos;AI ti aiuti a rispondere ai condomini.
              </p>
            </div>
            <CreateCondominiumDialog />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Condomini" value={String(stats.condominiumsCount)} icon={Building2} />
            <StatCard
              title="Email ricevute"
              value={String(stats.emailsReceivedCount)}
              icon={Inbox}
              hint="Totale storico"
            />
            <StatCard
              title="Documenti indicizzati"
              value={String(stats.documentsIndexedCount)}
              icon={FileCheck2}
            />
            <StatCard
              title="Confidenza media AI"
              value={stats.avgAiConfidence !== null ? `${Math.round(stats.avgAiConfidence * 100)}%` : "—"}
              icon={Sparkles}
              hint={stats.avgAiConfidence === null ? "Nessuna bozza ancora generata" : undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email — ultimi 14 giorni</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailsChart data={stats.emailsByDay} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">I tuoi condomini</h2>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/condomini" />}>
                Vedi tutti
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {condominiums.slice(0, 6).map((condominium) => (
                <CondominiumCard key={condominium.id} condominium={condominium} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
