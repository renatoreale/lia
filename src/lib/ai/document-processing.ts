import "server-only";

import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

import { CHAT_MODEL, getOpenAIClient } from "@/lib/ai/openai";
import { embedTexts } from "@/lib/ai/embeddings";
import { chunkText } from "@/lib/ai/chunking";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DocumentCategory } from "@/types/database.types";

const MIN_EXTRACTABLE_CHARS_PER_PAGE = 20;

async function ocrPage(pdfData: Uint8Array, pageNumber: number): Promise<string> {
  const imageDataUrl = await renderPageAsImage(pdfData, pageNumber, {
    scale: 2,
    toDataURL: true,
  });

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Trascrivi integralmente e letteralmente il testo visibile in questa pagina scansionata " +
              "(documento condominiale in italiano). Restituisci solo il testo trascritto, senza commenti " +
              "aggiuntivi. Se la pagina è vuota o illeggibile, rispondi con una stringa vuota.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    temperature: 0,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

interface ProcessResult {
  pageCount: number;
  chunkCount: number;
}

export async function processDocument(documentId: string): Promise<ProcessResult> {
  const admin = createAdminClient();

  const { data: document, error: fetchError } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    throw new Error(`Documento non trovato: ${fetchError?.message}`);
  }

  try {
    await admin.from("documents").update({ status: "extracting" }).eq("id", documentId);

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from(document.storage_bucket)
      .download(document.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Impossibile scaricare il file: ${downloadError?.message}`);
    }

    const pdfData = new Uint8Array(await fileBlob.arrayBuffer());
    const pdf = await getDocumentProxy(pdfData);
    const { totalPages, text: pageTexts } = await extractText(pdf, { mergePages: false });

    const requiresOcr = pageTexts.some((t) => t.trim().length < MIN_EXTRACTABLE_CHARS_PER_PAGE);

    const finalPageTexts: string[] = [...pageTexts];
    if (requiresOcr) {
      await admin
        .from("documents")
        .update({ status: "ocr_processing", requires_ocr: true })
        .eq("id", documentId);

      for (let i = 0; i < totalPages; i++) {
        if (pageTexts[i].trim().length < MIN_EXTRACTABLE_CHARS_PER_PAGE) {
          finalPageTexts[i] = await ocrPage(pdfData, i + 1);
        }
      }
    }

    await admin.from("documents").update({ status: "chunking" }).eq("id", documentId);

    const chunks: { page_number: number; chunk_index: number; content: string }[] = [];
    let runningIndex = 0;
    for (let pageIndex = 0; pageIndex < finalPageTexts.length; pageIndex++) {
      const pageChunks = chunkText(finalPageTexts[pageIndex], runningIndex);
      for (const chunk of pageChunks) {
        chunks.push({ page_number: pageIndex + 1, chunk_index: chunk.index, content: chunk.content });
      }
      runningIndex += pageChunks.length;
    }

    if (chunks.length === 0) {
      await admin
        .from("documents")
        .update({
          status: "failed",
          processing_error: "Nessun testo estraibile dal documento (pagine vuote o illeggibili).",
          page_count: totalPages,
        })
        .eq("id", documentId);
      return { pageCount: totalPages, chunkCount: 0 };
    }

    await admin.from("documents").update({ status: "embedding" }).eq("id", documentId);

    const vectors = await embedTexts(chunks.map((c) => c.content));

    const chunkRows = chunks.map((chunk, i) => ({
      document_id: documentId,
      condominium_id: document.condominium_id,
      category: document.category as DocumentCategory,
      page_number: chunk.page_number,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      token_count: Math.ceil(chunk.content.length / 4),
      embedding: vectors[i],
    }));

    const { data: insertedChunks, error: chunkError } = await admin
      .from("document_chunks")
      .insert(chunkRows)
      .select("id, page_number, chunk_index, content, embedding");

    if (chunkError || !insertedChunks) {
      throw new Error(`Impossibile salvare i chunk: ${chunkError?.message}`);
    }

    const embeddingRows = insertedChunks.map((chunk) => ({
      source_type: "document_chunk" as const,
      source_id: chunk.id,
      condominium_id: document.condominium_id,
      content: chunk.content,
      embedding: chunk.embedding as unknown as number[],
      metadata: { document_id: documentId, document_title: document.title, page_number: chunk.page_number },
    }));

    const { error: embeddingsError } = await admin.from("embeddings").insert(embeddingRows);
    if (embeddingsError) {
      throw new Error(`Impossibile salvare gli embedding unificati: ${embeddingsError.message}`);
    }

    await admin
      .from("documents")
      .update({ status: "indexed", page_count: totalPages, processing_error: null })
      .eq("id", documentId);

    return { pageCount: totalPages, chunkCount: chunkRows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto durante l'elaborazione.";
    await admin.from("documents").update({ status: "failed", processing_error: message }).eq("id", documentId);
    throw error;
  }
}
