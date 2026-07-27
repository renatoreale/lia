import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  condominiumsCount: number;
  emailsReceivedCount: number;
  emailsHandledCount: number;
  documentsIndexedCount: number;
  avgAiConfidence: number | null;
  emailsByDay: { day: string; ricevute: number; evase: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 13);

  const [
    { count: condominiumsCount },
    { count: emailsReceivedCount },
    { count: emailsHandledCount },
    { count: documentsIndexedCount },
    { data: confidenceRows },
    { data: recentEmails },
  ] = await Promise.all([
    supabase.from("condominiums").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("direction", "inbound")
      .is("deleted_at", null),
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .is("deleted_at", null),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "indexed")
      .is("deleted_at", null),
    supabase.from("email_drafts").select("ai_confidence").not("ai_confidence", "is", null),
    supabase
      .from("emails")
      .select("received_at, direction, status")
      .gte("received_at", since.toISOString())
      .is("deleted_at", null),
  ]);

  const avgAiConfidence =
    confidenceRows && confidenceRows.length > 0
      ? confidenceRows.reduce((sum, row) => sum + Number(row.ai_confidence ?? 0), 0) / confidenceRows.length
      : null;

  const emailsByDay = buildLastFourteenDays(recentEmails ?? []);

  return {
    condominiumsCount: condominiumsCount ?? 0,
    emailsReceivedCount: emailsReceivedCount ?? 0,
    emailsHandledCount: emailsHandledCount ?? 0,
    documentsIndexedCount: documentsIndexedCount ?? 0,
    avgAiConfidence,
    emailsByDay,
  };
}

function buildLastFourteenDays(
  rows: { received_at: string | null; direction: string; status: string }[],
) {
  const days: { day: string; ricevute: number; evase: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });

    const ricevute = rows.filter(
      (row) => row.received_at?.slice(0, 10) === key && row.direction === "inbound",
    ).length;
    const evase = rows.filter(
      (row) => row.received_at?.slice(0, 10) === key && row.status === "sent",
    ).length;

    days.push({ day: label, ricevute, evase });
  }

  return days;
}
