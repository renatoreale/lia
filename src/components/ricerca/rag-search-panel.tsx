"use client";

import { useState } from "react";
import { AlertTriangle, FileText, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/app/(dashboard)/ricerca/actions";
import { documentCategoryLabels } from "@/lib/validators/document";
import type { RagAnswer } from "@/lib/ai/rag";
import type { DocumentCategory } from "@/types/database.types";

interface Turn {
  question: string;
  answer: RagAnswer | null;
  error: string | null;
}

const EXAMPLES = [
  "Come si ripartiscono le spese di riscaldamento?",
  "Cosa dice il regolamento sugli animali domestici?",
  "Quali lavori sono stati deliberati nell'ultima assemblea?",
];

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return { label: "Alta", variant: "default" as const };
  if (confidence >= 0.68) return { label: "Media", variant: "secondary" as const };
  return { label: "Bassa", variant: "destructive" as const };
}

function AnswerCard({ turn }: { turn: Turn }) {
  if (turn.error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-start gap-2 py-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {turn.error}
        </CardContent>
      </Card>
    );
  }

  if (!turn.answer) return null;

  const { answer, confidence, lowConfidence, citations } = turn.answer;
  const confidenceInfo = confidenceLabel(confidence);

  const byCategory = citations.reduce<Record<string, typeof citations>>((acc, citation) => {
    (acc[citation.category] ??= []).push(citation);
    return acc;
  }, {});

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Confidenza:</span>
          <Badge variant={confidenceInfo.variant}>
            {confidenceInfo.label} ({Math.round(confidence * 100)}%)
          </Badge>
          {lowConfidence ? (
            <span className="text-xs text-muted-foreground">
              Bassa confidenza: verifica le fonti o chiedi un chiarimento più specifico.
            </span>
          ) : null}
        </div>

        {citations.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Documenti consultati
            </p>
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-foreground">
                  {documentCategoryLabels[category as DocumentCategory] ?? category}
                </p>
                {items.map((citation) => (
                  <div
                    key={citation.chunkId}
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2 text-xs"
                  >
                    <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {citation.documentTitle}
                        {citation.pageNumber ? ` — pag. ${citation.pageNumber}` : ""}
                      </span>
                      <span className="text-muted-foreground line-clamp-2">{citation.snippet}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RagSearchPanel({ condominiumId }: { condominiumId: string }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAsk(q?: string) {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion || isLoading) return;

    setIsLoading(true);
    setQuestion("");

    try {
      const answer = await askQuestion(condominiumId, finalQuestion);
      setTurns((current) => [{ question: finalQuestion, answer, error: null }, ...current]);
    } catch (err) {
      setTurns((current) => [
        {
          question: finalQuestion,
          answer: null,
          error: err instanceof Error ? err.message : "Si è verificato un errore.",
        },
        ...current,
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Fai una domanda sui documenti di questo condominio…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          rows={3}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleAsk(example)}
                disabled={isLoading}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
          <Button onClick={() => handleAsk()} disabled={isLoading || !question.trim()}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Chiedi
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {turns.map((turn, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{turn.question}</p>
            <AnswerCard turn={turn} />
          </div>
        ))}
        {turns.length === 0 && !isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Fai una domanda per iniziare. La risposta cita sempre i documenti da cui proviene.
          </p>
        ) : null}
      </div>
    </div>
  );
}
