"use server";

import { answerQuestion } from "@/lib/ai/rag";

export async function askQuestion(condominiumId: string, question: string) {
  return answerQuestion(condominiumId, question);
}
