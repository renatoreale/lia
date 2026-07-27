"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { approveDraft, discardDraft, updateDraftContent } from "@/app/(dashboard)/email/actions";

export interface DraftCitation {
  type: string;
  label: string;
  snippet: string;
  similarity?: number;
}

export function DraftEditor({
  draftId,
  initialContent,
  aiConfidence,
  citations,
}: {
  draftId: string;
  initialContent: string;
  aiConfidence: number | null;
  citations: DraftCitation[];
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const busy = isSaving || isApproving || isDiscarding;

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateDraftContent(draftId, content);
      toast.success("Bozza salvata.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile salvare la bozza.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove() {
    setIsApproving(true);
    try {
      await updateDraftContent(draftId, content);
      await approveDraft(draftId);
      toast.success("Risposta inviata.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invio non riuscito.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    try {
      await discardDraft(draftId);
      toast.success("Bozza scartata.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile scartare la bozza.");
    } finally {
      setIsDiscarding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Bozza generata dall&apos;AI</p>
        {aiConfidence !== null ? (
          <Badge variant={aiConfidence < 0.4 ? "secondary" : "default"}>
            Confidenza {Math.round(aiConfidence * 100)}%
          </Badge>
        ) : null}
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        disabled={busy}
        className="text-sm"
      />

      {citations.length > 0 ? (
        <details className="rounded-lg border border-border p-2.5 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            Fonti usate ({citations.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {citations.map((c, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">
                  [{i + 1}] {c.label}
                </span>
                <p className="line-clamp-2">{c.snippet}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={handleApprove}>
          {isApproving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Approva e invia
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={handleSave}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Salva modifiche
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={handleDiscard}>
          {isDiscarding ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Scarta
        </Button>
      </div>
    </div>
  );
}
