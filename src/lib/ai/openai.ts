import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY non configurata.");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/**
 * text-embedding-3-small produces 1536-dimension vectors, matching the
 * vector(1536) columns in document_chunks/embeddings (see
 * supabase/migrations/0004_documents.sql). If you change this, the
 * column dimension must change too.
 */
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Chat/vision model used for OCR transcription and RAG answer
 * generation. Configurable because "GPT-5.5" (as named in the product
 * spec) may not match the exact model id available on a given OpenAI
 * account -- point OPENAI_CHAT_MODEL at whatever you have access to.
 */
export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o";
