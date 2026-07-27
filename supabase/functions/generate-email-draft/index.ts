// Supabase Edge Function: generate-email-draft
// Internal pipeline step invoked by classify-email once an inbound message
// is classified as needing a reply. Mirrors the retrieval + confidence
// logic of src/lib/ai/rag.ts (same embedding model, same calibrated
// thresholds) but drafts an email reply instead of answering a question.
// The resulting draft is never sent automatically -- it lands in
// email_drafts with status 'pending_review' for a human to approve.

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { requireServiceRole } from "../_shared/require-service-role.ts";
import { CHAT_MODEL, EMBEDDING_MODEL, getOpenAIClient } from "../_shared/openai.ts";

const MATCH_COUNT = 6;
// See src/lib/ai/rag.ts for why these thresholds are calibrated against
// text-embedding-3-small specifically, not a universal RAG constant.
const MATCH_THRESHOLD = 0.2;
const LOW_CONFIDENCE_RAW_THRESHOLD = 0.35;
const CONFIDENCE_FLOOR = 0.2;
const CONFIDENCE_CEIL = 0.55;

function normalizeConfidence(rawSimilarity: number): number {
  const scaled = (rawSimilarity - CONFIDENCE_FLOOR) / (CONFIDENCE_CEIL - CONFIDENCE_FLOOR);
  return Math.max(0, Math.min(1, scaled));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  const admin = createAdminClient();

  try {
    requireServiceRole(req);
    const { email_id } = (await req.json()) as { email_id: string };
    if (!email_id) throw new Error("email_id mancante.");

    const { data: email, error: fetchError } = await admin
      .from("emails")
      .select("id, thread_id, condominium_id, subject, body_text, body_html, from_address")
      .eq("id", email_id)
      .single();

    if (fetchError || !email) throw new Error("Email non trovata.");
    if (!email.condominium_id) throw new Error("Email non ancora associata a un condominio.");

    const emailContent =
      email.body_text || (email.body_html ? stripHtml(email.body_html) : "") || email.subject || "";

    const client = getOpenAIClient();
    const embeddingResponse = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: `${email.subject ?? ""}\n\n${emailContent}`.slice(0, 8000),
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data: chunkMatches } = await admin.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      p_condominium_id: email.condominium_id,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    });

    const { data: knowledgeEntries } = await admin
      .from("knowledge")
      .select("title, content, confidence")
      .eq("condominium_id", email.condominium_id)
      .is("deleted_at", null)
      .order("confidence", { ascending: false })
      .limit(3);

    const matches = chunkMatches ?? [];
    const citations = [
      ...matches.map((m: { chunk_id: string; document_title: string; page_number: number | null; content: string; similarity: number }) => ({
        type: "document_chunk",
        label: `${m.document_title}${m.page_number ? ` (pagina ${m.page_number})` : ""}`,
        snippet: m.content,
        similarity: m.similarity,
      })),
      ...(knowledgeEntries ?? []).map((k) => ({ type: "knowledge", label: k.title, snippet: k.content })),
    ];

    const topSimilarity = matches[0]?.similarity ?? 0;
    const hasContext = citations.length > 0;
    const confidence = hasContext ? normalizeConfidence(topSimilarity) : CONFIDENCE_FLOOR;
    const lowConfidence = !hasContext || topSimilarity < LOW_CONFIDENCE_RAW_THRESHOLD;

    const context = citations.length
      ? citations
          .map((c, i) => `[${i + 1}] ${c.label}\n${c.snippet}`)
          .join("\n\n---\n\n")
      : "Nessun documento o nota rilevante trovata per questo condominio.";

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Sei l'assistente AI di un amministratore di condominio italiano. Scrivi SOLO il corpo di " +
            "una bozza di risposta email in italiano, tono professionale e cortese, rivolta al mittente. " +
            "Usa esclusivamente le informazioni nel contesto fornito (documenti e note del condominio); " +
            "se il contesto non è sufficiente per rispondere con sicurezza, scrivilo esplicitamente e " +
            "invita il destinatario ad attendere un riscontro dall'amministrazione invece di inventare " +
            "dettagli. Quando citi un'informazione dal contesto, riferisciti al numero tra parentesi " +
            "quadre (es. [1]). Non includere oggetto né firma, solo il corpo del messaggio.",
        },
        {
          role: "user",
          content:
            `Email ricevuta da ${email.from_address}, oggetto "${email.subject ?? "(nessun oggetto)"}":\n\n` +
            `${emailContent.slice(0, 4000)}\n\n---\n\nContesto disponibile sul condominio:\n\n${context}`,
        },
      ],
    });

    const draftContent = response.choices[0]?.message?.content?.trim();
    if (!draftContent) throw new Error("Nessuna bozza generata dal modello.");

    const { error: insertError } = await admin.from("email_drafts").insert({
      email_id: email.id,
      thread_id: email.thread_id,
      condominium_id: email.condominium_id,
      ai_content: draftContent,
      status: "pending_review",
      ai_confidence: confidence,
      citations,
      model: CHAT_MODEL,
    });

    if (insertError) throw new Error(`Impossibile salvare la bozza: ${insertError.message}`);

    await admin.from("emails").update({ status: "draft" }).eq("id", email.id);

    return Response.json({ ok: true, lowConfidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
});
