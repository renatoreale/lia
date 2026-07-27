import "server-only";

import { EMBEDDING_MODEL, getOpenAIClient } from "@/lib/ai/openai";

const BATCH_SIZE = 96; // OpenAI embeddings endpoint comfortably handles batches this size

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    for (const item of response.data) {
      vectors[i + item.index] = item.embedding;
    }
  }

  return vectors;
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
