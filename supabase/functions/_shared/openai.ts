import OpenAI from "npm:openai@4";

/** Deno mirror of src/lib/ai/openai.ts's CHAT_MODEL convention. */
export function getOpenAIClient(): OpenAI {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY non configurata (supabase secrets set).");
  return new OpenAI({ apiKey });
}

export const CHAT_MODEL = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o";
export const EMBEDDING_MODEL = "text-embedding-3-small";
