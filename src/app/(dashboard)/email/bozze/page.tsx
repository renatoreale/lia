import type { Metadata } from "next";
import { PenSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DraftEditor, type DraftCitation } from "@/components/email/draft-editor";
import { listPendingDrafts } from "@/services/email-service";

export const metadata: Metadata = { title: "Bozze" };

export default async function BozzePage() {
  const drafts = await listPendingDrafts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bozze</h1>
        <p className="text-sm text-muted-foreground">
          Risposte generate dall&apos;AI in attesa di revisione: mai inviate automaticamente.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <PenSquare className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nessuna bozza in attesa di revisione.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {drafts.map((draft) => {
            const email = draft.emails;
            const condominiumName = draft.condominiums?.name;

            return (
              <Card key={draft.id}>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{email?.subject || "(nessun oggetto)"}</p>
                      <p className="text-xs text-muted-foreground">Per: {email?.from_address}</p>
                    </div>
                    <Badge variant="secondary">{condominiumName ?? "—"}</Badge>
                  </div>

                  <DraftEditor
                    draftId={draft.id}
                    initialContent={draft.final_content ?? draft.ai_content}
                    aiConfidence={draft.ai_confidence}
                    citations={(draft.citations as unknown as DraftCitation[]) ?? []}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
