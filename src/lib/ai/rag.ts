import "server-only";

import { embedText } from "@/lib/ai/embeddings";
import { CHAT_MODEL, getOpenAIClient } from "@/lib/ai/openai";
import { createClient } from "@/lib/supabase/server";
import type { DocumentCategory } from "@/types/database.types";

const MATCH_COUNT = 8;

// text-embedding-3-small cosine similarities run much lower in absolute
// terms than the "0.7+ means related" intuition from other embedding
// models: a clearly-correct match against real condominium documents
// measured ~0.52. These thresholds are calibrated against that model,
// not a universal RAG constant -- revisit if the embedding model changes.
const MATCH_THRESHOLD = 0.2;
const LOW_CONFIDENCE_RAW_THRESHOLD = 0.35;
const CONFIDENCE_FLOOR = 0.2;
const CONFIDENCE_CEIL = 0.55;

/** Rescales a raw cosine similarity into a more legible 0-1 confidence for display. */
function normalizeConfidence(rawSimilarity: number): number {
  const scaled = (rawSimilarity - CONFIDENCE_FLOOR) / (CONFIDENCE_CEIL - CONFIDENCE_FLOOR);
  return Math.max(0, Math.min(1, scaled));
}

export interface RagCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  pageNumber: number | null;
  snippet: string;
  similarity: number;
}

export interface RagAnswer {
  answer: string;
  confidence: number;
  lowConfidence: boolean;
  citations: RagCitation[];
}

const NO_MATCH_ANSWER =
  "Non ho trovato informazioni sufficienti nei documenti caricati per questo condominio per rispondere " +
  "con sicurezza. Prova a riformulare la domanda o verifica di aver caricato il documento rilevante " +
  "(es. regolamento, verbale, delibera).";

export async function answerQuestion(condominiumId: string, question: string): Promise<RagAnswer> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("La domanda non può essere vuota.");
  }

  const supabase = await createClient();
  const questionEmbedding = await embedText(trimmed);

  const { data: matches, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: questionEmbedding,
    p_condominium_id: condominiumId,
    match_count: MATCH_COUNT,
    match_threshold: MATCH_THRESHOLD,
  });

  if (error) {
    throw new Error(`Ricerca semantica fallita: ${error.message}`);
  }

  if (!matches || matches.length === 0) {
    return { answer: NO_MATCH_ANSWER, confidence: 0, lowConfidence: true, citations: [] };
  }

  const topSimilarity = matches[0].similarity;
  const lowConfidence = topSimilarity < LOW_CONFIDENCE_RAW_THRESHOLD;
  const confidence = normalizeConfidence(topSimilarity);

  const citations: RagCitation[] = matches.map((m) => ({
    chunkId: m.chunk_id,
    documentId: m.document_id,
    documentTitle: m.document_title,
    category: m.category,
    pageNumber: m.page_number,
    snippet: m.content,
    similarity: m.similarity,
  }));

  if (lowConfidence) {
    return {
      answer:
        "Ho trovato solo riferimenti parziali nei documenti disponibili, non abbastanza precisi per " +
        "darti una risposta affidabile. Ti riporto comunque i passaggi più simili trovati: potrebbero " +
        "servirti chiarimenti aggiuntivi o il caricamento di documenti più specifici.",
      confidence,
      lowConfidence: true,
      citations,
    };
  }

  const context = citations
    .map(
      (c, i) =>
        `[${i + 1}] Documento: "${c.documentTitle}" (categoria: ${c.category}${c.pageNumber ? `, pagina ${c.pageNumber}` : ""})\n${c.snippet}`,
    )
    .join("\n\n---\n\n");

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Sei l'assistente AI di un amministratore di condominio esperto. Rispondi SOLO usando le " +
          "informazioni contenute nei passaggi di documenti forniti come contesto. Non inventare mai " +
          "informazioni non presenti nel contesto. Se il contesto non contiene la risposta, dichiaralo " +
          "esplicitamente invece di indovinare. Quando citi un'informazione, riferisciti al numero tra " +
          "parentesi quadre corrispondente al passaggio (es. [1], [2]). Rispondi sempre in italiano, in " +
          "modo chiaro e professionale.",
      },
      {
        role: "user",
        content: `Domanda: ${trimmed}\n\nContesto (estratti dai documenti del condominio):\n\n${context}`,
      },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim() || NO_MATCH_ANSWER;

  return { answer, confidence, lowConfidence: false, citations };
}
